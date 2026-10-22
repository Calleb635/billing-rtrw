# DOKUMENTASI FITUR APLIKASI - RTRWNET BILLING & MANAGEMENT SYSTEM
**Status:** ✅ COMPREHENSIVE FEATURE DOCUMENTATION  
**Tanggal:** 14 Agustus 2026  
**Tujuan:** Complete reference for all built-in features & functionality

---

## 📑 DAFTAR ISI

1. [Overview Sistem](#overview-sistem)
2. [Portal & Akses](#portal--akses)
3. [Fitur Billing & Invoicing](#fitur-billing--invoicing)
4. [Fitur Manajemen Pelanggan](#fitur-manajemen-pelanggan)
5. [Fitur MikroTik Integration](#fitur-mikrotik-integration)
6. [Fitur GenieACS & TR-069](#fitur-genieacs--tr-069)
7. [Fitur OLT & ONU Management](#fitur-olt--onu-management)
8. [Fitur Payment Gateway](#fitur-payment-gateway)
9. [Fitur GIS & Mapping](#fitur-gis--mapping)
10. [Fitur WhatsApp & Telegram](#fitur-whatsapp--telegram)
11. [Fitur Inventory & Logistics](#fitur-inventory--logistics)
12. [Fitur Ticketing & Support](#fitur-ticketing--support)
13. [Fitur Agent & Sales](#fitur-agent--sales)
14. [Fitur Monitoring & Health](#fitur-monitoring--health)
15. [Fitur Automation & Cron](#fitur-automation--cron)
16. [Fitur Internal User Management](#fitur-internal-user-management)

---

## 📊 OVERVIEW SISTEM

### Informasi Dasar
- **Nama:** RTRWNET Management & Billing System
- **Versi:** 1.0.0
- **Runtime:** Node.js ≥20.0.0
- **Database:** SQLite (better-sqlite3)
- **Main File:** `app-customer.js`
- **Port Default:** 3001 (dapat diubah di settings.json)
- **License:** Terbuka (lihat LICENSE file)

### Target User
1. **Admin/Manajemen ISP** - Pengelola bisnis & konfigurasi sistem
2. **Teknisi Lapangan** - Support & maintenance perangkat pelanggan
3. **Operator Billing** - Penagihan & administrasi keuangan
4. **Agent/Mitra Penjualan** - Penjualan paket & pembayaran
5. **Pelanggan** - Portal self-service
6. **Kolektor** - Approval pembayaran tertangguh

### Tech Stack Utama
```javascript
- Express.js 4.18.2        // Web framework
- SQLite (better-sqlite3)  // Database ringan & reliable
- EJS 3.1.10              // Template engine
- Bootstrap 5              // CSS framework
- Leaflet                  // Map/GIS
- Baileys 6.7.21          // WhatsApp unofficial
- node-routeros-client    // MikroTik API
- net-snmp                // OLT SNMP
- Axios                   // HTTP client
- node-cron              // Task scheduling
```

---

## 🚪 PORTAL & AKSES

### 1. Portal Pelanggan (Public/Private)
**URL:** `http://localhost:3001/customer`

**Sub-Fitur:**
- ✅ Login/Registrasi (dengan opsi OTP)
- ✅ Dashboard - ringkasan tagihan & status
- ✅ Cek tagihan (tanpa login via `/customer/check-billing`)
- ✅ Riwayat invoice & pembayaran
- ✅ Grafik traffic PPPoE real-time
- ✅ Ubah SSID/Password Wi-Fi
- ✅ Reboot CPE/ONU
- ✅ Beli voucher hotspot
- ✅ Buat tiket support
- ✅ Profil & setting pribadi

**Authentication:** Session-based + OTP optional

**Views:**
```
views/customer/
├── dashboard.ejs          // Halaman utama
├── billing.ejs           // Riwayat tagihan
├── topup.ejs            // Pembayaran online
├── register.ejs         // Registrasi
├── device.ejs           // Manajemen Wi-Fi
├── ppob.ejs            // Pembelian voucher
├── tickets.ejs         // Support tickets
```

---

### 2. Portal Admin
**URL:** `http://localhost:3001/admin`

**Sub-Fitur:**
- ✅ Dashboard - statistik & ringkasan
- ✅ Manajemen pelanggan (CRUD)
- ✅ Manajemen paket & harga
- ✅ Billing & invoice generation
- ✅ MikroTik configuration & monitoring
- ✅ GenieACS device management
- ✅ OLT/ONU management
- ✅ Peta jaringan (GIS) dengan Leaflet
- ✅ Whatsapp administration
- ✅ Manajemen agent/agen
- ✅ Laporan keuangan
- ✅ Inventory management
- ✅ Settings & configuration
- ✅ Audit trail & logs
- ✅ Backup & restore
- ✅ Multi-language support

**Authentication:** Session admin-only

**Main Routes:**
```
/admin/login              → Admin login
/admin                    → Dashboard
/admin/customers         → Manajemen pelanggan
/admin/packages          → Paket layanan
/admin/invoices          → Tagihan
/admin/mikrotik          → MikroTik tools
/admin/genieacs          → Device management
/admin/olts              → OLT management
/admin/map               → Peta jaringan
/admin/whatsapp          → WhatsApp config
/admin/agents            → Manajemen agen
/admin/reports           → Laporan
/admin/inventory         → Gudang
/admin/settings          → Pengaturan
```

---

### 3. Portal Teknisi (Field Support)
**URL:** `http://localhost:3001/tech`

**Sub-Fitur:**
- ✅ Dashboard teknis
- ✅ Pool tiket (ticket queue)
- ✅ Peta lokasi pelanggan & ODP
- ✅ Chat WhatsApp integration
- ✅ GPS tracking teknisi
- ✅ Input pelanggan baru (lapangan)
- ✅ Device monitoring (GenieACS)
- ✅ Performance monitoring (CPU, RAM, disk)
- ✅ Riwayat tiket & penanganan

**Authentication:** Session tech-only

**Features:**
```
/tech/                   → Dashboard
/tech/tickets            → Daftar tiket
/tech/tickets/:id        → Detail tiket
/tech/map                → Peta jaringan
/tech/devices/:id        → Detail device
/tech/monitoring         → System monitoring
```

---

### 4. Portal Agen (Agent/Sales)
**URL:** `http://localhost:3001/agent`

**Sub-Fitur:**
- ✅ Login & dashboard
- ✅ Pembayaran tagihan pelanggan (dari saldo agen)
- ✅ Pembelian voucher hotspot
- ✅ Penjualan pulsa & data (Digiflazz)
- ✅ Cetak struk transaksi
- ✅ Riwayat & laporan transaksi
- ✅ Manajemen saldo

**Authentication:** Session agent-only

**Payment Methods:**
- Direct payment dari saldo agen
- E-voucher purchase
- Digital product (pulsa, data, dll via Digiflazz)

---

### 5. Portal Kolektor (Payment Collector)
**URL:** `http://localhost:3001/collector`

**Sub-Fitur:**
- ✅ Login & dashboard
- ✅ Cek tagihan pelanggan per area
- ✅ Buat pengajuan pembayaran
- ✅ Riwayat pengajuan
- ✅ Approval workflow

**Authentication:** Session collector-only

**Workflow:**
```
1. Kolektor cek tagihan pelanggan
2. Kolektor buat pengajuan pembayaran
3. Admin/Kasir approve pengajuan
4. Sistem catat pembayaran
5. Pelanggan dapat notifikasi via WhatsApp
```

---

### 6. Portal Finance (Keuangan)
**URL:** `http://localhost:3001/finance`

**Sub-Fitur:**
- ✅ Laporan pendapatan
- ✅ Kategori pengeluaran
- ✅ Entry pengeluaran operasional
- ✅ Cash in/out tracking
- ✅ Financial dashboard
- ✅ Export laporan

**Authentication:** Admin-only access

---

### 7. Portal Public (Publik)
**Tanpa Login:**
- ✅ Cek tagihan tanpa login: `/customer/check-billing`
- ✅ Halaman status isolated: `/isolated`
- ✅ QRIS static payment: `/qris/static.ejs`
- ✅ Public voucher info: `/public/voucher`
- ✅ TOS/Privacy/About/Contact pages

---

## 💰 FITUR BILLING & INVOICING

### 1. Invoice Generation

**Jenis Billing:**
- ✅ Bulanan otomatis (automatic monthly billing)
- ✅ Per pelanggan (single customer)
- ✅ Massal (bulk billing)
- ✅ Prorata (untuk bulan pertama)

**Komponen Invoice:**
```javascript
{
  id: number,
  customer_id: number,
  period_month: number,      // 1-12
  period_year: number,        // 2026
  amount: number,             // Total tagihan
  status: 'unpaid'|'paid'|'cancelled',
  qris_amount_unique: number, // QRIS nominal unik
  notes: string,              // Promo & prorata info
  created_at: datetime,
  due_date: datetime,
  paid_at: datetime,
  payment_method: string      // 'admin', 'agent', 'tripay', dll
}
```

**Fitur Promo & Prorata:**
```
Promo:
- Paket bisa set harga promo untuk N siklus pertama
- Setiap pelanggan track promo_cycles_used
- Promo berakhir → kembali ke harga normal

Prorata:
- Jika tanggal pasang (install_date) = bulan tagihan
- Invoice pertama dihitung per hari (proporsi bulan)
- Otomatis di-apply berdasarkan paket setting
```

**Contoh Workflow:**
```
1. Admin generate invoice untuk periode 08/2026
2. Sistem hitung nominal per pelanggan:
   - Status promo? → gunakan promo_price
   - Paket punya FUP? → cek kuota bulanan
   - Bulan pertama & prorata aktif? → hitung prorata
3. Invoice di-create dengan status 'unpaid'
4. Notifikasi WhatsApp ke pelanggan
5. Pelanggan bayar (online atau manual)
6. Sistem update status menjadi 'paid'
7. Notifikasi paid ke pelanggan
8. Isolir otomatis jika lewat due date
```

---

### 2. Payment Gateway Integration

**Gateway Terintegasi:**
```javascript
1. Midtrans (Snap API)
   - Status: Aktif/Nonaktif di settings
   - Fitur: Multiple payment methods (CC, transfer, GCash, etc)

2. Tripay
   - Status: Aktif/Nonaktif
   - Fitur: Bank transfer, E-wallet, QRIS

3. Xendit
   - Status: Aktif/Nonaktif
   - Fitur: Invoice, VA, QR codes

4. Duitku
   - Status: Aktif/Nonaktif
   - Fitur: Aggregator pembayaran

5. QRIS Static (Built-in)
   - QR code fixed untuk donasi/pembayaran unik
   - Nominal unik auto-assign per invoice
   - Mudah match payment dari notifikasi bank
```

**Payment Flow:**
```
Customer → Choose Payment Method
         → Redirect to Gateway
         → Process Payment
         → Gateway Webhook/Callback
         → Mark Invoice as PAID
         → Send WhatsApp confirmation
```

**Webhook Payment Generic:**
```
Endpoint: POST /api/webhook/v1/payment-notif
Fitur:
- Generic webhook untuk bank/e-wallet notification
- Auto-match nominal dengan invoice
- Auto-mark paid jika cocok
- Log semua webhook untuk audit
- Manual cleanup jika perlu
```

---

### 3. Pembayaran Manual & Offline

**Tipe Pembayaran Manual:**
```javascript
1. Admin bayar (dari panel)
   - Pilih invoice
   - Catat nominal pembayaran
   - Catat metode pembayaran
   - Mark as paid
   - Otomatis kirim notifikasi WhatsApp

2. Agent bayar (dari saldo agen)
   - Agent login
   - Pilih pelanggan
   - Cek tagihan
   - Bayar dari saldo agen
   - Struk otomatis print/download

3. Kolektor ajukan (pending approval)
   - Kolektor input pembayaran
   - Pending approval (admin/kasir)
   - Approval → mark as paid
   - Rejection → return ke pending

4. Kasir bayar (kasir portal)
   - Kasir login
   - Input pembayaran
   - Mark paid
   - Print bukti
```

---

### 4. Invoice Management

**Fitur:**
```
- ✅ Lihat daftar invoice (admin/customer)
- ✅ Cetak invoice (PDF via pdfKit)
- ✅ Export invoice list (CSV/Excel)
- ✅ Batalkan pembayaran (unpay) - jika ada kesalahan
- ✅ Reschedule due date
- ✅ Bulk action (multiple invoices)
- ✅ Invoice status tracking
- ✅ Payment reminder via WhatsApp
```

**Invoice Status Flow:**
```
unpaid → (payment received) → paid
      ↓
    cancelled (oleh admin)

Isolir status linked ke unpaid invoices
Auto-isolir trigger jika lewat due date
```

---

## 👥 FITUR MANAJEMEN PELANGGAN

### 1. CRUD Pelanggan

**Data Pelanggan:**
```javascript
{
  id: number,
  name: string,                    // Nama pelanggan
  phone: string,                   // Nomor HP
  email: string,                   // Email
  address: string,                 // Alamat fisik
  latitude: float,                 // Koordinat GPS
  longitude: float,
  
  // Network
  package_id: number,              // Paket yang digunakan
  router_id: number,               // MikroTik router
  pppoe_username: string,          // Username PPPoE
  pppoe_secret: string,            // Password PPPoE
  hotspot_username: string,        // Username hotspot
  static_ip: string,               // IP statis (jika ada)
  
  // Device
  olt_id: number,                  // OLT yang digunakan
  onu_port: number,               // Port ONU
  genieacs_tag: string,           // Tag di GenieACS
  
  // Location
  odp_id: number,                 // ODP terdekat
  area: string,                   // Area/kabupaten
  
  // Status & Billing
  status: 'active'|'suspended'|'inactive',
  install_date: date,             // Tanggal pasang
  isolate_day: number,            // Tanggal isolir otomatis (1-31)
  auto_isolate: boolean,          // Enable isolir otomatis
  
  // Promo
  promo_cycles_used: number,      // Berapa siklus promo sudah dipakai
  
  // Other
  nik: string,                    // No ID pelanggan
  notes: string,                  // Catatan
  created_at: datetime,
  updated_at: datetime
}
```

**Operasi:**
```
- ✅ Tambah pelanggan baru
- ✅ Edit data pelanggan
- ✅ Hapus pelanggan (soft delete)
- ✅ Import pelanggan dari Excel
- ✅ Export pelanggan list
- ✅ Bulk action (status change, package change, dll)
- ✅ Search & filter (by name, phone, area, status)
```

---

### 2. Isolir / Suspend Customer

**Isolir Manual:**
```
Admin klik "Isolir" di halaman pelanggan
  ↓
Sistem suspend ke MikroTik:
  - PPPoE: hapus user atau disable
  - Hotspot: suspend user
  - Static IP: redirect ke "Isolated" page
  ↓
Status pelanggan: 'suspended'
  ↓
Pelanggan kembali online setelah bayar + admin buka isolir
```

**Isolir Otomatis (Cron):**
```
Cron job berjalan setiap hari jam 2 pagi
  ↓
Cek semua pelanggan:
  - Status = 'active'
  - auto_isolate = true
  - Tanggal hari ini >= isolate_day
  - Ada unpaid invoices
  ↓
Trigger isolir otomatis
  ↓
Notifikasi WhatsApp ke pelanggan
```

**Buka Isolir (Unisolir):**
```
Admin klik "Buka Isolir" setelah pembayaran
  ↓
Sistem restore di MikroTik:
  - PPPoE: tambah kembali user atau enable
  - Hotspot: reactivate user
  ↓
Status pelanggan: 'active'
  ↓
Pelanggan bisa online lagi
  ↓
Notifikasi WhatsApp konfirmasi
```

---

### 3. Manajemen Paket Layanan

**Data Paket:**
```javascript
{
  id: number,
  name: string,                    // Nama paket (Starter, Pro, Premium)
  description: string,
  price: number,                   // Harga reguler per bulan
  promo_price: number,            // Harga promo (opsional)
  promo_cycles: number,           // N siklus pertama dapat promo
  
  // Speed
  speed_down: number,             // Download Mbps
  speed_up: number,               // Upload Mbps
  
  // FUP (Fair Usage Policy)
  use_fup: boolean,               // Enable FUP?
  fup_limit_gb: number,           // Limit data per bulan (GB)
  fup_profile_name: string,       // Profile MikroTik saat FUP
  
  // Night Mode (Jam Kalong)
  use_night_mode: boolean,        // Enable night mode?
  night_profile_name: string,     // Profile MikroTik malam (23:00-06:00)
  
  // Tax
  use_ppn: boolean,               // Charge PPN?
  ppn_percentage: number,         // % PPN (default 11%)
  
  // Prorata
  prorate_first_invoice: boolean, // Prorata invoice pertama?
  
  is_active: boolean,
  created_at: datetime
}
```

**Operasi:**
```
- ✅ Tambah paket
- ✅ Edit paket
- ✅ Hapus paket
- ✅ Set promo per paket
- ✅ Set night mode profile
- ✅ Set FUP limit & profile
```

---

## 🌐 FITUR MIKROTIK INTEGRATION

### 1. Koneksi & Konfigurasi

**Setup MikroTik:**
```
1. Admin setting:
   - Host: 192.168.8.1
   - Username: billing
   - Password: password123
   - Port: 8711
   
2. Di MikroTik router:
   - Enable API service
   - Create user 'billing' dengan permission
   - Whitelist IP aplikasi

3. Tes koneksi dari panel admin
```

**Multi-Router Support:**
```
- Aplikasi bisa kelola banyak MikroTik router
- Per pelanggan assign ke router mana
- Cron job sinkron ke router tersesuai
- Fallback ke default router jika tidak specify
```

---

### 2. PPPoE Management

**PPPoE User:**
```javascript
{
  username: string,           // PPPoE username
  secret: string,            // PPPoE password
  password_hashed: string,   // Disimpan via PPPoE protocol
  profile: string,           // Bandwidth profile
  disabled: boolean,
  created_at: datetime
}
```

**Operasi:**
```
- ✅ Create PPPoE user
- ✅ Change secret/password
- ✅ Disable/enable user
- ✅ View active sessions
- ✅ Monitor traffic (bytes in/out)
- ✅ Set speed profile
- ✅ Delete user
```

**Traffic Monitoring:**
```
Real-time:
- ✅ Monitor sesi PPPoE aktif
- ✅ Grafik traffic per session
- ✅ Bytes sent/received
- ✅ Session duration
- ✅ IP address

Historical:
- ✅ Store pemakaian per hari/bulan
- ✅ Aggregate data per customer
- ✅ Usage history dashboard
```

---

### 3. Hotspot Management

**Hotspot User:**
```javascript
{
  name: string,              // Hotspot username
  password: string,
  profile: string,          // Speed profile
  limit_uptime: number,     // Session time limit
  limit_bytes_total: number, // Data limit
  limit_bytes_down: number,  // Download limit
  limit_bytes_up: number,    // Upload limit
  disabled: boolean
}
```

**Fitur:**
```
- ✅ Create/edit hotspot user
- ✅ Active session monitoring
- ✅ View real-time data usage
- ✅ Disconnect session
- ✅ Set speed & data limits
```

---

### 4. Voucher Hotspot

**Voucher System:**
```
Workflow:
1. Admin create voucher batch
2. Sistem generate N kode voucher
3. Kode disimpan di database & MikroTik
4. Customer bisa gunakan di hotspot portal
5. Agent bisa jual voucher ke customer
6. Pelanggan bayar → dapat voucher code
```

**Voucher Batch:**
```javascript
{
  id: number,
  name: string,              // Nama batch
  quantity: number,          // Jumlah voucher
  profile_name: string,      // Speed profile
  validity: number,          // Hari berlaku
  price: number,            // Harga jual per voucher
  status: 'pending'|'created'|'synced',
  qty_created: number,      // Berapa sudah dibuat
  qty_failed: number,       // Berapa gagal
  created_at: datetime
}
```

**Fitur:**
```
- ✅ Generate batch voucher
- ✅ Sync ke MikroTik
- ✅ Print voucher code
- ✅ Export CSV
- ✅ Track status (created/active/used/expired)
- ✅ Delete batch
- ✅ Sell via agent portal
- ✅ Sell via customer portal
```

---

### 5. Firewall & Rate Limiting

**Built-in Firewall Setup:**
```
Admin bisa setup firewall rules:
- Rate limiting per user
- Block ports tertentu
- Whitelist IP
- Queue management
- Priority traffic (VoIP, dst)
```

---

### 6. Bandwidth Profile (Jam Kalong)

**Night Mode Automation:**
```
Setup:
- Paket A: default 10Mbps, night 20Mbps (more speed at night)
- Paket B: default 5Mbps, night 2Mbps (throttle at night)

Cron:
- 00:00 (midnight): Switch ke night profile
- 06:00 (pagi): Switch ke day profile

Fitur:
- ✅ Set profile per paket
- ✅ Custom time (tidak harus fixed 00:00-06:00)
- ✅ Override manual per user
- ✅ Log profile changes
```

---

### 7. Backup MikroTik

**Fitur:**
```
- ✅ Backup konfigurasi MikroTik dari panel
- ✅ Schedule backup otomatis
- ✅ Download backup file
- ✅ Restore dari backup
- ✅ Version history
```

---

## 🎛️ FITUR GENIEACS & TR-069

### 1. Built-in ACS (Auto Configuration Server)

Aplikasi memiliki ACS internal ringan untuk TR-069 tanpa perlu GenieACS eksternal.

**Keuntungan:**
```
✅ Lightweight - langsung di Node.js
✅ Tidak perlu MongoDB/Redis
✅ Hemat resource VPS
✅ Support banyak brand ONU (ZTE, Huawei, FiberHome, dll)
✅ Auto-detect device properties
✅ Provision WAN & VLAN otomatis
```

**Setting:**
```json
{
  "use_builtin_acs": true|false,
  "acs_port": 7547         // TR-069 port
}
```

---

### 2. ONU/CPE Management

**Device List:**
```javascript
{
  id: number,
  device_id: string,              // Identifier unik (MAC/Serial)
  manufacturer: string,           // Brand (ZTE, Huawei, dll)
  model: string,
  serial_number: string,
  firmware_version: string,
  
  // Customer Link
  customer_id: number,
  customer_name: string,
  customer_phone: string,
  
  // Status
  status: 'online'|'offline'|'error',
  last_contact: datetime,
  
  // Wi-Fi
  ssid: string,                   // Wi-Fi name
  password: string,              // Wi-Fi password
  
  // VLAN
  vlan_id: number,
  management_ip: string,
  
  created_at: datetime
}
```

---

### 3. Device Operations

**Fitur:**
```
- ✅ View device list (dengan search & filter)
- ✅ Device detail (parameter, status, logs)
- ✅ Change SSID / Password Wi-Fi
- ✅ Bulk SSID change (multiple devices sekaligus)
- ✅ Reboot device
- ✅ View device logs & history
- ✅ Parameter configuration
- ✅ Provision WAN (VLAN, bridge, etc)
```

**SSID Change Workflow:**
```
1. Admin/Tech buka device detail
2. Edit SSID & Password baru
3. Click "Update SSID"
4. Sistem send perintah via TR-069
5. Device update Wi-Fi config
6. Notifikasi customer via WhatsApp
7. Log activity di audit trail
```

---

### 4. GenieACS Integration (Optional)

Jika gunakan GenieACS eksternal:

**Konfigurasi:**
```json
{
  "genieacs_url": "http://192.168.8.189:7557",
  "genieacs_username": "admin",
  "genieacs_password": "admin",
  "genieacs_timeout": 30000,
  "genieacs_monitoring_enabled": true,
  "genieacs_monitoring_interval": 6,     // Jam
  "genieacs_rxpower_threshold": -27      // dBm
}
```

**Fitur:**
```
- ✅ Sync device dari GenieACS ke aplikasi
- ✅ View GenieACS parameters
- ✅ Kirim command (SSID, reboot, dll)
- ✅ Monitor RX power (signal strength)
- ✅ Alert jika signal lemah
- ✅ Bulk operation
```

---

## 🔌 FITUR OLT & ONU MANAGEMENT

### 1. OLT Configuration

**OLT Data:**
```javascript
{
  id: number,
  name: string,              // Nama OLT (OLT-1, OLT-Jakarta, dll)
  host: string,             // IP address
  snmp_community: string,   // SNMP community string
  snmp_port: number,        // SNMP port (161)
  brand: string,            // Brand (HIOSO, ZTE, Huawei, dll)
  model: string,
  
  // Telnet (untuk konfigurasi WAN)
  telnet_host: string,
  telnet_port: number,
  telnet_username: string,
  telnet_password: string,
  telnet_enable_password: string,
  
  // Web interface
  web_url: string,
  web_username: string,
  web_password: string,
  
  // API (untuk ZTE C320)
  api_base_url: string,
  
  is_active: boolean,
  created_at: datetime
}
```

---

### 2. ONU Status & Monitoring

**ONU Info:**
```javascript
{
  olt_id: number,
  port: number,             // Port OLT (1-128 tergantung OLT)
  onu_index: number,
  
  // Hardware
  sn: string,               // Serial number
  model: string,
  firmware_version: string,
  mac_address: string,
  
  // Status
  status: 'online'|'offline'|'dying_gasp'|'error',
  admin_state: 'enable'|'disable',
  optical_signal: number,   // dBm
  
  // Customer link
  customer_id: number,
  customer_name: string,
  
  // Distance
  distance: number,         // KM to OLT
  
  // Last contact
  last_contact: datetime
}
```

---

### 3. ONU Operations

**Fitur:**
```
- ✅ View ONU list per port
- ✅ View ONU statistics (signal strength, status)
- ✅ Reboot ONU
- ✅ Rename ONU (friendly name)
- ✅ Authorize ONU (EPON)
- ✅ Configure WAN (VLAN, bridge, PPPoE)
- ✅ View ONU logs
- ✅ Bulk operation
```

**Configure WAN Methods:**
```
1. Telnet (OMCI commands)
   - For ZTE, Huawei, FiberHome
   - Direksi jalankan commands Telnet

2. TR-069 (GenieACS)
   - If GenieACS configured
   - Use parameter modification

3. REST API (go-api-c320)
   - For ZTE C320 specifically
   - Direct API call to OLT

4. Web Interface
   - Manual via OLT web UI
   - Backup method jika automation gagal
```

---

### 4. OLT Port Management

**Port Info:**
```javascript
{
  olt_id: number,
  port_number: number,      // 1-N
  port_type: 'EPON'|'GPON'|'hybrid',
  
  // Capacity
  total_onus: number,       // Max ONU di port ini
  active_onus: number,      // ONU yang online
  
  // Status
  status: 'up'|'down'|'error',
  admin_state: 'enable'|'disable',
  
  // Statistics
  bytes_rx: number,
  bytes_tx: number,
  packets_rx: number,
  packets_tx: number,
  errors: number,
  
  // Monitoring
  optical_power: number,
  temperature: number
}
```

---

## 💳 FITUR PAYMENT GATEWAY

### 1. Multi-Gateway Architecture

**Supported Gateways:**
```
1. Midtrans (Snap API)
   Status: Enable/Disable di settings
   Methods: CC, Transfer, GCash, Gopay, OVO, Dana
   
2. Tripay
   Status: Enable/Disable
   Methods: Bank Transfer, Ewallet, QRIS
   
3. Xendit
   Status: Enable/Disable
   Methods: Virtual Account, QR, Invoice
   
4. Duitku
   Status: Enable/Disable
   Methods: Aggregator pembayaran
   
5. QRIS Static (Built-in)
   Status: Always available
   Methods: QR Code fixed
```

---

### 2. Payment Integration Flow

**Customer Bayar Invoice:**
```
1. Customer lihat invoice di portal
2. Click "Bayar"
3. Pilih payment method dari gateway aktif
4. Redirect ke payment gateway
5. Customer input data pembayaran
6. Gateway proses pembayaran
7. Success/Failure notification
8. Aplikasi terima webhook dari gateway
9. Verify payment amount & signature
10. Mark invoice as PAID (jika success)
11. Send WhatsApp confirmation
12. Customer notif pembayaran berhasil
```

---

### 3. Payment Verification

**Verification Process:**
```javascript
function verifyPayment(invoice, payment) {
  // 1. Check nominal cocok
  if (payment.amount !== invoice.amount) {
    return false;
  }
  
  // 2. Check signature (tergantung gateway)
  const signature = crypto.createHmac('sha256', secretKey)
    .update(payment.order_id + payment.amount)
    .digest('hex');
  if (signature !== payment.signature) {
    return false;
  }
  
  // 3. Check status (sudah dibayar di gateway)
  if (payment.status !== 'success' && payment.status !== 'paid') {
    return false;
  }
  
  // 4. Check duplikasi (jangan bayar 2x)
  const existing = findPaymentByExternalId(payment.gateway_id);
  if (existing) {
    return false;
  }
  
  return true;
}
```

---

### 4. Webhook Handling

**Generic Webhook:**
```
Endpoint: POST /api/webhook/v1/payment-notif
Header: Authorization: Bearer MY_WEBHOOK_SECRET

Fitur:
- ✅ Accept webhook dari bank/e-wallet apapun
- ✅ Parse notifikasi pembayaran
- ✅ Match nominal dengan invoice/voucher
- ✅ Auto-mark paid jika cocok
- ✅ Log semua webhook (audit trail)
- ✅ Manual review & cleanup di admin
```

**Webhook Log:**
```javascript
{
  id: number,
  service: string,           // "bank_abc", "ewallet_xyz"
  content: string,          // Raw webhook content
  parsed_amount: number,    // Parsed dari notifikasi
  parsed_ok: boolean,       // Berhasil di-parse?
  matched_invoice: number,  // Invoice ID yang matched
  matched_voucher: number,  // Voucher ID yang matched
  ip: string,              // Source IP
  user_agent: string,
  created_at: datetime,
  status: 'pending'|'processed'|'error'
}
```

---

### 5. Payment Report

**Fitur:**
```
- ✅ Daily transaction report
- ✅ Gateway settlement report
- ✅ Payment method breakdown
- ✅ Failed payment report
- ✅ Refund tracking
- ✅ Revenue trending
```

---

## 🗺️ FITUR GIS & MAPPING

### 1. Peta Admin (`/admin/map`)

**Fitur Dasar:**
```
- ✅ Leaflet map dengan OpenStreetMap
- ✅ Hybrid view (satellite + road)
- ✅ Zoom in/out
- ✅ Locate kantor (center point dari office_lat/office_lng)
```

**Marker & Layer:**
```
1. Customer Marker
   - Merah: offline/suspended
   - Hijau: online
   - Biru: pending
   - Click → popup detail customer
   
2. ODP Marker
   - Orange icon
   - Click → ODP info & available ports
   
3. Cable Path (Polyline)
   - Garis dari customer ke ODP
   - Bisa edit/draw manually
   - Simpan rute untuk setiap customer
```

**Popup Info:**
```
Customer Popup:
- Name, phone, email
- Paket, status, speed
- IP address (PPPoE/hotspot)
- Unpaid invoices count
- Traffic graph (PPPoE real-time)
- Action buttons: isolir, edit, view detail

ODP Popup:
- ODP name
- Available ports
- Customers connected
- Port status summary
```

**Interactive Fitur:**
```
- ✅ Draw cable path (customer to ODP)
- ✅ Save cable route
- ✅ Edit customer location (via location picker)
- ✅ Bulk action dari peta (select multiple customers)
- ✅ Real-time PPPoE traffic graph
```

---

### 2. Peta Teknisi (`/tech/map`)

**Fitur:**
```
- ✅ Sama seperti admin map (read-only untuk tech)
- ✅ View customer & ODP locations
- ✅ Click customer → show WhatsApp chat button
- ✅ Open route di Google Maps
- ✅ GPS tracking teknisi (optional)
- ✅ Nearby customers (dalam radius tertentu)
```

**Tech GPS Tracking:**
```
Setting:
- Aktifkan attendance_geofencing di settings
- Radius perimeter kantor (attendance_radius meter)

Fitur:
- Tech login di mobile portal
- Sistem track GPS lokasi tech
- Visualisasi di peta
- Geofence alert (keluar/masuk area)
```

---

### 3. Location Picker (Form Customer)

**Fitur:**
```
- ✅ Modal dengan peta satellite view
- ✅ Click di peta → set customer location
- ✅ Drag marker untuk adjust posisi
- ✅ Coordinate display (lat/lng)
- ✅ Address lookup (reverse geocoding jika ada)
- ✅ Done → save ke form
```

---

### 4. Cable Path Management

**Data:**
```javascript
{
  customer_id: number,
  olt_id: number,
  odp_id: number,
  
  // Polyline coordinates
  path: [                    // Array of [lat, lng]
    [-6.2521, 107.9205],
    [-6.2522, 107.9206],
    [-6.2523, 107.9207]
  ],
  
  length_km: number,        // Calculated distance
  description: string,      // Cable detail (aerial/underground, etc)
  
  created_at: datetime,
  updated_at: datetime
}
```

**Operasi:**
```
- ✅ Draw path (click-click di peta)
- ✅ Edit existing path
- ✅ Delete path
- ✅ Calculate distance automatically
- ✅ Save to database
```

---

## 💬 FITUR WHATSAPP & TELEGRAM

### 1. WhatsApp Integration (Baileys)

**Setup:**
```
Setting di settings.json:
{
  "whatsapp_enabled": true,
  "whatsapp_auth_folder": "auth_info_baileys",
  "whatsapp_admin_numbers": ["081947215703", "087820851413"],
  "company_phone": "6287820851413"
}
```

**Authentication:**
```
1. Admin login ke /admin/whatsapp
2. Sistem tampilkan QR code
3. Scan QR code dengan WhatsApp app
4. Verifikasi di WhatsApp
5. Bot siap mengirim pesan
```

---

### 2. WhatsApp Features

**Incoming Message Handler:**
```
Admin/authorized nomor bisa kirim command:

1. BILLING
   - List unpaid invoices
   - Customer status
   - Payment info
   
2. MIKROTIK
   - Active users
   - Session info
   - Bandwidth status
   
3. PULSA (Digiflazz)
   - Check balance
   - Buy pulsa
   - Transaction status
   
4. TOPUP AGENT
   - Top-up saldo agent
   - Check agent balance
```

**Incoming Command Examples:**
```
From admin:
"billing" → Kirim laporan billing hari ini

"pppoe" → List active PPPoE sessions

"balance" → Cek saldo Digiflazz

"topup 1000000" → Top-up agen Rp 1jt

"saldo" → Cek saldo agent
```

---

### 3. WhatsApp Automated Messages

**Invoice Notification:**
```
When:
- Invoice created (otomatis kirim ke customer)
- Invoice paid (kirim konfirmasi)
- Invoice due (reminder H-1 isolir)

Content:
"Tagihan Internet RTRWnet
Periode: Agustus 2026
Nominal: Rp 350.000
Due: 10 Agustus 2026

Bayar di: [link portal]

Isolir jika belum bayar: 10 Agustus 2026"
```

**Payment Confirmation:**
```
When: Invoice marked as paid

Content:
"✅ Pembayaran Anda diterima!

Tagihan: Rp 350.000
Tanggal: 05 Agustus 2026
Status: LUNAS

Terima kasih atas pembayaran Anda.
Layanan Anda tetap aktif.

- RTRWnet Admin"
```

**Isolir Notice:**
```
When: Isolir automatic atau manual

Content:
"⚠️ PEMBERITAHUAN ISOLIR

Layanan internet Anda telah diputus
Alasan: Tagihan belum dibayar

Tagihan: Rp 350.000
Due date: 10 Agustus 2026

Hubungi: [support number]

Buka isolir setelah pembayaran"
```

---

### 4. WhatsApp Broadcast

**Fitur:**
```
- ✅ Select customer list
- ✅ Create message (dengan template variable)
- ✅ Schedule send time
- ✅ Set delay antar message (untuk hindari spam)
- ✅ View delivery status
- ✅ Pause/resume/stop broadcast
- ✅ Retry failed messages
```

**Broadcast Example:**
```
Template:
"Halo {{customer_name}},
Tagihan internet bulan ini sudah siap.
Nominal: {{amount_idr}}
Bayar di: {{payment_link}}"

Broadcast:
1. Select customers: Area Bekasi (200 customer)
2. Template: "Tagihan Bulanan"
3. Schedule: 09:00 (9 pagi)
4. Delay: 3 detik antar pesan
5. Total: 200 pesan dalam 10 menit
6. Status: Sent 198, Failed 2, Pending 0
```

---

### 5. WhatsApp Live Chat

**Fitur (Upcoming):**
```
- ✅ Inbox untuk semua chat masuk/keluar
- ✅ Reply message dari admin panel
- ✅ Chat history per customer
- ✅ Quick reply template
- ✅ Attachment support
```

---

### 6. Telegram Integration (Optional)

**Setup:**
```json
{
  "telegram_enabled": true|false,
  "telegram_bot_token": "xxx:yyy",
  "telegram_admin_id": "123456789"
}
```

**Fitur:**
```
- ✅ Bot untuk admin (same as WhatsApp commands)
- ✅ Alert notifications
- ✅ Daily report
- ✅ System monitoring
```

---

## 📦 FITUR INVENTORY & LOGISTICS

### 1. Inventory System

**Kategori Inventory:**
```
- Perangkat ONU/CPE (stock)
- Kabel & Connector
- Power Supply
- Accessories (splitter, dll)
- Tools & Equipment
```

**Item Data:**
```javascript
{
  id: number,
  category_id: number,
  name: string,             // Product name
  sku: string,             // SKU code
  description: string,
  unit: string,            // 'pcs', 'meter', 'kg', dll
  quantity: number,        // Current stock
  minimum_qty: number,     // Alert jika stock < ini
  unit_cost: number,       // Cost per unit
  supplier: string,
  location: string,        // Lokasi di gudang
  created_at: datetime
}
```

---

### 2. Inventory Operation

**Fitur:**
```
- ✅ Add item ke inventory
- ✅ Adjust stock (add/remove)
- ✅ Stock transfer
- ✅ Low stock alert
- ✅ Item history
- ✅ Search & filter
- ✅ Export inventory list
```

**Stock Alert:**
```
When stock < minimum_qty:
- Dashboard alert
- Email notification (jika ada)
- Request PO (Purchase Order)
```

---

### 3. Asset Tracking

**Asset Assignment:**
```
Teknisi bisa assign asset ke task:
- Ticket → use ONU
- Installation → use cable x10m
- Repair → use power supply 1pc
```

**Asset History:**
```
Track item dari stock → assignment → return
- What item used
- When used
- Who used
- For what task
- Status (used/returned/lost)
```

---

## 🎫 FITUR TICKETING & SUPPORT

### 1. Ticket System

**Ticket Data:**
```javascript
{
  id: number,
  
  // Customer & Technician
  customer_id: number,
  customer_name: string,
  customer_phone: string,
  customer_email: string,
  
  technician_id: number,
  technician_name: string,
  
  // Content
  subject: string,         // Judul keluhan
  message: string,         // Deskripsi masalah
  
  // Status
  status: 'open'|'in_progress'|'resolved'|'closed',
  
  // Details
  priority: 'low'|'medium'|'high'|'urgent',
  category: string,        // 'billing', 'technical', 'general'
  
  // Attachments
  customer_photos: string, // JSON array of file paths
  customer_photo_metadata: string, // Photo GPS/timestamp
  technician_photos: string,
  technician_notes: string,
  
  // Timeline
  created_at: datetime,
  updated_at: datetime,
  resolved_at: datetime
}
```

---

### 2. Ticket Workflow

**Open (Customer):**
```
1. Customer buka portal
2. Click "Buat Tiket"
3. Input subject, deskripsi, foto (optional)
4. Submit
5. Ticket created dengan status 'open'
6. Notifikasi ke admin & teknisi via WhatsApp
```

**Assign (Admin):**
```
1. Admin lihat daftar open tickets
2. Assign ke teknisi
3. Ticket status: 'open' → tidak berubah (tunggu teknisi accept)
```

**In Progress (Technician):**
```
1. Tech buka portal
2. Lihat pool tickets (assigned to tech)
3. Click "Ambil Tiket" (take ticket)
4. Ticket status: 'open' → 'in_progress'
5. Tech bisa input notes & foto
6. Status update ke customer via WhatsApp
```

**Resolve (Technician):**
```
1. Tech selesaikan pekerjaan
2. Input resolution notes
3. Upload foto (before/after)
4. Click "Selesai"
5. Ticket status: 'in_progress' → 'resolved'
6. Notifikasi ke customer
```

**Close (Customer/Admin):**
```
1. Customer lihat resolved ticket
2. Click "Tutup Tiket" (jika puas)
3. Ticket status: 'resolved' → 'closed'
4. Customer optional bisa rate 1-5
5. Feedback saved untuk quality control
```

---

### 3. Ticket Features

**Admin Panel:**
```
- ✅ Dashboard tickets (open, in_progress, resolved, closed)
- ✅ Assign tickets ke technician
- ✅ Reassign jika perlu
- ✅ View ticket history
- ✅ Add internal notes
- ✅ Override status
- ✅ Filter by status/category/tech
- ✅ Ticket aging report
- ✅ SLA tracking
```

**Tech Portal:**
```
- ✅ Pool tiket (tickets assigned to me)
- ✅ View ticket detail
- ✅ Take ticket
- ✅ Upload photos
- ✅ Add resolution notes
- ✅ Mark resolved
- ✅ View ticket history
```

**Customer Portal:**
```
- ✅ Create ticket
- ✅ View my tickets
- ✅ View ticket status
- ✅ Add comment/photo
- ✅ Mark resolved (jika tech bilang done)
- ✅ Rate satisfaction
- ✅ View ticket history
```

---

## 👔 FITUR AGENT & SALES

### 1. Agent Management

**Agent Data:**
```javascript
{
  id: number,
  username: string,         // Login username
  password_hash: string,   // Hashed password
  name: string,            // Agent name
  phone: string,
  email: string,
  area: string,            // Area operasi
  status: 'active'|'inactive',
  
  // Financial
  balance: number,         // Saldo agent (Rp)
  commission_percent: number, // Komisi %
  
  // Reference
  id_number: string,       // KTP/ID number
  bank_account: string,
  bank_name: string,
  
  created_at: datetime
}
```

---

### 2. Agent Portal

**Fitur:**
```
Dashboard:
- ✅ Total balance
- ✅ Today's transaction
- ✅ Commission earned
- ✅ Top customers

Pembayaran:
- ✅ Cari customer by name/phone
- ✅ Lihat unpaid invoices
- ✅ Pilih invoice → bayar dari saldo agent
- ✅ Print struk pembayaran
- ✅ Kirim struk ke customer (WhatsApp/Email)

Voucher:
- ✅ Lihat inventory voucher
- ✅ Pilih voucher untuk dijual
- ✅ Customer bayar → agent terima stok
- ✅ Print voucher code
- ✅ Track voucher sale

Digiflazz:
- ✅ Browse produk (pulsa, data, dll)
- ✅ Category → Brand → Nominal flow
- ✅ Buy produk (debit saldo agent)
- ✅ Manual input customer nomor
- ✅ Delivery otomatis
- ✅ Webhook status update
```

---

### 3. Admin Agent Management

**Fitur:**
```
- ✅ Add agent (create account)
- ✅ Edit agent (name, area, commission)
- ✅ Deactivate agent
- ✅ Top-up agent balance (from admin)
- ✅ View agent transaction history
- ✅ Set special price per agent
- ✅ View agent commission report
- ✅ Agent performance dashboard
```

**Top-up Agent:**
```
Admin:
1. Open agent list
2. Click "Top-up" pada agent
3. Input amount (Rp 1.000.000)
4. Mark as "top-up" in cash_in table
5. Agent balance += amount
6. Notifikasi ke agent via WhatsApp
```

---

### 4. Special Price Management

**Fitur:**
```
Admin bisa set special price per agent:

Paket A: Normal price Rp 350.000
- Agent A commission: Rp 30.000 (jadi agent harus charge min 350k)
- Agent B commission: Rp 50.000 (better agent)

atau

Special pricing:
- Agent A harga khusus: Rp 320.000/bulan
- Agent A komisi: Rp 20.000
- Total untuk agent: Rp 340.000
```

---

### 5. Digiflazz Integration

**Setup:**
```json
{
  "digiflazz_username": "your_account",
  "digiflazz_api_key": "api_key_xxx",
  "digiflazz_webhook_secret": "webhook_secret",
  "digiflazz_markup": 0    // Markup % (0-100)
}
```

**Flow:**
```
1. Agent login → menu "Beli Produk"
2. Pilih kategori (Pulsa, Data, dll)
3. Pilih brand (Telkomsel, Indosat, dll)
4. Pilih nominal (Rp 5rb, 10rb, dll)
5. Input customer nomor
6. Confirm & bayar
7. Sistem kirim ke Digiflazz API
8. Produk dikirim otomatis
9. Webhook notif status
10. Status di-update di aplikasi
11. Agent terima notif
```

**Product Display:**
```
[Telkomsel] [Indosat] [XL] [3] [Smartfren]
   ↓
[Rp 5rb] [Rp 10rb] [Rp 20rb] [Rp 50rb] [Rp 100rb]
   ↓
Input nomor → Konfirm → Proses
```

---

## 📊 FITUR MONITORING & HEALTH

### 1. System Monitoring

**Metrics:**
```
Real-time:
- CPU Usage (%)
- Memory Usage (%)
- Disk Usage (%)
- Process uptime
- Load average

Database:
- Connection status
- Table count
- Database size
- WAL status

Services:
- MikroTik connectivity
- GenieACS connectivity
- Payment gateway status
- WhatsApp connection status
- OLT SNMP status
```

---

### 2. Monitoring Dashboard

**Views:**
```
Admin Portal (/admin/monitoring):
- System metrics card
- Graph history (CPU, RAM, Disk)
- Service status indicators
- Alert log

Tech Portal (/tech/monitoring):
- Same as admin (read-only)
```

---

### 3. Health Check Endpoint

**Endpoint:**
```
GET /health

Response:
{
  "status": "healthy",
  "timestamp": "2026-08-14T10:30:00Z",
  "services": {
    "database": "ok",
    "mikrotik": "ok",
    "payment_gateway": "ok",
    "whatsapp": "connected"
  }
}
```

---

### 4. Alert System

**Alert Types:**
```
- ✅ High CPU (> 80%)
- ✅ Low disk space (< 10%)
- ✅ Memory warning (> 85%)
- ✅ Service disconnected
- ✅ Failed backup
- ✅ Unpaid invoices threshold
```

**Alert Delivery:**
```
- Dashboard alert badge
- Email notification
- WhatsApp notification (admin)
- Telegram notification (jika aktif)
```

---

## ⚙️ FITUR AUTOMATION & CRON

### 1. Cron Jobs Schedule

**1. Auto Invoice Generation**
```
Schedule: 1 Jan, Feb, Mar, ... Dec @ 00:01
Action: Generate monthly invoices untuk semua customer
Config: Automatic di app startup
Detail:
- Hitung promo price / regular price
- Hitung prorata jika bulan pertama
- Hitung tax/PPN jika applicable
- Create invoice record
- Notify customer via WhatsApp
```

**2. Auto Isolir**
```
Schedule: Every day @ 02:00
Action: Isolir customers yang lewat due date
Config: Otomatis
Detail:
- Cek semua customer dengan status 'active'
- Cek auto_isolate flag = true
- Cek tanggal hari ini >= isolate_day
- Cek ada unpaid invoices
- Suspend ke MikroTik (PPPoE/hotspot)
- Notif customer via WhatsApp
```

**3. WhatsApp Reminder**
```
Schedule: Every day @ 09:00
Action: Send billing reminder (H-1 isolir)
Config: Enable whatsapp_auto_billing_enabled = true
Detail:
- Cek customers yg isolir besok
- Send reminder message
- Template: tagihan amount, due date, payment link
- Delay 3-5 detik antar pesan (hindari spam)
```

**4. Night Mode Switch (Jam Kalong)**
```
Schedule: 00:00 (midnight) & 06:00 (pagi)
Action: Ganti PPPoE profile malam/siang
Config: Per paket, if use_night_mode = true
Detail:
- 00:00: Switch ke night_profile (contoh: 20Mbps)
- 06:00: Switch ke day_profile (contoh: 10Mbps)
- Custom time possible
```

**5. FUP Check (Fair Usage Policy)**
```
Schedule: Every hour @ 00 (00:00, 01:00, 02:00, ...)
Action: Check monthly data usage vs FUP limit
Config: Per paket, if use_fup = true
Detail:
- Cek total data used bulan ini
- Jika > fup_limit_gb: switch ke fup_profile
- Profile FUP usually slower (contoh: 1Mbps)
- Revert ke normal profile next month (1 Jan)
```

**6. Usage Sync**
```
Schedule: Every 10 minutes
Action: Sync PPPoE traffic dari MikroTik
Config: Enable usage_tracking_enabled = true
Detail:
- Query sesi PPPoE aktif dari MikroTik
- Aggregate bytes_in/out
- Store di customer_usage table
- Accumulate untuk FUP checking
```

**7. Backup Database**
```
Schedule: Daily @ 02:00 (configurable)
Action: Backup database billing.db
Config: Enable auto_backup_enabled = true
Detail:
- Copy database/billing.db → backups/
- Timestamp: billing-YYYYMMDD-HHMMSS.db
- Keep latest N backups (retention_days)
- Delete old backup automatically
```

---

### 2. Manual Trigger

**Admin bisa manual trigger:**
```
/admin/billing/generate-invoices  → Generate now
/admin/isolate-customers          → Run isolir check
/admin/whatsapp/send-reminder     → Send broadcast
/admin/backup/create              → Backup now
```

---

## 👨‍💼 FITUR INTERNAL USER MANAGEMENT

### 1. User Roles

**Role Hierarchy:**
```
1. Super Admin (Tertinggi)
   - Full access semua fitur
   - User management
   - Settings & configuration
   - Audit trail access
   
2. Admin
   - Customer management
   - Billing & payment
   - MikroTik & device management
   - WhatsApp administration
   - Limited setting access
   
3. Kasir (Cashier)
   - Payment recording only
   - Invoice marking (paid/unpaid)
   - Report viewing (finance)
   
4. Teknisi (Technician)
   - Ticket management
   - Device configuration
   - Customer support
   - Map & location
   - No payment/billing access
   
5. Kolektor (Collector)
   - View customer billing
   - Create payment requests
   - No payment mark (approval flow)
   
6. Agent/Agen (Sales)
   - Pembayaran dari saldo agent
   - Voucher sales
   - Pulsa/data sales
   - No admin/config access
```

---

### 2. User Data

**User Record:**
```javascript
{
  id: number,
  username: string,
  password_hash: string,
  role: 'superadmin'|'admin'|'kasir'|'tech'|'collector'|'agent',
  name: string,
  email: string,
  phone: string,
  area: string,                // For tech/collector scope
  is_active: boolean,
  created_at: datetime,
  last_login: datetime
}
```

---

### 3. Access Control

**Portal Restrictions:**
```
Superadmin:
- /admin (all features)
- /finance (all features)
- /settings (system settings)
- /audit-trail

Admin:
- /admin (except system settings)
- /finance (reports only)
- /settings (limited)

Kasir:
- /admin/invoices
- /admin/payments
- /finance (read-only)

Teknisi:
- /tech (all features)
- /admin/tickets (read-write)

Kolektor:
- /collector (all features)

Agent:
- /agent (all features)

Pelanggan:
- /customer (self-service)
```

---

### 4. Audit Trail

**Logged Actions:**
```
Sensitive actions logged:
- User login/logout
- Invoice mark as paid
- Customer isolir/unisolir
- Payment manual input
- SSID/password change
- Settings modification
- Backup creation
- User creation/modification
- Bulk operations
```

**Audit Record:**
```javascript
{
  id: number,
  user_id: number,
  user_role: string,
  action: string,           // 'invoice_paid', 'customer_isolir', dll
  resource_type: string,    // 'invoice', 'customer', 'device'
  resource_id: number,
  changes: object,          // Before/after data
  timestamp: datetime,
  ip_address: string,
  status: 'success'|'fail'
}
```

---

## 📱 FITUR MULTI-LANGUAGE (i18n)

**Supported Languages:**
```
- English (en)
- Indonesian (id)
```

**Implementation:**
```
config/i18n.js:
- Load translation files from locales/
- locales/en.json
- locales/id.json

Usage:
- Query parameter: ?lang=id
- Route: /lang/id (set session)
- Session key: req.session.lang
- Template helper: res.locals.t('key', 'fallback')
```

**EJS Usage:**
```ejs
<!-- In template -->
<h1><%= t('welcome_message') %></h1>
<button><%= t('pay_invoice') %></button>

<!-- Result dengan lang=id -->
<h1>Selamat Datang</h1>
<button>Bayar Tagihan</button>
```

---

## 🔧 TECHNOLOGY STACK DETAIL

### Backend
```
- Express.js 4.18.2
- Node.js runtime
- Better-sqlite3 (database)
- node-cron (scheduling)
```

### Frontend
```
- EJS template engine
- Bootstrap 5.x
- Bootstrap Icons
- Leaflet (mapping)
- Chart.js / D3 (charts)
- jQuery (minimal)
```

### Integration
```
- routeros-client (MikroTik API)
- net-snmp (OLT management)
- axios (HTTP requests)
- Baileys (WhatsApp unofficial)
- node-telegram-bot-api (Telegram)
- Various payment gateway SDKs
```

### Security
```
- Session management (express-session)
- Password hashing (crypto)
- CSRF protection (basic via Referer)
- Rate limiting (express-rate-limit)
```

### Utilities
```
- pino (logging)
- winston (application logging)
- jimp (image processing)
- qrcode (QR generation)
- xlsx (spreadsheet import)
- pdfkit (PDF generation)
```

---

## 📋 SUMMARY

Aplikasi RTRWNET Billing & Management System adalah sistem ISP yang **comprehensive** dengan fitur-fitur lengkap untuk:

✅ Billing & Invoice management  
✅ Customer lifecycle management  
✅ Network equipment management (MikroTik, OLT, GenieACS)  
✅ Payment processing (multiple gateways)  
✅ Field support & ticketing  
✅ Sales & agent management  
✅ Mapping & GIS visualization  
✅ Automation & scheduled tasks  
✅ Monitoring & health checks  
✅ Multi-user portal & access control  

Sistem ini **sudah production-ready** untuk ISP/RTRW yang ingin manage billing, network, dan customer dalam satu platform terpadu.

---

**Dokumentasi ini comprehensive & siap untuk:**
- On-boarding tim baru
- Training & knowledge transfer
- Development reference
- Feature planning
- Troubleshooting guide

Untuk detail lebih lanjut per fitur, lihat file-file:
- AUDIT_LENGKAP.md (technical deep dive)
- DATABASE_SCHEMA.md (data structure)
- QUICK_REFERENCE.md (quick commands)


---

## 🛠️ PANDUAN PEMECAHAN MASALAH & SOLUSI KENDALA SISTEM (TROUBLESHOOTING GUIDE)

Bagian ini menyajikan panduan diagnosis teknis lengkap untuk menyelesaikan setiap kendala operasional yang mungkin dihadapi oleh Administrator, Teknisi Lapangan, maupun Pelanggan RTRW-Net.

---

### 1. KENDALA BILLING, ISOLIR, & INVOICING

#### A. Pelanggan Sudah Terisolir (Status Suspended) tapi Masih Bisa Browsing / Internetan
* **Penyebab Utama:**
  1. **Sesi PPPoE Aktif Belum Di-Kick:** Ketika status billing diubah ke isolir, koneksi PPPoE aktif di MikroTik masih memegang IP lama sebelum rule isolir diterapkan.
  2. **Posisi NAT Rule Isolir Salah:** Rule DST-NAT isolir berada di bawah rule masquerade umum atau rule bypass lainnya.
  3. **DNS Bypass:** Pelanggan menggunakan DNS manual (misal Google DNS 8.8.8.8, Cloudflare 1.1.1.1, atau DoH pada browser) dan port 53 UDP/TCP belum di-redirect / di-drop oleh MikroTik.
  4. **Flag Auto-Isolir Nonaktif:** Field `auto_isolate` bernilai `0` pada data pelanggan di database.
* **Langkah Solusi Konkret:**
  1. Putus (kick) sesi aktif pelanggan via Bot WhatsApp/Telegram: ketik `kickuser <username_pppoe>` atau via Winbox: `/interface pppoe-server remove [find user="<username>"]`.
  2. Pindahkan NAT rule isolir ke baris paling atas di Winbox:
     ```routeros
     /ip firewall nat add chain=dstnat protocol=tcp dst-port=80,443 src-address-list=ISOLIR action=redirect to-ports=80 place-before=0
     /ip firewall nat add chain=dstnat protocol=udp dst-port=53 src-address-list=ISOLIR action=redirect to-ports=53 place-before=0
     ```
  3. Pastikan landing page isolir aktif di web billing: `http://<IP_SERVER>:3001/isolated`.
  4. Pastikan di database billing pelanggan memiliki status `auto_isolate = 1`.

#### B. Pelanggan Sudah Bayar / Lunas tapi Internet Masih Terisolir
* **Penyebab Utama:**
  1. IP pelanggan masih tersangkut di `/ip firewall address-list` dengan nama list `ISOLIR`.
  2. Profile PPPoE di `/ppp secret` belum dikembalikan dari profile isolir ke profile paket semula.
  3. Pelanggan belum melakukan restart modem / dial-up ulang.
* **Langkah Solusi Konkret:**
  1. **Via Web Billing:** Buka data pelanggan -> Klik tombol "Buka Isolir". Sistem akan memanggil `activateCustomer(id)` yang secara otomatis mengembalikan profile PPPoE ke paket aslinya dan men-kick sesi aktif agar router memberikan IP normal.
  2. **Via Bot WhatsApp / Telegram:** Ketik perintah `buka <nama/id_pelanggan>`.
  3. **Via Winbox Manual (Darurat):**
     ```routeros
     /ip firewall address-list remove [find address="<IP_PELANGGAN>"]
     /ppp secret set [find name="<USER_PPPOE>"] profile="<NAMA_PAKET>"
     /interface pppoe-server remove [find user="<USER_PPPOE>"]
     ```

#### C. Invoice Tagihan Bulanan Tidak Terbit Otomatis di Awal Bulan
* **Penyebab Utama:**
  1. Service PM2 `billing` sempat mati atau server restart saat jam eksekusi cron job (biasanya jam 00:05 tanggal 1).
  2. Pelanggan baru belum memiliki data billing date atau berstatus nonaktif saat cron berjalan.
* **Langkah Solusi Konkret:**
  1. **Via Web Admin:** Masuk ke menu `Billing & Invoice` -> Klik tombol "Generate Tagihan Periode Ini".
  2. **Via Bot WhatsApp / Telegram:** Ketik `generate <bulan> <tahun>`, misal: `generate 11 2026`. Sistem akan otomatis menerbitkan invoice baru untuk pelanggan aktif tanpa menggandakan invoice yang sudah ada.
  3. Periksa status cron di log: `pm2 logs billing --lines 50`.

#### D. Denda Keterlambatan (Late Fee) Tidak Terhitung
* **Penyebab Utama:** Fitur denda belum diaktifkan di konfigurasi atau jatuh tempo belum lewat.
* **Langkah Solusi Konkret:**
  1. Masuk ke Web Admin -> Pengaturan (Settings) -> Tagihan & Pembayaran.
  2. Aktifkan opsi "Terapkan Denda Telat" (`late_fee_enabled: true`).
  3. Atur nominal denda (misal Rp 5.000 atau Rp 10.000). Denda akan ditambahkan otomatis ke tagihan saat jatuh tempo terlewati.

---

### 2. KENDALA MIKROTIK & JARINGAN

#### A. Error: "Tidak bisa konek ke MikroTik port 8728/8729/8711" (API Timeout)
* **Penyebab Utama:**
  1. Service API MikroTik (`api` / `api-ssl`) dalam keadaan disable di RouterOS.
  2. Port API diubah dari default atau port tidak cocok dengan yang diisi di web billing.
  3. Firewall MikroTik memblokir input port API dari IP server billing.
  4. Routing antara server billing dan MikroTik terputus (tunnel VPN down atau IP gateway berubah).
* **Langkah Solusi Konkret:**
  1. Buka terminal MikroTik via Winbox / SSH:
     ```routeros
     /ip service enable api
     /ip service set api port=8728
     ```
     Jika menggunakan koneksi SSL:
     ```routeros
     /ip service enable api-ssl
     /ip service set api-ssl port=8729
     ```
  2. Tambahkan rule firewall allow API di baris teratas:
     ```routeros
     /ip firewall filter add chain=input protocol=tcp dst-port=8728 action=accept place-before=0 comment="Allow Billing API"
     ```
  3. Buka Web Admin -> Menu Routers: Pastikan Host (IP), Port, Username, dan Password sama persis dengan yang bisa login di Winbox. Disarankan membuat user khusus di MikroTik:
     ```routeros
     /user group add name=billing-api policy=api,read,write,test
     /user add name=billinguser group=billing-api password="passwordkuat123"
     ```

#### B. Secret PPPoE Hilang / Tidak Sinkron Antara Web Billing dan MikroTik
* **Penyebab Utama:** Secret terhapus manual langsung di Winbox, atau terjadi restore backup MikroTik lama.
* **Langkah Solusi Konkret:**
  1. Buka Web Admin -> Routers -> Klik "Sync Secrets" atau "Import Secrets".
  2. Atau buka menu Data Pelanggan, klik "Edit Pelanggan", lalu klik "Simpan" tanpa mengubah data. Sistem akan mem-push ulang secret ke MikroTik secara otomatis.

#### C. Voucher Hotspot Tidak Bisa Login / "User not found" / "Invalid username or password"
* **Penyebab Utama:**
  1. Server Hotspot MikroTik menggunakan profile dengan setting Cookie atau MAC Auth yang konflik dengan perangkat baru.
  2. User hotspot belum ter-push ke router yang aktif (pada mode Multi-Router).
* **Langkah Solusi Konkret:**
  1. Cek di Winbox: `/ip hotspot user print where name="<KODE_VOUCHER>"`.
  2. Jika user belum ada: Buat voucher ulang via Web Admin -> Hotspot Voucher -> Generate, atau via bot: `vcr <paket> <jumlah>`.
  3. Pastikan profile server hotspot mengizinkan HTTP CHAP dan HTTP PAP.

---

### 3. KENDALA GENIEACS & MODEM ONU (TR-069)

#### A. Modem ONU Pelanggan Tidak Muncul di Daftar GenieACS
* **Penyebab Utama:**
  1. Konfigurasi CWMP / TR-069 di web modem pelanggan (192.168.1.1) belum diisi atau dinonaktifkan.
  2. URL ACS salah atau port 7547 di server billing terblokir firewall UFW.
  3. Modem tidak memiliki rute jaringan ke IP server GenieACS (misal VLAN TR-069 belum dibinding di OLT/MikroTik).
* **Langkah Solusi Konkret:**
  1. Buka web manajemen modem (192.168.1.1):
     - Masuk ke menu `Network` / `Application` -> `CWMP` / `TR-069`.
     - Enable CWMP: **Centang (Aktif)**.
     - ACS URL: `http://<IP_SERVER_BILLING>:7547/`
     - Periodic Inform: **Enable**, Interval: `300` detik (5 menit).
     - Username & Password ACS: Sesuaikan dengan konfigurasi GenieACS.
     - Connection Request Username & Password: Buat standar (misal: `admin`/`admin`).
  2. Di server Linux: Jalankan perintah `sudo ufw allow 7547/tcp`.
  3. Pastikan tag pelanggan di Web Billing sama persis dengan Serial Number / OUI modem di GenieACS.

#### B. Redaman Optik (Optical Power RX) Jelek (> -25 dBm) atau Status LOS (Lampu Merah Berkedip)
* **Kategori Standar Redaman Optik (Wavelength 1490nm):**
  - **-15 dBm s/d -22 dBm:** SANGAT BAIK / IDEAL (Koneksi stabil, throughput maksimal).
  - **-23 dBm s/d -25 dBm:** CUKUP / AMBANG BATAS (Masih jalan normal, pantau berkala).
  - **-26 dBm s/d -28 dBm:** BURUK (Mulai terjadi packet loss, latency tinggi, throughput drop saat jam sibuk).
  - **> -28 dBm s/d -32 dBm:** KRITIS (Sering putus nyambung / dial PPPoE gagal).
  - **LOS (Lampu Merah Menyala / RX < -35 dBm):** PUTUS TOTAL (Sinyal optik tidak sampai ke modem).
* **Langkah Solusi Konkret:**
  1. Cek redaman live via Bot WA/Telegram: ketik `info <nama_pelanggan>` atau `/redaman <tag>`.
  2. **Jika Redaman -25 dBm s/d -28 dBm:**
     - Bersihkan ujung konektor SC/UPC (biru) atau SC/APC (hijau) pada patchcord dengan alkohol isopropil.
     - Periksa kabel dropcore dari lekukan tajam (macro bending) di dekat roset atau proteksi tiang.
  3. **Jika LOS (Lampu Merah):**
     - Kirim teknisi dengan membawa OPM (Optical Power Meter) & VFL (Laser Merah).
     - Ukur redaman langsung di output ODP. Jika di ODP bagus (-18 dBm) tapi di rumah pelanggan LOS, berarti kabel dropcore putus/terjepit di tiang. Lakukan splicing ulang atau penarikan kabel baru.

#### C. Gagal Ganti SSID atau Kata Sandi WiFi via Web / Bot
* **Penyebab Utama:** Modem sedang offline (mati lampu / kabel optik tercabut), atau modem lambat merespon antrean task TR-069.
* **Langkah Solusi Konkret:**
  1. Pastikan modem online (lampu PON hijau stabil, last inform < 5 menit).
  2. Kirim perintah reboot terlebih dahulu: via bot ketik `reboot <nama_pelanggan>`.
  3. Setelah modem booting selesai (sekitar 1-2 menit), ulangi perintah ganti sandi / SSID via bot atau web portal.

---

### 4. KENDALA OLT & PORT PON (SNMP)

#### A. Status OLT Offline di Web Billing
* **Penyebab Utama:** Community SNMP tidak cocok, port 161 UDP tertutup, atau IP OLT tidak dapat di-ping.
* **Langkah Solusi Konkret:**
  1. Di server billing, tes koneksi SNMP:
     `snmpwalk -v2c -c public <IP_OLT> 1.3.6.1.2.1.1.1`
  2. Jika timeout: Cek konfigurasi SNMP di OLT (pastikan SNMP Agent aktif, community string sama, dan host server diizinkan).
  3. Pastikan firewall tidak memblokir port UDP 161.

#### B. Unconfigured ONU Tidak Terdeteksi di Halaman OLT
* **Penyebab Utama:** OLT memerlukan waktu hingga 60-120 detik untuk scanning port PON setelah ONU baru tercolok.
* **Langkah Solusi Konkret:** Tunggu 1-2 menit lalu klik tombol "Refresh Discovery". Pastikan jenis OLT (HIOSO, VSOL, ZTE, atau BDCOM) dipilih sesuai tipe hardware di menu Konfigurasi OLT.

---

### 5. KENDALA PAYMENT GATEWAY & WEBHOOK CALLBACK

#### A. Pelanggan Sudah Bayar via QRIS / Transfer tapi Tagihan Tetap "Unpaid"
* **Penyebab Utama:**
  1. URL Webhook Callback belum didaftarkan di dashboard merchant payment gateway (Tripay/Midtrans/Xendit/Duitku).
  2. URL Webhook menggunakan HTTP biasa (bukan HTTPS). Sebagian besar payment gateway menolak callback ke non-HTTPS.
  3. Merchant Code, API Key, atau Private Key salah sehingga verifikasi hash/signature callback gagal.
  4. Server billing berada di balik Cloudflare dan IP callback gateway terblokir oleh Challenge/WAF Cloudflare.
* **Langkah Solusi Konkret:**
  1. Masuk ke dashboard merchant payment gateway Anda, daftarkan URL Callback resmi:
     - **Tripay:** `https://domain-anda.com/api/payment/tripay/callback`
     - **Midtrans:** `https://domain-anda.com/api/payment/midtrans/callback`
     - **Xendit:** `https://domain-anda.com/api/payment/xendit/callback`
     - **Duitku:** `https://domain-anda.com/api/payment/duitku/callback`
  2. Pastikan file `settings.json` memiliki `app_url` dengan awalan `https://`.
  3. **Tindakan Darurat Admin:** Jika pelanggan sudah menunjukkan bukti transfer sah dari bank, admin dapat langsung melunasi tagihan secara manual via bot: ketik `lunas <ID_INVOICE>` atau via web portal klik "Tandai Lunas". Sistem akan langsung mengaktifkan pelanggan seketika.

#### B. Notifikasi Mutasi Otomatis (MacroDroid / SMS Banking) Tidak Masuk
* **Penyebab Utama:** Aplikasi MacroDroid di smartphone penampung mutasi terhenti oleh manajemen daya Android (battery saver), atau izin membaca SMS dicabut.
* **Langkah Solusi Konkret:**
  1. Buka pengaturan HP: Nonaktifkan optimasi baterai (Don't optimize / Unrestricted) untuk MacroDroid.
  2. Aktifkan fitur "Autostart" dan kunci aplikasi MacroDroid di recent apps.
  3. Tes kirim HTTP POST webhook dari browser/Postman ke endpoint `/api/callback/mutasi` untuk memastikan server merespon `200 OK`.

---

### 6. KENDALA WHATSAPP GATEWAY (BAILEYS)

#### A. Pesan "Menunggu pesan ini. Ini mungkin perlu waktu" (Waiting for this message)
* **Penyebab Utama:** Sesi enkripsi end-to-end Signal Protocol belum selesai melakukan handshake prekeys antara server bot dan WhatsApp pengirim. Hal ini lumrah terjadi jika bot baru direstart atau nomor baru pertama kali chat.
* **Langkah Solusi Konkret:**
  1. Sistem billing sudah dilengkapi `BaileysCacheStore` dan `MultiLayerMessageStore` untuk merespon retry prekey secara otomatis.
  2. Minta pengirim mengirimkan 1 pesan teks biasa lagi (misal "Halo" atau "Tes") agar kunci sesi terkunci dan pesan sebelumnya langsung terbaca.
  3. Hindari me-restart service bot berulang kali tanpa jeda.

#### B. WhatsApp Bot Sering Terputus / Logout (401 Unauthorized / Connection Closed)
* **Penyebab Utama:** Sesi WhatsApp dikeluarkan dari aplikasi HP ("Perangkat Tertaut" terputus), atau HP bot kehabisan baterai/internet mati lama.
* **Langkah Solusi Konkret:**
  1. Buka Web Admin -> WhatsApp Gateway -> Klik tombol "Reset Sesi".
  2. Buka WhatsApp di smartphone bot -> Perangkat Tertaut -> Tautkan Perangkat.
  3. Pindai ulang QR Code yang muncul di layar.
  4. Pastikan smartphone bot selalu terhubung ke Wi-Fi yang stabil dan charger terpasang.

---

### 7. KENDALA TELEGRAM BOT

#### A. Error `deleteWebHook` atau Polling 409 Conflict di Log Server
* **Penyebab Utama:** Ada dua script/proses yang berjalan bersamaan menggunakan Token Bot Telegram yang sama (misal proses dev di laptop dan proses produksi di server berjalan bersama).
* **Langkah Solusi Konkret:**
  1. Pastikan hanya ada 1 proses bot Telegram yang hidup di seluruh server/komputer.
  2. Di server: jalankan `pm2 restart billing`. Jangan jalankan `node app.js` manual di terminal lain jika PM2 sudah aktif.

#### B. Perintah Admin di Telegram Ditolak ("Akses Ditolak")
* **Penyebab Utama:** ID Telegram pengirim belum didaftarkan di pengaturan `telegram_admin_id`.
* **Langkah Solusi Konkret:**
  1. Chat bot `@userinfobot` di Telegram untuk mengetahui User ID akun Telegram Anda (contoh: `123456789`).
  2. Masuk ke Web Admin -> Pengaturan (Settings) -> Telegram Bot -> Masukkan angka User ID tersebut pada kolom `telegram_admin_id`.
  3. Klik Simpan. Bot akan langsung mengenali Anda sebagai Admin penuh.

---

### 8. KENDALA FREERADIUS SERVER

#### A. Autentikasi PPPoE / Hotspot Ditolak (Auth-Reject di Log RADIUS)
* **Penyebab Utama:** String `secret` di konfigurasi MikroTik `/radius` tidak sama dengan `secret` di file `/etc/freeradius/3.0/clients.conf` server.
* **Langkah Solusi Konkret:**
  1. Di MikroTik: jalankan `/radius print detail`, catat `secret`.
  2. Di server Linux: buka `/etc/freeradius/3.0/clients.conf`, pastikan IP router dan secret-nya cocok:
     `client mikrotik { ipaddr = 192.168.8.1; secret = passwordradius123; }`
  3. Restart FreeRADIUS: `sudo systemctl restart freeradius`.

---

### 9. KENDALA DIGIFLAZZ (PPOB & PULSA)

#### A. Transaksi Pulsa / Paket Data Gagal (Error RC 40, RC 41, atau RC 42)
* **Penyebab Utama:**
  1. **RC 40 / 41:** IP Publik server billing belum didaftarkan di Whitelist IP Digiflazz.
  2. **RC 42:** Saldo deposit Digiflazz tidak mencukupi untuk memproses pesanan.
* **Langkah Solusi Konkret:**
  1. Cek saldo Digiflazz via bot: ketik `saldodigi` (admin).
  2. Jika IP belum terdaftar: Login ke Member Area Digiflazz -> Pengaturan -> Koneksi API -> Tambahkan IP Publik server billing Anda ke Whitelist IP.
  3. Lakukan topup deposit Digiflazz melalui transfer bank tiket deposit di dashboard Digiflazz.

---

### 10. KENDALA DATABASE SQLITE & SERVER MAINTENANCE

#### A. Error `SQLITE_BUSY: database is locked`
* **Penyebab Utama:** Banyak query penulisan ke database SQLite secara serempak tanpa mode WAL.
* **Langkah Solusi Konkret:**
  1. Sistem billing ini secara default telah menyertakan pengaturan performa tinggi:
     `PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;`
  2. Jika sesekali terjadi lock karena proses berat: Restart service billing: `pm2 restart billing`.

#### B. Cara Restore Database dari File Backup Otomatis
* **Langkah Solusi Konkret:**
  1. File backup tersimpan rapi setiap hari di folder `backups/billing_backup_YYYY-MM-DD_*.sqlite`.
  2. Untuk memulihkan data:
     ```bash
     pm2 stop billing
     cp backups/billing_backup_TERAKHIR.sqlite database.sqlite
     pm2 start billing
     ```

---
