import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safeHref = (value, { relative = true } = {}) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (relative && /^(#|\/|\.\/|\.\.\/)/.test(raw)) return raw;
  try {
    const u = new URL(raw, window.location.origin);
    return ["https:", "http:", "mailto:", "tel:"].includes(u.protocol) ? raw : "";
  } catch { return ""; }
};
const wa = (number, message) => {
  const digits = String(number || "").replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return "";
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
};

$("#year").textContent = new Date().getFullYear();
$("#menuToggle").addEventListener("click", () => {
  const open = $("#nav").classList.toggle("open");
  $("#menuToggle").setAttribute("aria-expanded", String(open));
});

let db;
let settings = { whatsapp: "" };
function applyTheme(theme={}) {
  const root=document.documentElement;
  const map={accent:"--neon",secondary:"--violet",background:"--paper",surface:"--white",text:"--ink",muted:"--muted"};
  for(const [key,variable] of Object.entries(map)) if(/^#[0-9a-f]{6}$/i.test(String(theme[key]||""))) root.style.setProperty(variable,theme[key]);
  const motion=theme.animation||"smooth";document.body.dataset.motion=motion;
  document.body.dataset.glow=theme.glow===false?"off":"on";
  document.body.dataset.glass=theme.glass===false?"off":"on";
  document.body.dataset.particles=theme.particles===false?"off":"on";
  document.body.dataset.intensity=theme.intensity||"medium";
}

function renderServices(items) {
  const active = items.filter(x => x.active !== false);
  $("#serviceGrid").innerHTML = active.length ? active.map(x => `
    <article class="service-card">
      ${x.imageUrl ? `<img class="service-image" src="${esc(x.imageUrl)}" alt="${esc(x.title || "Layanan")}" loading="lazy">` : ""}
      <div class="service-icon">${esc(x.icon || "✦")}</div>
      <h3>${esc(x.title || "Layanan")}</h3><p>${esc(x.description || "")}</p>
      <div class="muted">${esc(x.price || "")}</div>
      <a href="#order" data-order-service="${esc(x.title || "")}">PESAN LAYANAN ↗</a>
    </article>`).join("") : '<div class="empty-state">Layanan akan segera hadir.</div>';
  $("#orderService").innerHTML = '<option value="">Pilih layanan</option>' + active.map(x => `<option value="${esc(x.title || "")}">${esc(x.title || "")}</option>`).join("");
  document.querySelectorAll("[data-order-service]").forEach(a => a.addEventListener("click", () => { $("#orderService").value = a.dataset.orderService; }));
}
function renderArticles(items) {
  const published = items.filter(x => x.published !== false);
  $("#articleGrid").innerHTML = published.length ? published.map(x => {
    const external = safeHref(x.url, { relative: false });
    return `<article class="article-card">
      ${x.imageUrl ? `<img class="article-image" src="${esc(x.imageUrl)}" alt="${esc(x.title || "Artikel")}" loading="lazy">` : ""}
      <span class="date">${esc(x.date || x.category || "KENDEVSEC JOURNAL")}</span>
      <h3>${esc(x.title || "Artikel")}</h3><p>${esc(x.excerpt || "")}</p>
      ${x.content ? `<details class="article-detail"><summary>Baca artikel</summary><div class="article-content">${esc(x.content).replace(/\n/g,"<br>")}</div></details>` : ""}
      ${external ? `<a href="${esc(external)}" target="_blank" rel="noopener noreferrer">SUMBER / LANJUTKAN ↗</a>` : ""}
    </article>`;
  }).join("") : '<div class="empty-state">Artikel akan segera hadir.</div>';
}
function renderFaqs(items) {
  $("#faqList").innerHTML = items.sort((a,b)=>(Number(a.sort)||0)-(Number(b.sort)||0)).map(x => `<details class="faq-item"><summary>${esc(x.question || "Pertanyaan")}</summary><p>${esc(x.answer || "")}</p></details>`).join("");
}
function renderSections(items) {
  $("#customSections").innerHTML = items.filter(x => x.active !== false).sort((a,b)=>(Number(a.sort)||0)-(Number(b.sort)||0)).map(x => {
    const href = safeHref(x.buttonUrl);
    return `<section class="custom-content-section"><div class="custom-content-inner"><div><span class="eyebrow">${esc(x.eyebrow || "KENDEVSEC / FEATURE")}</span><h2>${esc(x.heading || x.name || "")}</h2><p>${esc(x.body || "").replace(/\n/g,"<br>")}</p>${x.buttonText && href ? `<a class="button primary" href="${esc(href)}" ${/^https?:/i.test(href) ? 'target="_blank" rel="noopener noreferrer"' : ""}>${esc(x.buttonText)} ↗</a>` : ""}</div>${x.imageUrl ? `<img src="${esc(x.imageUrl)}" alt="${esc(x.heading || x.name || "")}" loading="lazy">` : ""}</div></section>`;
  }).join("");
}
function renderTestimonials(items) {
  $("#testimonialGrid").innerHTML = items.filter(x => x.active !== false).map(x => `<article class="testimonial-card">${x.imageUrl ? `<img class="testimonial-image" src="${esc(x.imageUrl)}" alt="${esc(x.name || "Pelanggan")}" loading="lazy">` : ""}<span class="quote">“</span><p>${esc(x.message || "")}</p><strong>${esc(x.name || "Pelanggan")}</strong><small>${esc(x.role || "")}</small></article>`).join("");
}

const musicEl = $("#siteMusic"), musicBtn = $("#musicToggle"), musicStatus = $("#musicStatus"), soundDock = $("#soundDock");
let musicConfigured = false;
configureMusic("./assets/dj-intro.mp3", "LAGI TAMVAN / KENDEVSEC RADIO");
function configureMusic(url, label="SOUND EXPERIENCE") {
  if (!musicEl || !musicBtn) return;
  const safe = safeHref(url, { relative:true });
  musicConfigured = !!safe;
  if (safe && musicEl.src !== new URL(safe, location.href).href) musicEl.src = safe;
  musicStatus.textContent = musicConfigured ? `${label} / READY` : "SOUND EXPERIENCE / ADD YOUR TRACK";
  musicBtn.disabled = !musicConfigured;
  musicBtn.title = musicConfigured ? "Mulai atau jeda musik" : "Admin perlu menambahkan audio terlebih dahulu";
}
musicBtn?.addEventListener("click", async () => {
  if (!musicConfigured) return;
  if (musicEl.paused) {
    try { await musicEl.play(); soundDock.classList.add("playing"); musicBtn.textContent="Ⅱ"; musicStatus.textContent="NOW PLAYING / KENDEVSEC RADIO"; }
    catch { musicStatus.textContent="TAP AGAIN TO PLAY / BROWSER BLOCKED"; }
  } else { musicEl.pause(); soundDock.classList.remove("playing"); musicBtn.textContent="▶"; musicStatus.textContent="SOUND EXPERIENCE / PAUSED"; }
});
musicEl?.addEventListener("ended",()=>{soundDock?.classList.remove("playing");musicBtn.textContent="▶";});

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  const [siteSnap, servicesSnap, articlesSnap, faqsSnap, testimonialsSnap, sectionsSnap] = await Promise.all([
    getDoc(doc(db, "site", "settings")),
    getDocs(collection(db, "services")),
    getDocs(collection(db, "articles")),
    getDocs(collection(db, "faqs")),
    getDocs(collection(db, "testimonials")),
    getDocs(collection(db, "sections"))
  ]);
  if (siteSnap.exists()) {
    settings = { ...settings, ...siteSnap.data() };
    const s = settings; applyTheme(s.theme||{}); configureMusic(s.musicUrl || "./assets/dj-intro.mp3", s.musicLabel || "LAGI TAMVAN / KENDEVSEC RADIO");
    $("#brandName").textContent = s.brandName || "KENDEVSEC";
    $("#heroTitle").textContent = s.heroTitle || "Build your digital presence with confidence.";
    $("#heroText").textContent = s.heroText || $("#heroText").textContent;
    $("#aboutText").textContent = s.aboutText || $("#aboutText").textContent;
    $("#contactTitle").textContent = s.contactTitle || "Let's make it happen.";
    $("#contactEmail").textContent = s.email || "kendevelopersecurity@gmail.com";
    $("#contactInstagram").textContent = s.instagram || "@kendevsec";
    const chatUrl = wa(s.whatsapp, "Halo KENDEVSEC, saya ingin konsultasi.");
    if (chatUrl) $("#whatsappLink").href = chatUrl;
    if (s.announcementEnabled && s.announcementText) { $("#announcement").textContent = s.announcementText; $("#announcement").classList.remove("hidden"); }
    if (s.maintenance === true) { $("#maintenance").classList.remove("hidden"); document.querySelector("main").classList.add("hidden"); }
    if (s.seoTitle) document.title = s.seoTitle;
    if (s.seoDescription) document.querySelector('meta[name="description"]')?.setAttribute("content", s.seoDescription);
  }
  renderServices(servicesSnap.docs.map(d => ({ id:d.id, ...d.data() })));
  renderArticles(articlesSnap.docs.map(d => d.data()));
  renderFaqs(faqsSnap.docs.map(d => d.data()));
  renderTestimonials(testimonialsSnap.docs.map(d => d.data()));
  renderSections(sectionsSnap.docs.map(d => d.data()));

  $("#orderForm").addEventListener("submit", async e => {
    e.preventDefault();
    const form = e.currentTarget;
    const feedback = $("#orderFeedback");
    // Honeypot: quiet success response to basic automated form submissions.
    if (form.elements.website?.value) { feedback.textContent = "Permintaan diterima."; form.reset(); return; }
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    const phone = String(data.phone || "").trim();
    if (phone.replace(/\D/g, "").length < 8) { feedback.textContent = "Masukkan nomor WhatsApp yang valid."; return; }
    if (!settings.whatsapp || !wa(settings.whatsapp, "test")) { feedback.textContent = "WhatsApp admin belum diatur. Silakan hubungi melalui kontak yang tersedia."; return; }
    feedback.textContent = "Mengirim permintaan...";
    // Open a tab during the user gesture so mobile browsers are less likely to block WhatsApp later.
    const waTab = window.open("about:blank", "_blank");
    try {
      // Coupons are not checked in the public browser. Discount validation must be server-side.
      const coupon = String(data.coupon || "").trim().toUpperCase().slice(0,40);
      await addDoc(collection(db, "orders"), {
        customer: String(data.customer || "").trim().slice(0,100),
        phone: phone.slice(0,24),
        service: String(data.service || "").trim().slice(0,120),
        message: String(data.message || "").trim().slice(0,1500),
        coupon, discount: 0, status: "new", createdAt: serverTimestamp()
      });
      feedback.textContent = "Permintaan tersimpan. WhatsApp akan dibuka...";
      const message = `Halo KENDEVSEC, saya ${data.customer}. Saya ingin memesan ${data.service}. Detail: ${data.message || "-"}. Kode promo untuk diverifikasi admin: ${coupon || "-"}.`;
      const chat = wa(settings.whatsapp, message);
      if (chat && waTab) waTab.location.replace(chat);
      else if (waTab) waTab.close();
      if (chat && !waTab) {
        feedback.innerHTML = `Permintaan tersimpan. <a href="${esc(chat)}" target="_blank" rel="noopener noreferrer">Buka WhatsApp</a>`;
      }
      form.reset();
    } catch (err) {
      if (waTab) waTab.close();
      console.error(err);
      feedback.textContent = "Gagal mengirim. Periksa koneksi dan konfigurasi Firebase, lalu coba lagi.";
    }
  });
} catch (error) {
  console.warn("Firebase belum dikonfigurasi / data belum tersedia:", error);
  renderServices([]); renderArticles([]); renderFaqs([]); renderTestimonials([]);
  $("#orderFeedback").textContent = "Website sedang menunggu konfigurasi Firebase.";
}
