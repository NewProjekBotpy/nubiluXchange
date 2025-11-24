
# 📸 Screenshot Guide - Dokumentasi Penjualan

## Panduan Lengkap Mengambil Screenshot Berkualitas

### 🎯 TUJUAN
Menghasilkan screenshot berkualitas tinggi untuk dokumentasi penjualan yang menarik dan profesional.

---

## 📋 SCREENSHOT CHECKLIST

### 1. Homepage / Landing Page
**URL:** `http://localhost:5000/`

**What to Capture:**
- ✅ Featured products carousel
- ✅ Category filter (horizontal scroll)
- ✅ Product grid (minimal 6 products visible)
- ✅ Bottom navigation
- ✅ Search bar

**Settings:**
- Resolution: 1920x1080 (Desktop) atau 375x812 (Mobile)
- Browser: Chrome/Firefox (full screen)
- Remove dev tools sebelum screenshot

**Tips:**
- Pastikan ada data produk (gunakan seeded data)
- Dark mode aktif untuk aesthetic
- Hide mouse cursor

---

### 2. Product Listing Grid
**URL:** `http://localhost:5000/all-products`

**What to Capture:**
- ✅ Grid layout dengan 8-12 produk
- ✅ Filter options (category, price, sort)
- ✅ Product cards dengan gambar, harga, seller info
- ✅ Rating & verified badges

**Best Practices:**
- Full page screenshot dengan scroll
- Capture berbagai kategori produk
- Show search functionality

---

### 3. Product Detail Page
**URL:** `http://localhost:5000/product/[id]`

**What to Capture:**
- ✅ Product images carousel
- ✅ Product title, price, description
- ✅ Seller information card
- ✅ Ratings & reviews section
- ✅ Buy now & contact seller buttons
- ✅ Game details section

**Multiple Screenshots:**
- Screenshot 1: Above the fold (image + title + price)
- Screenshot 2: Seller info + game details
- Screenshot 3: Reviews section

---

### 4. Chat Interface
**URL:** `http://localhost:5000/chat/[id]`

**What to Capture:**
- ✅ Chat header dengan seller info
- ✅ Message bubbles (buyer & seller)
- ✅ Typing indicator (simulasi)
- ✅ File attachment examples
- ✅ Message reactions
- ✅ Input area dengan attachment button

**Setup:**
1. Login sebagai buyer
2. Open chat dengan seller yang ada messages
3. Capture conversation flow yang natural

---

### 5. Payment Checkout
**URL:** Trigger dari product detail → "Buy Now"

**What to Capture:**
- ✅ Product summary di checkout
- ✅ Payment method selection
- ✅ Wallet balance (jika ada)
- ✅ Total amount breakdown
- ✅ Midtrans payment methods
- ✅ QRIS code example

**Sensitive Info:**
- ⚠️ Blur/hide real payment credentials
- ⚠️ Gunakan test mode Midtrans

---

### 6. Admin Dashboard
**URL:** `http://localhost:5000/admin`

**Login:** Gunakan admin credentials
```
Email: admin@example.com
Password: Test123!@#
```

**What to Capture:**
- ✅ Dashboard overview dengan stats cards
- ✅ Analytics charts (revenue, users, products)
- ✅ Recent activity feed
- ✅ Live metrics
- ✅ User management table
- ✅ Export buttons

**Multiple Tabs:**
- Screenshot per tab (Dashboard, Users, Analytics, etc.)
- Capture dengan sample data yang realistic

---

### 7. Security Features
**URL:** `http://localhost:5000/admin/security`

**What to Capture:**
- ✅ 2FA setup flow
- ✅ Active sessions list
- ✅ Device tracking
- ✅ Security alerts
- ✅ Fraud monitoring dashboard
- ✅ GeoIP detection example

---

### 8. Mobile PWA Experience

**Device Simulation:**
- Chrome DevTools → Toggle device toolbar
- iPhone 13 Pro (390x844) atau Samsung Galaxy S21 (360x800)

**What to Capture:**
- ✅ Mobile homepage
- ✅ Bottom navigation
- ✅ Product grid (2 columns)
- ✅ Mobile chat interface
- ✅ Mobile checkout
- ✅ Pull-to-refresh indicator
- ✅ Install PWA prompt

**Tips:**
- Rotate untuk landscape/portrait
- Capture swipe gestures (bisa pakai screen recording)

---

### 9. Video & Status Features
**URL:** `http://localhost:5000/video` dan `/upload-status`

**What to Capture:**
- ✅ Video feed (TikTok-style)
- ✅ Status upload interface
- ✅ WhatsApp-style status stories
- ✅ Sticker picker
- ✅ Music selector
- ✅ Video trimming tool

---

### 10. Seller Dashboard
**URL:** `http://localhost:5000/seller-dashboard`

**What to Capture:**
- ✅ Sales statistics
- ✅ Product management table
- ✅ Revenue chart
- ✅ Order history
- ✅ Ratings & reviews received

---

## 🛠️ SCREENSHOT TOOLS

### Recommended Tools:
1. **Lightshot** (Windows/Mac) - Quick & easy
2. **Greenshot** (Windows) - Professional annotations
3. **Snagit** (Paid) - Advanced editing
4. **Chrome DevTools** - Built-in device simulation
5. **Firefox Screenshot Tool** - Full page capture

### Browser Extensions:
- **Awesome Screenshot** - Full page + scrolling
- **Nimbus Screenshot** - Video recording + annotations
- **GoFullPage** - One-click full page screenshot

---

## 📐 SCREENSHOT SPECIFICATIONS

### Desktop Screenshots:
- **Resolution:** 1920x1080 atau 2560x1440
- **Format:** PNG (lossless quality)
- **File Size:** < 2MB per screenshot
- **Naming:** `feature-name-desktop.png`

### Mobile Screenshots:
- **Resolution:** 375x812 (iPhone) atau 360x800 (Android)
- **Format:** PNG
- **File Size:** < 1MB per screenshot
- **Naming:** `feature-name-mobile.png`

### Charts/Analytics:
- **Capture saat ada data** - Gunakan seeded data
- **Clear labels** - Pastikan axis labels terbaca
- **Color scheme** - Dark theme untuk consistency

---

## 🎨 EDITING GUIDELINES

### What to Add:
- ✅ **Annotations** - Arrows untuk highlight fitur utama
- ✅ **Blur sensitive info** - Email, phone, payment details
- ✅ **Borders** - Subtle shadow atau border untuk professional look
- ✅ **Watermark** (optional) - Brand watermark di corner

### What to Remove:
- ❌ Dev tools console
- ❌ Browser bookmarks bar
- ❌ Operating system taskbar
- ❌ Mouse cursor (kecuali untuk demonstrasi)
- ❌ Test data yang terlihat fake

### Color Correction:
- Brightness: Ensure visibility
- Contrast: Readable text
- Saturation: Natural, tidak over-saturated

---

## 📁 ORGANIZATION

### Folder Structure:
```
screenshots/
├── desktop/
│   ├── homepage.png
│   ├── product-listing.png
│   ├── product-detail.png
│   ├── chat-interface.png
│   ├── payment-checkout.png
│   ├── admin-dashboard.png
│   ├── admin-analytics.png
│   ├── admin-users.png
│   ├── security-2fa.png
│   ├── security-fraud.png
│   ├── seller-dashboard.png
│   └── video-feed.png
├── mobile/
│   ├── homepage-mobile.png
│   ├── product-listing-mobile.png
│   ├── chat-mobile.png
│   ├── pwa-install.png
│   └── bottom-nav-mobile.png
└── features/
    ├── real-time-chat.gif (screen recording)
    ├── payment-flow.gif
    └── admin-bulk-actions.gif
```

---

## 🎬 SCREEN RECORDINGS (Optional)

### When to Use Video:
- Complex workflows (signup → purchase flow)
- Real-time features (chat, notifications)
- Interactive animations
- Mobile gestures (swipe, pull-to-refresh)

### Tools:
- **OBS Studio** (Free, professional)
- **Loom** (Quick sharing)
- **ScreenToGif** (Convert to GIF)

### Specifications:
- Resolution: 1080p minimum
- Frame Rate: 30fps
- Duration: 30-60 seconds per feature
- Format: MP4 atau GIF

---

## ✅ FINAL CHECKLIST

Before publishing screenshots:

- [ ] All screenshots taken at correct resolution
- [ ] Sensitive information blurred/removed
- [ ] Consistent theme (dark mode) across all screenshots
- [ ] No browser dev tools visible
- [ ] Clear, readable text in all screenshots
- [ ] File sizes optimized (< 2MB each)
- [ ] Proper naming convention followed
- [ ] Organized in correct folders
- [ ] Backup original unedited versions
- [ ] Quality check on different devices

---

## 🚀 QUICK START

**Fastest Way to Get All Screenshots:**

1. **Seed database** dengan sample data:
```bash
npm run db:seed
```

2. **Login sebagai admin**:
```
Email: admin@example.com
Password: Test123!@#
```

3. **Use screenshot checklist** di atas

4. **Edit & optimize** menggunakan tools recommended

5. **Organize** sesuai folder structure

---

## 💡 PRO TIPS

1. **Consistent viewport** - Gunakan browser zoom 100%
2. **Same time of day** - Untuk consistent lighting pada theme
3. **Batch capture** - Screenshot semua features sekaligus
4. **Version control** - Simpan screenshots di folder terpisah per version
5. **User perspective** - Screenshot dari sudut pandang user, bukan developer

---

**Happy Screenshot Taking! 📸**

*Untuk hasil terbaik, capture screenshots dalam satu session untuk consistency*
