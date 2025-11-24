# 🚀 Panduan Deployment ke Vercel + Supabase

Panduan lengkap untuk deploy NubiluXchange marketplace ke Vercel (frontend + backend) dan Supabase (database) - **100% GRATIS, tanpa kartu kredit!**

---

## 📋 Daftar Isi

1. [Persiapan Awal](#persiapan-awal)
2. [Setup Database di Supabase](#setup-database-di-supabase)
3. [Deploy ke Vercel](#deploy-ke-vercel)
4. [Konfigurasi Environment Variables](#konfigurasi-environment-variables)
5. [Verifikasi Deployment](#verifikasi-deployment)
6. [Troubleshooting](#troubleshooting)

---

## ⚙️ Persiapan Awal

### Yang Anda Butuhkan:
- ✅ Akun GitHub (untuk menyimpan code)
- ✅ Akun Supabase (gratis, tanpa kartu kredit)
- ✅ Akun Vercel (gratis, bisa login dengan GitHub)

### Langkah Persiapan:

1. **Push project ke GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit for deployment"
   git remote add origin https://github.com/username/nama-repo.git
   git push -u origin main
   ```

---

## 🗄️ Setup Database di Supabase

### 1. Buat Project Baru di Supabase

1. Buka [supabase.com](https://supabase.com)
2. Klik **"Start your project"** atau **"New Project"**
3. Pilih **Organization** (buat baru jika belum ada)
4. Isi data project:
   - **Name**: `nubiluxchange` (atau nama lain)
   - **Database Password**: Simpan password ini dengan aman!
   - **Region**: Pilih **Southeast Asia (Singapore)** untuk latency rendah
   - **Pricing Plan**: **Free** (sudah cukup untuk startup)
5. Klik **"Create new project"**
6. Tunggu ~2 menit sampai database siap

### 2. Dapatkan Connection String

1. Setelah project selesai dibuat, buka **Settings** (ikon gear di sidebar)
2. Pilih **Database** di menu sebelah kiri
3. Scroll ke bawah ke bagian **"Connection String"**
4. Pilih tab **"URI"** atau **"Direct connection"**
5. Copy connection string, format:
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
   ```
6. **Ganti `[PASSWORD]` dengan password database yang Anda buat tadi**

### 3. Setup Database Schema

Ada 2 cara untuk setup database schema:

#### Opsi A: Via Supabase SQL Editor (Recommended)
1. Di Supabase Dashboard, buka **SQL Editor** (ikon database di sidebar)
2. Klik **"New query"**
3. Copy semua migration files dari folder `migrations/` di project Anda
4. Paste dan run satu per satu, mulai dari file paling lama
5. Pastikan semua migration berhasil (status: Success)

#### Opsi B: Via Drizzle Push (dari local)
1. Install dependencies:
   ```bash
   npm install
   ```
2. Buat file `.env` di root project:
   ```bash
   DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
   ```
3. Push schema ke Supabase:
   ```bash
   npx drizzle-kit push
   ```

---

## 🌐 Deploy ke Vercel

### 1. Import Project ke Vercel

1. Buka [vercel.com](https://vercel.com)
2. Login dengan akun GitHub Anda
3. Klik **"Add New..."** → **"Project"**
4. Pilih repository GitHub yang berisi project Anda
5. Klik **"Import"**

### 2. Configure Project Settings

Di halaman **"Configure Project"**:

1. **Framework Preset**: Pilih **"Other"** (karena ini custom full-stack)
2. **Root Directory**: Biarkan kosong (`.`)
3. **Build Command**: 
   ```bash
   npm run build
   ```
4. **Output Directory**:
   ```
   dist/public
   ```
5. **Install Command**:
   ```bash
   npm install
   ```

### 3. Tambahkan Environment Variables

Klik **"Environment Variables"** dan tambahkan variabel berikut:

#### REQUIRED (Wajib):
```env
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
SESSION_SECRET=your-session-secret-min-32-characters-long
JWT_SECRET=your-jwt-secret-min-32-characters-long
TOTP_ENCRYPTION_KEY=your-totp-encryption-key-min-32-characters
NODE_ENV=production
```

**Cara generate secrets:**
```bash
# Di terminal/command prompt:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Jalankan command di atas 3x untuk generate:
1. SESSION_SECRET
2. JWT_SECRET
3. TOTP_ENCRYPTION_KEY

#### OPTIONAL (Opsional - untuk fitur tambahan):

**Midtrans Payment** (untuk payment gateway):
```env
MIDTRANS_SERVER_KEY=your-midtrans-server-key
MIDTRANS_CLIENT_KEY=your-midtrans-client-key
```

**Cloudinary** (untuk image hosting):
```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

**Sentry** (untuk error tracking):
```env
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

### 4. Deploy!

1. Setelah semua environment variables diisi, klik **"Deploy"**
2. Vercel akan mulai build dan deploy
3. Tunggu 3-5 menit sampai deployment selesai
4. Anda akan mendapat URL: `https://your-app.vercel.app`

---

## 🔧 Konfigurasi Environment Variables

### Update CORS Settings

Setelah deployment pertama berhasil:

1. Buka **Settings** → **Environment Variables** di Vercel Dashboard
2. Tambahkan variabel berikut dengan URL Vercel Anda:

```env
FRONTEND_URL=https://your-app.vercel.app
ALLOWED_DOMAINS=your-app.vercel.app
CORS_ORIGINS=your-app.vercel.app
```

3. **Redeploy** project:
   - Buka tab **"Deployments"**
   - Klik tombol **"..."** di deployment terakhir
   - Pilih **"Redeploy"**

---

## ✅ Verifikasi Deployment

### 1. Test Backend API

Buka browser dan akses:
```
https://your-app.vercel.app/api/health
```

Response yang diharapkan:
```json
{
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### 2. Test Frontend

Buka:
```
https://your-app.vercel.app
```

Halaman login/homepage harus muncul dengan benar.

### 3. Test Database Connection

1. Coba register user baru
2. Coba login
3. Cek di Supabase Dashboard → **Table Editor** → **users**
4. User baru harus muncul di database

---

## 🐛 Troubleshooting

### Problem: "DATABASE_URL must be set"
**Solusi:**
1. Pastikan environment variable `DATABASE_URL` sudah diset di Vercel
2. Re-deploy project

### Problem: "Cannot connect to database"
**Solusi:**
1. Cek connection string Supabase benar
2. Pastikan password database tidak ada special characters yang di-encode
3. Coba gunakan "Direct connection" string, bukan "Pooling"

### Problem: "Build failed"
**Solusi:**
1. Cek build logs di Vercel untuk error spesifik
2. Pastikan semua dependencies di `package.json` ter-install dengan benar
3. Coba build di local dulu: `npm run build`

### Problem: Frontend tidak muncul
**Solusi:**
1. Pastikan `outputDirectory` di vercel.json sudah benar: `dist/public`
2. Cek folder `dist/public` ada file `index.html` setelah build

### Problem: CORS Error
**Solusi:**
1. Tambahkan `FRONTEND_URL` dan `ALLOWED_DOMAINS` di environment variables
2. Re-deploy

### Problem: Session tidak persist
**Solusi:**
1. Pastikan `SESSION_SECRET` sudah diset
2. Cek cookie settings di browser (allow cookies dari domain Vercel)

---

## 🎯 Next Steps Setelah Deployment

1. **Custom Domain** (Optional):
   - Beli domain dari Namecheap, GoDaddy, dll
   - Di Vercel: Settings → Domains → Add domain
   - Follow instruksi untuk update DNS

2. **Setup Monitoring**:
   - Aktifkan Sentry untuk error tracking
   - Monitor di Vercel Analytics (gratis)

3. **Database Backup**:
   - Gunakan Supabase automatic backups (ada di dashboard)
   - Download backup manual secara berkala

4. **Environment Segregation**:
   - Buat separate Supabase project untuk development
   - Setup preview deployments di Vercel dengan database terpisah

---

## 📊 Monitoring & Maintenance

### Vercel Dashboard
- **Analytics**: Traffic, performance metrics
- **Logs**: Runtime logs untuk debugging
- **Deployments**: History semua deployments

### Supabase Dashboard
- **Table Editor**: View & edit database
- **SQL Editor**: Run custom queries
- **Database Health**: Monitor performance
- **Logs**: Database query logs

---

## 💰 Biaya (GRATIS!)

| Service | Plan | Limit | Cost |
|---------|------|-------|------|
| **Vercel** | Hobby | 100GB bandwidth/bulan | **$0** |
| **Supabase** | Free | 500MB database, 1GB storage | **$0** |
| **Total** | | | **$0/bulan** |

---

## 📞 Butuh Bantuan?

Jika masih ada masalah:
1. Cek Vercel build logs
2. Cek Supabase database logs
3. Test di local environment dulu
4. Pastikan semua environment variables sudah benar

---

**Selamat! Aplikasi marketplace Anda sekarang live di internet! 🎉**
