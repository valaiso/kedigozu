// Doğruluk sayfası: bütün sistemin denetimi (motorlar/veri_dogrulama.py → tam_denetim). Her denetim için ne kontrol
// edildi, kaç kalemde, sonuç ne; ayrıntıda bulunan sorunlar (✗) ve doğrulanan örnekler (✓).

const DURUM = {
  GECTI: { metin: "GEÇTİ", sinif: "al" },
  UYARI: { metin: "UYARI", sinif: "uyari-rozet" },
  HATA: { metin: "HATA", sinif: "sat" },
};
let rapor = null;
let hepsiAcik = false;
const acik = new Set();

function ozetCiz(r) {
  const kutu = document.getElementById("ozet");
  if (!r || !r.zaman) {
    kutu.innerHTML = '<p class="soluk">Henüz denetim yapılmadı. "Şimdi kontrol et" ile başlatabilirsin.</p>';
    return;
  }
  const genel = r.hata ? DURUM.HATA : r.uyari ? DURUM.UYARI : DURUM.GECTI;
  const kart = (baslik, deger, sinif = "") => `<div class="kart"><div class="soluk kucuk">${baslik}</div><div class="dogruluk-sayi ${sinif}">${deger}</div></div>`;
  kutu.innerHTML = `
    <div class="kart dogruluk-genel">
      <div class="soluk kucuk">Genel sonuç</div>
      <div class="buyuk"><span class="rozet ${genel.sinif}">${r.hata ? "SORUN VAR" : r.uyari ? "UYARI VAR" : "HER ŞEY DOĞRU"}</span></div>
      <div class="soluk kucuk">Son denetim ${zamanMetni(r.zaman)}</div>
    </div>
    ${kart("Denetim", r.kontrol)}
    ${kart("Geçti", r.gecti, "arti")}
    ${kart("Uyarı", r.uyari, r.uyari ? "uyari-yazi" : "")}
    ${kart("Hata", r.hata, r.hata ? "eksi" : "")}
    ${r.onarimlar?.length ? `<div class="kart" style="grid-column:1/-1"><b>Onarılan seriler:</b> ${r.onarimlar.map(kacis).join(" · ")}</div>` : ""}`;
}

function ayrintiSatiri(k) {
  const satirlar = [
    ...k.bulgular.map((b) => `<li class="yanlis">✗ ${kacis(b)}</li>`),
    ...k.dogrulananlar.map((d) => `<li class="${d.startsWith("✗") ? "yanlis" : "dogru"}">${kacis(d)}</li>`),
  ];
  const govde = satirlar.length ? `<ul class="dogruluk-liste">${satirlar.join("")}</ul>`
    : `<p class="soluk kucuk" style="margin:0">✓ ${kacis(k.kapsam)} denetlendi; hiçbirinde sorun bulunmadı.</p>`;
  return `<tr class="dogruluk-ayrinti"><td></td><td colspan="4">${govde}</td></tr>`;
}

function kontrollerCiz(r) {
  const kutu = document.getElementById("kontroller");
  if (!r?.kontroller?.length) { kutu.innerHTML = ""; return; }
  const gruplar = [];
  for (const k of r.kontroller) {
    let g = gruplar.find((x) => x.ad === k.grup);
    if (!g) gruplar.push(g = { ad: k.grup, liste: [] });
    g.liste.push(k);
  }
  kutu.innerHTML = gruplar.map((g) => {
    const sorun = g.liste.filter((k) => k.durum !== "GECTI").length;
    return `<h3>${kacis(g.ad)} <span class="soluk">· ${g.liste.length - sorun}/${g.liste.length} geçti</span></h3>
      <div class="tablo-kutu"><table class="sik dogruluk-tablo"><thead><tr><th>Sonuç</th><th>Denetim</th><th>Ne kontrol edildi</th>
        <th>Kapsam</th><th>Bulgu</th></tr></thead><tbody>
        ${g.liste.map((k) => {
          const d = DURUM[k.durum] || DURUM.UYARI;
          const ac = hepsiAcik || acik.has(k.kimlik);
          return `<tr class="tik" data-kimlik="${kacis(k.kimlik)}">
              <td><span class="rozet ${d.sinif}">${d.metin}</span></td>
              <td><b>${kacis(k.ad)}</b></td>
              <td class="kucuk">${kacis(k.ne)}</td>
              <td class="soluk kucuk">${kacis(k.kapsam)}</td>
              <td class="kucuk">${kacis(k.sonuc)}${k.dogrulananlar.length ? ` · ${k.dogrulananlar.length} örnek` : ""} <span class="soluk">${ac ? "▾" : "▸"}</span></td>
            </tr>${ac ? ayrintiSatiri(k) : ""}`;
        }).join("")}
      </tbody></table></div>`;
  }).join("");
}

function ciz() {
  ozetCiz(rapor);
  kontrollerCiz(rapor);
  document.getElementById("ayrinti").textContent = hepsiAcik ? "Ayrıntıları gizle" : "Ayrıntıları göster";
}

async function yukle() {
  try {
    rapor = await getir("/api/dogruluk");
  } catch (e) {
    document.getElementById("ozet").innerHTML = `<p class="eksi">Rapor alınamadı: ${kacis(e.message)}</p>`;
    return;
  }
  ciz();
}

document.getElementById("kontrol-et").addEventListener("click", async (e) => {
  const dugme = e.currentTarget;
  dugme.disabled = true;
  dugme.textContent = "Denetleniyor…";
  try {
    const yanit = await fetch("/api/dogruluk/calistir", { method: "POST" });
    const veri = await yanit.json().catch(() => ({}));
    if (!yanit.ok) throw new Error(veri.detail || `HTTP ${yanit.status}`);
    rapor = veri;
    ciz();
  } catch (hata) {
    document.getElementById("ozet").insertAdjacentHTML("afterbegin", `<p class="eksi">Denetim çalışmadı: ${kacis(hata.message)}</p>`);
  } finally {
    dugme.disabled = false;
    dugme.textContent = "Şimdi kontrol et";
  }
});

document.getElementById("ayrinti").addEventListener("click", () => {
  hepsiAcik = !hepsiAcik;
  if (!hepsiAcik) acik.clear();
  ciz();
});

document.getElementById("kontroller").addEventListener("click", (e) => {
  const satir = e.target.closest("tr[data-kimlik]");
  if (!satir) return;
  const k = satir.dataset.kimlik;
  if (hepsiAcik) { hepsiAcik = false; rapor.kontroller.forEach((x) => acik.add(x.kimlik)); }
  acik.has(k) ? acik.delete(k) : acik.add(k);
  ciz();
});

yukle();
islerYukle();

// Zamanlanmış işler (ana panelden taşındı): her işin son çalışması
function isSatiri(i) {
  const durum = i.durum === "basarili" ? '<span class="durum ok">OK</span>'
    : i.durum === "hata" ? '<span class="durum hata">HATA</span>'
    : i.durum === "calisiyor" ? '<span class="durum">Çalışıyor</span>' : '<span class="soluk">–</span>';
  return `<tr><td>${kacis(IS_ADLARI[i.is] || i.is)}</td><td>${durum}</td>
    <td class="soluk">${zamanMetni(i.baslangic)}</td>
    <td class="soluk kucuk" title="${kacis(i.mesaj || "")}">${kacis((i.mesaj || "").slice(0, 90))}</td></tr>`;
}

const IS_ADLARI = {
  evren: "XU100 listesi", fiyat: "Fiyat (mumlar)", sinyal: "Teknik sinyal", mali_tablo: "Mali tablolar",
  kap: "KAP bildirimleri", takvim: "Bilanço takvimi", temettu: "Temettü ve tedbir", haber: "Hisse haberleri",
  makro: "Tahvil, kur, PPK", piyasa_haber: "Ekonomi haberleri", puanlama: "Haber puanlama",
  tv_karsilastir: "TradingView karşılaştırması", fvt_mali: "FVT mali tablolar", tufe: "TÜFE",
  mali_hesap: "Mali seriler ve oranlar", carpan: "Çarpanlar", evds_makro: "EVDS: politika faizi, anket, mevduat",
  piyasa_verisi: "XU100 çarpanları, analist, iştirak", degerleme: "Gerçek değer ve fiyat skoru", faiz: "Faiz Rüzgârı",
  ekonomist: "Ekonomist yorumu", veri_dogrulama: "Veri doğrulama", deger_isabet: "Gerçek değer isabeti", faktor: "Hisse sıralaması (bileşik puan)", olay_etkisi: "Bilanço sürprizi ve KAP olayları", meta_model: "AL olasılığı (meta model)", kurum_hedefleri: "Kurum hedef fiyatları", kurum_karnesi: "Kurumların isabet karnesi", baglam: "Rejim ölçümü",
};

async function islerYukle() {
  try {
    const isler = await getir("/api/isler");
    document.getElementById("isler").innerHTML = isler.isler.map(isSatiri).join("");
    const tv = isler.tv_karsilastirma;
    document.getElementById("tv-ozet").textContent = tv
      ? `Son TradingView karşılaştırması (${zamanMetni(tv.tarih)}): ${tv.ayni}/${tv.n} sinyal etiketi TradingView ile aynı.`
      : "";
  } catch (e) {
    document.getElementById("isler").innerHTML = `<tr><td colspan="4" class="eksi">Alınamadı: ${kacis(e.message)}</td></tr>`;
  }
}
