// Ortak yardımcılar: biçimlendirme, rozetler, veri çekme.

const GRUP_ADLARI = { sanayi: "Sanayi", banka: "Banka", sigorta: "Sigorta", holding: "Holding", gyo: "GYO", endeks: "Endeks", emtia: "Emtia" };
const ZD_ADLARI = { "4h": "4 saatlik", "1d": "Günlük" };

function kacis(metin) {
  return String(metin ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function sayi(x, basamak = 2) {
  if (x === null || x === undefined || Number.isNaN(x)) return "–";
  const r = Math.round(x * 10 ** basamak) / 10 ** basamak;     // sıfıra yuvarlanan eksi değer "-0,0" yazılmasın
  return new Intl.NumberFormat("tr-TR", { minimumFractionDigits: basamak, maximumFractionDigits: basamak }).format(r === 0 ? 0 : r);
}

function yuzde(x) {
  if (x === null || x === undefined) return "–";
  const d = x * 100;
  return `${d > 0 ? "+" : ""}${sayi(d, 2)}%`;
}

function yonSinifi(x) {
  if (!x) return "";
  return x > 0 ? "arti" : "eksi";
}

function etiketSinifi(etiket) {
  return { "GÜÇLÜ AL": "guclu-al", "AL": "al", "TUT": "tut", "SAT": "sat", "GÜÇLÜ SAT": "guclu-sat" }[etiket] || "yok";
}

function rozet(sinyal) {
  if (!sinyal) return '<span class="rozet yok">–</span>';
  return `<span class="rozet ${etiketSinifi(sinyal.etiket)}" title="Puan ${sayi(sinyal.puan, 3)}">${kacis(sinyal.etiket)}</span>`;
}

function oyRozeti(oy) {
  if (oy === null || oy === undefined) return '<span class="rozet yok">–</span>';
  if (oy > 0) return '<span class="rozet al">AL</span>';
  if (oy < 0) return '<span class="rozet sat">SAT</span>';
  return '<span class="rozet tut">TUT</span>';
}

function zamanMetni(iso) {
  if (!iso) return "–";
  const t = new Date(iso);
  if (iso.length <= 10) return t.toLocaleDateString("tr-TR");
  return t.toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
}

async function getir(url, secenek) {
  // Telefon kopyasında (yayin.js) veri şifreli paketlerden okunur; değişiklik yapılamaz.
  if (window.kediYayin) {
    if (secenek?.method && secenek.method !== "GET") throw new Error("Telefon kopyasında değişiklik yapılamaz.");
    return window.kediYayin.getir(url);
  }
  const yanit = await fetch(url, secenek);
  if (!yanit.ok) throw new Error(`${url}: ${yanit.status}`);
  return yanit.json();
}

async function guncellemeBaslat(tur, dugme) {
  dugme.disabled = true;
  const eski = dugme.textContent;
  try {
    const s = await getir(`/api/guncelle/${tur}`, { method: "POST" });
    dugme.textContent = "Güncelleme başladı…";
    setTimeout(() => location.reload(), 25000);
    return s;
  } catch (e) {
    dugme.textContent = "Başlatılamadı";
    setTimeout(() => { dugme.textContent = eski; dugme.disabled = false; }, 3000);
  }
}

// Haber puanı rozeti (0-100, 50 nötr). Dil modelsiz geçici puan "*" ile işaretlenir.
// geminiVar === false: Gemini anahtarı yok; olay yoksa "kapalı", yalnızca kural tablosundan gelen puan soluk "kural".
function puanRozeti(p, geminiVar = true) {
  if (geminiVar === false) {
    if (!p || !(p.olay_sayisi > 0)) {
      return '<span class="rozet yok" title="Gemini anahtarı tanımlı değil: haber puanı kapalı. Yalnızca kural tablosundaki olaylar (geri alım, temettü, devre kesici …) puanlanır; şu an öyle bir olay yok.">kapalı</span>';
    }
    const sinifK = p.puan >= 60 ? "al" : p.puan <= 40 ? "sat" : "tut";
    const baslikK = `Haber puanı ${sayi(p.puan, 1)} · ${p.olay_sayisi} olay · ${zamanMetni(p.zaman)} · Gemini anahtarı yok: yalnızca kural tablosu, haberlerin çoğu değerlendirilmedi`;
    return `<span class="rozet puan ${sinifK} guvensiz" title="${kacis(baslikK)}">${sayi(p.puan, 0)} <span class="kucuk">kural</span></span>`;
  }
  if (!p) return '<span class="rozet yok" title="Henüz puanlanmadı">–</span>';
  const sinif = p.puan >= 60 ? "al" : p.puan <= 40 ? "sat" : "tut";
  const not = p.dil_modelsiz ? " · geçici: dil modelsiz puan (Gemini değerlendirmesi bekleniyor)" : "";
  const baslik = `Haber puanı ${sayi(p.puan, 1)} · ${p.olay_sayisi ?? 0} olay · ${zamanMetni(p.zaman)}${not}`;
  return `<span class="rozet puan ${sinif}" title="${kacis(baslik)}">${sayi(p.puan, 0)}${p.dil_modelsiz ? "*" : ""}</span>`;
}

function etkiOku(etki) {
  if (etki === null || etki === undefined) return '<span class="soluk" title="Puanlanmayı bekliyor">…</span>';
  if (etki > 0.005) return `<span class="arti" title="Etki ${sayi(etki, 2)}">▲</span>`;
  if (etki < -0.005) return `<span class="eksi" title="Etki ${sayi(etki, 2)}">▼</span>`;
  return `<span class="soluk" title="Etki ${sayi(etki, 2)}">■</span>`;
}

// Fiyat skoru rozeti (0 ucuz … 100 aşırı pahalı)
function fiyatSkoruRozeti(d) {
  if (!d || d.fiyat_skoru === null || d.fiyat_skoru === undefined) return '<span class="rozet yok" title="Hesaplanmadı">–</span>';
  const s = d.fiyat_skoru;
  const sinif = s < 40 ? "al" : s >= 60 ? "sat" : "tut";
  // Güveni düşük değerleme (modeller birbirinden çok farklı) soluk gösterilir: rozet baskın görünmesin
  const dusuk = d.guven === "dusuk";
  const baslik = `Fiyat skoru ${sayi(s, 1)}: ${d.bant || ""}${dusuk ? " · güven düşük: değerleme modelleri birbirinden çok farklı sonuç veriyor" : ""}`;
  return `<span class="rozet puan ${sinif}${dusuk ? " guvensiz" : ""}" title="${kacis(baslik)}">${sayi(s, 0)} <span class="kucuk">${kacis(d.bant || "")}${dusuk ? " ?" : ""}</span></span>`;
}

// Rozetler: bilanço (son 7 gün kırmızı), temettü (durum, brüt, verim), aktif tedbir
function tarihKisa(t) {
  return t ? `${t.slice(8, 10)}.${t.slice(5, 7)}` : "–";
}

function rozetlerHtml(r) {
  if (!r) return "";
  const parca = [];
  const b = r.bilanco;
  if (b) {
    parca.push(b.durum === "açıklandı"
      ? `<span class="minirozet" title="${kacis(b.donem)} finansal rapor ${kacis(b.aciklama)} tarihinde açıklandı">Bilanço ${kacis(b.donem)} açıklandı</span>`
      : `<span class="minirozet ${b.kirmizi ? "kirmizi" : ""}" title="${kacis(b.donem)} finansal raporu için son gün ${kacis(b.son_gun)}">Bilanço ${kacis(b.donem)} · ${b.kalan_gun} gün</span>`);
  }
  const t = r.temettu;
  if (t) {
    parca.push(`<span class="minirozet temettu" title="Brüt ${sayi(t.brut_tl, 4)} TL, net ${sayi(t.net_tl, 4)} TL · hak kullanım ${kacis(t.hak_kullanim || "–")}, ödeme ${kacis(t.odeme || "–")} · kaynak ${kacis(t.kaynak)}">
      Temettü ${sayi(t.brut_tl, 2)} TL${t.verim != null ? ` · %${sayi(t.verim * 100, 1)}` : ""} · ${tarihKisa(t.hak_kullanim)} · ${kacis(t.durum || "")}</span>`);
  }
  if (r.tedbir) parca.push('<span class="minirozet kirmizi" title="SPK / Borsa İstanbul tedbiri aktif">TEDBİR</span>');
  return parca.length ? `<div class="rozetler">${parca.join("")}</div>` : "";
}

// Bar kapanış anı (Türkiye saati). 4 saatlik bar: başlangıç + 4 saat, en geç o günün seans sonu (18:10);
// günlük bar: o günün 18:10'u. Sinyal mantığına dokunmaz; yalnızca ekranda "bar henüz kapanmadı" notu için.
function barKapanisi(zaman, zd) {
  if (!zaman) return null;
  const z = String(zaman);
  const seansSonu = new Date(`${z.slice(0, 10)}T18:10:00+03:00`);
  if (zd === "1d" || z.length <= 10) return seansSonu;
  const bitis = new Date(new Date(z).getTime() + 4 * 3600 * 1000);
  return bitis < seansSonu ? bitis : seansSonu;
}

// Son bar henüz kapanmadıysa kısa not (ör. "bar kapanmadı · kapanış 17:00"), kapandıysa boş metin.
function acikBarNotu(zaman, zd) {
  const k = barKapanisi(zaman, zd);
  if (!k || Date.now() >= k.getTime()) return "";
  const saat = k.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
  return `bar kapanmadı · kapanış ${saat}`;
}

// Sade görünüm: uzun açıklama notları (p.not) iki satıra katlanır, tıklayınca açılır. Sayfalar içeriği sonradan
// doldurduğu için yeni eklenen notlar da izlenir. Kimliği olan notlar (durum mesajı gibi) katlanmaz.
const NOT_KATLAMA_SINIRI = 200;
function notlariKatla(kok = document) {
  kok.querySelectorAll?.("p.not:not([data-katlama]):not([id])").forEach((p) => {
    p.dataset.katlama = "1";
    if (p.textContent.trim().length > NOT_KATLAMA_SINIRI) p.classList.add("katli");
  });
}
document.addEventListener("click", (e) => {
  const p = e.target.closest("p.not.katli, p.not.acik");
  if (!p || e.target.closest("a, button")) return;
  p.classList.toggle("katli");
  p.classList.toggle("acik");
});
let notZamanlayici = null;
new MutationObserver(() => {
  clearTimeout(notZamanlayici);
  notZamanlayici = setTimeout(() => notlariKatla(), 50);
}).observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener("DOMContentLoaded", () => notlariKatla());
