// Bildirim sayfası: fiyat alarmları (isler/fiyat_alarmi.py). Kurma ve silme bilgisayardaki sitede; telefon kopyasında
// yalnız liste görünür. Tetiklenen alarm Telegram'a 1 saat arayla iki kez bildirilir.

const RENKLER = { yukari: "var(--al)", asagi: "var(--sat)", bant: "var(--turkuaz)" };
const OKLAR = { yukari: "▲", asagi: "▼", bant: "↕" };
let alarmTuru = "hedef";
let anlikFiyat = null;          // önizleme: seçili hissenin şu anki fiyatı

const sayiOku = (metin) => {
  const s = String(metin || "").trim().replace(/\s/g, "");
  if (!s) return null;
  const n = Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);   // "1.234,56", "320,5", "320.5"
  return Number.isFinite(n) ? n : NaN;
};

const yuzdeHap = (x) => (x === null || x === undefined ? "" :
  `<span class="hap ${yonSinifi(x)}">${x > 0 ? "+" : x < 0 ? "−" : ""}%${sayi(Math.abs(x) * 100, 2)}</span>`);

function mesajYaz(metin, sinif = "") {
  const p = document.getElementById("alarm-mesaj");
  p.textContent = metin;
  p.className = `alarm-mesaj ${sinif}`;
}

// --- kartlar ----------------------------------------------------------------------------------------------

function ray(a) {
  // Eklendiği fiyattan alarmın çalışacağı eşiğe ilerleme (fiyata gelince: girilen fiyat; ± %: aralığın yakın kenarı).
  const son = a.son_fiyat, bas = a.kurulus_fiyati, bit = a.esik;
  const ilerleme = son && bit !== bas ? (son - bas) / (bit - bas) : 1;
  const yuzde = (x) => `${Math.max(0, Math.min(1, x)) * 100}%`;
  const hedef = a.tur === "bant" ? `Aralık ${sayi(a.bant_alt)}–${sayi(a.bant_ust)}` : `Hedef ${sayi(a.fiyat)}`;
  return `<div class="alarm-ray">
      <div class="ray"><span class="dolgu" style="width:${yuzde(ilerleme)}"></span>
        <i class="isaret" style="left:${yuzde(ilerleme)}" title="Son fiyat ${sayi(son)}"></i></div>
      <div class="ray-etiket"><span>Eklendiğinde ${sayi(bas)}</span><span>${hedef}</span></div>
    </div>`;
}

function aktifKarti(a) {
  return `<article class="alarm-kart" style="--renk:${RENKLER[a.tur]}">
      <header>
        <a href="hisse.html?kod=${encodeURIComponent(a.kod)}" class="alarm-kod">${kacis(a.kod)}</a>
        <span class="alarm-ad">${kacis(a.ad && a.ad !== a.kod ? a.ad : "")}</span>
        <button class="ikon-dugme alarm-sil" data-sil="${a.id}" title="Alarmı sil" aria-label="Alarmı sil">×</button>
      </header>
      <div class="alarm-kosul"><span class="ok">${OKLAR[a.tur]}</span> ${kacis(a.kosul)}</div>
      ${ray(a)}
      <footer>
        <span class="hap">Son <b>${sayi(a.son_fiyat)}</b> TL</span>
        <span title="Son fiyattan en yakın sınıra uzaklık">${yuzdeHap(a.uzaklik)}</span>
        <span class="soluk kucuk zaman">${zamanMetni(a.kurulus)}</span>
      </footer>
    </article>`;
}

function iletiDurumu(a) {
  const ilk = a.bildirim ? `<span class="durum tamam" title="${kacis(zamanMetni(a.bildirim))}">1/2 ✓</span>`
    : '<span class="durum bekliyor">1/2 bekliyor</span>';
  const ikinci = a.bildirim2 ? `<span class="durum tamam" title="${kacis(zamanMetni(a.bildirim2))}">2/2 ✓</span>`
    : `<span class="durum bekliyor">2/2 ${a.sonraki_bildirim ? zamanMetni(a.sonraki_bildirim).split(" ").pop() : "bekliyor"}</span>`;
  return ilk + ikinci;
}

function tetiklenenSatiri(a) {
  const yon = a.tetik_fiyat >= (a.referans || a.fiyat) ? "yukari" : "asagi";
  return `<article class="alarm-olay" style="--renk:${RENKLER[yon]}">
      <i class="nokta"></i>
      <div class="olay-govde">
        <div class="olay-ust">
          <a href="hisse.html?kod=${encodeURIComponent(a.kod)}" class="alarm-kod">${kacis(a.kod)}</a>
          <span class="hap"><span class="ok">${OKLAR[yon]}</span> <b>${sayi(a.tetik_fiyat)}</b> TL</span>
          ${yuzdeHap(a.degisim)}
        </div>
        <div class="soluk kucuk">${kacis(a.kosul)} · ${zamanMetni(a.tetik_zaman)}</div>
      </div>
      <div class="olay-telegram" title="Telegram iletileri">${iletiDurumu(a)}</div>
      <button class="ikon-dugme alarm-sil" data-sil="${a.id}" title="Listeden sil" aria-label="Listeden sil">×</button>
    </article>`;
}

async function yukle() {
  const r = await getir("/api/alarmlar");
  const bugun = new Date().toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });
  document.getElementById("sayac-aktif").textContent = r.aktif.length;
  document.getElementById("sayac-bugun").textContent = r.tetiklenen
    .filter((a) => a.tetik_zaman && new Date(a.tetik_zaman).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" }) === bugun).length;
  document.getElementById("aktif-sayi").textContent = r.aktif.length ? `${r.aktif.length} alarm` : "";
  document.getElementById("aktif").innerHTML = r.aktif.map(aktifKarti).join("")
    || '<div class="alarm-bos"><span>🔕</span>Aktif alarm yok. Yukarıdan bir hisse ve fiyat girerek kurabilirsin.</div>';
  document.getElementById("tetiklenen").innerHTML = r.tetiklenen.map(tetiklenenSatiri).join("")
    || '<div class="alarm-bos kucuk">Henüz tetiklenen alarm yok.</div>';
  document.getElementById("kontrol-notu").innerHTML =
    `Fiyat hafta içi seans boyunca 15 dakikada bir kontrol edilir; iki kontrol arasında değip dönen fiyat da yakalanır.
     Son kontrol: <b>${zamanMetni(r.son_calisma)}</b>.${r.telegram ? "" : ' <span class="eksi">Telegram tanımlı değil: ileti gitmez.</span>'}`;
}

// --- form ve önizleme ---------------------------------------------------------------------------------------

function onizlemeYaz() {
  const kutu = document.getElementById("alarm-onizleme");
  const kod = document.getElementById("alarm-kod").value.trim().toUpperCase();
  const fiyat = sayiOku(document.getElementById("alarm-fiyat").value);
  const y = sayiOku(document.getElementById("alarm-yuzde").value);
  if (!kod || !anlikFiyat || anlikFiyat.kod !== kod) { kutu.hidden = true; return; }
  const simdi = anlikFiyat.fiyat;
  let govde = `<span class="hap"><b>${kacis(kod)}</b> şu an <b>${sayi(simdi)}</b> TL</span>`;
  if (fiyat && !Number.isNaN(fiyat)) {
    if (alarmTuru === "bant" && y && !Number.isNaN(y)) {
      const ust = fiyat * (1 + y / 100), alt = fiyat * (1 - y / 100);
      const esik = simdi > ust ? ust : simdi < alt ? alt : null;     // aralığa girince: yakın kenar
      govde += `<span class="hap">↕ Aralık <b>${sayi(alt)}–${sayi(ust)}</b></span>` + (esik === null
        ? '<span class="hap">fiyat zaten bu aralıkta: ilk kontrolde çalışır</span>'
        : `<span class="hap">${esik < simdi ? "▼ İnince" : "▲ Çıkınca"} <b>${sayi(esik)}</b> ${yuzdeHap(esik / simdi - 1)}</span>`);
    } else if (alarmTuru === "hedef") {
      const yukari = fiyat >= simdi;
      govde += `<span class="hap">${yukari ? "▲ Yükselince" : "▼ Düşünce"} <b>${sayi(fiyat)}</b> ${yuzdeHap(fiyat / simdi - 1)}</span>`;
    }
  }
  kutu.innerHTML = govde;
  kutu.hidden = false;
}

let fiyatZamanlayici = null;
function anlikFiyatGetir() {
  clearTimeout(fiyatZamanlayici);
  const kod = document.getElementById("alarm-kod").value.trim().toUpperCase();
  if (kod.length < 3 || window.kediYayin) { anlikFiyat = null; onizlemeYaz(); return; }
  fiyatZamanlayici = setTimeout(async () => {
    try {
      anlikFiyat = await getir(`/api/alarmlar/fiyat/${encodeURIComponent(kod)}`);
    } catch { anlikFiyat = null; }
    onizlemeYaz();
  }, 400);
}

function turSec(tur) {
  alarmTuru = tur;
  document.querySelectorAll(".secmeli button").forEach((b) => {
    const secili = b.dataset.tur === tur;
    b.classList.toggle("secili", secili);
    b.setAttribute("aria-checked", secili);
  });
  document.querySelector(".alan-yuzde").hidden = tur !== "bant";
  document.getElementById("alarm-yuzde").required = tur === "bant";
  onizlemeYaz();
}

async function evrenYukle() {
  try {
    const evren = await getir("/api/evren");
    document.getElementById("alarm-evren").innerHTML = evren
      .map((h) => `<option value="${kacis(h.kod)}">${kacis(h.ad)}${h.takipte ? " · takipte" : ""}</option>`).join("");
  } catch { /* liste yoksa elle yazılır */ }
}

document.querySelector(".secmeli").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-tur]");
  if (b) turSec(b.dataset.tur);
});
document.getElementById("alarm-kod").addEventListener("input", anlikFiyatGetir);
document.getElementById("alarm-fiyat").addEventListener("input", onizlemeYaz);
document.getElementById("alarm-yuzde").addEventListener("input", onizlemeYaz);

document.getElementById("alarm-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const kod = document.getElementById("alarm-kod").value.trim().toUpperCase();
  const fiyat = sayiOku(document.getElementById("alarm-fiyat").value);
  const y = alarmTuru === "bant" ? sayiOku(document.getElementById("alarm-yuzde").value) : null;
  if (!fiyat || Number.isNaN(fiyat) || fiyat <= 0) return mesajYaz("Fiyatı sayı olarak gir (ör. 320,50).", "eksi");
  if (alarmTuru === "bant" && (!y || Number.isNaN(y) || y <= 0 || y >= 100)) return mesajYaz("Uzaklığı 0 ile 100 arasında gir (ör. 5).", "eksi");
  const dugme = e.target.querySelector(".ana-dugme");
  dugme.disabled = true;
  mesajYaz("Şu anki fiyat alınıyor…", "soluk");
  try {
    const yanit = await fetch("/api/alarmlar", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kod, fiyat, yuzde: y }),
    });
    const veri = await yanit.json().catch(() => ({}));
    if (!yanit.ok) return mesajYaz(veri.detail || "Kurulamadı.", "eksi");
    mesajYaz(`✓ ${veri.mesaj}`, "arti");
    e.target.reset();
    anlikFiyat = null;
    turSec(alarmTuru);
    await yukle();
  } finally {
    dugme.disabled = false;
  }
});

document.querySelector("main").addEventListener("click", async (e) => {
  const dugme = e.target.closest("button[data-sil]");
  if (!dugme) return;
  if (!confirm("Bu alarm silinsin mi?")) return;
  const yanit = await fetch(`/api/alarmlar/${dugme.dataset.sil}`, { method: "DELETE" });
  mesajYaz(yanit.ok ? "Alarm silindi." : "Silinemedi.", yanit.ok ? "" : "eksi");
  await yukle();
});

evrenYukle();
yukle().catch((e) => {
  document.getElementById("aktif").innerHTML = `<div class="alarm-bos eksi">Veri alınamadı: ${kacis(e.message)}</div>`;
});
