
import {
  initializeApp,
  getApp,
  getApps
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat("id-ID").format(Number(n) || 0);

let services = [];
let packages = [];
let orders = [];
let busy = false;
let customers = [];
const adminLoginCooldownKey = "kenseonn_admin_login_until";

const defaultServices = [
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
];

// Tidak membuat paket/harga contoh otomatis agar pelanggan tidak melihat harga fiktif.
const defaultPackages = [];

function esc(value = "") {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function showStatus(id, message) {
  const element = $(id);
  if (element) element.textContent = message;
}

function showError(action, error) {
  console.error(action, error);
  return `${action}: ${error?.code || error?.message || "Terjadi kesalahan"}`;
}

function setBusy(button, value) {
  if (!button) return;
  button.disabled = value;
}

function getFormValue(form, name) {
  return form.elements.namedItem(name);
}


// LOGIN DAN PEMERIKSAAN ADMIN

onAuthStateChanged(auth, async user => {
  if (!user) {
    $("loginView")?.classList.remove("hidden");
    $("dashboard")?.classList.add("hidden");
    return;
  }

  showStatus("loginStatus", "Memeriksa akses admin...");

  try {
    const adminRef = doc(db, "admins", user.uid);
    const adminSnap = await getDoc(adminRef);

    if (!adminSnap.exists() || adminSnap.data().enabled !== true) {
      showStatus("loginStatus", "Akun ini belum diberi akses admin.");
      await signOut(auth);
      return;
    }

    $("loginView")?.classList.add("hidden");
    $("dashboard")?.classList.remove("hidden");

    await refreshAll();
  } catch (error) {
    showStatus("loginStatus", showError("Gagal memuat admin panel", error));
    $("dashboard")?.classList.add("hidden");
    $("loginView")?.classList.remove("hidden");
  }
});

$("loginForm")?.addEventListener("submit", async event => {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');

  const until = Number(sessionStorage.getItem(adminLoginCooldownKey) || 0);
  if (until > Date.now()) { showStatus("loginStatus", `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil((until-Date.now())/60000)} menit.`); return; }
  if (button.disabled) return;
  showStatus("loginStatus", "Memproses login...");
  setBusy(button, true);

  try {
    await signInWithEmailAndPassword(
      auth,
      $("loginEmail").value.trim(),
      $("loginPassword").value
    );
  } catch (error) {
    if (error.code === "auth/too-many-requests") sessionStorage.setItem(adminLoginCooldownKey, String(Date.now()+15*60*1000));
    const message = error.code === "auth/too-many-requests" ? "Firebase membatasi login sementara. Tunggu 15 menit dan jangan klik berulang." : error.code === "auth/invalid-credential" ? "Email atau password admin tidak sesuai." : `${error.code || error.message}`;
    showStatus("loginStatus", `Login gagal: ${message}`);
  } finally {
    setBusy(button, false);
  }
});

$("logoutBtn")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    alert(showError("Logout gagal", error));
  }
});

// NAVIGASI TAB ADMIN

document.querySelectorAll(".admin-tab").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".admin-tab").forEach(tab => {
      tab.classList.toggle("active", tab === button);
    });

    document.querySelectorAll(".admin-pane").forEach(pane => {
      pane.classList.add("hidden");
    });

    const target = $(button.dataset.pane);
    target?.classList.remove("hidden");
  });
});

// DATA AWAL DAN PEMUATAN DATA

async function ensureDefaults() {
  const servicesSnap = await getDocs(collection(db, "services"));

  if (servicesSnap.empty) {
    for (const [id, icon, name, description] of defaultServices) {
      await setDoc(doc(db, "services", id), {
        icon,
        name,
        description,
        active: true
      });
    }
  }

  const siteRef = doc(db, "siteConfig", "main");
  const siteSnap = await getDoc(siteRef);

  if (!siteSnap.exists()) {
    await setDoc(siteRef, {
      brandName: "KENSEONN",
      heroTitle: "Security, Digital Growth & IT Service.",
      heroText: "Layanan digital profesional berbasis izin.",
      aboutName: "Kenseonn Ethical Hacking",
      aboutBio: "Fokus pada pengujian keamanan yang legal dan berizin.",
      email: "kendevelopersecurity@gmail.com",
      instagram: "kenseonn",
      whatsapp: "62895636069948",
      experience: "4+ years learning & building",
      registrationEnabled: true,
      maintenanceEnabled: false,
      maintenanceTitle: "Website sedang maintenance",
      maintenanceMessage: "Silakan kembali beberapa saat lagi.",
      maintenanceUntil: "",
      maintenanceStatus: "MAINTENANCE"
    });
  }
}

async function refreshAll() {
  showStatus("siteStatus", "Memuat data...");

  try {
    await ensureDefaults();

    await Promise.all([
      loadSite(),
      loadServices(),
      loadPackages(),
      loadOrders(),
      loadCustomers()
    ]);

    showStatus("siteStatus", "Data berhasil dimuat ✓");
  } catch (error) {
    showStatus("siteStatus", showError("Gagal memuat data", error));
  }
}


async function loadSite() {
  const snapshot = await getDoc(doc(db, "siteConfig", "main"));
  if (!snapshot.exists()) return;

  const data = snapshot.data();
  const form = $("siteForm");
  if (!form) return;

  for (const [key, value] of Object.entries(data)) {
    const field = getFormValue(form, key);
    if (!field) continue;

    if (field.type === "checkbox") {
      field.checked = value === true;
    } else {
      field.value = value ?? "";
    }
  }

  const maintenance = getFormValue(form, "maintenanceEnabled");
  if (maintenance) {
    maintenance.checked = data.maintenanceEnabled === true;
  }
}

async function loadServices() {
  const snapshot = await getDocs(collection(db, "services"));

  services = snapshot.docs.map(item => ({
    id: item.id,
    ...item.data()
  }));

  showStatus("statServices", services.length);
  renderServices();
}

async function loadPackages() {
  const snapshot = await getDocs(collection(db, "packages"));

  packages = snapshot.docs.map(item => ({
    id: item.id,
    ...item.data()
  }));

  showStatus("statPackages", packages.length);
  renderPackages();
}

async function loadOrders() {
  const snapshot = await getDocs(
    query(collection(db, "orders"), orderBy("createdAt", "desc"))
  );

  orders = snapshot.docs.map(item => ({
    id: item.id,
    ...item.data()
  }));

  showStatus("statOrders", orders.length);
  renderOrders();
  if (typeof renderOrderTools === "function") renderOrderTools();
}

async function loadCustomers() {
  const snapshot = await getDocs(collection(db, "customers"));
  customers = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
  const count = $("statCustomers"); if (count) count.textContent = customers.length;
  renderCustomers();
}

function renderCustomers() {
  const target = $("customersAdminList"); if (!target) return;
  const q = String($("customerSearch")?.value || "").toLowerCase();
  const list = customers.filter(c => [c.name,c.email,c.phone,c.id].some(v => String(v||"").toLowerCase().includes(q)));
  target.innerHTML = list.map(c => `<article class="admin-row"><div><b>${esc(c.name || "Pelanggan")}</b><small>${esc(c.email || "")} · UID ${esc(c.id)}</small></div><span class="status-chip">Customer</span></article>`).join("") || '<p class="muted-note">Belum ada pelanggan yang cocok.</p>';
}
$("customerSearch")?.addEventListener("input", renderCustomers);
$("showArchivedOrders")?.addEventListener("change", renderOrders);

// SIMPAN WEBSITE DAN MAINTENANCE MODE

$("siteForm")?.addEventListener("submit", async event => {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');
  const fields = new FormData(form);
  const data = Object.fromEntries(fields.entries());

  // Checkbox yang tidak dicentang tidak masuk FormData.
  // Karena itu, baca langsung dari elemen form.
  const maintenanceField = getFormValue(form, "maintenanceEnabled");
  data.maintenanceEnabled = maintenanceField?.checked === true;
  data.registrationEnabled = getFormValue(form, "registrationEnabled")?.checked !== false;

  const untilField = getFormValue(form, "maintenanceUntil");
  data.maintenanceUntil = untilField?.value || "";

  showStatus("siteStatus", "Menyimpan pengaturan...");
  setBusy(button, true);

  try {
    await setDoc(doc(db, "siteConfig", "main"), data, { merge: true });

    showStatus("siteStatus", "Pengaturan berhasil disimpan ✓");
    await auditAdmin("Ubah pengaturan website", `Pendaftaran: ${data.registrationEnabled ? "ON" : "OFF"}; maintenance: ${data.maintenanceEnabled ? "ON" : "OFF"}`);
  } catch (error) {
    showStatus("siteStatus", showError("Gagal menyimpan website", error));
  } finally {
    setBusy(button, false);
  }
});

// TAMBAH DAN EDIT LAYANAN

$("serviceForm")?.addEventListener("submit", async event => {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');
  const fields = new FormData(form);
  const id = String(fields.get("id") || "").trim();

  const data = {
    name: String(fields.get("name") || "").trim(),
    icon: String(fields.get("icon") || "").trim(),
    description: String(fields.get("description") || "").trim(),
    active: fields.get("active") === "true"
  };

  if (!data.name || !data.description) {
    alert("Nama layanan dan deskripsi wajib diisi.");
    return;
  }

  setBusy(button, true);

  try {
    if (id) {
      await updateDoc(doc(db, "services", id), data);
    } else {
      await addDoc(collection(db, "services"), data);
    }

    form.reset();
    getFormValue(form, "id").value = "";
    await loadServices();
    alert("Layanan berhasil disimpan ✓");
  } catch (error) {
    alert(showError("Gagal menyimpan layanan", error));
  } finally {
    setBusy(button, false);
  }
});

$("serviceCancel")?.addEventListener("click", () => {
  const form = $("serviceForm");
  form?.reset();
  if (form) getFormValue(form, "id").value = "";
});

// TAMBAH DAN EDIT PAKET

$("packageForm")?.addEventListener("submit", async event => {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');
  const fields = new FormData(form);
  const id = String(fields.get("id") || "").trim();

  const data = {
    platform: String(fields.get("platform") || "").trim(),
    type: String(fields.get("type") || "Followers").trim(),
    qty: String(fields.get("qty") || "").trim().toUpperCase(),
    price: Number(fields.get("price")),
    guarantee: String(fields.get("guarantee") || "").trim()
  };

  if (
    !data.platform ||
    !data.qty ||
    !Number.isFinite(data.price) ||
    data.price < 0 ||
    !data.guarantee
  ) {
    alert("Periksa kembali platform, jumlah, harga, dan garansi.");
    return;
  }

  setBusy(button, true);

  try {
    if (id) {
      await updateDoc(doc(db, "packages", id), data);
    } else {
      await addDoc(collection(db, "packages"), data);
    }

    form.reset();
    getFormValue(form, "id").value = "";
    await loadPackages();
    alert("Paket berhasil disimpan ✓");
  } catch (error) {
    alert(showError("Gagal menyimpan paket", error));
  } finally {
    setBusy(button, false);
  }
});

$("packageCancel")?.addEventListener("click", () => {
  const form = $("packageForm");
  form?.reset();
  if (form) getFormValue(form, "id").value = "";
});

// TAMPILKAN DAFTAR LAYANAN

function renderServices() {
  const container = $("servicesAdminList");
  if (!container) return;

  container.innerHTML = services.map(service => `
    <div class="admin-row">
      <div>
        <b>${esc(service.icon)} ${esc(service.name)}</b>
        <small>${esc(service.description)}</small>
      </div>
      <span>${service.active === false ? "OFF" : "ON"}</span>
      <button type="button" class="btn small edit-service"
        data-id="${esc(service.id)}">Edit</button>
      <button type="button" class="btn small danger del-service"
        data-id="${esc(service.id)}">Hapus</button>
    </div>
  `).join("");
}

// TAMPILKAN DAFTAR PAKET

function renderPackages() {
  const container = $("packagesAdminList");
  if (!container) return;

  const sorted = [...packages].sort((a, b) =>
    String(a.platform || "").localeCompare(String(b.platform || "")) ||
    (parseInt(a.qty, 10) || 0) - (parseInt(b.qty, 10) || 0)
  );

  container.innerHTML = sorted.map(item => `
    <div class="admin-row">
      <div>
        <b>${esc(item.platform)} ${esc(item.qty)} ${esc(item.type || "Followers")}</b>
        <small>Rp ${money(item.price)} • Garansi ${esc(item.guarantee)}</small>
      </div>
      <button type="button" class="btn small edit-package"
        data-id="${esc(item.id)}">Edit</button>
      <button type="button" class="btn small danger del-package"
        data-id="${esc(item.id)}">Hapus</button>
    </div>
  `).join("");
}

// TAMPILKAN ORDER

function renderOrders() {
  const container = $("ordersAdminList");
  if (!container) return;

  const showArchived = $("showArchivedOrders")?.checked === true;
  const visibleOrders = orders.filter(item => showArchived ? item.archived === true : item.archived !== true);
  container.innerHTML = visibleOrders.map(item => `
    <div class="order-row order-row-expanded">
      <div>
        <b>${esc(item.orderCode || item.id)} · ${esc(item.name || "Tanpa nama")} • ${esc(item.service || "")}</b>
        <small>${esc(item.phone || "")} ${item.email ? "• " + esc(item.email) : ""} · ${esc(dateValue(item.createdAt))}</small>
        <p>${esc(item.details || "")}</p>
        <div class="order-admin-controls">
          <label>Status order<select class="status-select" data-id="${esc(item.id)}">${["new", "contacted", "paid", "processing", "done", "cancelled"].map(status => `<option value="${status}" ${item.status === status ? "selected" : ""}>${status}</option>`).join("")}</select></label>
          <label>Status pembayaran<select class="payment-status-select" data-id="${esc(item.id)}">${["awaiting_quote","awaiting_payment","paid","rejected","refunded"].map(status => `<option value="${status}" ${(item.paymentStatus || "awaiting_quote") === status ? "selected" : ""}>${status}</option>`).join("")}</select></label>
          <label>Total tagihan (Rp)<input class="order-price-input" data-id="${esc(item.id)}" type="number" min="0" step="1000" value="${Number(item.price)||0}"></label>
          <label class="payment-note-field">Instruksi / catatan pembayaran<input class="payment-note-input" data-id="${esc(item.id)}" maxlength="500" value="${esc(item.paymentNote || "")}" placeholder="Transfer ke ..."></label>
          <button type="button" class="btn small save-order-payment" data-id="${esc(item.id)}">Simpan pembayaran</button>
          ${["done","cancelled"].includes(item.status) && !item.archived ? `<button type="button" class="btn small archive-order" data-id="${esc(item.id)}">Arsipkan</button>` : ""}${item.archived ? `<button type="button" class="btn small restore-order" data-id="${esc(item.id)}">Pulihkan</button>` : ""}
        </div>
      </div>
    </div>
  `).join("");
}

// EDIT DAN HAPUS LAYANAN / PAKET

document.addEventListener("click", async event => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.classList.contains("archive-order") || button.classList.contains("restore-order")) {
    const item = orders.find(order => order.id === button.dataset.id);
    if (!item || !["done", "cancelled"].includes(item.status)) { alert("Hanya pesanan selesai atau dibatalkan yang dapat diarsipkan."); return; }
    const archived = button.classList.contains("archive-order");
    if (!confirm(archived ? "Arsipkan pesanan ini? Data tetap tersimpan." : "Pulihkan pesanan dari arsip?")) return;
    try { button.disabled = true; await updateDoc(doc(db, "orders", item.id), { archived, updatedAt: serverTimestamp() }); await loadOrders(); }
    catch (error) { alert(showError("Gagal mengubah arsip pesanan", error)); button.disabled = false; }
    return;
  }

  if (button.classList.contains("delete-order")) {
    const item = orders.find(order => order.id === button.dataset.id);
    if (!item || !["done", "cancelled"].includes(item.status)) { alert("Hanya pesanan selesai atau dibatalkan yang dapat dihapus."); return; }
    if (!confirm(`Hapus pesanan ${item.orderCode || item.id} secara permanen? Tindakan ini tidak dapat dibatalkan.`)) return;
    try { button.disabled = true; await deleteDoc(doc(db, "orders", item.id)); await loadOrders(); alert("Pesanan berhasil dihapus."); }
    catch (error) { alert(showError("Gagal menghapus pesanan", error)); button.disabled = false; }
    return;
  }

  if (button.classList.contains("edit-service")) {
    const item = services.find(service => service.id === button.dataset.id);
    const form = $("serviceForm");
    if (!item || !form) return;

    for (const key of ["id", "name", "icon", "description", "active"]) {
      const field = getFormValue(form, key);
      if (field) field.value = item[key] ?? "";
    }

    $("servicesPane")?.scrollIntoView({ behavior: "smooth" });
    return;
  }

  if (button.classList.contains("del-service")) {
    if (!confirm("Hapus layanan ini?")) return;

    try {
      await deleteDoc(doc(db, "services", button.dataset.id));
      await loadServices();
      alert("Layanan berhasil dihapus.");
    } catch (error) {
      alert(showError("Gagal menghapus layanan", error));
    }
    return;
  }

  if (button.classList.contains("edit-package")) {
    const item = packages.find(pkg => pkg.id === button.dataset.id);
    const form = $("packageForm");
    if (!item || !form) return;

    for (const key of ["id", "platform", "type", "qty", "price", "guarantee"]) {
      const field = getFormValue(form, key);
      if (field) field.value = item[key] ?? "";
    }

    $("packagesPane")?.scrollIntoView({ behavior: "smooth" });
    return;
  }

  if (button.classList.contains("del-package")) {
    if (!confirm("Hapus paket ini?")) return;

    try {
      await deleteDoc(doc(db, "packages", button.dataset.id));
      await loadPackages();
      alert("Paket berhasil dihapus.");
    } catch (error) {
      alert(showError("Gagal menghapus paket", error));
    }
  }
});

// SIMPAN NOMINAL DAN INSTRUKSI PEMBAYARAN DIRECT
 document.addEventListener("click", async event => {
   const button = event.target.closest(".save-order-payment");
   if (!button) return;
   const id = button.dataset.id;
   const price = Number(document.querySelector(`.order-price-input[data-id="${id}"]`)?.value || 0);
   const paymentNote = document.querySelector(`.payment-note-input[data-id="${id}"]`)?.value.trim() || "";
   const paymentStatus = document.querySelector(`.payment-status-select[data-id="${id}"]`)?.value || "awaiting_quote";
   if (!Number.isFinite(price) || price < 0) { alert("Nominal pembayaran tidak valid."); return; }
   try { button.disabled = true; await updateDoc(doc(db, "orders", id), { price, paymentNote, paymentStatus, updatedAt: serverTimestamp() }); await loadOrders(); alert("Nominal dan instruksi pembayaran diperbarui."); }
   catch (error) { alert(showError("Gagal menyimpan pembayaran", error)); }
   finally { button.disabled = false; }
 });

// UBAH STATUS ORDER

document.addEventListener("change", async event => {
  const field = event.target;

  if (!field.classList.contains("status-select")) return;

  try {
    await updateDoc(doc(db, "orders", field.dataset.id), {
      status: field.value,
      updatedAt: serverTimestamp()
    });

    showStatus("siteStatus", "Status order berhasil diperbarui ✓");
    await loadOrders();
  } catch (error) {
    alert(showError("Gagal memperbarui status order", error));
    await loadOrders().catch(loadError => {
      console.error("Gagal memuat ulang order:", loadError);
    });
  }
});

// MUAT ULANG ORDER

$("refreshOrders")?.addEventListener("click", async () => {
  const button = $("refreshOrders");
  setBusy(button, true);

  try {
    await loadOrders();
  } catch (error) {
    alert(showError("Gagal memuat order", error));
  } finally {
    setBusy(button, false);
  }
});


// FINAL ULTIMATE 50: design controls, diagnostics, reports and operational helpers.
const capabilityNames = [
"Admin login Firebase","Pemeriksaan UID admin","Dashboard ringkasan","Penghitungan pesanan","Penghitungan layanan","Penghitungan paket","Ringkasan pesanan baru","Ringkasan pesanan selesai","Ringkasan nilai pesanan","Edit profil brand","Edit judul hero","Edit deskripsi hero","Edit email kontak","Edit Instagram","Edit WhatsApp","Maintenance mode","Maintenance countdown","CRUD katalog IT","Aktif/nonaktif layanan","CRUD paket boosting","Edit platform boosting","Edit kuantitas paket","Edit harga paket","Edit garansi paket","Daftar order Firebase","Ubah status order","Pencarian order","Filter status order","Refresh order","Tetapkan nominal tagihan","Ubah status pembayaran","Tulis instruksi pembayaran","Export CSV order","Kode order unik sisi browser","Matrix Rain","Starfield","Snowfall","Cyber particles","Preset tema","Warna aksen","Kontrol kecepatan efek","Kontrol kepadatan efek","Kontrol glow","Toggle scanline","Toggle grid","Toggle motion","Edit monogram","Analytics status","Layanan populer","Rasio penyelesaian","Monitor halaman dari browser","Tes baca Firestore","Backup JSON katalog","Restore konfigurasi situs","Export katalog CSV","Activity log sesi lokal","Layout responsif admin","Dashboard akun pelanggan","Registrasi pelanggan","Login pelanggan","Logout pelanggan","Daftar pesanan milik akun","Refresh riwayat pelanggan","Pemesanan dengan akun","Penyimpanan UID pelanggan","Validasi nomor WhatsApp","Validasi detail pesanan","Persetujuan kepemilikan/izin","Status menunggu penawaran","Status menunggu pembayaran","Status pembayaran lunas","Catatan pembayaran per order","Tagihan per order","Instruksi transfer per order","Katalog layanan IT","Katalog paket sosial","Tautan order dari kartu layanan","Tautan order dari kartu paket","FAQ layanan","Kontak email","Kontak WhatsApp","Kontak Instagram","Halaman maintenance","Pengaturan pembayaran manual","Proteksi data pelanggan per UID","Akses baca order oleh admin","Akses update order oleh admin","Akses CRUD katalog oleh admin","Aturan catch-all deny","Tidak meminta password akun sosial","Peringatan jangan kirim OTP","Peringatan scope security berizin","Riwayat status pesanan","Pencarian nama pelanggan","Pencarian nomor pelanggan","Pencarian kode order","Pencarian detail order","Ekspor data pesanan","Ekspor katalog layanan","Timestamp pembaruan order"
];
const capGrid = $("capabilityGrid");
if (capGrid) capGrid.innerHTML = capabilityNames.map((name,i)=>`<div class="capability-item"><span>${String(i+1).padStart(2,"0")}</span>${esc(name)}</div>`).join("");
let localActivity=[];
function logActivity(message){localActivity.unshift({at:new Date().toLocaleString("id-ID"),message});localActivity=localActivity.slice(0,30);const box=$("activityLog");if(box)box.innerHTML=localActivity.map(x=>`<div><small>${esc(x.at)}</small>${esc(x.message)}</div>`).join("")||"<p>Belum ada aktivitas.</p>";}
function navigatePane(id){document.querySelectorAll(".admin-tab").forEach(t=>t.classList.toggle("active",t.dataset.pane===id));document.querySelectorAll(".admin-pane").forEach(p=>p.classList.toggle("hidden",p.id!==id));}
document.addEventListener("click",e=>{const b=e.target.closest("[data-jump]");if(b){navigatePane(b.dataset.jump);$(b.dataset.jump)?.scrollIntoView({behavior:"smooth",block:"start"});}});
function fillDesignForm(data={}){const f=$("designForm");if(!f)return;for(const [k,v] of Object.entries({theme:"matrix",effect:"matrix",accent:"#79f2a0",accent2:"#58d9ff",speed:5,density:55,glow:"medium",motion:true,scanline:true,grid:true,logoText:"K//",...data})){const el=f.elements.namedItem(k);if(el){if(el.type==="checkbox")el.checked=v===true;else el.value=v??"";}}$("speedOutput").textContent=f.elements.speed.value;$("densityOutput").textContent=f.elements.density.value;}
const designDefaults={theme:"matrix",effect:"matrix",accent:"#79f2a0",accent2:"#58d9ff",speed:5,density:55,glow:"medium",motion:true,scanline:true,grid:true,logoText:"K//"};
const originalRefreshAll=refreshAll;
// Load saved visual config after the existing site document has been loaded.
const _refreshAllUltimate=refreshAll;
// Wrap refresh in a microtask to keep the original Firebase loading path intact.
setTimeout(async()=>{try{const snap=await getDoc(doc(db,"siteConfig","main"));if(snap.exists())fillDesignForm({...designDefaults,...(snap.data().design||{})});else fillDesignForm();}catch(e){console.warn("Design settings load:",e);fillDesignForm();}},1200);
$("designForm")?.addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget,btn=f.querySelector('[type="submit"]');const d={};for(const key of Object.keys(designDefaults)){const el=f.elements.namedItem(key);d[key]=el?.type==="checkbox"?el.checked:el?.type==="range"?Number(el.value):el?.value;}btn.disabled=true;showStatus("designStatus","Menyimpan desain...");try{await setDoc(doc(db,"siteConfig","main"),{design:d},{merge:true});showStatus("designStatus","Desain tersimpan. Website menerapkan saat dimuat ulang.");logActivity("Memperbarui Design Lab");}catch(err){showStatus("designStatus",showError("Gagal menyimpan desain",err));}finally{btn.disabled=false;}});
["speed","density"].forEach(k=>$("designForm")?.elements.namedItem(k)?.addEventListener("input",e=>{$(k+"Output").textContent=e.target.value;}));
$("previewEffect")?.addEventListener("click",()=>{const f=$("designForm"),box=$("effectPreview");box.dataset.effect=f.elements.effect.value;box.style.setProperty("--preview-accent",f.elements.accent.value);box.querySelector("span").textContent=`PREVIEW: ${f.elements.effect.value.toUpperCase()} • SPEED ${f.elements.speed.value}`;logActivity("Menjalankan preview efek lokal");});
function csvDownload(name,rows){const csv=rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));a.download=name;a.click();URL.revokeObjectURL(a.href);}
function dateValue(v){try{return v?.toDate?v.toDate().toLocaleString("id-ID"):"";}catch{return "";}}
function renderOrderTools(){
 const q=($("orderSearch")?.value||"").toLowerCase(),st=$("orderFilter")?.value||"all";
 const archivedOnly=$("showArchivedOrders")?.checked===true;
 const filtered=orders.filter(o=>(archivedOnly?o.archived===true:o.archived!==true)&&(st==="all"||o.status===st)&&[o.name,o.phone,o.service,o.orderCode,o.details].some(v=>String(v||"").toLowerCase().includes(q)));
 const c=$("ordersAdminList");if(!c)return;
 c.innerHTML=filtered.map(item=>`<div class="order-row order-row-expanded"><div>
 <b>${esc(item.orderCode||item.id)} · ${esc(item.name||"Tanpa nama")} — ${esc(item.service||"")}</b>
 <small>${esc(item.phone||"")} ${item.email?"· "+esc(item.email):""} · ${esc(dateValue(item.createdAt))}</small><p>${esc(item.details||"")}</p>
 <div class="order-admin-controls">
 <label>Status order<select class="status-select" data-id="${esc(item.id)}">${["new","contacted","paid","processing","done","cancelled"].map(status=>`<option value="${status}" ${item.status===status?"selected":""}>${status}</option>`).join("")}</select></label>
 <label>Status pembayaran<select class="payment-status-select" data-id="${esc(item.id)}">${["awaiting_quote","awaiting_payment","paid","rejected","refunded"].map(status=>`<option value="${status}" ${(item.paymentStatus||"awaiting_quote")===status?"selected":""}>${status}</option>`).join("")}</select></label>
 <label>Total tagihan (Rp)<input class="order-price-input" data-id="${esc(item.id)}" type="number" min="0" step="1000" value="${Number(item.price)||0}"></label>
 <label class="payment-note-field">Instruksi pembayaran<input class="payment-note-input" data-id="${esc(item.id)}" maxlength="500" value="${esc(item.paymentNote||"")}" placeholder="Transfer ke ..."></label>
 <button type="button" class="btn small save-order-payment" data-id="${esc(item.id)}">Simpan pembayaran</button>
          ${["done","cancelled"].includes(item.status) && !item.archived ? `<button type="button" class="btn small archive-order" data-id="${esc(item.id)}">Arsipkan</button>` : ""}${item.archived ? `<button type="button" class="btn small restore-order" data-id="${esc(item.id)}">Pulihkan</button>` : ""}
 </div></div></div>`).join("")||'<p class="muted-note">Tidak ada pesanan yang cocok.</p>';
}
$("orderSearch")?.addEventListener("input",renderOrderTools);$("orderFilter")?.addEventListener("change",renderOrderTools);$("showArchivedOrders")?.addEventListener("change",renderOrderTools);
$("exportOrders")?.addEventListener("click",()=>{csvDownload("kenseonn-orders.csv",[["Order ID","Kode","Nama","WhatsApp","Email","Layanan","Detail","Status","Dibuat"],...orders.map(o=>[o.id,o.orderCode,o.name,o.phone,o.email,o.service,o.details,o.status,dateValue(o.createdAt)])]);logActivity("Export data pesanan CSV");});
$("exportCatalog")?.addEventListener("click",()=>{csvDownload("kenseonn-catalog.csv",[["Type","ID","Name/platform","Description/qty","Price","Guarantee","Active"],...services.map(x=>["service",x.id,x.name,x.description,"","",x.active!==false]),...packages.map(x=>["package",x.id,x.platform,x.qty,x.price,x.guarantee,true])]);logActivity("Export katalog CSV");});
function renderAnalytics(){const total=orders.length,done=orders.filter(o=>o.status==="done").length,active=orders.filter(o=>["new","contacted","paid","processing"].includes(o.status)).length;$("anaTotal").textContent=total;$("anaActive").textContent=active;$("anaDone").textContent=done;$("anaRate").textContent=(total?Math.round(done/total*100):0)+"%";const counts={};orders.forEach(o=>counts[o.status||"unknown"]=(counts[o.status||"unknown"]||0)+1);$("statusBars").innerHTML=Object.entries(counts).map(([k,v])=>`<div class="bar-row"><span>${esc(k)}</span><div><i style="width:${total?v/total*100:0}%"></i></div><b>${v}</b></div>`).join("")||"Belum ada data.";const popular={};orders.forEach(o=>popular[o.service||"Tidak diketahui"]=(popular[o.service||"Tidak diketahui"]||0)+1);$("popularServices").innerHTML=Object.entries(popular).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>`<div class="admin-row"><b>${esc(k)}</b><span>${v} order</span></div>`).join("")||"Belum ada pesanan.";$("statNew").textContent=orders.filter(o=>o.status==="new").length;$("statDone").textContent=done;$("statRevenue").textContent="Rp "+money(orders.filter(o=>["paid","done"].includes(o.status)).reduce((sum,o)=>sum+Number(o.price||0),0));}
$("refreshAnalytics")?.addEventListener("click",async()=>{try{await loadOrders();renderAnalytics();logActivity("Refresh analytics");}catch(e){alert(showError("Analytics gagal dimuat",e));}});
$("runMonitor")?.addEventListener("click",async()=>{const out=$("monitorResult");out.textContent="Memeriksa...";const start=performance.now();try{const res=await fetch("./",{cache:"no-store"});out.textContent=`HTTP ${res.status} · ${Math.round(performance.now()-start)} ms`;logActivity("Monitor website dijalankan");}catch(e){out.textContent="Gagal dijangkau dari browser ini";}});
$("runFirebaseCheck")?.addEventListener("click",async()=>{const out=$("firebaseResult");out.textContent="Memeriksa...";try{await getDoc(doc(db,"siteConfig","main"));out.textContent="Firestore read OK";logActivity("Tes koneksi Firestore berhasil");}catch(e){out.textContent=`Gagal: ${e.code||e.message}`;}});
$("backupData")?.addEventListener("click",async()=>{try{const [siteSnap,s,p]=await Promise.all([getDoc(doc(db,"siteConfig","main")),getDocs(collection(db,"services")),getDocs(collection(db,"packages"))]);const payload={schema:"kenseonn-backup-v1",createdAt:new Date().toISOString(),site:siteSnap.data()||{},services:s.docs.map(d=>({id:d.id,...d.data()})),packages:p.docs.map(d=>({id:d.id,...d.data()}))};const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}));a.download="kenseonn-backup.json";a.click();URL.revokeObjectURL(a.href);logActivity("Backup JSON diunduh");}catch(e){alert(showError("Backup gagal",e));}});
$("restoreData")?.addEventListener("click",async()=>{const file=$("restoreFile")?.files?.[0];if(!file){alert("Pilih file backup JSON terlebih dahulu.");return;}if(!confirm("Restore akan menggabungkan konfigurasi ke siteConfig/main. Lanjutkan?"))return;try{const data=JSON.parse(await file.text());if(data.schema!=="kenseonn-backup-v1"||!data.site||typeof data.site!=="object")throw new Error("Format backup tidak dikenali");await setDoc(doc(db,"siteConfig","main"),data.site,{merge:true});alert("Konfigurasi berhasil direstore. Layanan dan paket tidak ditimpa otomatis demi keamanan.");logActivity("Restore konfigurasi website");}catch(e){alert(showError("Restore gagal",e));}});
$("clearActivity")?.addEventListener("click",()=>{localActivity=[];$("activityLog").innerHTML="<p>Log lokal dibersihkan.</p>";});
// Recompute overview whenever original loaders finish and after status updates.
const _loadOrdersUltimate=loadOrders;
loadOrders=async function(){await _loadOrdersUltimate();renderAnalytics();renderOrderTools();};
const _loadServicesUltimate=loadServices;
loadServices=async function(){await _loadServicesUltimate();};
const _loadPackagesUltimate=loadPackages;
loadPackages=async function(){await _loadPackagesUltimate();};
