// Hisse sayfası: gerçek değer, fiyat skoru, analist konsensüsü, kalite skorları, faiz duyarlılığı ve makro etki.

const BILESEN_ADLARI = {
  tarihsel: "Tarihsel (kendi geçmişi)", sektorel: "Sektörel (eşlerine göre)", kalite: "Kaliteye göre (ÖK kârlılığı)",
  gercek_deger: "Gerçek değere göre", analist: "Analist hedefine göre",
};
const BILESEN_IPUCLARI = {
  tarihsel: "Çarpanların hissenin kendi geçmişindeki yüzdeliği",
  sektorel: "Çarpanların sektör eşleri arasındaki yüzdeliği; dar sektör az eşliyse geniş sektörle harmanlanır",
  kalite: "PD/DD, bütün XU100'de özsermaye kârlılığına göre beklenen PD/DD ile kıyaslanır (Damodaran regresyonu); açıklama gücü (R²) düşükse ağırlığı azalır",
  gercek_deger: "Gerçek değere göre prim; değerleme belirsizse (güven düşük) güvenlik payı genişler (Morningstar yaklaşımı)",
  analist: "Fiyatın medyan analist hedefine göre primi; hedefler iyimser olduğu için %10 düşülür (en az 3 analist, 45 günden yeni)",
};

function tl(x) { return x === null || x === undefined ? "–" : `${sayi(x, 2)} TL`; }

function aralikSeridi(d) {
  const lo = Math.min(d.alt, d.fiyat, d.analist?.dusuk ?? d.alt) * 0.9;
  const hi = Math.max(d.ust, d.fiyat, d.analist?.yuksek ?? d.ust) * 1.05;
  const x = (v) => `${((v - lo) / (hi - lo)) * 100}%`;
  return `<div class="serit" title="Gerçek değer aralığı (mavi), baz (mavi çizgi), fiyat (beyaz çizgi)">
      <div class="aralik" style="left:${x(d.alt)}; width:calc(${x(d.ust)} - ${x(d.alt)})"></div>
      <div class="isaret baz" style="left:${x(d.baz)}"></div><div class="isaret" style="left:${x(d.fiyat)}"></div></div>
    <div class="ust-satir kucuk soluk"><span>${sayi(lo, 0)}</span><span>${sayi(hi, 0)}</span></div>`;
}

function degerKarti(d) {
  if (!d?.baz) return `<div class="kart"><div class="baslik">Gerçek değer</div><p class="soluk">${kacis(d?.birlesim?.neden || "Hesaplanamadı")}</p></div>`;
  const iskonto = d.prim < 0;
  return `<div class="kart deger-ozet">
    <div class="ust-satir"><span class="baslik">Gerçek değer</span><span class="soluk kucuk">${d.birlesim?.uygulanan ?? "?"} model · güven ${kacis(d.guven_adi)}</span></div>
    <div class="buyuk">${sayi(d.alt, 0)}–${sayi(d.ust, 0)} TL <span class="soluk kucuk">baz ${sayi(d.baz, 2)}</span></div>
    <div>Fiyat ${sayi(d.fiyat, 2)} · <span class="${iskonto ? "arti" : "eksi"}">${iskonto ? "iskonto" : "prim"} %${sayi(Math.abs(d.prim) * 100, 0)}</span></div>
    ${onIkiAyKiyasi(d)}
    ${aralikSeridi(d)}
    ${kurumFarkiUyarisi(d)}
  </div>`;
}

// Gerçek değer bugünün değeri; kurum hedefleri 12 ay sonrası. İkisini aynı ölçekte yan yana göster.
function onIkiAyKiyasi(d) {
  const h = d.ek?.hedef_12ay?.hedef;
  const k = d.modeller?.kurum;
  if (!h) return "";
  return `<div class="kucuk" title="Gerçek değer ve aralık bugünün değeridir. Kurum hedefleri 12 ay sonrası içindir; kıyaslanacak sayı 12 ay sonra beklenen fiyattır">
    12 ay sonra beklenen <b>${sayi(h, 2)} TL</b>${k?.medyan_hedef ? ` · kurumların 12 aylık hedefi (medyan, ${k.kurum_sayisi} kurum) <b>${sayi(k.medyan_hedef, 2)} TL</b>` : ""}
    <span class="soluk">· yukarıdaki aralık bugünün değeri</span></div>`;
}

// Modellerin birleşimi kurumların bugünkü karşılığından çok saparsa nedenleriyle uyarı (genel denetim, 30 Ekim)
const KURUM_FARK_ESIGI = 0.4;
function kurumFarkiUyarisi(d) {
  const k = d.modeller?.kurum?.deger;
  if (!k || !d.baz) return "";
  const fark = d.baz / k - 1;
  if (Math.abs(fark) <= KURUM_FARK_ESIGI) return "";
  const nedenler = Object.values(d.modeller || {})
    .map((m) => m.agirlik_notu || (m.deger ? null : m.neden) ? `${m.ad}: ${m.agirlik_notu || m.neden}` : null).filter(Boolean);
  return `<p class="uyari kucuk" style="margin-top:8px">Modellerin birleşimi, kurum hedeflerinin bugünkü karşılığından
    (${sayi(k, 2)} TL) %${sayi(Math.abs(fark) * 100, 0)} ${fark < 0 ? "düşük" : "yüksek"}. Geçmiş kâra ve çarpanlara bakan modeller büyümeyi,
    sipariş bakiyesini ya da sektöre özgü durumları göremeyebilir; aşağıdaki model tablosuna bak.
    ${nedenler.length ? `<br>${nedenler.map(kacis).join("<br>")}` : ""}</p>`;
}

function skorKarti(d) {
  const b = d?.bilesenler || {};
  const satir = (ad) => {
    const x = b[ad];
    if (!x || x.puan === null || x.puan === undefined) return `<div class="kucuk soluk" title="${kacis(BILESEN_IPUCLARI[ad] || "")}">${kacis(BILESEN_ADLARI[ad])}: yok</div>`;
    const renk = x.puan < 40 ? "var(--al)" : x.puan >= 60 ? "var(--sat)" : "var(--tut)";
    const ag = d?.skor_agirliklari?.[ad];
    return `<div class="kucuk" title="${kacis(BILESEN_IPUCLARI[ad] || "")}">${kacis(BILESEN_ADLARI[ad])} <b>${sayi(x.puan, 0)}</b>
      ${ag != null ? `<span class="soluk">· ağırlık ${sayi(ag * (x.agirlik_carpani ?? 1), 2)}</span>` : ""}
      <div class="bilesen-cubuk"><span style="width:${x.puan}%; background:${renk}"></span></div></div>`;
  };
  return `<div class="kart">
    <div class="ust-satir"><span class="baslik">Fiyat skoru</span><span class="soluk kucuk">0 ucuz · 100 aşırı pahalı</span></div>
    <div class="buyuk-puan">${fiyatSkoruRozeti(d)}</div>
    ${["tarihsel", "sektorel", "kalite", "gercek_deger", "analist"].map(satir).join("")}
    ${(d?.skor_notlari || []).map((n) => `<p class="uyari">${kacis(n)}</p>`).join("")}
    <p class="not">Beş bileşenin ağırlıklı ortalaması (bileşen adının üstüne gelince yöntemi görünür).${d?.eksik_bilesenler?.length ? " Eksik bileşenin ağırlığı diğerlerine dağıtıldı." : ""}</p>
  </div>`;
}

function analistKarti(a, fiyat) {
  if (!a) return '<div class="kart"><div class="baslik">Analist konsensüsü</div><p class="soluk kucuk">Veri yok.</p></div>';
  const fark = fiyat ? a.medyan / fiyat - 1 : null;
  return `<div class="kart">
    <div class="ust-satir"><span class="baslik">Analist konsensüsü</span><span class="soluk kucuk">${a.analist_sayisi} analist · ${kacis(a.tarih)}</span></div>
    <div class="buyuk-puan"><b style="font-size:22px">${sayi(a.medyan, 2)} TL</b><span class="soluk kucuk">medyan hedef${fark !== null ? ` · ${fark > 0 ? "+" : ""}%${sayi(fark * 100, 0)}` : ""}</span></div>
    <div class="kucuk">Aralık ${sayi(a.dusuk, 0)}–${sayi(a.yuksek, 0)} TL · ortalama ${sayi(a.ortalama, 2)}</div>
    <p class="not">Kaynak ${kacis(a.kaynak)}. Ortalamaya girmez, karşılaştırma için gösterilir.</p>
  </div>`;
}

function makroKarti(m) {
  if (!m) return '<div class="kart"><div class="baslik">Makro etki</div><p class="soluk kucuk">Hesaplanmadı.</p></div>';
  const a = m.ayrinti || {};
  const yon = m.makro_etki > 0.02 ? "lehine" : m.makro_etki < -0.02 ? "aleyhine" : "nötr";
  return `<div class="kart">
    <div class="ust-satir"><span class="baslik">Faiz duyarlılığı ve makro etki</span><span class="soluk kucuk">${kacis(m.tarih)}</span></div>
    <div class="buyuk-puan"><b style="font-size:22px" class="${m.makro_etki > 0.02 ? "arti" : m.makro_etki < -0.02 ? "eksi" : "soluk"}">${m.makro_etki > 0 ? "+" : ""}${sayi(m.makro_etki, 2)}</b>
      <span class="soluk kucuk">bugünkü ortam bu hisse için ${yon} (−1 … +1)</span></div>
    <div class="kucuk">Faiz duyarlılığı <b>${sayi(m.duyarlilik, 2)}</b> (faiz düşüşünden ${m.duyarlilik > 0.5 ? "çok" : m.duyarlilik > 0.2 ? "orta" : "az"} yararlanır) · beta ${sayi(m.beta, 2)}</div>
    <div class="kucuk soluk">Sektör ön bilgisi ${sayi(a.sektor_on_bilgi, 1)} (${kacis(a.sektor || "–")}) ·
      bilanço ${a.bilanco_payi != null ? sayi(a.bilanco_payi, 2) : "–"}${a.net_borc_favok != null ? ` (net borç/FAVÖK ${sayi(a.net_borc_favok, 1)})` : ""} ·
      geçmiş tepki ${a.gecmis_tepki != null ? sayi(a.gecmis_tepki, 2) : "–"}${a.gecmis_egim_yuzde_puan_basina != null ? ` (2Y faiz 1 puan artınca haftalık %${sayi(a.gecmis_egim_yuzde_puan_basina, 1)})` : ""}</div>
    <p class="not">Makro etki = 0,6 × Faiz Rüzgârı (${a.faiz_ruzgari != null ? sayi(a.faiz_ruzgari, 0) : "–"}) × duyarlılık + 0,25 × piyasa puanı × beta + 0,15 × sektör puanı.</p>
  </div>`;
}

function hesapMetni(m) {
  const gizle = new Set(["ad", "agirlik", "deger", "neden"]);
  // Büyük tutarlar milyar TL; tam sayılar (eş ve ölçüm sayısı gibi) ondalıksız
  const yaz = (v) => typeof v !== "number" ? JSON.stringify(v)
    : Math.abs(v) >= 1e6 ? sayi(v / 1e9, 2) + " mlr" : Number.isInteger(v) ? sayi(v, 0) : sayi(v, 3);
  return Object.entries(m).filter(([k]) => !gizle.has(k)).map(([k, v]) => {
    if (v && typeof v === "object" && !Array.isArray(v)) return `${k}: ${Object.entries(v).map(([a, b]) => `${a} ${b == null ? "–" : yaz(b)}`).join(", ")}`;
    if (Array.isArray(v)) return `${k}: ${v.map((x) => typeof x === "object" ? `${x.kod} %${sayi(x.oran, 1)} → ${sayi(x.deger / 1e9, 1)} mlr` : x).join("; ")}`;
    return `${k}: ${v == null ? "–" : yaz(v)}`;
  }).join("\n");
}

function modelTablosu(d) {
  const ag = d.birlesim?.agirliklar || {};
  const satirlar = Object.entries(d.modeller || {}).map(([ad, m]) => `<tr>
      <td><details class="model"><summary>${kacis(m.ad)}</summary><pre class="hesap">${kacis(hesapMetni(m))}</pre></details></td>
      <td class="sag">${m.deger ? sayi(m.deger, 2) : "–"}</td>
      <td class="sag soluk">${ag[ad] != null ? "%" + sayi(ag[ad] * 100, 0) : m.alt_sinir ? "alt sınır" : "–"}</td>
      <td class="kucuk soluk sarmal">${kacis(m.neden || m.aciklama || (m.sektor ? `Eşler: ${m.sektor} (${m.es_sayisi})` : ""))}${
        m.agirlik_notu ? ` <span class="uyari-metin">${kacis(m.agirlik_notu)}.</span>` : ""}${
        m.piyasanin_ima_ettigi_roe != null ? ` Piyasa fiyatı %${sayi(m.piyasanin_ima_ettigi_roe * 100, 1)} ROE ima ediyor (son 12 ay %${sayi(m.roe * 100, 1)}).` : ""}</td></tr>`).join("");
  const v = d.varsayimlar || {};
  return `<div class="tablo-kutu"><table class="olay-tablosu">
      <thead><tr><th>Model (hesap için tıkla)</th><th class="sag">Değer (TL)</th><th class="sag">Ağırlık</th><th>Not</th></tr></thead>
      <tbody>${satirlar}</tbody></table></div>
    <p class="not">Varsayımlar: bilanço ${kacis(v.bilanco_donemi || "–")}${v.tms29 === false ? " (TMS 29 uygulamıyor)" : ""} ·
      reel risksiz faiz %${v.reel_risksiz != null ? sayi(v.reel_risksiz * 100, 1) : "–"} (10 yıllık %${sayi(v.TR10Y, 2)}, 24 ay enflasyon beklentisi %${sayi(v.TUFE_BEK_24AY, 1)}) ·
      beta ${sayi(v.beta, 2)}${v.beta_varsayilan ? " (varsayılan)" : ""} · hisse risk primi %${sayi((v.hisse_risk_primi || 0) * 100, 1)} ·
      reel özsermaye maliyeti %${v.ozsermaye_maliyeti_reel != null ? sayi(v.ozsermaye_maliyeti_reel * 100, 1) : "–"}.
      Tutarlar bugünün TL'sinde. Varsayımlar ayarlar.yaml → degerleme.</p>`;
}

function bilesenTablosu(d) {
  const satirlar = [];
  for (const ad of ["tarihsel", "sektorel"]) {
    const b = d.bilesenler?.[ad];
    for (const [c, x] of Object.entries(b?.kalemler || {})) {
      satirlar.push(`<tr><td>${kacis(BILESEN_ADLARI[ad])}</td><td>${kacis({ fk: "F/K", pd_dd: "PD/DD", fd_favok: "FD/FAVÖK", fd_s: "FD/S" }[c] || c)}</td>
        <td class="sag">${x.deger != null ? sayi(x.deger, 2) : "–"}</td><td class="sag soluk">${x.medyan != null ? sayi(x.medyan, 2) : "–"}</td>
        <td class="sag">${sayi(x.yuzdelik, 0)}</td><td class="kucuk soluk">${kacis(x.not || "")}</td></tr>`);
    }
  }
  const s = d.bilesenler?.sektorel;
  return `<div class="tablo-kutu"><table class="sik">
      <thead><tr><th>Bileşen</th><th>Çarpan</th><th class="sag">Bugün</th><th class="sag">Medyan</th><th class="sag">Yüzdelik</th><th></th></tr></thead>
      <tbody>${satirlar.join("") || '<tr><td colspan="6" class="soluk">Yok</td></tr>'}</tbody></table></div>
    <p class="not">Tarihsel: hissenin TMS 29 sonrası günlük çarpan geçmişindeki sırası. Sektörel: ${kacis(s?.sektor || "–")} içindeki ${s?.es_sayisi ?? 0} hisseye göre sırası (FVT çarpanları, haftalık).
      Yüzdelik 100'e yaklaştıkça pahalı.</p>`;
}

function kaliteTablosu(k) {
  if (!k.length) return "";
  const ayrinti = (x) => {
    if (!x.ayrinti) return "";
    if (Array.isArray(x.ayrinti)) return x.ayrinti.map((m) => `${m.puan ? "✓" : "✗"} ${m.madde}`).join(" · ");
    return Object.entries(x.ayrinti).map(([a, v]) => `${a} ${typeof v === "number" ? sayi(v, 2) : v ?? "–"}`).join(" · ");
  };
  return `<div class="tablo-kutu"><table class="olay-tablosu">
      <thead><tr><th>Skor</th><th class="sag">Değer</th><th>Yorum</th><th>Bileşenler</th></tr></thead>
      <tbody>${k.map((x) => `<tr><td>${kacis(x.ad)} <span class="soluk kucuk">${kacis(x.donem)}</span></td>
        <td class="sag">${x.deger != null ? sayi(x.deger, 2) : "–"}</td><td>${kacis(x.yorum || "")}</td>
        <td class="kucuk soluk sarmal">${kacis(ayrinti(x))}</td></tr>`).join("")}</tbody></table></div>
    <p class="not">Piotroski F (0-9): 7+ güçlü, 3- zayıf. Altman Z'' (gelişmekte olan piyasalar): 5,85 üstü güvenli, 4,35 altı sıkıntı.
      Beneish M: −1,78 üstü muhasebe manipülasyonu riski işareti (kesin hüküm değildir). Beta: son 1 yıl, Blume düzeltmeli.</p>`;
}

async function degerYukle() {
  const kutu = document.getElementById("deger");
  let v;
  try {
    v = await getir(`/api/degerleme/${encodeURIComponent(kod)}`);
  } catch (e) {
    kutu.innerHTML = `<p class="eksi">Değerleme alınamadı: ${kacis(e.message)}</p>`;
    return;
  }
  const d = v.degerleme;
  if (!d) {
    kutu.innerHTML = '<p class="soluk">Değerleme henüz hesaplanmadı.</p>';
    return;
  }
  kutu.innerHTML = `
    <div class="kartlar">${degerKarti(d)}${skorKarti(d)}${analistKarti(d.analist, d.fiyat)}${makroKarti(v.makro)}</div>
    ${kurumKarti(v.kurum, d.fiyat)}
    ${senaryoKarti(d)}
    <h3>Gerçek değer modelleri</h3>${modelTablosu(d)}${isabetAyariNotu(d)}
    <h3>Fiyat skoru bileşenleri</h3>${bilesenTablosu(d)}
    <h3>Kalite skorları</h3>${kaliteTablosu(v.kalite)}
    ${isabetKarti(v.isabet)}`;
}

// Senaryolar, 12 aylık hedef, ters DCF, duyarlılık ve çekirdek kâr (motorlar/deger_ek.py)
function senaryoKarti(d) {
  const ek = d.ek;
  if (!ek) return "";
  const tl = (x) => (x === null || x === undefined ? "–" : `${sayi(x, 2)} TL`);
  const y = (x, b = 1) => (x === null || x === undefined ? "–" : `${x < 0 ? "−" : ""}%${sayi(Math.abs(x) * 100, b)}`);
  const s = ek.senaryolar || {};
  const h = ek.hedef_12ay;
  const t = ek.ters_dcf;
  const c = ek.cekirdek_kar;
  const dy = ek.duyarlilik;
  const parcalar = [];
  parcalar.push(`<div class="senaryo-satiri">
      <div><span class="soluk kucuk">Kötü senaryo</span><b>${tl(s.kotu)}</b></div>
      <div class="baz"><span class="soluk kucuk">Baz (gerçek değer)</span><b>${tl(s.baz)}</b></div>
      <div><span class="soluk kucuk">İyi senaryo</span><b>${tl(s.iyi)}</b></div>
      ${h ? `<div><span class="soluk kucuk" title="Gerçek değer bugünün değeridir; 12 ay sonra beklenen fiyat = gerçek değer × (1 + nominal özsermaye maliyeti) − beklenen temettü">12 ay sonra beklenen</span><b>${tl(h.hedef)}</b></div>` : ""}
    </div>`);
  if (h) parcalar.push(`<p class="kucuk">Gerçek değer bugünün değeridir. 12 ay sonra beklenen fiyat, buna nominal özsermaye maliyeti
      (${y(h.nominal_ozsermaye_maliyeti)}; enflasyon beklentisi ${y(h.enflasyon_beklentisi)} dahil) eklenip beklenen temettü
      (${sayi(h.beklenen_temettu, 2)} TL) düşülerek bulunur. Enflasyonda nominal hedef her yıl büyür.</p>`);
  if (t?.ima_buyume !== null && t?.ima_buyume !== undefined) {
    parcalar.push(`<p><b>Ters DCF:</b> Bugünkü fiyat, önümüzdeki ${t.yil} yıl boyunca ${t.kaynak === "net_kar"
        ? "net kârın (serbest nakit akımı şu an negatif olduğu için kâr nakde dönecek varsayıldı)" : "serbest nakit akımının"} yılda
      <b>${y(t.ima_buyume)}</b> reel büyümesini varsayıyor${t.gecmis_buyume !== null && t.gecmis_buyume !== undefined
        ? ` (son 12 ayın reel satış büyümesi ${y(t.gecmis_buyume)})` : ""}. Varsayım geçmişten çok yüksekse fiyat iyimser,
      çok düşükse temkinli demektir.</p>`);
  }
  if (c?.uyari) parcalar.push(`<p class="uyari">${kacis(c.uyari)}</p>`);
  if (dy) {
    parcalar.push(`<details class="durustluk-nasil"><summary>Duyarlılık: varsayımlar değişirse DCF değeri</summary>
      <div class="tablo-kutu"><table class="sik"><thead><tr><th>İskonto ↓ · uzun vade büyüme →</th>${dy.son_buyume.map((g) => `<th class="sag">${y(g)}</th>`).join("")}</tr></thead>
      <tbody>${dy.iskonto.map((r, i) => `<tr><td>${y(r)}</td>${dy.deger[i].map((v, j) => `<td class="sag${i === 1 && j === 1 ? " vurgulu" : ""}">${tl(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
      <p class="not">Reel iskonto oranı ±1 puan ve uzun vade reel büyümesi ±1 puan değişince DCF modelinin hisse başı değeri.</p></details>`);
  }
  return `<h3>Senaryolar ve varsayımlar</h3><div class="kart">${parcalar.join("")}</div>`;
}

function isabetAyariNotu(d) {
  const liste = Object.values(d.modeller || {}).filter((m) => m?.isabet_ayari);
  if (!liste.length) return "";
  return `<p class="not">Ağırlıklar geçmiş isabete göre ayarlandı: ${liste.map((a) => `"${kacis(a.ad)}" ${a.isabet_ayari.n} ölçümde XU100'e göre
    doğru yön %${sayi(a.isabet_ayari.isabet * 100, 0)}, ağırlık çarpanı ${sayi(a.isabet_ayari.carpan, 2)}`).join("; ")}.
    Diğer modellerin isabeti ölçüldükçe aynı kural uygulanır.</p>`;
}

// Kurumların hedefleri (motorlar/kurum_karnesi.py): her kurumun son 6 aydaki en son hedefi, revizyonlar, isabet
const yz2 = (x) => (x === null || x === undefined ? "–" : `${x > 0 ? "+" : x < 0 ? "−" : ""}%${sayi(Math.abs(x) * 100, 1)}`);
function kurumKarti(k, fiyat) {
  const s = k?.konsensus;
  if (!s) return "";
  const y = (x, b = 0) => (x === null || x === undefined ? "–" : `%${sayi(x * 100, b)}`);
  const pot = (h) => (fiyat ? `<span class="${yonSinifi(h / fiyat - 1)}">${h / fiyat - 1 > 0 ? "+" : ""}%${sayi((h / fiyat - 1) * 100, 0)}</span>` : "–");
  const g12 = k.genel?.["12ay"];
  const karne = (r) => {
    const x = r.karne?.["12ay"] || r.karne?.["6ay"];
    return x ? `${y(x.ulasti)} <span class="soluk kucuk">(${x.n})</span>` : '<span class="soluk">–</span>';
  };
  const tav = Object.entries(s.tavsiye || {}).filter(([t]) => t && t !== "null").map(([t, n]) => `${n} ${kacis(t)}`).join(" · ");
  return `<h3>Kurumların hedefleri</h3>
    <div class="kart">
      <p><b>${s.kurum_sayisi}</b> kurumun son 6 aydaki hedefi: medyan <b>${sayi(s.agirlikli_medyan, 2)} TL</b> (${pot(s.agirlikli_medyan)}),
        en düşük ${sayi(s.en_dusuk, 2)} – en yüksek ${sayi(s.en_yuksek, 2)} TL. ${tav ? `Tavsiyeler: ${tav}.` : ""}
        Son 30 günde <b class="arti">${s.yukselten_30}</b> kurum hedefini yükseltti, <b class="eksi">${s.dusuren_30}</b> kurum düşürdü.</p>
      ${g12 ? `<p class="kucuk">Kurum hedefleri geçmişte ne kadar tuttu? 12 aylık ${g12.n} hedefte dönem içinde ulaşılma oranı ${y(g12.ulasti)},
        dönem sonunda ulaşılma oranı ${y(g12.sonda)}. Hedeflerin ima ettiği getiri ortalama ${y(g12.ima)}, gerçekleşen ${y(g12.gerceklesen)};
        aradaki iyimserlik (${y(k.iyimserlik)}) değerlemede hedeften düşülüyor.</p>` : ""}
      ${k.revizyon?.yukseltme?.car20?.n ? `<p class="kucuk">Hedef revizyonlarından sonra (bütün hisseler): yükseltmeden sonraki 20 günde hisse
        XU100'e göre ortalama ${yz2(k.revizyon.yukseltme.car20.ort)} (${k.revizyon.yukseltme.car20.n} revizyon), düşürmeden sonra
        ${yz2(k.revizyon.dusurme?.car20?.ort)} (${k.revizyon.dusurme?.car20?.n || 0} revizyon).</p>` : ""}
      <div class="tablo-kutu"><table class="sik"><thead><tr><th>Kurum</th><th>Tarih</th><th class="sag">Hedef</th><th class="sag">Önceki</th>
        <th>Tavsiye</th><th class="sag">Potansiyel</th>
        <th class="sag" title="Bu kurumun geçmiş 12 aylık (yoksa 6 aylık) hedeflerine dönem içinde ulaşılma oranı; parantezde ölçüm sayısı">Kurumun isabeti</th></tr></thead>
        <tbody>${s.kurumlar.map((r) => `<tr><td>${kacis(r.kurum)}</td><td class="soluk">${zamanMetni(r.tarih)}</td>
          <td class="sag"><b>${sayi(r.hedef, 2)}</b></td>
          <td class="sag ${r.onceki_hedef ? (r.hedef > r.onceki_hedef ? "arti" : "eksi") : "soluk"}">${r.onceki_hedef ? sayi(r.onceki_hedef, 2) : "–"}</td>
          <td>${r.tavsiye ? `<span class="rozet ${r.tavsiye === "AL" ? "al" : r.tavsiye === "SAT" ? "sat" : "tut"}">${kacis(r.tavsiye)}</span>` : "–"}</td>
          <td class="sag">${pot(r.hedef)}</td><td class="sag">${karne(r)}</td></tr>`).join("")}</tbody></table></div>
      <p class="not">Kaynak: hedeffiyat.com.tr. Medyan, kurumların geçmiş isabetine göre ağırlıklıdır (az ölçümü olan kurum ortalamaya çekilir).</p>
    </div>`;
}

// Gerçek değer ne kadar isabetli? (motorlar/deger_isabet.py) Söylenen değere fiyat 3, 6, 12 ay sonra gitti mi.
const UFUK_ADLARI = { "3ay": "3 ay", "6ay": "6 ay", "12ay": "12 ay" };
function isabetKarti(i) {
  if (!i) return "";
  const y = (x) => (x === null || x === undefined ? "–" : `%${sayi(x * 100, 0)}`);
  const satir = (t) => `<tr><td>${kacis(t.ad)}</td><td>${UFUK_ADLARI[t.ufuk] || t.ufuk}</td><td class="sag">${t.n}</td>
      <td class="sag"><b>${y(t.goreli_isabet)}</b></td><td class="sag">${y(t.hedefe_ulasti)}</td><td class="sag">${y(t.sonda_ulasti)}</td>
      <td class="sag">${y(t.medyan_hata)}</td></tr>`;
  const tablo = (liste) => (liste.length ? `<div class="tablo-kutu"><table class="sik"><thead><tr><th>Değer</th><th>Ufuk</th>
      <th class="sag">Ölçüm</th><th class="sag" title="Ucuz denen XU100'den iyi, pahalı denen kötü gitti mi">Doğru yön (XU100'e göre)</th>
      <th class="sag" title="Dönem içinde herhangi bir kapanış değere ulaştı mı">Değere ulaştı</th>
      <th class="sag" title="Dönem sonunda fiyat değerin ötesinde mi">Dönem sonunda</th>
      <th class="sag" title="Dönem sonu fiyatının değere uzaklığı (ortanca)">Sapma</th></tr></thead>
      <tbody>${liste.map(satir).join("")}</tbody></table></div>` : "");
  const gd = i.genel.tablo.filter((t) => t.kaynak !== "gecmis_model" && !t.kaynak.startsWith("model:"));
  const b = i.genel.bekleyen;
  const bekleme = gd.length ? "" : `<p>Bu sitenin gerçek değerleri ${b ? zamanMetni(b.ilk_kayit) : "–"} tarihinden beri her gün kaydediliyor.
      İlk 3 aylık sonuç <b>${b ? zamanMetni(b.ilk_sonuc_3ay) : "–"}</b>, ilk 12 aylık sonuç ${b ? zamanMetni(b.ilk_sonuc_12ay) : "–"} tarihinde
      görünecek. O zamana kadar aşağıda, bugünden geriye doğru ölçülebilen tek model var.</p>`;
  const gm = i.genel.tablo.filter((t) => t.kaynak === "gecmis_model");
  const hm = i.hisse.tablo.filter((t) => t.kaynak === "gecmis_model" && t.ufuk === "3ay")[0];
  const k = i.genel.kiyas;
  return `<h3>Gerçek değer ne kadar isabetli?</h3>
    <div class="kart">
      ${bekleme}
      ${tablo(gd)}
      ${gm.length ? `<p style="margin-top:12px"><b>Kendi geçmiş çarpanına göre değer</b> (bütün hisseler, geriye dönük yeniden hesap):</p>${tablo(gm)}` : ""}
      ${hm ? `<p>Bu hissede 3 ay sonra doğru yön: <b>${y(hm.goreli_isabet)}</b> (${hm.n} ölçüm).</p>` : ""}
      <p class="soluk kucuk">Kıyas: analistlerin 12 aylık hedeflerinin ${y(k.sonda_ulasti)}'i dönem sonunda, ${y(k.hedefe_ulasti)}'ü dönem içinde
        tutuyor; ortalama sapma ${y(k.ortalama_hata)} (${kacis(k.kaynak)}). Doğru yön %50 civarındaysa değer, fiyatın nereye gideceğini
        yazı-turadan iyi tahmin etmiyor demektir.</p>
    </div>`;
}
