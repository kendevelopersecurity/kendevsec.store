import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  setDoc,
  query,
  serverTimestamp,
  where
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
let currentCustomer = null;
let registrationEnabled = true;
const loginCooldownKey = "kenseonn_customer_login_until";

const fallbackServices = [
  ['security-assessment', '🛡️', 'Audit Keamanan Website', 'Pemeriksaan konfigurasi dan risiko keamanan website milik klien.'],
  ['wifi-audit', '📡', 'Audit Keamanan WiFi', 'Pemeriksaan keamanan jaringan WiFi dengan izin pemilik.'],
  ['cctv-audit', '📹', 'Audit CCTV & NVR', 'Review konfigurasi, akses, firmware, dan keamanan perangkat CCTV.'],
  ['mobile-security', '📱', 'Mobile App Security Review', 'Review keamanan aplikasi Android/iOS dengan izin.'],
  ['wa-security', '💬', 'Konsultasi Keamanan WhatsApp', 'Panduan privasi, keamanan akun, dan pemulihan akses resmi.'],
  ['domain-check', '🌐', 'Pemeriksaan Domain & DNS', 'Pemeriksaan DNS, konfigurasi domain, dan keamanan dasar.'],
  ['ssl-setup', '🔒', 'Instalasi SSL/TLS', 'Konfigurasi sertifikat HTTPS untuk domain yang dikelola klien.'],
  ['website-maintenance', '🧰', 'Maintenance Website', 'Pembaruan, perbaikan bug, dan pengecekan rutin website.'],
  ['wordpress-care', '📰', 'WordPress Care', 'Update plugin/tema, hardening dasar, backup, dan troubleshooting.'],
  ['malware-cleanup', '🧹', 'Pembersihan Malware Website', 'Pemeriksaan dan pembersihan malware pada website milik klien.'],
  ['backup-restore', '💾', 'Backup & Restore Website', 'Pembuatan backup dan pemulihan file/database.'],
  ['web-development', '💻', 'Pembuatan Website', 'Landing page, company profile, katalog, atau website custom.'],
  ['web-redesign', '🎨', 'Redesign UI Website', 'Penyegaran antarmuka, responsif, dan pengalaman pengguna.'],
  ['hosting-setup', '☁️', 'Setup Hosting & Deployment', 'Konfigurasi hosting, domain, SSL, dan deployment.'],
  ['email-business', '✉️', 'Setup Email Bisnis', 'Konfigurasi email domain dan DNS email.'],
  ['database-setup', '🗄️', 'Setup Database', 'Perancangan database dan konfigurasi akses sesuai kebutuhan.'],
  ['firebase-setup', '🔥', 'Firebase Setup', 'Setup Firebase Auth, Firestore, Hosting, dan security rules.'],
  ['automation-script', '⚙️', 'Automation Script', 'Script otomasi untuk workflow yang sah dan disetujui.'],
  ['bot-development', '🤖', 'Bot & Integration Development', 'Bot layanan/integrasi API untuk penggunaan yang sah.'],
  ['api-integration', '🔌', 'API Integration', 'Integrasi API resmi antar aplikasi dan layanan.'],
  ['pc-troubleshoot', '🖥️', 'Troubleshooting PC/Laptop', 'Diagnosa software, sistem operasi, dan performa perangkat.'],
  ['android-support', '📲', 'Android Troubleshooting', 'Bantuan konfigurasi, backup, dan pemecahan masalah Android.'],
  ['network-setup', '🕸️', 'Setup Jaringan LAN', 'Perencanaan dan konfigurasi jaringan lokal.'],
  ['osint-audit', '🔎', 'OSINT Exposure Review', 'Pemeriksaan paparan informasi publik secara etis dan sah.'],
  ['security-training', '🎓', 'Private Cybersecurity Training', 'Pelatihan dasar keamanan siber dan praktik defensif.'],
  ['custom-development', '🧩', 'Custom Software Development', 'Pembuatan aplikasi atau tools sesuai ruang lingkup proyek.'],
  ['social-marketing', '📈', 'Social Media Marketing', 'Konsultasi kampanye dan pemasaran media sosial.'],
  ['content-design', '🖼️', 'Desain Konten Digital', 'Desain aset visual untuk kebutuhan digital.'],
  ['seo-audit', '📊', 'SEO Basic Audit', 'Audit dasar struktur SEO teknis dan konten website.'],
  ['consultation', '🧑\u200d💼', 'Konsultasi IT', 'Konsultasi kebutuhan IT, estimasi pekerjaan, dan rekomendasi solusi.']
].map(([id, icon, name, description]) => ({ id, icon, name, description, active: true }));

// Paket dan harga tidak dibuat otomatis. Admin wajib memasukkan harga yang benar.
const fallbackPackages = [];

const fallbackSite = {
  brandName: "KENSEONN",
  heroTitle: "Security, Digital Growth & IT Service.",
  heroText: "Layanan digital profesional dengan proses berbasis izin dan kesepakatan.",
  aboutName: "Kenseonn Ethical Hacking",
  aboutBio: "Fokus pada security testing yang legal, terukur, dan berizin.",
  email: "kendevelopersecurity@gmail.com",
  instagram: "kenseonn",
  whatsapp: "62895636069948",
  experience: "4+ years learning & building"
};

let services = fallbackServices;
let packages = fallbackPackages;
let site = { ...fallbackSite };

const byId = id => document.getElementById(id);
const money = n => new Intl.NumberFormat("id-ID").format(Number(n) || 0);

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function showOrderStatus(message, success = false) {
  const el = byId("orderStatus");
  if (!el) return;
  el.textContent = message;
  el.setAttribute("role", "status");
  el.style.color = success ? "#86ffad" : "#ffb4b4";
}

async function loadData() {
  try {
    const [serviceSnap, packageSnap, siteSnap] = await Promise.all([
      getDocs(collection(db, "services")),
      getDocs(collection(db, "packages")),
      getDoc(doc(db, "siteConfig", "main"))
    ]);

    if (!serviceSnap.empty) {
      services = serviceSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(s => s.active !== false);
    }

    if (!packageSnap.empty) {
      packages = packageSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
    }

    if (siteSnap.exists()) {
      site = { ...fallbackSite, ...siteSnap.data() };
    }
    registrationEnabled = site.registrationEnabled !== false;
  } catch (err) {
    console.error("Gagal memuat data website:", err);
    showOrderStatus(
      "Info: data online belum berhasil dimuat. Katalog bawaan ditampilkan."
    );
  }

  render();
  applyDesign();
  const paymentBox = byId("paymentInstructions");
  if (paymentBox) {
    const method = [site.paymentMethod, site.paymentRecipient, site.paymentAccount].filter(Boolean).join(" · ");
    paymentBox.textContent = [method, site.paymentInstructions].filter(Boolean).join(" — ") || "Instruksi pembayaran akan diberikan admin setelah nominal dikonfirmasi.";
  }
}

function render() {
  applyMaintenance();
  const registerForm = byId("registerForm");
  const registerNotice = byId("registrationDisabledNotice");
  if (registerForm) registerForm.classList.toggle("hidden", !registrationEnabled);
  if (registerNotice) registerNotice.classList.toggle("hidden", registrationEnabled);

  document.title = `${site.brandName || "KENSEONN"} — Digital IT Service`;

  const textFields = {
    brandName: site.brandName || "KENSEONN",
    heroTitle: site.heroTitle || "",
    heroText: site.heroText || "",
    aboutName: site.aboutName || "",
    aboutBio: site.aboutBio || "",
    terminalName: site.aboutName || "",
    terminalExp: site.experience || "",
    serviceCount: services.length,
    year: new Date().getFullYear()
  };

  Object.entries(textFields).forEach(([id, value]) => {
    const el = byId(id);
    if (el) el.textContent = value;
  });

  const email = byId("emailLink");
  if (email) {
    email.textContent = site.email || "";
    email.href = `mailto:${site.email || ""}`;
  }

  const instagram = byId("igLink");
  if (instagram) {
    instagram.textContent = `@${site.instagram || ""}`;
    instagram.href = `https://instagram.com/${encodeURIComponent(site.instagram || "")}`;
  }

  const whatsapp = byId("waLink");
  if (whatsapp) {
    whatsapp.href = `https://wa.me/${String(site.whatsapp || "").replace(/\D/g, "")}`;
  }

  const servicesGrid = byId("servicesGrid");
  if (servicesGrid) {
    servicesGrid.innerHTML = services.map(s => `
      <article class="service-card">
        <div class="service-icon">${esc(s.icon || "⚡")}</div>
        <h3>${esc(s.name)}</h3>
        <p>${esc(s.description)}</p>
        <button type="button" class="btn small order-service"
          data-service="${esc(s.name)}">
          Order layanan →
        </button>
      </article>
    `).join("");
  }

  const serviceSelect = byId("serviceSelect");
  if (serviceSelect) {
    const previousValue = serviceSelect.value;
    serviceSelect.innerHTML = services.map(s => `
      <option value="${esc(s.name)}">${esc(s.name)}</option>
    `).join("");

    if ([...serviceSelect.options].some(o => o.value === previousValue)) {
      serviceSelect.value = previousValue;
    }
  }

  const platformOrder = ["instagram","tiktok","facebook","youtube","telegram","x","threads","whatsapp","linkedin","spotify","twitch","snapchat","pinterest","reddit","discord","soundcloud","kick","medium","quora"];
  const platforms = [...new Set([...platformOrder, ...packages.map(p => String(p.platform || "").toLowerCase())])];
  const tabs = byId("platformTabs");
  if (tabs) {
    const labels = {instagram:"Instagram",tiktok:"TikTok",facebook:"Facebook",youtube:"YouTube",telegram:"Telegram",x:"X",threads:"Threads",whatsapp:"WhatsApp",linkedin:"LinkedIn",spotify:"Spotify",twitch:"Twitch",snapchat:"Snapchat",pinterest:"Pinterest",reddit:"Reddit",discord:"Discord",soundcloud:"SoundCloud",kick:"Kick",medium:"Medium",quora:"Quora"};
    tabs.innerHTML = platforms.map((key,i) => `<button class="tab ${i===0?"active":""}" data-platform="${esc(key)}">${esc(labels[key] || key.toUpperCase())}</button>`).join("");
    tabs.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
      tabs.querySelectorAll("button").forEach(t => t.classList.toggle("active", t===button));
      renderPackages(button.dataset.platform);
    }));
  }
  renderPackages(platforms[0] || "instagram");
}

function renderPackages(platform) {
  const grid = byId("packagesGrid");
  if (!grid) return;

  const list = packages
    .filter(p => p.platform === platform)
    .sort((a, b) => (parseInt(a.qty, 10) || 0) - (parseInt(b.qty, 10) || 0));

  grid.innerHTML = list.length ? list.map(p => `
    <article class="price-card ${p.qty === "10K" ? "featured" : ""}">
      ${p.qty === "10K" ? '<span class="popular">BEST VALUE</span>' : ""}
      <span class="price-platform">${esc(platform.toUpperCase())}</span>
      <h3>${esc(p.qty)} ${esc(p.type || "Followers")}</h3>
      <div class="price">Rp ${money(p.price)}</div>
      <div class="guarantee">Garansi ${esc(p.guarantee || "sesuai kesepakatan")}</div>
      <button type="button" class="btn primary full order-package"
        data-service="${esc(`${platform} ${p.qty} ${p.type || "Followers"} — Rp ${p.price}`)}">
        Order Paket
      </button>
    </article>
  `).join("") : '<p class="muted-note">Paket untuk platform ini belum tersedia. Silakan ajukan permintaan melalui formulir order; admin akan mengonfirmasi ketersediaan dan harga.</p>';
}

function applyMaintenance() {
  const screen = byId("maintenanceScreen");
  if (!screen) return;

  const enabled = site.maintenanceEnabled === true;

  if (!enabled) {
    screen.classList.add("hidden");
    document.body.classList.remove("maintenance-active");
    return;
  }

  screen.classList.remove("hidden");
  document.body.classList.add("maintenance-active");

  const title = byId("maintenanceTitle");
  const message = byId("maintenanceMessage");
  const status = byId("maintenanceStatus");
  const wa = byId("maintenanceWa");
  const ig = byId("maintenanceIg");

  if (title) title.textContent = site.maintenanceTitle || "Website sedang maintenance";
  if (message) message.textContent = site.maintenanceMessage || "Silakan kembali beberapa saat lagi.";
  if (status) status.textContent = site.maintenanceStatus || "MAINTENANCE";

  if (wa) wa.href = `https://wa.me/${String(site.whatsapp || "").replace(/\D/g, "")}`;
  if (ig) ig.href = `https://instagram.com/${encodeURIComponent(site.instagram || "")}`;

  startCountdown(site.maintenanceUntil);
}

let countdownTimer;

function startCountdown(until) {
  clearInterval(countdownTimer);

  const el = byId("countdown");
  if (!el) return;

  if (!until) {
    el.textContent = "MAINTENANCE";
    return;
  }

  const target = new Date(until).getTime();

  if (!Number.isFinite(target)) {
    el.textContent = "MAINTENANCE";
    return;
  }

  const tick = () => {
    const diff = target - Date.now();

    if (diff <= 0) {
      el.textContent = "00:00:00";
      clearInterval(countdownTimer);
      return;
    }

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    el.textContent = [hours, minutes, seconds]
      .map(n => String(n).padStart(2, "0"))
      .join(":");
  };

  tick();
  countdownTimer = setInterval(tick, 1000);
}


document.addEventListener("click", event => {
  const button = event.target.closest(".order-service, .order-package");
  if (!button) return;

  const select = byId("serviceSelect");
  const form = byId("orderForm");
  if (!select || !form) return;

  const requested = button.dataset.service || "";

  if (![...select.options].some(option => option.value === requested)) {
    const option = document.createElement("option");
    option.value = requested;
    option.textContent = requested;
    select.appendChild(option);
  }

  select.value = requested;
  location.hash = "order";
  form.scrollIntoView({ behavior: "smooth", block: "center" });
});

const authGuest = byId("authGuest");
const customerDashboard = byId("customerDashboard");
const setText = (id, value) => { const el = byId(id); if (el) el.textContent = value ?? ""; };

async function refreshCustomerOrders() {
  if (!currentCustomer) return;
  const target = byId("customerOrders");
  if (!target) return;
  target.innerHTML = '<p class="muted-note">Memuat pesanan...</p>';
  try {
    const snap = await getDocs(query(collection(db, "orders"), where("uid", "==", currentCustomer.uid)));
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    target.innerHTML = items.filter(o => !o.archived).map(o => { const stages = ["new","contacted","paid","processing","done"]; const current = stages.indexOf(o.status); return `<article class="customer-order-card"><div class="order-card-head"><b>${esc(o.orderCode || o.id)}</b><span class="status-chip">${esc(o.status || "new")}</span></div><h4>${esc(o.service || "Layanan")}</h4><p>${esc(o.details || "")}</p><div class="order-timeline">${stages.map((st,i)=>`<span class="${current >= i ? "reached" : ""}">${st}</span>`).join("")}</div><div class="order-meta"><span>Pembayaran: <b>${esc(o.paymentStatus || "awaiting_quote")}</b></span><span>Tagihan: <b>Rp ${money(o.price || 0)}</b></span></div>${o.paymentNote ? `<p class="payment-note">${esc(o.paymentNote)}</p>` : ""}<div class="order-actions"><button type="button" class="btn ghost copy-order-code" data-code="${esc(o.orderCode || o.id)}">Salin kode order</button></div><small>Dibuat: ${esc(o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString("id-ID") : "Baru saja")}</small></article>`; }).join("") || '<p class="muted-note">Belum ada pesanan. Pilih layanan untuk memulai.</p>';
  } catch (err) { target.innerHTML = `<p class="form-status">Gagal memuat pesanan: ${esc(err.code || err.message)}</p>`; }
}

onAuthStateChanged(auth, async user => {
  currentCustomer = user;
  if (authGuest) authGuest.classList.toggle("hidden", !!user);
  if (customerDashboard) customerDashboard.classList.toggle("hidden", !user);
  if (!user) return;
  setText("customerName", user.displayName || "Pelanggan Kenseonn");
  setText("customerEmail", user.email || "");
  const emailField = document.querySelector('#orderForm [name="email"]');
  if (emailField) emailField.value = user.email || "";
  const nameField = document.querySelector('#orderForm [name="name"]');
  if (nameField && user.displayName) nameField.value = user.displayName;
  await refreshCustomerOrders();
});

byId("registerForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  if (!registrationEnabled) { setText("registerStatus", "Pendaftaran akun sedang ditutup oleh admin."); return; }
  const form = event.currentTarget, data = new FormData(form), button = form.querySelector('[type="submit"]');
  if (button.disabled) return;
  try {
    button.disabled = true; setText("registerStatus", "Membuat akun...");
    const credential = await createUserWithEmailAndPassword(auth, String(data.get("email")).trim(), String(data.get("password")));
    await updateProfile(credential.user, { displayName: String(data.get("name")).trim() });
    await setDoc(doc(db, "customers", credential.user.uid), { name: String(data.get("name")).trim(), email: credential.user.email, createdAt: serverTimestamp() }, { merge: true });
    form.reset(); setText("registerStatus", "Akun berhasil dibuat. Dashboard siap digunakan.");
  } catch(err) { setText("registerStatus", err.code === "auth/email-already-in-use" ? "Email sudah terdaftar. Silakan login." : `Pendaftaran gagal: ${err.code || err.message}`); }
  finally { button.disabled = false; }
});

byId("customerLoginForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget, data = new FormData(form), button = form.querySelector('[type="submit"]');
  const until = Number(sessionStorage.getItem(loginCooldownKey) || 0), remaining = until - Date.now();
  if (remaining > 0) { setText("customerLoginStatus", `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(remaining/60000)} menit.`); return; }
  if (button.disabled) return;
  try { button.disabled = true; setText("customerLoginStatus", "Memproses login..."); await signInWithEmailAndPassword(auth, String(data.get("email")).trim(), String(data.get("password"))); sessionStorage.removeItem(loginCooldownKey); form.reset(); setText("customerLoginStatus", "Login berhasil."); }
  catch(err) {
    if (err.code === "auth/too-many-requests") sessionStorage.setItem(loginCooldownKey, String(Date.now()+15*60*1000));
    const messages = {"auth/too-many-requests":"Firebase membatasi percobaan sementara. Tunggu 15 menit sebelum mencoba lagi.","auth/invalid-credential":"Email atau password tidak sesuai.","auth/user-not-found":"Akun tidak ditemukan.","auth/wrong-password":"Password tidak benar.","auth/network-request-failed":"Koneksi internet bermasalah."};
    setText("customerLoginStatus", messages[err.code] || `Login gagal: ${err.code || err.message}`);
  } finally { button.disabled = false; }
});
byId("customerLogout")?.addEventListener("click", () => signOut(auth));
byId("customerResetPassword")?.addEventListener("click", async () => { const email = byId("customerResetEmail")?.value.trim() || document.querySelector("#customerLoginForm [name=\"email\"]")?.value.trim(); if (!email) { setText("customerLoginStatus", "Masukkan email akun terlebih dahulu."); return; } try { await sendPasswordResetEmail(auth, email); setText("customerLoginStatus", "Link reset password dikirim jika email terdaftar. Periksa inbox/spam."); } catch (err) { setText("customerLoginStatus", `Tidak dapat mengirim reset password: ${err.code || err.message}`); } });
byId("refreshCustomerOrders")?.addEventListener("click", refreshCustomerOrders);
document.addEventListener("click", event => { const b = event.target.closest(".copy-order-code"); if (!b) return; navigator.clipboard?.writeText(b.dataset.code || "").then(() => setText("registerStatus", "Kode pesanan disalin.")).catch(() => setText("registerStatus", "Tidak dapat menyalin otomatis; salin kode secara manual.")); });

const orderForm = byId("orderForm");
if (orderForm) orderForm.addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget, submitButton = form.querySelector('[type="submit"]');
  if (!currentCustomer) { showOrderStatus("Silakan daftar atau masuk melalui Customer Dashboard sebelum membuat pesanan."); byId("account")?.scrollIntoView({behavior:"smooth"}); return; }
  if (!form.reportValidity()) return;
  const fields = new FormData(form);
  const name = String(fields.get("name") || currentCustomer.displayName || "Pelanggan").trim();
  const phone = String(fields.get("phone") || "").trim();
  const email = currentCustomer.email || "";
  const service = String(fields.get("service") || "").trim();
  const details = String(fields.get("details") || "").trim();
  const consent = form.querySelector('[type="checkbox"]');
  if (!name || phone.length < 7 || !service || details.length < 5) { showOrderStatus("Periksa nama, nomor WhatsApp, layanan, dan detail pesanan."); return; }
  if (consent && !consent.checked) { showOrderStatus("Centang persetujuan sebelum mengirim pesanan."); return; }
  const data = { uid: currentCustomer.uid, name, phone, email, service, details, status:"new", paymentStatus:"awaiting_quote", price:0, paymentNote:"Menunggu admin mengonfirmasi total tagihan dan instruksi pembayaran.", orderCode:`KN-${Date.now().toString(36).toUpperCase()}`, source:"customer-dashboard", createdAt:serverTimestamp() };
  try { showOrderStatus("Mengirim pesanan..."); submitButton.disabled = true; await addDoc(collection(db,"orders"), data); showOrderStatus("Pesanan berhasil dikirim. Pantau status dan tagihan di Customer Dashboard.", true); form.reset(); const emailField=form.querySelector('[name="email"]'); if(emailField) emailField.value=currentCustomer.email||""; await refreshCustomerOrders(); byId("account")?.scrollIntoView({behavior:"smooth"}); }
  catch(err) { console.error(err); showOrderStatus(`Pesanan gagal (${err.code || "unknown"}). Pastikan Firebase Rules versi terbaru sudah dipasang.`); }
  finally { submitButton.disabled = false; }
});

loadData();


// VISUAL ENGINE: matrix rain, starfield, snowfall and particles (reduced-motion aware).
function applyDesign() {
  const d = site.design || {};
  const themes = {matrix:["#79f2a0","#58d9ff","#070b10"],aurora:["#8be7ff","#b9a4ff","#07101a"],violet:["#c69aff","#64dcff","#0c0715"],ember:["#ff9a67","#ffd36e","#100a08"],mono:["#d5e0eb","#91a2b5","#080b0f"]};
  const palette = themes[d.theme] || themes.matrix;
  const accent = d.accent || palette[0], accent2 = d.accent2 || palette[1];
  document.documentElement.style.setProperty("--accent", accent);
  document.documentElement.style.setProperty("--accent2", accent2);
  document.documentElement.style.setProperty("--bg", palette[2]);
  document.body.classList.toggle("no-motion", d.motion === false);
  document.body.classList.toggle("no-scanline", d.scanline === false);
  document.body.classList.toggle("no-grid", d.grid === false);
  document.documentElement.style.setProperty("--glow-strength", d.glow === "high" ? ".34" : d.glow === "low" ? ".06" : ".18");
  const mark = document.querySelector(".brand-mark"); if (mark && d.logoText) mark.textContent = d.logoText;
  startVisualEffect(d);
}
let fxFrame = 0;
function startVisualEffect(settings={}) {
  const canvas = byId("fxCanvas"); if (!canvas) return;
  const ctx = canvas.getContext("2d"); if (!ctx) return;
  cancelAnimationFrame(fxFrame);
  const effect = settings.effect || "matrix", speed = Math.max(1,Math.min(10,Number(settings.speed)||5));
  const density = Math.max(10,Math.min(150,Number(settings.density)||55));
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (settings.motion === false || reduced || effect === "none") { ctx.clearRect(0,0,canvas.width,canvas.height); return; }
  let w=0,h=0,items=[];
  const resize=()=>{w=canvas.width=window.innerWidth*devicePixelRatio;h=canvas.height=window.innerHeight*devicePixelRatio;canvas.style.width="100%";canvas.style.height="100%";items=Array.from({length:density},()=>({x:Math.random()*w,y:Math.random()*h,z:.3+Math.random()*1.4,v:(.4+Math.random()*1.4)*speed*.22,r:Math.random()*2+0.5}));};
  resize(); window.addEventListener("resize",resize,{passive:true});
  const tick=()=>{ctx.clearRect(0,0,w,h);const accent=settings.accent||"#79f2a0";items.forEach((p,i)=>{p.y+=p.v*(effect==="snow"?1.1:1);p.x+=effect==="snow"?Math.sin((p.y+i)*.006)*.35:effect==="particles"?Math.cos((p.y+i)*.01)*.3:0;if(p.y>h+8){p.y=-8;p.x=Math.random()*w;}if(effect==="matrix"){ctx.fillStyle=accent;ctx.globalAlpha=.16+p.z*.28;ctx.font=`${12*p.z*devicePixelRatio}px monospace`;ctx.fillText(Math.random()>.5?"1":"0",p.x,p.y);}else{ctx.globalAlpha=.15+p.z*.38;ctx.fillStyle=effect==="snow"?"#dff5ff":effect==="stars"?"#d7eaff":accent;ctx.beginPath();ctx.arc(p.x,p.y,p.r*p.z*devicePixelRatio,0,Math.PI*2);ctx.fill();}});ctx.globalAlpha=1;fxFrame=requestAnimationFrame(tick);};
  tick();
}
