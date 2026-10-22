const db = require('../config/database');
const customerSvc = require('./customerService');
const billingSvc = require('./billingService');
const mikrotikService = require('./mikrotikService');
const customerDevice = require('./customerDeviceService');
const agentSvc = require('./agentService');
const { getSetting, getCurrentDateInTimezone } = require('../config/settingsManager');
const { logger } = require('../config/logger');

/**
 * Deklarasi Tools (Function Calling) untuk Google Gemini API
 */
const adminToolDeclarations = [
  {
    name: 'add_customer',
    description: 'Mendaftarkan / menambah pelanggan internet baru ke database billing dan MikroTik',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING', description: 'Nama lengkap pelanggan' },
        phone: { type: 'STRING', description: 'Nomor WhatsApp atau telepon pelanggan' },
        packageName: { type: 'STRING', description: 'Nama paket langganan (misal: BRONZE, SILVER, GOLD, dll)' },
        area: { type: 'STRING', description: 'Nama area / dusun / lokasi pelanggan (opsional)' },
        address: { type: 'STRING', description: 'Alamat lengkap rumah pelanggan (opsional)' },
        pppoeUsername: { type: 'STRING', description: 'Username akun PPPoE untuk dial MikroTik (opsional)' },
        pppoePassword: { type: 'STRING', description: 'Password akun PPPoE (opsional)' }
      },
      required: ['name', 'phone']
    }
  },
  {
    name: 'delete_customer_request',
    description: 'Meminta konfirmasi penghapusan data pelanggan secara permanen dari sistem',
    parameters: {
      type: 'OBJECT',
      properties: {
        target: { type: 'STRING', description: 'Nama pelanggan, ID pelanggan, nomor WhatsApp, atau username PPPoE yang ingin dihapus' }
      },
      required: ['target']
    }
  },
  {
    name: 'reboot_onu',
    description: 'Me-reboot / restart modem ONU pelanggan dari jarak jauh via GenieACS TR-069',
    parameters: {
      type: 'OBJECT',
      properties: {
        target: { type: 'STRING', description: 'Nama pelanggan, ID, no HP, akun PPPoE, atau tag ONU' }
      },
      required: ['target']
    }
  },
  {
    name: 'update_wifi_password',
    description: 'Mengubah kata sandi WiFi modem ONU pelanggan via GenieACS TR-069',
    parameters: {
      type: 'OBJECT',
      properties: {
        target: { type: 'STRING', description: 'Nama pelanggan, no HP, akun PPPoE, atau tag ONU' },
        newPassword: { type: 'STRING', description: 'Kata sandi WiFi baru (minimal 8 karakter)' }
      },
      required: ['target', 'newPassword']
    }
  },
  {
    name: 'update_wifi_ssid',
    description: 'Mengubah nama SSID WiFi modem ONU pelanggan via GenieACS TR-069',
    parameters: {
      type: 'OBJECT',
      properties: {
        target: { type: 'STRING', description: 'Nama pelanggan, no HP, akun PPPoE, atau tag ONU' },
        newSsid: { type: 'STRING', description: 'Nama SSID WiFi baru' }
      },
      required: ['target', 'newSsid']
    }
  },
  {
    name: 'mark_invoice_paid',
    description: 'Menandai lunas / melunasi tagihan invoice pelanggan dan cabut isolir jika ada',
    parameters: {
      type: 'OBJECT',
      properties: {
        target: { type: 'STRING', description: 'ID invoice (angka), nama pelanggan, no HP, atau username PPPoE' }
      },
      required: ['target']
    }
  },
  {
    name: 'isolate_customer',
    description: 'Mengisolir / suspend / memutus sementara layanan internet pelanggan di billing dan MikroTik',
    parameters: {
      type: 'OBJECT',
      properties: {
        target: { type: 'STRING', description: 'Nama pelanggan, ID pelanggan, no HP, atau username PPPoE' }
      },
      required: ['target']
    }
  },
  {
    name: 'unisolate_customer',
    description: 'Membuka isolir / mengaktifkan kembali layanan internet pelanggan di billing dan MikroTik',
    parameters: {
      type: 'OBJECT',
      properties: {
        target: { type: 'STRING', description: 'Nama pelanggan, ID pelanggan, no HP, atau username PPPoE' }
      },
      required: ['target']
    }
  },
  {
    name: 'kick_pppoe_user',
    description: 'Memutus paksa / kick sesi active PPPoE atau Hotspot pelanggan di router MikroTik',
    parameters: {
      type: 'OBJECT',
      properties: {
        username: { type: 'STRING', description: 'Username PPPoE atau nama pelanggan' }
      },
      required: ['username']
    }
  },
  {
    name: 'create_hotspot_voucher',
    description: 'Membuat / generate voucher hotspot baru di router MikroTik (Mikhmon profile)',
    parameters: {
      type: 'OBJECT',
      properties: {
        profile: { type: 'STRING', description: 'Nama profil paket voucher (misal: 1jam, 5jam, 24jam, dll)' },
        count: { type: 'INTEGER', description: 'Jumlah voucher yang ingin dibuat (opsional, default 1)' }
      },
      required: ['profile']
    }
  },
  {
    name: 'generate_invoices',
    description: 'Menjalankan generate invoice tagihan bulanan seluruh pelanggan',
    parameters: {
      type: 'OBJECT',
      properties: {
        month: { type: 'INTEGER', description: 'Bulan (1-12)' },
        year: { type: 'INTEGER', description: 'Tahun (misal: 2026)' }
      },
      required: ['month', 'year']
    }
  },
  {
    name: 'check_digiflazz_balance',
    description: 'Mengecek sisa saldo deposit Digiflazz (PPOB / Pulsa) Admin',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  },
  {
    name: 'topup_agent',
    description: 'Mentransfer / top up saldo agen reseller voucher atau pembayaran',
    parameters: {
      type: 'OBJECT',
      properties: {
        agentKey: { type: 'STRING', description: 'Username agent, nama agent, no HP, atau ID agent' },
        amount: { type: 'INTEGER', description: 'Nominal saldo yang ditransfer (angka dalam Rupiah)' },
        note: { type: 'STRING', description: 'Catatan transfer (opsional)' }
      },
      required: ['agentKey', 'amount']
    }
  }
];

/**
 * Helper untuk mencari pelanggan secara fleksibel (Nama, HP, PPPoE, ID, Tag)
 */
function findCustomerHelper(query) {
  if (!query) return null;
  const q = String(query).trim();
  let cust = customerSvc.findCustomerByAny(q);
  if (cust) return cust;

  const byExactName = db.prepare('SELECT id FROM customers WHERE LOWER(name) = LOWER(?) LIMIT 1').get(q);
  if (byExactName) return customerSvc.getCustomerById(byExactName.id);

  const candidates = customerSvc.getAllCustomers(q) || [];
  if (candidates.length === 1) return customerSvc.getCustomerById(candidates[0].id);
  if (candidates.length > 1) {
    const exact = candidates.find(c => c.name.toLowerCase() === q.toLowerCase());
    if (exact) return customerSvc.getCustomerById(exact.id);
    return customerSvc.getCustomerById(candidates[0].id);
  }
  return null;
}

/**
 * Eksekutor Tool / Fungsi Perintah WhatsApp Admin
 */
async function executeAdminTool(toolName, args, extraContext = {}) {
  const { reply, sock, lidStore } = extraContext;
  logger.info(`[Admin AI Tool] Memulai eksekusi tool "${toolName}" dengan args: ${JSON.stringify(args)}`);

  try {
    switch (toolName) {
      // 1. Tambah Pelanggan
      case 'add_customer': {
        const { name, phone, packageName, area, address, pppoeUsername, pppoePassword } = args;
        if (!name || !phone) {
          return '❌ Mohon sebutkan minimal Nama dan Nomor WhatsApp pelanggan yang ingin didaftarkan.';
        }

        const allPkgs = customerSvc.getAllPackages();
        let pkg = null;
        if (packageName) {
          pkg = allPkgs.find(p => p.name.toLowerCase() === packageName.toLowerCase().trim()) ||
                allPkgs.find(p => p.name.toLowerCase().includes(packageName.toLowerCase().trim()));
        }
        if (!pkg && allPkgs.length > 0) {
          pkg = allPkgs[0];
        }
        if (!pkg) {
          return '❌ Tidak ada paket layanan internet yang aktif di database.';
        }

        let cleanPppoe = (pppoeUsername || name.toLowerCase().replace(/[^a-z0-9]/g, '')).trim();
        if (!cleanPppoe) cleanPppoe = 'user' + Math.floor(1000 + Math.random() * 9000);
        
        const existing = db.prepare('SELECT id FROM customers WHERE pppoe_username = ?').get(cleanPppoe);
        if (existing) {
          cleanPppoe += Math.floor(10 + Math.random() * 89);
        }
        const cleanPass = (pppoePassword || cleanPppoe).trim();

        const routerRow = db.prepare('SELECT id FROM routers WHERE is_active = 1 LIMIT 1').get();
        const routerId = routerRow ? routerRow.id : null;

        const today = new Date().toISOString().slice(0, 10);
        const newCustData = {
          name: name.trim(),
          phone: String(phone).replace(/\D/g, ''),
          email: '',
          address: address ? String(address).trim() : '',
          area: area ? String(area).trim() : '',
          package_id: pkg.id,
          router_id: routerId,
          connection_type: 'pppoe',
          pppoe_username: cleanPppoe,
          pppoe_password: cleanPass,
          status: 'active',
          install_date: today,
          auto_isolate: 1,
          isolate_day: 10
        };

        const res = customerSvc.createCustomer(newCustData);
        const newId = res.lastInsertRowid;

        let mtSynced = false;
        let mtError = '';
        if (routerId) {
          try {
            await mikrotikService.createPppoeSecret({
              username: cleanPppoe,
              password: cleanPass,
              profile: pkg.name,
              routerId: routerId
            });
            mtSynced = true;
          } catch (err) {
            mtError = err.message;
          }
        }

        try {
          billingSvc.ensureCurrentInvoice(newId);
        } catch (_) {}

        return `✅ *PENDAFTARAN PELANGGAN BERHASIL*\n\n` +
          `• ID Pelanggan: *#${newId}*\n` +
          `• Nama: *${name}*\n` +
          `• No. WhatsApp: *${newCustData.phone}*\n` +
          `• Area: *${newCustData.area || '-'}*\n` +
          `• Paket: *${pkg.name}* (Rp ${Number(pkg.price).toLocaleString('id-ID')}/bln)\n` +
          `• Akun PPPoE: \`${cleanPppoe}\`\n` +
          `• Sandi PPPoE: \`${cleanPass}\`\n` +
          `• Sinkronisasi MikroTik: ${mtSynced ? '✅ Berhasil dibuat' : (mtError ? `⚠️ ${mtError}` : 'Dilewati (Router offline)')}\n` +
          `• Status Billing: *Aktif* (Invoice periode berjalan dibuat)`;
      }

      // 2. Hapus Pelanggan (Permintaan Konfirmasi)
      case 'delete_customer_request': {
        const { target } = args;
        if (!target) return '❌ Mohon sebutkan nama pelanggan, ID, atau No HP yang ingin dihapus.';
        const cust = findCustomerHelper(target);
        if (!cust) {
          return `❌ Pelanggan *"${target}"* tidak ditemukan di sistem. Pastikan penulisan nama atau nomor HP benar.`;
        }

        return `⚠️ *KONFIRMASI PENGHAPUSAN PELANGGAN*\n\n` +
          `Apakah Anda yakin ingin menghapus pelanggan berikut dari sistem?\n\n` +
          `• ID: *#${cust.id}*\n` +
          `• Nama: *${cust.name}*\n` +
          `• No. HP: *${cust.phone || '-'}*\n` +
          `• Paket: *${cust.package_name || '-'}*\n` +
          `• PPPoE: \`${cust.pppoe_username || '-'}\`\n` +
          `• Status: *${cust.status}*\n\n` +
          `⚠️ _PERINGATAN: Tindakan ini permanen. Data tagihan dan akun MikroTik pelanggan akan dihapus._\n\n` +
          `Ketik balasan:\n👉 *YA HAPUS ${cust.id}*\n\n_Untuk membatalkan, abaikan pesan ini._`;
      }

      // 3. Reboot Modem ONU
      case 'reboot_onu': {
        const { target } = args;
        if (!target) return '❌ Mohon sebutkan target nama pelanggan atau tag ONU yang ingin di-reboot.';

        const cust = findCustomerHelper(target);
        const tagToken = cust ? (cust.genieacs_tag || cust.pppoe_username || cust.phone) : target;

        const targetDevice = await customerDevice.resolveDeviceToken(tagToken);
        if (!targetDevice) {
          return `❌ Perangkat untuk target *"${target}"* tidak ditemukan di GenieACS TR-069.`;
        }

        const r = await customerDevice.requestReboot(tagToken);
        return `🔄 *REBOOT MODEM ONU*\n\nTarget: *${cust ? cust.name : target}* (Tag: \`${tagToken}\`)\nStatus: ${r.message}`;
      }

      // 4. Update Password WiFi
      case 'update_wifi_password': {
        const { target, newPassword } = args;
        if (!target || !newPassword) return '❌ Mohon sebutkan target pelanggan dan kata sandi baru.';
        if (String(newPassword).length < 8) return '❌ Kata sandi WiFi baru minimal 8 karakter.';

        const cust = findCustomerHelper(target);
        const tagToken = cust ? (cust.genieacs_tag || cust.pppoe_username || cust.phone) : target;

        const ok = await customerDevice.updatePassword(tagToken, String(newPassword).trim());
        if (ok) {
          return `🔑 *GANTI SANDI WIFI BERHASIL*\n\nTarget: *${cust ? cust.name : target}*\nSandi Baru: \`${newPassword}\`\n\n_Modem ONU telah diperbarui via TR-069._`;
        } else {
          return `❌ Gagal mengubah kata sandi WiFi untuk *"${target}"*. Pastikan modem ONU sedang online di GenieACS.`;
        }
      }

      // 5. Update SSID WiFi
      case 'update_wifi_ssid': {
        const { target, newSsid } = args;
        if (!target || !newSsid) return '❌ Mohon sebutkan target pelanggan dan nama SSID WiFi baru.';

        const cust = findCustomerHelper(target);
        const tagToken = cust ? (cust.genieacs_tag || cust.pppoe_username || cust.phone) : target;

        const ok = await customerDevice.updateSSID(tagToken, String(newSsid).trim());
        if (ok) {
          return `📶 *GANTI NAMA WIFI (SSID) BERHASIL*\n\nTarget: *${cust ? cust.name : target}*\nNama WiFi Baru: *${newSsid}*\n\n_Modem ONU telah diperbarui via TR-069._`;
        } else {
          return `❌ Gagal mengubah nama WiFi untuk *"${target}"*. Pastikan modem ONU sedang online di GenieACS.`;
        }
      }

      // 6. Melunasi Tagihan
      case 'mark_invoice_paid': {
        const { target } = args;
        if (!target) return '❌ Mohon sebutkan ID invoice, nama pelanggan, atau no HP yang ingin dilunasi.';
        const { executeAdminLunas } = await import('./whatsappBot.mjs');
        let capturedReply = '';
        const localReply = async (msg) => { capturedReply = msg; };
        await executeAdminLunas(target, localReply, sock, lidStore);
        return capturedReply || `✅ Perintah pelunasan tagihan *"${target}"* telah dieksekusi.`;
      }

      // 7. Isolir Pelanggan
      case 'isolate_customer': {
        const { target } = args;
        if (!target) return '❌ Mohon sebutkan nama pelanggan atau ID yang ingin diisolir.';
        const { executeAdminIsolir } = await import('./whatsappBot.mjs');
        let capturedReply = '';
        const localReply = async (msg) => { capturedReply = msg; };
        await executeAdminIsolir(target, localReply);
        return capturedReply || `⛔ Perintah isolir pelanggan *"${target}"* telah dieksekusi.`;
      }

      // 8. Buka Isolir Pelanggan
      case 'unisolate_customer': {
        const { target } = args;
        if (!target) return '❌ Mohon sebutkan nama pelanggan atau ID yang ingin dibuka isolirnya.';
        const { executeAdminBuka } = await import('./whatsappBot.mjs');
        let capturedReply = '';
        const localReply = async (msg) => { capturedReply = msg; };
        await executeAdminBuka(target, localReply);
        return capturedReply || `🟢 Perintah buka isolir pelanggan *"${target}"* telah dieksekusi.`;
      }

      // 9. Kick PPPoE / Hotspot User
      case 'kick_pppoe_user': {
        const { username } = args;
        if (!username) return '❌ Mohon sebutkan username PPPoE yang ingin diputus.';
        
        let targetUser = username.trim();
        const cust = findCustomerHelper(username);
        if (cust && cust.pppoe_username) {
          targetUser = cust.pppoe_username;
        }

        const pk = await mikrotikService.kickPppoeUser(targetUser);
        const hk = await mikrotikService.kickHotspotUser(targetUser);
        if (pk || hk) {
          return `✂️ *KICK USER AKTIF BERHASIL*\n\nSesi aktif untuk *${targetUser}*${cust ? ` (Pelanggan: ${cust.name})` : ''} telah diputus dari router MikroTik. Perangkat akan melakukan dial-up / login ulang otomatis.`;
        } else {
          return `⚠️ Sesi aktif untuk *"${targetUser}"* tidak ditemukan di router MikroTik.`;
        }
      }

      // 10. Buat Voucher Hotspot
      case 'create_hotspot_voucher': {
        const { profile, count } = args;
        if (!profile) return '❌ Mohon sebutkan nama profil paket voucher hotspot (misal: 1jam, 5jam, dll).';

        const numVouchers = Math.min(Math.max(parseInt(count, 10) || 1, 1), 10);
        const created = [];
        const now = getCurrentDateInTimezone();
        const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

        for (let i = 0; i < numVouchers; i++) {
          const code = Math.floor(1000 + Math.random() * 9000).toString();
          const comment = `vc ${code} ${dateStr} AI`;
          await mikrotikService.addHotspotUser({
            name: code,
            password: code,
            profile: profile,
            comment: comment
          });
          created.push(code);
        }

        let resp = `🎟️ *VOUCHER HOTSPOT BERHASIL DIBUAT*\n\n`;
        resp += `• Profil Paket: *${profile}*\n`;
        resp += `• Jumlah: *${created.length} voucher*\n\n`;
        resp += `*Kode Voucher (Username & Password):*\n`;
        created.forEach((c, idx) => {
          resp += `${idx + 1}. \`${c}\`\n`;
        });
        return resp;
      }

      // 11. Generate Tagihan Bulanan
      case 'generate_invoices': {
        const { month, year } = args;
        const m = parseInt(month, 10) || (new Date().getMonth() + 1);
        const y = parseInt(year, 10) || new Date().getFullYear();

        const r = await billingSvc.generateMonthlyInvoices(m, y);
        return `🧾 *GENERATE INVOICE SELESAI*\n\n` +
          `• Periode: *${m}/${y}*\n` +
          `• Invoice Baru Dibuat: *${r?.created || 0} tagihan*\n` +
          `• Dilewati (Sudah ada): *${r?.skipped || 0} tagihan*`;
      }

      // 12. Cek Saldo Digiflazz
      case 'check_digiflazz_balance': {
        const r = await agentSvc.digiflazzCheckBalance();
        const dep = Number(r?.deposit || 0).toLocaleString('id-ID');
        return `🏦 *SALDO DIGIFLAZZ (ADMIN)*\n\nDeposit: *Rp ${dep}*\nStatus: Aktif`;
      }

      // 13. Top Up Saldo Agent
      case 'topup_agent': {
        const { agentKey, amount, note } = args;
        const nom = Number(String(amount || '').replace(/[^\d]/g, ''));
        if (!nom || nom <= 0) return '❌ Nominal top up harus angka lebih dari 0.';

        const rawKey = String(agentKey || '').trim();
        let agent = agentSvc.getAgentById(parseInt(rawKey, 10)) ||
                    agentSvc.getAgentByUsername(rawKey) ||
                    agentSvc.getAgentByPhone(rawKey);

        if (!agent) {
          const all = agentSvc.getAllAgents();
          agent = all.find(a => String(a.name || '').toLowerCase().includes(rawKey.toLowerCase()));
        }

        if (!agent) return `❌ Agent *"${agentKey}"* tidak ditemukan.`;

        const r = agentSvc.topupAgent(agent.id, nom, note || 'Topup via WhatsApp AI', 'Admin WA');
        return `✅ *TOP UP AGENT BERHASIL*\n\n` +
          `• Agent: *${agent.name}* (@${agent.username})\n` +
          `• Nominal: *Rp ${nom.toLocaleString('id-ID')}*\n` +
          `• Saldo: Rp ${Number(r.before || 0).toLocaleString('id-ID')} ➜ *Rp ${Number(r.after || 0).toLocaleString('id-ID')}*\n` +
          `• Catatan: ${note || '-'}`;
      }

      default:
        return `⚠️ Fungsi *"${toolName}"* belum terkonfigurasi.`;
    }
  } catch (err) {
    logger.error(`[Admin AI Tool] Error saat eksekusi ${toolName}: ${err.message}`);
    return `❌ Gagal mengeksekusi perintah *${toolName}*: ${err.message}`;
  }
}

module.exports = {
  adminToolDeclarations,
  executeAdminTool
};
