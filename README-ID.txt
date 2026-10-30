KENDEVSEC GOD-TIER — FUTURISTIC EDITION
======================================

RINGKASAN
- Website publik responsif dengan tema futuristic dark / neon.
- Konten layanan, kategori, artikel, FAQ, testimoni, dan section dari Firestore.
- Artikel dapat dibaca langsung melalui detail expand.
- Form order tersimpan di Firestore dan membuka WhatsApp admin.
- Admin Firebase Authentication + pemeriksaan dokumen admins/{UID}.
- CRUD konten, upload media Firebase Storage, pengaturan SEO, announcement,
  maintenance mode, status order, dan audit log.
- Validasi URL aman di form admin; upload gambar dibatasi ke JPG/PNG/WEBP/GIF max 5 MB.
- DJ intro/background audio dapat diunggah admin dari Visual Studio (MP3/OGG/WAV/M4A max 15 MB). Pengunjung memulai audio dengan tombol play; browser umumnya memblokir autoplay bersuara sebelum interaksi pengguna.
- Kode promo tidak lagi dibaca/diterapkan oleh browser publik. Admin memverifikasi
  promo secara manual; diskon otomatis memerlukan backend tepercaya.

STRUKTUR
index.html
admin.html
firestore.rules
storage.rules
README-ID.txt
assets/app.js
assets/admin.js
assets/firebase-config.js
assets/style.css

SETUP FIREBASE
1. Buat Firebase project.
2. Authentication > Get started > Sign-in method > aktifkan Email/Password.
3. Authentication > Users > Add user untuk membuat akun admin.
4. Salin UID akun admin.
5. Firestore Database > Create database.
6. Firestore > Rules: tempel firestore.rules dari paket ini, lalu Publish.
7. Storage > Get started. Di Rules, tempel storage.rules, lalu Publish.
8. Firestore Data: buat collection admins; document ID = UID akun admin.
   Field active (boolean) = true. Field role (string) = owner (informasi label).
9. Project settings > General > Your apps > Add app > Web app.
10. Salin firebaseConfig ke assets/firebase-config.js dan ganti semua placeholder.
11. Authentication > Settings > Authorized domains: tambahkan domain GitHub Pages.
12. Storage Rules paket ini juga mengizinkan file audio DJ maksimal 15 MB untuk admin aktif. Terapkan rules terbaru sebelum mengunggah audio.
12. Upload struktur folder ke repository GitHub dengan assets/ tetap sebagai folder.
13. Settings > Pages > Deploy from a branch > main > /(root) > Save.
14. Buka /admin.html, login, lalu uji setiap fitur.

ATURAN KEAMANAN DAN BATASAN PENTING
- Jangan pernah mengunggah password, service-account key, atau private key ke GitHub.
- Firebase Web API key memang berada di frontend; akses harus dikontrol Security Rules.
- Koleksi katalog dan konten bersifat dapat dibaca publik. Jangan menyimpan data rahasia
  di koleksi tersebut. Koleksi coupons sekarang hanya dapat dibaca admin.
- Order publik dibatasi field, tipe, dan panjang data melalui Firestore Rules. Namun
  Rules bukan pengganti rate limiting / anti-abuse backend. Aktifkan Firebase App Check
  (reCAPTCHA Enterprise atau provider web yang sesuai) dan monitor penggunaan.
- Honeypot form hanya penghalang spam sederhana, bukan kontrol keamanan utama.
- Nomor WhatsApp harus memakai format internasional angka saja, contoh 62xxxxxxxxxx.
- Kupon tidak memberikan diskon otomatis pada versi ini. Validasi harga/diskon harus
  dilakukan di Cloud Functions atau backend tepercaya sebelum pembayaran.
- Pembayaran gateway, invoice PDF, email otomatis, analytics tingkat lanjut, live chat,
  backup otomatis terjadwal, dan page builder drag-and-drop belum diintegrasikan.
- Storage membatasi MIME type dan ukuran file, tetapi validasi konten gambar lanjutan
  (misalnya pemindaian malware / re-encoding) membutuhkan backend.
- Firestore Rules harus diuji di Firebase Emulator / Rules Playground sebelum produksi.
- Maintenance mode front-end ini bukan penghalang keamanan: Rules tetap melindungi data.

CHECKLIST PENGUJIAN SETELAH DEPLOY
[ ] Halaman utama tampil dan CSS/JS dimuat tanpa 404.
[ ] Login admin benar; akun non-admin ditolak.
[ ] CRUD layanan, artikel, FAQ, testimoni, kategori, section berjalan.
[ ] Upload gambar dan preview berfungsi.
[ ] Order tersimpan dan WhatsApp terbuka.
[ ] Status order dapat diubah oleh admin.
[ ] Pengaturan SEO, announcement, dan maintenance berjalan.
[ ] Pengguna anonim tidak dapat membaca coupons / orders / messages / auditLogs.
[ ] Pengguna anonim tidak dapat mengunggah / menghapus file Storage.
[ ] Firebase App Check dan domain resmi telah dikonfigurasi.

CATATAN
Pemeriksaan sintaks dan ZIP integrity bukan bukti integrasi Firebase end-to-end.
Gunakan proyek Firebase milik sendiri untuk pengujian fungsional dan keamanan.

GOD-TIER VISUAL STUDIO & SERVICE CATALOG
- Login sebagai admin, buka menu Visual Studio untuk mengatur enam warna, preset animasi, intensitas efek, neon glow, partikel (flag tema), dan glassmorphism.
- Gunakan preview sebelum menyimpan. Tema disimpan di dokumen Firestore site/settings pada properti theme.
- Menu Katalog layanan dapat menambahkan draft layanan social media dan IT/cybersecurity. Semua item baru dibuat nonaktif; periksa legalitas, ruang lingkup, harga, serta kebijakan platform sebelum mengaktifkannya.
- Tema diterapkan pada variabel CSS publik setelah halaman dimuat ulang. Sebagian detail visual yang masih berupa warna literal di stylesheet mungkin tidak berubah mengikuti semua warna; uji kombinasi tema sebelum dipublikasikan.
- Animasi menghormati preferensi reduced-motion dari sistem operasi.


AUDIO DJ BAWAAN
- File assets/dj-intro.mp3 adalah audio yang diberikan pengguna.
- Audio disiapkan sebagai track bawaan KENDEVSEC RADIO.
- Pengunjung harus menekan tombol play karena browser membatasi autoplay bersuara.
- Admin dapat mengganti audio melalui Visual Studio dengan upload track yang memiliki hak penggunaan.
