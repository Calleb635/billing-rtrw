const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { getSetting } = require('../config/settingsManager');
const { logger } = require('../config/logger');
const { adminToolDeclarations, executeAdminTool } = require('./adminAiTools');

// Cache untuk dokumen knowledge base
let cachedKnowledge = null;
let lastLoadTime = 0;
const KNOWLEDGE_RELOAD_INTERVAL = 3600000; // Reload tiap 1 jam jika ada update doc

/**
 * Muat dan ringkas dokumentasi aplikasi agar efisien dalam prompt AI
 */
function loadKnowledgeBase() {
  const now = Date.now();
  if (cachedKnowledge && (now - lastLoadTime < KNOWLEDGE_RELOAD_INTERVAL)) {
    return cachedKnowledge;
  }

  try {
    const docPath = path.join(__dirname, '../FITUR_APLIKASI_LENGKAP.md');
    if (fs.existsSync(docPath)) {
      const fullDoc = fs.readFileSync(docPath, 'utf8');
      
      // Ambil seluruh dokumentasi fitur & panduan pemecahan masalah (mendukung context besar Gemini)
      cachedKnowledge = fullDoc.length > 350000 ? fullDoc.substring(0, 340000) + '\n\n...(dokumentasi dipotong untuk efisiensi context)...' : fullDoc;
      lastLoadTime = now;
      logger.info(`[TelegramAI] Knowledge base loaded (${cachedKnowledge.length} bytes).`);
      return cachedKnowledge;
    }
  } catch (err) {
    logger.warn(`[TelegramAI] Gagal memuat FITUR_APLIKASI_LENGKAP.md: ${err.message}`);
  }

  // Fallback ringkasan jika file tidak terbaca
  cachedKnowledge = `
Aplikasi: RTRWNET Management & Billing System (Botlokal Customer Portal)
Tech Stack: Node.js (>=20.0.0), Express.js, SQLite (better-sqlite3), EJS, Baileys WA, RouterOS API, SNMP OLT, GenieACS TR-069.
Fitur Utama:
1. Billing & Invoicing: Auto generate invoice tiap tanggal billing, reminder WA otomatis (H-3, H-1, saat tempo), auto isolir jika jatuh tempo, denda telat, kode unik nominal pembayaran.
2. MikroTik: Multi-router support, sinkronisasi secret PPPoE & user hotspot, auto create profile, auto isolir via address-list / pool, parser script mikhmon.
3. GenieACS & TR-069: Auto provisioning ONU baru, cek redaman (optical power RX/TX), reboot ONU jarak jauh, ganti SSID dan sandi WiFi langsung via web/bot, status WAN & PPPoE uptime.
4. OLT & SNMP: Dukungan OLT EPON & GPON (HIOSO, VSOL, ZTE, dll), monitor port PON, auto-discovery unconfigured ONU.
5. Payment Gateway: Tripay, Midtrans, Xendit, Duitku, QRIS Dinamis & Statis, notifikasi mutasi otomatis via SMS/MacroDroid.
6. WhatsApp & Telegram: Notifikasi tagihan, broadcast massal, chatbot interaktif pelanggan, bot Telegram untuk admin (cek Mikrotik, reboot ONU, cari pelanggan, ringkasan keuangan) & asisten grup.
7. Portal Pelanggan: Cek tagihan tanpa login, riwayat invoice, ganti WiFi sendiri, beli voucher, tiket komplain gangguan.
8. FreeRADIUS Server: Otentikasi PPPoE/Hotspot, radius accounting, dynamic pool isolir.
`;
  lastLoadTime = now;
  return cachedKnowledge;
}

/**
 * Ambil status live seluruh pelanggan, MikroTik, dan GenieACS untuk Admin WhatsApp / Telegram
 */
async function getAdminGlobalContext(userQuestion) {
  try {
    const db = require('../config/database');
    const customerDevice = require('./customerDeviceService');
    const mikrotikService = require('./mikrotikService');

    // 1. Ambil ringkasan seluruh pelanggan dari SQLite
    const query = `
      SELECT 
        c.id, c.name, c.phone, c.status, c.pppoe_username, c.genieacs_tag, c.area,
        p.name as package_name, p.price as package_price,
        COUNT(CASE WHEN i.status != 'paid' THEN 1 END) as unpaid_count,
        COALESCE(SUM(CASE WHEN i.status != 'paid' THEN i.amount ELSE 0 END), 0) as unpaid_amount
      FROM customers c
      LEFT JOIN packages p ON c.package_id = p.id
      LEFT JOIN invoices i ON c.id = i.customer_id
      GROUP BY c.id
      ORDER BY c.id ASC
    `;
    const customers = db.prepare(query).all();

    const total = customers.length;
    const active = customers.filter(c => (c.status || '').toLowerCase() === 'active').length;
    const isolated = customers.filter(c => ['isolated', 'suspended', 'isolir'].includes((c.status || '').toLowerCase())).length;
    const inactive = customers.filter(c => ['inactive', 'nonaktif', 'terminated'].includes((c.status || '').toLowerCase())).length;
    const unpaidCustomers = customers.filter(c => c.unpaid_count > 0);
    const totalUnpaidAmount = unpaidCustomers.reduce((acc, c) => acc + (c.unpaid_amount || 0), 0);

    let contextText = `=== RINGKASAN GLOBAL SISTEM RTRW-NET (REALTIME ADMIN CONTEXT) ===\n`;
    contextText += `Total Pelanggan Terdaftar: ${total} pelanggan\n`;
    contextText += `- Aktif: ${active} pelanggan\n`;
    contextText += `- Terisolir / Suspended: ${isolated} pelanggan\n`;
    contextText += `- Non-Aktif / Terminated: ${inactive} pelanggan\n`;
    contextText += `Tunggakan Belum Lunas: ${unpaidCustomers.length} pelanggan (Total Tunggakan: Rp ${totalUnpaidAmount.toLocaleString('id-ID')})\n\n`;

    // 2. Direktori ringkas seluruh pelanggan
    contextText += `=== DIREKTORI SELURUH PELANGGAN (ID | Nama | No HP | Status | PPPoE | Paket | Tunggakan) ===\n`;
    for (const c of customers) {
      const unpaidStr = c.unpaid_count > 0 ? `${c.unpaid_count} tagihan (Rp ${c.unpaid_amount.toLocaleString('id-ID')})` : 'Lunas';
      contextText += `[ID:${c.id}] ${c.name} | ${c.phone || '-'} | Status: ${c.status} | PPPoE: ${c.pppoe_username || '-'} | Pkt: ${c.package_name || '-'} | Tunggakan: ${unpaidStr}\n`;
    }
    contextText += `\n`;

    // 3. Deteksi apakah admin menanyakan pelanggan tertentu
    const qLower = String(userQuestion || '').toLowerCase();
    const matchedCustomers = [];

    for (const c of customers) {
      let isMatch = false;
      const name = String(c.name || '').toLowerCase().trim();
      const pppoe = String(c.pppoe_username || '').toLowerCase().trim();
      const phoneDigits = String(c.phone || '').replace(/\D/g, '');
      const tag = String(c.genieacs_tag || '').toLowerCase().trim();
      const idStr = String(c.id);

      // Cek ID
      if (new RegExp(`\\b(id|#)\\s*${idStr}\\b`, 'i').test(qLower)) {
        isMatch = true;
      }
      // Cek No HP
      else if (phoneDigits.length >= 8 && qLower.includes(phoneDigits.slice(-8))) {
        isMatch = true;
      }
      // Cek PPPoE username
      else if (pppoe.length >= 3 && qLower.includes(pppoe)) {
        isMatch = true;
      }
      // Cek GenieACS Tag
      else if (tag.length >= 3 && qLower.includes(tag)) {
        isMatch = true;
      }
      // Cek Nama Pelanggan
      else if (name.length >= 3) {
        if (qLower.includes(name)) {
          isMatch = true;
        } else {
          const words = name.split(/\s+/).filter(w => w.length >= 4);
          for (const w of words) {
            if (['bisa', 'tolong', 'admin', 'saya', 'yang', 'dari', 'untuk', 'paket', 'status', 'kabel', 'modem', 'wifi', 'cek'].includes(w)) continue;
            if (qLower.includes(w)) {
              isMatch = true;
              break;
            }
          }
        }
      }

      if (isMatch) {
        matchedCustomers.push(c);
        if (matchedCustomers.length >= 3) break;
      }
    }

    // 4. Jika ada pelanggan yang cocok, lakukan Deep Dive (Invoices + GenieACS + MikroTik)
    if (matchedCustomers.length > 0) {
      contextText += `=== DETAIL MENDALAM PELANGGAN YANG DITANYAKAN ===\n`;

      let activeSessionsMap = new Map();
      try {
        activeSessionsMap = await Promise.race([
          mikrotikService.getActivePppoeSessionsMap(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('MikroTik timeout')), 4000))
        ]).catch(() => new Map());
      } catch (_) {}

      for (const mc of matchedCustomers) {
        const invRows = db.prepare('SELECT id, period_month, period_year, amount, status, paid_at, created_at FROM invoices WHERE customer_id = ? ORDER BY id DESC LIMIT 5').all(mc.id);
        const unpaidInvs = invRows.filter(i => i.status !== 'paid');
        const paidInvs = invRows.filter(i => i.status === 'paid');

        let onuData = null;
        const lookupTag = mc.genieacs_tag || mc.pppoe_username || mc.phone;
        if (lookupTag) {
          try {
            onuData = await Promise.race([
              customerDevice.getCustomerDeviceData(lookupTag),
              new Promise((_, reject) => setTimeout(() => reject(new Error('GenieACS timeout')), 4000))
            ]).catch(() => null);
          } catch (_) {}
        }

        const pppoeUser = (mc.pppoe_username || '').toLowerCase();
        const pppoeSession = pppoeUser ? activeSessionsMap.get(pppoeUser) : null;

        contextText += `\n>> PELANGGAN: ${mc.name} (ID: ${mc.id})\n`;
        contextText += `  - No HP: ${mc.phone || '-'}\n`;
        contextText += `  - Status Billing: ${mc.status}\n`;
        contextText += `  - Area: ${mc.area || '-'}\n`;
        contextText += `  - Paket: ${mc.package_name || '-'} (Rp ${Number(mc.package_price || 0).toLocaleString('id-ID')}/bulan)\n`;
        contextText += `  - Akun PPPoE: ${mc.pppoe_username || '-'}\n`;
        contextText += `  - Status PPPoE MikroTik: ${pppoeSession ? `ONLINE (IP: ${pppoeSession.ip}, Uptime: ${pppoeSession.uptime}, Router: ${pppoeSession.routerName || '-'})` : 'OFFLINE / Belum dial'}\n`;

        if (onuData) {
          contextText += `  - Status Modem ONU: ${onuData.status || 'Unknown'}\n`;
          contextText += `  - Redaman Optical (RX Power): ${onuData.rxPower ? onuData.rxPower + ' dBm' : '-'}\n`;
          contextText += `  - Nama WiFi (SSID): ${onuData.ssid || '-'}\n`;
          contextText += `  - ONU Uptime: ${onuData.uptime || '-'}\n`;
          contextText += `  - Pengguna WiFi Terhubung: ${onuData.totalAssociations || 0} user\n`;
        } else {
          contextText += `  - Status Modem ONU: (Data modem belum terhubung/tag GenieACS belum diisi)\n`;
        }

        contextText += `  - Rincian Tunggakan Tagihan: ${unpaidInvs.length > 0 ? unpaidInvs.map(i => `#${i.id} (Periode ${i.period_month}/${i.period_year}: Rp ${Number(i.amount).toLocaleString('id-ID')})`).join(', ') : 'TIDAK ADA (Semua tagihan LUNAS)'}\n`;
        if (paidInvs.length > 0) {
          contextText += `  - Tagihan Terakhir Lunas: #${paidInvs[0].id} (Periode ${paidInvs[0].period_month}/${paidInvs[0].period_year} sebesar Rp ${Number(paidInvs[0].amount).toLocaleString('id-ID')} pada ${paidInvs[0].paid_at || '-'})\n`;
        }
      }
    }

    return contextText;
  } catch (err) {
    logger.error(`[TelegramAI] Gagal mengambil admin global context: ${err.message}`);
    return '';
  }
}

/**
 * Panggil Google Gemini API
 */
async function callGeminiApi(apiKey, userQuestion, senderName = 'Member', customerContext = null, isAdmin = false, adminContext = null) {
  const knowledge = loadKnowledgeBase();
  const models = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-3.8-flash'];
  const preferredModel = getSetting('gemini_model', 'gemini-3.5-flash-lite');
  
  // Prioritaskan model pilihan user
  const modelList = [preferredModel, ...models.filter(m => m !== preferredModel)];

  let systemInstruction = '';
  if (isAdmin) {
    systemInstruction = `Anda adalah asisten cerdas, serba tahu, dan handal yang mendampingi Pemilik / Administrator "RTRWNET Management & Billing System" (Botlokal).

PEDOMAN UTAMA & ATURAN JAWABAN:
1. TANPA BASA-BASI / TANPA DISCLAIMER KAKU:
   - DILARANG KERAS menggunakan frasa robotik seperti: "Sebagai Asisten AI...", "Sebagai Asisten AI Eksekutif...", "Sebagai model bahasa...", "Mohon maaf sepertinya Anda bercanda/terpotong...", atau "Saya hanya bisa membantu seputar billing...".
   - Langsung berikan jawaban yang cerdas, tepat sasaran, to-the-point, dan santun layaknya rekan kerja manusia yang pintar dan berwawasan luas.
2. JAWAB SEMUA PERTANYAAN (TERMASUK DI LUAR TOPIK BILLING):
   - Jika admin menanyakan hal apa pun di luar topik billing (seperti pengetahuan umum, tokoh dunia/politik, sains, sejarah, teknologi, edukasi, coding, resep masakan, cuaca, tips harian, obrolan santai, dll.), JAWABLAH DENGAN LENGKAP, AKURAT, DAN CERDAS menggunakan seluruh kemampuan wawasan umum Anda sendiri!
   - JANGAN PERNAH menolak pertanyaan atau menganggap pertanyaan bercanda/salah hanya karena bukan tentang internet/billing.
3. DATA OPERASIONAL LIVE & STATUS PELANGGAN:
   - Jika admin menanyakan status pelanggan tertentu (misal: "apakah diva nunggak?", "cek redaman diva", "siapa yang terisolir?", "kenapa pelanggan X putus?"), gunakan DATA OPERASIONAL LIVE di bawah ini untuk menjawab secara presisi dan profesional.
   - Jika admin menanyakan ringkasan (misal: "berapa yang isolir?", "siapa saja yang belum bayar?", "total uang tunggakan?"), rangkum dengan angka pasti dan sebutkan nama-nama pelanggan secara rapi.
4. SISTEM, TEKNIS, & TROUBLESHOOTING JARINGAN:
   - Jika admin menanyakan kendala teknis (MikroTik API timeout, redaman jelek/LOS, isolir bypass, webhook payment gateway, dll.), berikan diagnosis penyebab dan solusi konkret mengacu pada DOKUMENTASI SISTEM & PANDUAN PEMECAHAN MASALAH di bawah.
5. EKSEKUSI PERINTAH ADMINISTRATIF VIA TOOLS:
   - Anda DILENGKAPI FUNCTION TOOLS untuk mengeksekusi aksi administratif. Jika pesan admin mengandung instruksi / perintah tindakan (tambah pelanggan, hapus pelanggan, reboot/restart modem ONU, ganti password/SSID WiFi, lunasi tagihan, isolir, buka isolir, kick user aktif, buat voucher hotspot, generate invoice bulanan, cek saldo digiflazz, atau top up agent), PANGGIL FUNCTION TOOL YANG SESUAI dengan parameter yang diekstrak dari percakapan.
   - Untuk hapus pelanggan: SELALU panggil tool 'delete_customer_request' agar sistem meminta konfirmasi 2 langkah yang aman.
   - Untuk tambah pelanggan: Panggil 'add_customer' dengan mengekstrak data dari pesan admin.
   - Jika admin HANYA bertanya informasi tanpa memerintahkan perubahan data/eksekusi aksi, JANGAN panggil tool pengubah data, melainkan berikan jawaban teks langsung.
6. FORMAT PENYAJIAN:
   - Gunakan format teks WhatsApp yang rapi (*bold*, bullet points) agar nyaman dan mudah dibaca di layar chat.

DATA OPERASIONAL LIVE (ADMIN ACCESS):
${adminContext || '(Tidak ada data kontekstual khusus)'}

DOKUMENTASI SISTEM & PANDUAN PEMECAHAN MASALAH:
${knowledge}
`;
  } else {
    let liveCustomerDataPrompt = '';
    if (customerContext) {
      liveCustomerDataPrompt = `
----------------------------------------
DATA STATUS LIVE PELANGGAN (Dari Database Server Billing):
- Nama Pelanggan: ${customerContext.customerName || senderName}
- Paket Layanan: ${customerContext.package || '-'}
- Akun PPPoE: ${customerContext.pppoeUsername || '-'}
- Status Langganan: ${customerContext.customerStatus || 'Active'}
- Status Tagihan Saat Ini: ${customerContext.hasUnpaid ? `MEMILIKI ${customerContext.unpaidCount} TAGIHAN BELUM LUNAS (Total: Rp ${customerContext.totalUnpaidAmount.toLocaleString('id-ID')})` : (customerContext.allPaid ? 'SEMUA TAGIHAN SUDAH LUNAS' : 'Belum ada data tagihan')}
${customerContext.unpaidInvoices ? `Rincian Tagihan Belum Lunas:\n${customerContext.unpaidInvoices}` : ''}

PETUNJUK KHUSUS JIKA MENANYAKAN TAGIHAN / TUNGGAKAN / PEMBAYARAN:
Jika pelanggan bertanya mengenai sisa tagihan, status pembayaran, jumlah uang yang harus dibayar, atau tunggakan miliknya, gunakan DATA STATUS LIVE di atas! Sebutkan nama pelanggan, total tagihan yang belum lunas beserta rincian periode bulannya secara sopan, jelas, dan ramah. Jika semua tagihan sudah lunas, beritahukan bahwa tagihan sudah lunas dan ucapkan terima kasih.
----------------------------------------
`;
    }

    systemInstruction = `Anda adalah asisten cerdas, ramah, dan solutif untuk komunitas dan layanan pelanggan "RTRWNET Management & Billing System" (Botlokal).

PEDOMAN UTAMA & ATURAN JAWABAN:
1. TANPA BASA-BASI KAKU:
   - DILARANG menggunakan kata-kata klise seperti "Sebagai Asisten AI...", "Sebagai model bahasa...", atau menolak pertanyaan. Langsung jawab ke inti pertanyaan dengan ramah, santun, dan bersahabat.
2. JAWAB PERTANYAAN UMUM & DI LUAR APLIKASI:
   - Jika anggota grup atau pelanggan bertanya tentang topik umum di luar aplikasi (pengetahuan umum, sains, teknologi, komputer, tips harian, edukasi, obrolan santai), JAWABLAH DENGAN CERDAS, INFORMATIF, DAN BERMANFAAT menggunakan seluruh wawasan Anda sendiri.
3. PERTANYAAN TERKAIT FITUR & TROUBLESHOOTING APLIKASI:
   - Jika berkaitan dengan layanan internet, cara bayar tagihan, cara ganti sandi wifi, cek tagihan, atau troubleshooting jaringan rumah, jawablah dengan panduan praktis yang mengacu pada DOKUMENTASI SISTEM & PANDUAN PEMECAHAN MASALAH di bawah.
4. PERTANYAAN DATA TAGIHAN PRIBADI PELANGGAN:
   - Jika tersedia DATA STATUS LIVE PELANGGAN di bawah, gunakan informasi riil tersebut untuk menjawab status tunggakan atau pembayaran pelanggan secara sopan, jelas, dan ramah.
5. FORMAT PENYAJIAN:
   - Gunakan format teks rapi (*bold*, bullet points), maksimal 2-4 paragraf agar nyaman dibaca di layar chat.

${liveCustomerDataPrompt}

DOKUMENTASI SISTEM & PANDUAN PEMECAHAN MASALAH:
${knowledge}
`;
  }

  let lastError = null;

  for (const model of modelList) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${systemInstruction}\n\nPesan / Pertanyaan dari ${isAdmin ? `Admin (${senderName})` : senderName}:\n${userQuestion}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024
        }
      };

      if (isAdmin && Array.isArray(adminToolDeclarations) && adminToolDeclarations.length > 0) {
        payload.tools = [
          {
            functionDeclarations: adminToolDeclarations
          }
        ];
      }

      const response = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 25000
      });

      const candidate = response.data?.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      // Periksa apakah model memutuskan memanggil function tool
      const funcPart = parts.find(p => p.functionCall);
      if (funcPart && funcPart.functionCall) {
        return {
          type: 'function_call',
          functionCall: {
            name: funcPart.functionCall.name,
            args: funcPart.functionCall.args || {}
          }
        };
      }

      // Jawaban teks biasa
      const textPart = parts.find(p => p.text && p.text.trim());
      if (textPart && textPart.text) {
        return {
          type: 'text',
          text: textPart.text.trim()
        };
      }
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      // Jika error 404 (model tidak ditemukan), lanjut ke model berikutnya
      if (status === 404) {
        logger.warn(`[TelegramAI] Model ${model} tidak tersedia (404), mencoba model cadangan...`);
        continue;
      }
      // Jika 429 atau quota limit, log dan coba model berikutnya
      if (status === 429) {
        logger.warn(`[TelegramAI] Model ${model} kena limit (429), mencoba model cadangan...`);
        continue;
      }
      // Error lain (seperti Invalid API Key 400)
      if (status === 400) {
        throw new Error('API Key Gemini tidak valid atau belum diaktifkan.');
      }
      logger.warn(`[TelegramAI] Error calling ${model}: ${err.message}`);
    }
  }

  throw lastError || new Error('Gagal mendapatkan respon dari AI.');
}

/**
 * Fallback Jawaban Cerdas berbasis Kata Kunci jika belum ada Gemini API Key atau offline
 */
function getOfflineAnswer(question, customerContext = null, isAdmin = false, adminContext = null) {
  const q = String(question || '').toLowerCase();

  // Khusus Admin jika offline: Jawab ringkasan data riil dari database
  if (isAdmin) {
    try {
      const db = require('../config/database');

      // 1. Cek pertanyaan tunggakan / tagihan belum lunas
      if (q.includes('tunggak') || q.includes('belum bayar') || q.includes('tagihan') || q.includes('piutang') || q.includes('nunggak')) {
        const unpaidList = db.prepare(`
          SELECT c.id, c.name, c.phone, c.status, COUNT(i.id) as count, SUM(i.amount) as total
          FROM customers c
          JOIN invoices i ON c.id = i.customer_id
          WHERE i.status != 'paid'
          GROUP BY c.id
          ORDER BY total DESC
        `).all();

        if (unpaidList.length === 0) {
          return `🎉 *Laporan Billing Admin (Offline)*\n\nAlhamdulillah, saat ini *tidak ada pelanggan yang menunggak*. Semua tagihan sudah lunas!`;
        }

        const totalNominal = unpaidList.reduce((sum, item) => sum + Number(item.total || 0), 0);
        let resp = `📊 *LAPORAN TUNGGAKAN PELANGGAN (OFFLINE)*\n\n`;
        resp += `• Total Penunggak: *${unpaidList.length} pelanggan*\n`;
        resp += `• Total Nominal: *Rp ${totalNominal.toLocaleString('id-ID')}*\n\n`;
        resp += `*Daftar Pelanggan Menunggak:*\n`;
        unpaidList.slice(0, 15).forEach((c, idx) => {
          resp += `${idx + 1}. *${c.name}* (${c.phone || '-'}) - Rp ${Number(c.total).toLocaleString('id-ID')} [${c.count} tagihan]\n`;
        });
        if (unpaidList.length > 15) {
          resp += `\n_...dan ${unpaidList.length - 15} pelanggan lainnya._`;
        }
        return resp;
      }

      // 2. Cek pertanyaan isolir / terisolir / putus
      if (q.includes('isolir') || q.includes('suspend') || q.includes('putus')) {
        const isolatedList = db.prepare(`
          SELECT id, name, phone, pppoe_username, area
          FROM customers
          WHERE LOWER(status) IN ('isolated', 'suspended', 'isolir')
          ORDER BY id ASC
        `).all();

        if (isolatedList.length === 0) {
          return `✅ *Laporan Status Isolir (Offline)*\n\nSaat ini *tidak ada pelanggan yang sedang terisolir*. Semua pelanggan dalam status aktif/normal.`;
        }

        let resp = `🔒 *DAFTAR PELANGGAN TERISOLIR (Total: ${isolatedList.length})*\n\n`;
        isolatedList.forEach((c, idx) => {
          resp += `${idx + 1}. *${c.name}* | PPPoE: \`${c.pppoe_username || '-'}\` | Area: ${c.area || '-'}\n`;
        });
        return resp;
      }

      // 3. Cek total / ringkasan / rekap
      if (q.includes('total') || q.includes('berapa') || q.includes('rekap') || q.includes('ringkasan')) {
        const stats = db.prepare(`
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN LOWER(status) = 'active' THEN 1 END) as active,
            COUNT(CASE WHEN LOWER(status) IN ('isolated', 'suspended', 'isolir') THEN 1 END) as isolated,
            COUNT(CASE WHEN LOWER(status) IN ('inactive', 'terminated', 'nonaktif') THEN 1 END) as inactive
          FROM customers
        `).get();

        return `📊 *RINGKASAN PELANGGAN (OFFLINE)*\n\n` +
          `• Total Terdaftar: *${stats.total} pelanggan*\n` +
          `• Aktif: *${stats.active} pelanggan*\n` +
          `• Terisolir: *${stats.isolated} pelanggan*\n` +
          `• Nonaktif: *${stats.inactive} pelanggan*`;
      }
    } catch (err) {
      logger.error(`[TelegramAI] Offline admin answer error: ${err.message}`);
    }
  }

  // Jika pelanggan menanyakan tagihan/tunggakan dan ada data live pelanggan
  if (customerContext && (q.includes('tagihan') || q.includes('tunggak') || q.includes('bayar') || q.includes('lunas') || q.includes('tempo') || q.includes('invoice'))) {
    if (customerContext.hasUnpaid) {
      return `Halo Kak *${customerContext.customerName}*,\n\n` +
        `Saat ini Anda memiliki *${customerContext.unpaidCount} tagihan belum lunas* dengan total:\n` +
        `💰 *Rp ${customerContext.totalUnpaidAmount.toLocaleString('id-ID')}*\n\n` +
        `📋 *Rincian Tagihan:*\n${customerContext.unpaidInvoices}\n\n` +
        `💡 _Pembayaran dapat dilakukan melalui transfer bank atau QRIS di portal pelanggan atau hubungi admin/kolektor._`;
    } else if (customerContext.allPaid) {
      return `Halo Kak *${customerContext.customerName}*,\n\n` +
        `✅ *Semua tagihan internet Anda sudah LUNAS!* Tidak ada tunggakan saat ini.\nTerima kasih atas kerja samanya. 🙏`;
    }
  }

  // --- DIAGNOSTIK & PEMECAHAN MASALAH (TROUBLESHOOTING) ---

  // 1. Masalah Sudah Lunas tapi Masih Isolir
  if (q.includes('masih isolir') || (q.includes('sudah bayar') && q.includes('isolir')) || (q.includes('lunas') && q.includes('isolir')) || q.includes('sudah bayar tapi')) {
    return `💡 *Solusi: Sudah Lunas Tapi Masih Terisolir*\n\n` +
      `*Penyebab:* IP pelanggan masih tersangkut di address-list isolir MikroTik atau profile PPPoE belum dial-up ulang.\n\n` +
      `*Langkah Perbaikan:*\n` +
      `1. *Via Web Billing:* Buka Data Pelanggan ➜ Klik tombol *"Buka Isolir"*.\n` +
      `2. *Via Bot WA/Telegram:* Ketik perintah: \`buka <nama/id_pelanggan>\`.\n` +
      `3. *Via MikroTik (Darurat):*\n` +
      `   • Hapus IP di: \`/ip firewall address-list remove [find address="<IP>"]\`\n` +
      `   • Kick sesi aktif: \`/interface pppoe-server remove [find user="<username>"]\``;
  }

  // 2. Masalah Terisolir tapi Masih Bisa Internetan
  if (q.includes('masih bisa') && (q.includes('isolir') || q.includes('suspend') || q.includes('putus'))) {
    return `💡 *Solusi: Pelanggan Isolir Tapi Masih Bisa Internetan*\n\n` +
      `*Penyebab:* Sesi PPPoE aktif belum diputus (masih pegang IP lama) atau rule NAT isolir posisinya di bawah rule masquerade umum.\n\n` +
      `*Langkah Perbaikan:*\n` +
      `1. Kick sesi aktif pelanggan via bot: \`kickuser <username>\` agar router mengalokasikan IP isolir.\n` +
      `2. Pindahkan NAT Rule isolir ke *urutan teratas* di Winbox (\`/ip firewall nat\`).\n` +
      `3. Tambahkan drop/redirect DNS port 53 untuk address-list ISOLIR agar tidak bypass via DNS publik (8.8.8.8 / 1.1.1.1).\n` +
      `4. Pastikan opsi \`auto_isolate\` pada data pelanggan bernilai \`1\`.`;
  }

  // 3. Masalah Koneksi MikroTik API (Timeout / Gagal Konek)
  if (q.includes('tidak bisa konek') || q.includes('gagal konek') || q.includes('api timeout') || q.includes('port 8728') || q.includes('port 8729') || q.includes('service api')) {
    return `🔧 *Solusi: Gagal Terhubung ke MikroTik API (Port 8728 / 8729)*\n\n` +
      `*Penyebab:* Service API nonaktif di router, port API salah, atau firewall MikroTik memblokir input port API.\n\n` +
      `*Langkah Perbaikan di Winbox/Terminal MikroTik:*\n` +
      `1. Aktifkan service API:\n` +
      `   \`/ip service enable api; /ip service set api port=8728\`\n` +
      `2. Buka izin firewall input:\n` +
      `   \`/ip firewall filter add chain=input protocol=tcp dst-port=8728 action=accept place-before=0 comment="Allow Billing API"\`\n` +
      `3. Periksa Web Admin ➜ Menu Routers:\n` +
      `   • Pastikan Host IP, Port, User, dan Password sama persis dengan yang bisa login Winbox.\n` +
      `   • Disarankan membuat user khusus API dengan group \`full\`.`;
  }

  // 4. Masalah Redaman Optik / LOS Lampu Merah
  if ((q.includes('redaman') && (q.includes('jelek') || q.includes('tinggi') || q.includes('drop') || q.includes('dbm') || q.includes('solusi') || q.includes('masalah') || q.includes('kenapa') || q.includes('buruk'))) || q.includes('los') || q.includes('lampu merah') || q.includes('kabel putus') || q.includes('rx power')) {
    return `📡 *Panduan Redaman Optik & Solusi LOS (Lampu Merah)*\n\n` +
      `*Kategori Nilai Redaman (RX Power):*\n` +
      `• *-15 dBm s/d -22 dBm:* Sangat Baik / Ideal (Koneksi stabil)\n` +
      `• *-23 dBm s/d -25 dBm:* Cukup / Ambang Batas Aman\n` +
      `• *-26 dBm s/d -28 dBm:* Buruk (Packet loss / throughput drop)\n` +
      `• *> -28 dBm s/d -32 dBm:* Kritis (Sering putus-nyambung)\n` +
      `• *LOS (Lampu Merah / RX < -35 dBm):* Putus Total\n\n` +
      `*Langkah Perbaikan:*\n` +
      `1. *Jika redaman -25 s/d -28 dBm:* Bersihkan ujung konektor SC patchcord dengan alkohol isopropil, cek tekukan kabel dropcore.\n` +
      `2. *Jika LOS (Merah):* Cek redaman di output ODP dengan OPM. Jika di ODP bagus tapi di rumah pelanggan LOS, lacak kabel putus menggunakan VFL (Laser Optik) lalu lakukan splicing ulang.`;
  }

  // 5. Masalah Webhook / Payment Gateway / QRIS
  if (q.includes('webhook') || (q.includes('qris') && (q.includes('gagal') || q.includes('belum lunas') || q.includes('unpaid') || q.includes('tidak otomatis')))) {
    return `💳 *Solusi: Pembayaran QRIS / Gateway Tidak Otomatis Lunas*\n\n` +
      `*Penyebab:* URL callback webhook di dashboard merchant gateway belum sesuai atau server belum HTTPS.\n\n` +
      `*Langkah Perbaikan:*\n` +
      `1. Daftarkan URL Callback di Dashboard Merchant:\n` +
      `   • Tripay: \`https://domain-anda.com/api/payment/tripay/callback\`\n` +
      `   • Midtrans: \`https://domain-anda.com/api/payment/midtrans/callback\`\n` +
      `   • Xendit: \`https://domain-anda.com/api/payment/xendit/callback\`\n` +
      `   • Duitku: \`https://domain-anda.com/api/payment/duitku/callback\`\n` +
      `2. Pastikan \`app_url\` di \`settings.json\` menggunakan awalan \`https://\`.\n` +
      `3. *Solusi Cepat Admin:* Jika bukti transfer sudah valid, lunaskan manual via bot: ketik \`lunas <ID_INVOICE>\`.`;
  }

  // 6. Masalah WhatsApp "Menunggu Pesan Ini" / Logout
  if (q.includes('menunggu pesan ini') || q.includes('waiting for this message') || q.includes('wa logout') || q.includes('wa putus')) {
    return `💬 *Solusi: WhatsApp "Menunggu Pesan Ini" / Sering Terputus*\n\n` +
      `*Penyebab:* Handshake enkripsi Signal prekey antara Baileys dan WhatsApp pengirim belum selesai sinkronisasi.\n\n` +
      `*Langkah Penanganan:*\n` +
      `1. Minta pengirim mengirim 1 pesan teks biasa (misal "Halo" atau "Tes") agar kunci enkripsi tersinkronisasi otomatis.\n` +
      `2. Hindari me-restart service WhatsApp tanpa jeda.\n` +
      `3. Jika status bot 401 / Logout: Masuk Web Admin ➜ WhatsApp Gateway ➜ Klik *"Reset Sesi"* lalu scan ulang QR Code. Pastikan HP bot koneksi internetnya stabil dan mode hemat baterai dimatikan.`;
  }

  // 7. Masalah Telegram Bot
  if (q.includes('telegram') && (q.includes('akses ditolak') || q.includes('conflict') || q.includes('409') || q.includes('tidak respon'))) {
    return `🤖 *Solusi Kendala Bot Telegram*\n\n` +
      `1. *Akses Ditolak:* Masukkan ID Telegram Anda ke \`telegram_admin_id\` di Web Admin ➜ Pengaturan ➜ Telegram Bot. (Cek ID Anda via @userinfobot).\n` +
      `2. *Polling 409 Conflict / deleteWebHook:* Terjadi jika ada 2 proses bot yang berjalan bersamaan dengan token yang sama. Hentikan proses dev di lokal atau restart PM2: \`pm2 restart billing\`.`;
  }

  // 8. Masalah Database SQLite Locked
  if (q.includes('database is locked') || q.includes('sqlite_busy') || q.includes('restore database')) {
    return `🗄️ *Solusi: Database Locked & Restore Backup SQLite*\n\n` +
      `1. *Database Locked:* Terjadi saat transaksi write menumpuk. Sistem sudah mengaktifkan WAL mode. Jika stuck, restart service: \`pm2 restart billing\`.\n` +
      `2. *Restore Database:* File backup harian ada di folder \`backups/\`.\n` +
      `   Perintah restore:\n` +
      `   \`pm2 stop billing && cp backups/billing_backup_TERAKHIR.sqlite database.sqlite && pm2 start billing\``;
  }

  // 9. Masalah Digiflazz
  if (q.includes('digiflazz') && (q.includes('gagal') || q.includes('rc 40') || q.includes('rc 41') || q.includes('rc 42') || q.includes('saldo habis'))) {
    return `🏦 *Solusi: Kendala Transaksi Pulsa Digiflazz*\n\n` +
      `• *RC 40 / 41 (IP Not Allowed):* Daftarkan IP Publik server billing Anda ke Whitelist IP di Member Area Digiflazz (Pengaturan ➜ Koneksi API).\n` +
      `• *RC 42 (Saldo Kurang):* Saldo deposit Digiflazz tidak cukup. Cek via bot: \`saldodigi\` dan lakukan top up deposit di dashboard Digiflazz.\n` +
      `• *Cek Status:* Gunakan perintah: \`cekpulsa <TXID>\`.`;
  }

  if (q.includes('isolir') || q.includes('putus') || q.includes('tunggak')) {
    return `🔒 *Fitur Auto Isolir & Unisolir*\n\n` +
      `Aplikasi ini memiliki sistem isolir otomatis berbasis Cron Job:\n` +
      `• *Trigger:* Dijalankan otomatis sesuai jadwal jika pelanggan melewati tanggal jatuh tempo.\n` +
      `• *Metode Isolir MikroTik:* Menambahkan IP pelanggan ke Address List isolir atau mengubah IP Pool ke Pool Isolir.\n` +
      `• *Metode RADIUS:* Memindahkan user ke group/profile isolir secara dinamis.\n` +
      `• *Unisolir Otomatis:* Begitu tagihan dibayar (via Payment Gateway atau ditandai lunas oleh Admin/Kolektor), isolir langsung dicabut otomatis.`;
  }

  if (q.includes('genieacs') || q.includes('tr069') || q.includes('tr-069') || q.includes('onu') || q.includes('redaman')) {
    return `📡 *Fitur GenieACS & TR-069*\n\n` +
      `Aplikasi terintegrasi mendalam dengan GenieACS:\n` +
      `• *Auto Provisioning:* Mengidentifikasi perangkat baru secara otomatis berdasarkan Serial Number/Tag.\n` +
      `• *Monitoring:* Menampilkan redaman optical power (RX/TX), uptime perangkat, status WAN PPPoE, dan jumlah user WiFi terkoneksi.\n` +
      `• *Kontrol Jarak Jauh:* Reboot ONU, ganti nama WiFi (SSID), dan ganti password WiFi langsung dari Web Admin atau Bot Telegram.`;
  }

  if (q.includes('olt') || q.includes('snmp') || q.includes('gpon') || q.includes('epon')) {
    return `🔌 *Fitur OLT & ONU Management (SNMP)*\n\n` +
      `• Mendukung berbagai merk OLT EPON & GPON (HIOSO, VSOL, ZTE, dll).\n` +
      `• Memantau status interface port PON & uplink secara real-time via SNMP.\n` +
      `• Auto-discovery ONU yang belum terkonfigurasi (unregistered ONU) untuk memudahkan teknisi lapangan saat pasang baru.`;
  }

  if (q.includes('payment') || q.includes('tripay') || q.includes('midtrans') || q.includes('xendit') || q.includes('duitku') || q.includes('qris')) {
    return `💳 *Fitur Payment Gateway & Pembayaran*\n\n` +
      `Aplikasi mendukung beragam saluran pembayaran otomatis:\n` +
      `• *Payment Gateway:* Terintegrasi dengan Tripay, Midtrans, Xendit, dan Duitku.\n` +
      `• *QRIS Dinamis:* Pelanggan bisa scan barcode QRIS dan tagihan otomatis lunas dalam hitungan detik setelah bayar.\n` +
      `• *QRIS Statis + Kode Unik:* Transfer nominal unik dengan verifikasi otomatis via webhook notifikasi SMS/E-Wallet (MacroDroid).\n` +
      `• Konfirmasi pembayaran otomatis mencabut isolir & mengirim struk via WhatsApp.`;
  }

  if (q.includes('whatsapp') || q.includes('wa') || q.includes('baileys') || q.includes('notif')) {
    return `💬 *Fitur WhatsApp Gateway (Baileys)*\n\n` +
      `• Menggunakan engine Baileys unofficial yang hemat biaya (tanpa biaya langganan API berbayar).\n` +
      `• *Notifikasi Otomatis:* Pengiriman tagihan baru (H-3, H-1), reminder jatuh tempo, notifikasi isolir, dan ucapan terima kasih + invoice lunas.\n` +
      `• *Chatbot Pelanggan:* Pelanggan bisa cek tagihan, cek status WiFi, ganti password, dan minta reboot via WhatsApp.`;
  }

  if (q.includes('mikrotik') || q.includes('router') || q.includes('pppoe') || q.includes('hotspot')) {
    return `⚙️ *Fitur Integrasi MikroTik*\n\n` +
      `• *Multi-Router Support:* Mendukung banyak router MikroTik sekaligus dalam 1 dashboard.\n` +
      `• *Manajemen PPPoE:* Sinkronisasi akun secret, status online/offline, dan grafik traffic live.\n` +
      `• *Hotspot & Voucher:* Sinkronisasi profile Mikhmon, cetak voucher massal dengan template kustom, dan laporan penjualan.\n` +
      `• *Auto Script Generator:* Integrasi script failover dan netwatch.`;
  }

  if (q.includes('radius') || q.includes('freeradius')) {
    return `🛡️ *Fitur FreeRADIUS Server*\n\n` +
      `• Manajemen autentikasi terpusat untuk PPPoE dan Hotspot.\n` +
      `• Mendukung RADIUS Accounting untuk pelacakan penggunaan kuota/bandwidth.\n` +
      `• Dynamic Framed-Pool dan Isolir-Pool yang langsung di-push saat pelanggan menunggak.`;
  }

  if (q.includes('portal') || q.includes('pelanggan') || q.includes('customer')) {
    return `📱 *Portal Pelanggan (Self-Service)*\n\n` +
      `URL: \`/customer\`\n` +
      `• Pelanggan dapat cek tagihan tanpa login (via nomor HP / tagihan).\n` +
      `• Melihat riwayat pembayaran, mengunduh invoice PDF.\n` +
      `• Mengubah nama WiFi & kata sandi mandiri dari rumah.\n` +
      `• Pembelian voucher hotspot & pembuatan tiket gangguan teknis.`;
  }

  // Jawaban standar jika belum ada keyword yang cocok
  return `🤖 *Asisten RTRWNET Management & Billing System*\n\n` +
    `Saya dapat membantu menjawab berbagai pertanyaan seputar aplikasi ini:\n` +
    `• *Billing & Invoicing:* Auto invoice, denda, auto isolir & unisolir\n` +
    `• *MikroTik:* Multi-router, PPPoE secret, Hotspot Mikhmon\n` +
    `• *GenieACS (TR-069):* Cek redaman, reboot ONU, ganti WiFi\n` +
    `• *OLT (SNMP):* Monitoring port PON, uncfg ONU (EPON/GPON)\n` +
    `• *Payment Gateway:* Tripay, Midtrans, Xendit, Duitku, QRIS\n` +
    `• *WhatsApp:* Notifikasi invoice otomatis, broadcast, chatbot Baileys\n` +
    `• *Portal Pelanggan:* Self-service WiFi, cek tagihan, tiket support\n\n` +
    `_💡 Coba tanyakan spesifik, misal: "Bagaimana cara isolir otomatis?" atau "Apakah support multi router?"_`;
}

/**
 * Handle tanya jawab AI utama
 */
async function askAi({ question, senderName, customerContext = null, isAdmin = false, extraContext = {} }) {
  const cleanQ = String(question || '').trim();
  if (!cleanQ) {
    return 'Silakan ajukan pertanyaan seputar fitur aplikasi atau layanan internet Anda.';
  }

  let adminContext = null;
  if (isAdmin) {
    try {
      adminContext = await getAdminGlobalContext(cleanQ);
    } catch (err) {
      logger.error(`[TelegramAI] Gagal build admin context: ${err.message}`);
    }
  }

  const apiKey = getSetting('gemini_api_key', '');
  
  if (apiKey && apiKey.trim()) {
    try {
      const aiReply = await callGeminiApi(apiKey.trim(), cleanQ, senderName, customerContext, isAdmin, adminContext);
      if (typeof aiReply === 'object' && aiReply?.type === 'function_call') {
        const toolResult = await executeAdminTool(aiReply.functionCall.name, aiReply.functionCall.args, extraContext);
        return toolResult;
      }
      if (typeof aiReply === 'object' && aiReply?.type === 'text') {
        return aiReply.text;
      }
      return typeof aiReply === 'string' ? aiReply : (aiReply?.text || JSON.stringify(aiReply));
    } catch (err) {
      logger.error(`[TelegramAI] Gagal call Gemini API: ${err.message}. Menggunakan fallback jawaban lokal.`);
      // Jika AI error, fallback ke jawaban offline
      return getOfflineAnswer(cleanQ, customerContext, isAdmin, adminContext);
    }
  }

  // Jika API key belum diatur, gunakan offline knowledge base
  return getOfflineAnswer(cleanQ, customerContext, isAdmin, adminContext);
}

/**
 * Utilitas Diagnostik: Cek DNS via DNS-over-HTTPS (DoH Cloudflare / Google)
 */
async function checkDns(domain, type = 'A') {
  try {
    const cleanDomain = String(domain || '').trim().replace(/^https?:\/\//i, '').split('/')[0];
    const recType = String(type || 'A').toUpperCase();

    // Gunakan Cloudflare DoH untuk kehandalan tanpa terkena port 53 hijack ISP
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(cleanDomain)}&type=${recType}`;
    const res = await axios.get(url, {
      headers: { 'Accept': 'application/dns-json' },
      timeout: 7000
    });

    const data = res.data;
    if (!data.Answer || data.Answer.length === 0) {
      return `🔍 *HASIL CEK DNS*\n\nTarget: \`${cleanDomain}\`\nRecord: *${recType}*\nStatus: ⚠️ Tidak ditemukan record ${recType} untuk domain ini.`;
    }

    let out = `🌐 *HASIL CEK DNS (Cloudflare Resolver)*\n\n`;
    out += `Domain: \`${cleanDomain}\`\nRecord: *${recType}*\n\n*Data Jawaban:*\n`;
    data.Answer.forEach(ans => {
      out += `• \`${ans.data}\` (TTL: ${ans.TTL}s)\n`;
    });

    return out;
  } catch (err) {
    return `❌ Gagal melakukan lookup DNS: ${err.message}`;
  }
}

/**
 * Utilitas Diagnostik: Cek Host / Latency (HTTP Head Ping)
 */
async function checkPing(host) {
  try {
    let cleanHost = String(host || '').trim();
    if (!cleanHost.startsWith('http://') && !cleanHost.startsWith('https://')) {
      cleanHost = 'http://' + cleanHost;
    }

    const startTime = Date.now();
    const res = await axios.head(cleanHost, { timeout: 8000, validateStatus: () => true });
    const latency = Date.now() - startTime;

    return `🏓 *HASIL PING / KONEKSI*\n\n` +
      `Target: \`${cleanHost}\`\n` +
      `Status: ✅ Terhubung (HTTP ${res.status})\n` +
      `Latensi: *${latency} ms*`;
  } catch (err) {
    return `❌ Gagal menghubungi \`${host}\`: ${err.message}`;
  }
}

module.exports = {
  askAi,
  checkDns,
  checkPing,
  getOfflineAnswer,
  getAdminGlobalContext
};
