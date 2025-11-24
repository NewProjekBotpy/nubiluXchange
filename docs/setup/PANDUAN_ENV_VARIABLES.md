# 📋 Panduan Mengaktifkan Fitur Optional

Aplikasi NubiluXchange Gaming Marketplace sudah berfungsi dengan sempurna tanpa konfigurasi tambahan. Namun, untuk mengaktifkan fitur-fitur optional seperti push notifications, error tracking, dan backup otomatis, Anda perlu menambahkan environment variables berikut.

## 🔐 Cara Menambahkan Environment Variables

1. **Buat file .env**
   - Copy file `.env.example` menjadi `.env`
   - File `.env` akan diabaikan oleh Git untuk keamanan

2. **Tambahkan Environment Variables**
   - Edit file `.env` dan tambahkan key-value sesuai panduan di bawah
   - Format: `KEY=value` (tanpa spasi sebelum/sesudah =)

3. **Restart Aplikasi**
   - Setelah menambahkan environment variables, restart aplikasi agar perubahan diterapkan
   - Gunakan command: `npm run dev`

---

## 📱 Push Notifications (Web Push)

Fitur notifikasi web untuk memberitahu pengguna tentang pesan baru, transaksi, dll.

**Environment Variables yang Diperlukan:**

| Key | Value |
|-----|-------|
| `VAPID_PUBLIC_KEY` | `BP7iJcb322ZmOIRlcWNQl9d5-yeDp-xorsdVF36Qv3hWKG23ab1OeTHryh1bgJOKU6QxI58mIUO3_kTp-TxK2Gw` |
| `VAPID_PRIVATE_KEY` | `q-a_iv1W4RrKP6g65TfN75ZFPZcM6sw8uKQu0csGkjQ` |
| `VAPID_EMAIL` | `mailto:admin@nxe-marketplace.com` |

**Cara Menambahkan:**
```
Key: VAPID_PUBLIC_KEY
Value: BP7iJcb322ZmOIRlcWNQl9d5-yeDp-xorsdVF36Qv3hWKG23ab1OeTHryh1bgJOKU6QxI58mIUO3_kTp-TxK2Gw

Key: VAPID_PRIVATE_KEY
Value: q-a_iv1W4RrKP6g65TfN75ZFPZcM6sw8uKQu0csGkjQ

Key: VAPID_EMAIL
Value: mailto:admin@nxe-marketplace.com
```

---

## 🐛 Error Tracking dengan Sentry (Optional)

Sentry membantu melacak dan memonitor error yang terjadi di aplikasi secara real-time.

**Environment Variables yang Diperlukan:**

| Key | Value |
|-----|-------|
| `SENTRY_DSN` | *Dapatkan dari https://sentry.io* |

**Cara Mendapatkan Sentry DSN:**
1. Buat akun gratis di [sentry.io](https://sentry.io)
2. Buat project baru untuk Node.js
3. Copy DSN yang diberikan (format: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`)
4. Tambahkan ke file `.env` Anda

**Catatan:** Fitur ini bersifat optional. Aplikasi tetap berjalan normal tanpa Sentry.

---

## 💾 Backup System (Optional)

Sistem backup otomatis untuk database dan data penting.

**Environment Variables yang Diperlukan:**

| Key | Value |
|-----|-------|
| `BACKUP_ENABLED` | `true` |

**Cara Menambahkan:**
```
Key: BACKUP_ENABLED
Value: true
```

**Catatan:** Backup akan berjalan secara otomatis sesuai jadwal yang ditentukan di sistem.

---

## 📨 SMS Alerts dengan Twilio (Optional)

Fitur notifikasi SMS untuk alert penting seperti transaksi, keamanan, dll.

**Environment Variables yang Diperlukan:**

| Key | Value |
|-----|-------|
| `TWILIO_ACCOUNT_SID` | *Dapatkan dari twilio.com* |
| `TWILIO_AUTH_TOKEN` | *Dapatkan dari twilio.com* |
| `TWILIO_FROM_PHONE` | *Nomor Twilio Anda (format: +1234567890)* |

**Cara Mendapatkan Twilio Credentials:**
1. Buat akun di [twilio.com](https://www.twilio.com)
2. Verifikasi nomor telepon Anda
3. Di dashboard Twilio, copy:
   - Account SID
   - Auth Token
   - Nomor telepon Twilio Anda
4. Tambahkan ke file `.env` Anda

**Catatan:** Twilio versi gratis memiliki batasan pengiriman SMS.

---

## ⚡ Redis untuk Scaling (Optional)

Redis meningkatkan performa chat real-time dan caching.

**Environment Variables yang Diperlukan:**

| Key | Value |
|-----|-------|
| `ENABLE_REDIS` | `true` |
| `REDIS_URL` | *URL Redis instance Anda* |

**Cara Mendapatkan Redis:**
1. Gunakan service seperti [Upstash](https://upstash.com) (gratis)
2. Atau [Redis Cloud](https://redis.com/cloud) (gratis tier tersedia)
3. Copy Redis URL yang diberikan
4. Tambahkan ke file `.env` Anda

---

## ✅ Status Fitur

### Fitur yang Sudah Aktif (Tanpa Konfigurasi):
- ✅ Authentication & Authorization (JWT)
- ✅ Real-time Chat dengan WebSocket
- ✅ Message Reactions (Baru!)
- ✅ Typing Indicators
- ✅ Online/Offline Status
- ✅ Read Receipts (sent → delivered → read)
- ✅ Admin Panel
- ✅ Escrow System
- ✅ Product Marketplace
- ✅ Wallet & Transactions
- ✅ AI Admin Assistant

### Fitur Optional (Perlu Konfigurasi):
- ⚙️ Push Notifications (VAPID keys)
- ⚙️ Error Tracking (Sentry DSN)
- ⚙️ Backup System (BACKUP_ENABLED)
- ⚙️ SMS Alerts (Twilio credentials)
- ⚙️ Redis Caching (REDIS_URL)

---

## 🚨 Catatan Penting

1. **Keamanan**: Jangan pernah share secrets/keys Anda di public repository atau dengan siapapun
2. **Environment**: File `.env` sudah tercantum di `.gitignore` untuk menjaga keamanan
3. **Production**: Untuk deployment production, gunakan secrets yang berbeda dari development
4. **Optional**: Semua fitur di atas bersifat OPTIONAL - aplikasi tetap berfungsi 100% tanpa konfigurasi tambahan

---

## 📞 Bantuan

Jika mengalami kesulitan dalam mengaktifkan fitur optional:
1. Pastikan format key dan value sudah benar
2. Restart aplikasi setelah menambahkan secrets
3. Cek console logs untuk pesan error
4. Hubungi tim support jika masalah berlanjut

**Selamat menggunakan NubiluXchange Gaming Marketplace! 🎮✨**
