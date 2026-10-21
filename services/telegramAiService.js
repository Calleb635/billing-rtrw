const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { getSetting } = require('../config/settingsManager');
const { logger } = require('../config/logger');

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
      
      // Ambil inti fitur dan bersihkan format berlebih jika terlalu panjang
      cachedKnowledge = fullDoc.length > 50000 ? fullDoc.substring(0, 48000) + '\n\n...(dokumentasi dipotong untuk efisiensi context)...' : fullDoc;
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
 * Panggil Google Gemini API
 */
async function callGeminiApi(apiKey, userQuestion, senderName = 'Member') {
  const knowledge = loadKnowledgeBase();
  const models = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-3.8-flash'];
  const preferredModel = getSetting('gemini_model', 'gemini-3.5-flash-lite');
  
  // Prioritaskan model pilihan user
  const modelList = [preferredModel, ...models.filter(m => m !== preferredModel)];

  const systemInstruction = `Anda adalah "Asisten AI Komunitas RTRW-Net", asisten cerdas yang ramah dan membantu untuk grup diskusi pengguna "RTRWNET Management & Billing System" (Botlokal).

Pedoman Jawaban:
1. TERKAIT APLIKASI: Jika pertanyaan berkaitan dengan aplikasi RTRWNET / Botlokal (seperti Billing, MikroTik, GenieACS TR-069, OLT SNMP, Payment Gateway, WhatsApp Baileys, Portal Pelanggan, Voucher, isolir, dll.), jawablah secara mendalam, akurat, dan mengacu pada DOKUMENTASI SISTEM di bawah ini.
2. PERTANYAAN UMUM / DI LUAR APLIKASI: Jika pertanyaan mengenai hal umum di luar aplikasi (misalnya konsep jaringan komputer, MikroTik dasar, Linux/server, tips teknologi, coding, atau obrolan santai), Anda TETAP BISA menjawab dengan ramah, cerdas, solutif, dan informatif.
3. Gaya Bahasa: Gunakan Bahasa Indonesia yang santun, bersahabat, jelas, dan profesional.
4. Format: Gunakan format Markdown Telegram yang rapi (bullet points, bold untuk penekanan istilah, backtick untuk perintah/kode).
5. Panjang Jawaban: Buat jawaban yang padat dan to-the-point (maksimal 3-4 paragraf atau 5-8 poin agar nyaman dibaca di layar chat).

DOKUMENTASI SISTEM (Khusus untuk pertanyaan seputar fitur aplikasi):
${knowledge}
`;

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
                text: `${systemInstruction}\n\nPertanyaan dari ${senderName}:\n${userQuestion}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024
        }
      };

      const response = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 20000
      });

      const candidate = response.data?.candidates?.[0];
      const answer = candidate?.content?.parts?.[0]?.text;
      if (answer && answer.trim()) {
        return answer.trim();
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
 * Fallback Jawaban Cerdas berbasis Kata Kunci jika belum ada Gemini API Key
 */
function getOfflineAnswer(question) {
  const q = String(question || '').toLowerCase();

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
async function askAi({ question, senderName }) {
  const cleanQ = String(question || '').trim();
  if (!cleanQ) {
    return 'Silakan ajukan pertanyaan seputar fitur aplikasi. Contoh: `/tanya bagaimana cara isolir otomatis?`';
  }

  const apiKey = getSetting('gemini_api_key', '');
  
  if (apiKey && apiKey.trim()) {
    try {
      const aiReply = await callGeminiApi(apiKey.trim(), cleanQ, senderName);
      return aiReply;
    } catch (err) {
      logger.error(`[TelegramAI] Gagal call Gemini API: ${err.message}. Menggunakan fallback jawaban lokal.`);
      // Jika AI error, fallback ke jawaban offline
      return getOfflineAnswer(cleanQ);
    }
  }

  // Jika API key belum diatur, gunakan offline knowledge base
  return getOfflineAnswer(cleanQ);
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
  getOfflineAnswer
};
