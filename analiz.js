// Hisse sayfası: uyarlanmış sinyal, alt panel seçimi, dürüstlük kartı, gösterge başarısı, grafikte geri bildirim.

const ETIKET_TURLERI = { dip: "Gerçek dip", tepe: "Gerçek tepe", yanlis_al: "Yanlış AL", yanlis_sat: "Yanlış SAT" };
let analizVerisi = null;
let mumVerisi = [];
let etiketIsaretleri = [];
let isaretlemeModu = false;
const ekSeri = grafik.addSeries(LW.LineSeries, { color: "#5b9cf6", lineWidth: 1, priceLineVisible: false, lastValueVisible: false }, 1);

function yuzdeMetni(x, basamak = 1) {
  return x === null || x === undefined ? "–" : `${x > 0 ? "+" : x < 0 ? "−" : ""}%${sayi(Math.abs(x) * 100, basamak)}`;
}

// --- alt panel ------------------------------------------------------------------------------------------------
async function altPanelGuncelle() {
  const kaynak = document.getElementById("alt-panel").value;
  ekSeri.setData([]);
  if (kaynak === "tv") return;          // grafikYukle TradingView puanını zaten çizdi
  const veri = await getir(`/api/alt_panel/${encodeURIComponent(kod)}?zd=${zd}&kaynak=${encodeURIComponent(kaynak)}`);
  if (kaynak === "kedi") {
    puanSerisi.setData(veri.map((v) => ({
      time: v.time, value: v.deger, color: v.deger > 0.1 ? RENK.al : v.deger < -0.1 ? RENK.sat : RENK.tut,
    })));
    return;
  }
  if (kaynak === "uyarlanmis") {
    puanSerisi.setData(veri.map((v) => ({
      time: v.time, value: v.deger,
      color: v.guven === "zayıf" ? "rgba(139,147,163,.6)" : v.deger > 0.1 ? RENK.al : v.deger < -0.1 ? RENK.sat : RENK.tut,
    })));
    return;
  }
  // Eklenti: sinyal histogram, ilk sayısal sütun çizgi
  puanSerisi.setData(veri.filter((v) => v.sinyal !== null).map((v) => ({
    time: v.time, value: v.sinyal * 0.5, color: v.sinyal > 0 ? RENK.al : v.sinyal < 0 ? RENK.sat : RENK.tut,
  })));
  const sutun = Object.keys(veri[0] || {}).find((k) => !["time", "sinyal"].includes(k));
  if (!sutun) return;
  const cizgi = veri.filter((v) => v[sutun] !== null).map((v) => ({ time: v.time, value: v[sutun] }));
  // Fiyat düzeyindeki çizgiler (SuperTrend gibi) mumların üstüne, osilatörler alt panele çizilir.
  const son = cizgi.at(-1)?.value, fiyat = mumVerisi.at(-1)?.close;
  const fiyatDuzeyinde = son && fiyat && son / fiyat > 0.5 && son / fiyat < 2;
  ekSeri.moveToPane(fiyatDuzeyinde ? 0 : 1);
  ekSeri.setData(cizgi);
  panelBoyutu();
}

function altPanelSecenekleri(eklentiler) {
  const s = document.getElementById("alt-panel");
  const katmanlar = { trend: "Trend göstergeleri", osilator: "Osilatörler", hacim: "Hacim", diger: "Diğer" };
  const gecerli = eklentiler.filter((e) => e.durum === "gecerli").sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  s.innerHTML = '<option value="tv">TradingView puanı</option><option value="kedi">Kedi Gözü puanı</option><option value="uyarlanmis">Uyarlanmış puan</option>'
    + Object.entries(katmanlar).map(([k, baslik]) => {
      const liste = gecerli.filter((e) => (e.katman || "diger") === k);
      return liste.length ? `<optgroup label="${baslik}">${liste.map((e) => `<option value="eklenti:${kacis(e.kod)}">${kacis(e.ad)}</option>`).join("")}</optgroup>` : "";
    }).join("");
}

// --- uyarlanmış sinyal kartları -------------------------------------------------------------------------------
// Bileşenin oyları: az sayıdaysa tek tek, çoksa (50 eklenti) özet; tam liste fare üstünde ve konsey bölümünde.
function oyListesi(oylar) {
  const ogeler = Object.entries(oylar || {});
  const metin = (o) => (o > 0 ? "AL" : o < 0 ? "SAT" : o === 0 ? "TUT" : "–");
  if (ogeler.length <= 6) return ogeler.map(([a, o]) => `${kacis(a.replace("eklenti:", ""))} ${metin(o)}`).join(" · ");
  const say = (f) => ogeler.filter(([, o]) => f(o)).length;
  const tam = ogeler.map(([a, o]) => `${a.replace("eklenti:", "")} ${metin(o)}`).join(", ");
  return `<span title="${kacis(tam)}"><span class="arti">${say((o) => o > 0)} AL</span> · ${say((o) => o === 0)} TUT · `
    + `<span class="eksi">${say((o) => o < 0)} SAT</span> <span class="soluk">(${ogeler.length} gösterge; ayrıntı konsey bölümünde)</span></span>`;
}

function uyarlanmisKarti(z, u) {
  if (!u) return `<h2>${ZD_ADLARI[z]} uyarlanmış</h2><p class="soluk">Hesaplanmamış.</p>`;
  const katmanlar = Object.values(u.katmanlar || {}).map((k) => `<tr><td>${kacis(k.ad)}</td>
      <td class="sag">${k.puan === null ? "–" : sayi(k.puan, 2)}</td><td class="sag soluk">${sayi(k.agirlik, 2)}</td>
      <td class="kucuk soluk oy-hucresi">${oyListesi(k.oylar)}</td></tr>`).join("");
  return `<h2>${ZD_ADLARI[z]} · Uyarlanmış sinyal</h2>
    <div class="buyuk">${rozet({ etiket: u.etiket, puan: u.puan })} ${u.guven === "zayıf" ? '<span class="minirozet kirmizi">güven düşük</span>' : ""}</div>
    ${(u.notlar || []).map((n) => `<p class="kucuk eksi">${kacis(n)}</p>`).join("")}
    <table class="sik"><thead><tr><th>Bileşen</th><th class="sag">Puan</th><th class="sag">Ağırlık</th><th>Oylar</th></tr></thead>
      <tbody>${katmanlar}</tbody></table>
    <p class="not">TradingView standart sinyali yukarıda ayrı ve değişmeden durur. Puan ${sayi(u.puan, 3)} · ${zamanMetni(u.zaman)}${acikBarNotu(u.zaman, z)
      ? ` · <span class="acik-bar" title="Henüz kapanmamış barın şimdiki fiyatıyla hesaplandı; bar kapanana kadar değişebilir">${acikBarNotu(u.zaman, z)}</span>` : ""}</p>`;
}

// --- dürüstlük kartı -------------------------------------------------------------------------------------------
// Sade dürüstlük kartı: sitenin sinyalleri bu hissenin geçmişinde doğru zamanda doğru sinyali verebilmiş mi?
// Puan sunucuda (analiz_rapor.durustluk): 50 yazı-tura, üstü geçmişte işe yaradı, altı ters çalıştı.
const SINYAL_ADLARI = { kedi_puani: "Kedi Gözü puanı", uyarlanmis: "Uyarlanmış sinyal", tradingview: "TradingView sinyali" };
const yuzde0 = (x) => (x === null || x === undefined ? "–" : `%${sayi(x * 100, 0)}`);
// Renk hükümle aynı eşikte (motorlar/durustluk.hukum): 66 ve 34 güven değeri ±1, yani şans payının sınırı
const puanSinifi = (p) => (p === null || p === undefined ? "tut" : p >= 66 ? "al" : p > 34 ? "tut" : "sat");

function durustlukKarti(d) {
  if (!d?.genel || d.genel.puan === null) return '<p class="soluk">Henüz hesaplanmadı (mum turunda uyarlanmış sinyalle birlikte hesaplanır).</p>';
  const g = d.genel;
  const kutu = (z, s) => {
    const x = d[z]?.[s];
    if (!x) return "";
    return `<div class="kart durustluk-kutu">
        <div class="soluk kucuk">${SINYAL_ADLARI[s]} · ${ZD_ADLARI[z]}</div>
        <div class="durustluk-mini ${puanSinifi(x.puan)}">${x.puan === null ? "–" : sayi(x.puan, 0)}</div>
        <div class="kucuk">Doğru yön: <b>${yuzde0(x.yon_isabet)}</b> <span class="soluk">(${x.yon_sinyal} sinyal)</span></div>
        <div class="soluk kucuk">rastgele tahmin ${yuzde0(x.yon_taban)}</div>
      </div>`;
  };
  // Seçili zaman diliminde Kedi Gözü puanı (yoksa uyarlanmış, o da yoksa TradingView) için düz cümleler
  const x = d[zd]?.kedi_puani || d[zd]?.uyarlanmis || d[zd]?.tradingview;
  const xAd = SINYAL_ADLARI[d[zd]?.kedi_puani ? "kedi_puani" : d[zd]?.uyarlanmis ? "uyarlanmis" : "tradingview"];
  const gs = d.gostergeler?.[zd];
  const cumleler = [];
  if (x) {
    const ufuk = zd === "4h" ? `${x.ileri} mum (yaklaşık 2 gün)` : `${x.ileri} gün`;
    cumleler.push(`<b>Doğru sinyal mi?</b> ${xAd}, ${tarihUzun(x.baslangic)} – ${tarihUzun(x.bitis)} arasında ${x.yon_sinyal} kez AL ya da SAT dedi. ${x.yon_dogru} tanesinde
      (${yuzde0(x.yon_isabet)}) fiyat ${ufuk} içinde söylediği yöne gitti. Rastgele tahmin ${yuzde0(x.yon_taban)} tutturdu.`);
    if (x.dip_yakalama !== null && x.dip_yakalama !== undefined) {
      cumleler.push(`<b>Doğru zamanda mı?</b> Bu dönemdeki ${x.dip_sayisi ?? "–"} gerçek dibinde, AL'ın dipte ya da en geç 2 mum
        sonra gelme oranı ${yuzde0(x.dip_yakalama)}. Rastgele zamanlamada bu oran ${yuzde0(x.rastgele_dip)}.`);
    }
    cumleler.push(`<b>Sinyale uysaydın?</b> AL'da alıp AL bitince satsaydın <b class="${yonSinifi(x.toplam_getiri)}">${yuzdeMetni(x.toplam_getiri, 0)}</b>,
      hisseyi alıp hiç satmasaydın ${yuzdeMetni(x.al_tut, 0)} olurdu. En kötü düşüş ${yuzdeMetni(x.en_buyuk_dusus, 0)}.
      ${x.net_toplam_getiri !== undefined && x.net_toplam_getiri !== null ? `Komisyon, vergi ve alış-satış farkı (işlem başına
      %${sayi((x.maliyet_tek_yon || 0) * 200, 1)}) düşülünce sinyale uymanın sonucu <b class="${yonSinifi(x.net_toplam_getiri)}">${yuzdeMetni(x.net_toplam_getiri, 0)}</b>
      (${x.islem} işlem).` : ""}`);
  }
  if (gs) {
    cumleler.push(`<b>70 gösterge:</b> ${gs.olculen} göstergenin <b class="arti">${gs.belirgin_iyi}</b> tanesi bu hissede belirgin şekilde doğru
      yönü buldu, <b class="eksi">${gs.belirgin_kotu}</b> tanesi belirgin şekilde ters. En isabetliler:
      ${gs.en_iyi.map((e) => `${kacis(e.ad)} (${yuzde0(e.kisa_dogruluk)})`).join(", ")}.`);
  }
  return `<div class="durustluk-ust">
      <div class="kart durustluk-genel">
        <div class="soluk kucuk">Dürüstlük puanı</div>
        <div class="durustluk-puan ${puanSinifi(g.puan)}">${sayi(g.puan, 0)}<span>/100</span></div>
        <div class="durustluk-hukum">${kacis(g.hukum)}</div>
        <div class="durustluk-cubuk"><span style="left:${Math.max(0, Math.min(100, g.puan))}%"></span></div>
        <div class="durustluk-olcek soluk kucuk"><span>ters çalıştı</span><span>yazı-tura</span><span>işe yaradı</span></div>
      </div>
      <div class="durustluk-kutular">${["4h", "1d"].map((z) => kutu(z, "kedi_puani") + kutu(z, "uyarlanmis") + kutu(z, "tradingview")).join("")}</div>
    </div>
    <div class="kart durustluk-cumleler">${cumleler.map((c) => `<p>${c}</p>`).join("")}
      <p class="soluk kucuk">${ZD_ADLARI[zd]} için. Zaman dilimini sayfanın üstünden değiştirebilirsin.</p></div>
    <details class="durustluk-nasil"><summary>Nasıl hesaplanıyor?</summary>
      <p>Sitenin AL ve SAT sinyalleri bu hissenin son 5 yıllık geçmişinde tek tek sınanır; geçmişe bakarak sonradan
        ayarlama yapılmaz. İki şey ölçülür: sinyalden sonra fiyat söylenen yöne gitti mi, ve gerçek diplerde AL zamanında
        geldi mi. İkisi de rastgele tahminle kıyaslanır; yükselen piyasada "AL" demek kolay olduğu için taban buna göre ayarlanır.</p>
      <p>Puan, farkın büyüklüğüne ve sinyal sayısına göre verilir: az sinyalle şans eseri iyi çıkan sinyal yüksek puan almaz.
        50 yazı-turadan farksız demektir; 34 ile 66 arası şans payının içindedir. 66–79 ve 21–34 zayıf işarettir; 79 ve üstü geçmişte belirgin şekilde işe yaradı, 21 ve altı belirgin şekilde ters çalıştı (bunların şans eseri olması zor).
        Genel puan kutuların ortalamasıdır. Kedi Gözü puanının göstergeleri her ay yalnızca o güne kadarki sonuçlarla seçilir, yani o da geleceğe bakmadan ölçülür. Komisyon ve vergi dahil değildir; geçmişteki başarı gelecek için güvence değildir.</p>
    </details>`;
}

// --- gösterge başarısı -------------------------------------------------------------------------------------------
function basariTablosu(liste) {
  if (!liste?.length) return '<p class="soluk kucuk">Ölçülmedi.</p>';
  return `<div class="tablo-kutu"><table class="sik">
    <thead><tr><th>Gösterge</th><th class="sag">Olay</th><th class="sag">1 bar</th><th class="sag">3 bar</th><th class="sag">6 bar</th>
      <th class="sag">İsabet</th><th class="sag" title="Gerçek dip/tepeye göre ortalama bar farkı; eksi erken">Erken/geç</th>
      <th class="sag" title="Dip ve tepelerin yüzde kaçını ±10 bar içinde yakaladı">Kapsama</th></tr></thead>
    <tbody>${liste.map((g) => `<tr><td>${kacis(g.ad)}</td><td class="sag">${g.olay}</td>
      <td class="sag ${yonSinifi(g.getiri1)}">${yuzdeMetni(g.getiri1, 2)}</td><td class="sag ${yonSinifi(g.getiri3)}">${yuzdeMetni(g.getiri3, 2)}</td>
      <td class="sag ${yonSinifi(g.getiri6)}"><b>${yuzdeMetni(g.getiri6, 2)}</b></td>
      <td class="sag">${g.isabet === null ? "–" : "%" + sayi(g.isabet * 100, 0)}</td>
      <td class="sag">${g.erken_gec === null ? "–" : (g.erken_gec > 0 ? "+" : "") + sayi(g.erken_gec, 1)}</td>
      <td class="sag">${g.kapsama === null ? "–" : "%" + sayi(g.kapsama * 100, 0)}</td></tr>`).join("")}</tbody></table></div>
    <p class="not">Son 12 ay. Getiri: olay yönünde (SAT'tan sonra düşüş kazanç sayılır). Gerçek dip ve tepeler 2 ATR eşikli zikzakla
      sonradan bulunur. Bütün hisselerin birlikte ölçümü ve ağırlık önerisi Göstergeler sayfasında.</p>`;
}

// --- geri bildirim ---------------------------------------------------------------------------------------------
function etiketleriKur(kayitlar) {
  const zamanlar = new Map(mumVerisi.map((m) => [m.zaman, m.time]));
  etiketIsaretleri = (kayitlar || []).filter((k) => k.zd === zd && zamanlar.has(k.zaman)).map((k) => ({
    time: zamanlar.get(k.zaman), position: k.tur === "dip" || k.tur === "yanlis_sat" ? "belowBar" : "aboveBar",
    shape: "square", size: 0.8, color: "#f5c542", text: ETIKET_TURLERI[k.tur],
  }));
  if (typeof okGoster === "function") okGoster();
  document.getElementById("etiket-listesi").innerHTML = (kayitlar || []).length
    ? `<table class="sik"><tbody>${kayitlar.map((k) => `<tr><td>${kacis(k.tur_adi)}</td><td>${ZD_ADLARI[k.zd]}</td>
        <td class="soluk kucuk">${kacis(k.zaman.slice(0, 16).replace("T", " "))}</td><td class="kucuk">${kacis(k.aciklama || "")}</td>
        <td><button class="cikar" data-etiket-sil="${k.id}" title="Sil">×</button></td></tr>`).join("")}</tbody></table>`
    : '<p class="soluk kucuk">Henüz işaret yok.</p>';
}

grafik.subscribeClick(async (param) => {
  if (!isaretlemeModu || param.time === undefined) return;
  const bar = mumVerisi.find((m) => m.time === param.time);
  if (!bar) return;
  const secim = document.getElementById("etiket-turu").value;
  const aciklama = document.getElementById("etiket-not").value;
  // Bir işaretten sonra mod kapanır: grafikte gezinirken yanlışlıkla işaret eklenmesin.
  isaretlemeModuAyarla(false);
  const yanit = await fetch("/api/geri_bildirim", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kod, zd, zaman: bar.zaman, tur: secim, aciklama }),
  });
  const v = await yanit.json().catch(() => ({}));
  document.getElementById("etiket-mesaj").textContent = yanit.ok
    ? `${ETIKET_TURLERI[secim]} işaretlendi (${bar.zaman.slice(0, 16).replace("T", " ")}). Bir sonraki ölçümde etiket olarak kullanılır.`
    : (v.detail || "Kaydedilemedi");
  if (yanit.ok) etiketleriKur(v.kayitlar);
});

function isaretlemeModuAyarla(acik) {
  isaretlemeModu = acik;
  const b = document.getElementById("isaretle");
  b.classList.toggle("secili", acik);
  b.textContent = acik ? "İşaretleme açık: grafikte bara tıkla" : "Grafikte işaretle";
}
document.getElementById("isaretle").addEventListener("click", () => isaretlemeModuAyarla(!isaretlemeModu));

document.getElementById("etiket-listesi").addEventListener("click", async (e) => {
  const d = e.target.closest("button[data-etiket-sil]");
  if (!d) return;
  await fetch(`/api/geri_bildirim/${d.dataset.etiketSil}`, { method: "DELETE" });
  analizYukle();
});

// TradingView puanına dönüşte puan serisini grafikYukle yeniden çizer.
document.getElementById("alt-panel").addEventListener("change", (e) =>
  (e.target.value === "tv" ? grafikYukle() : altPanelGuncelle()).catch(() => {}));

async function analizYukle() {
  try {
    const [v, g] = await Promise.all([getir(`/api/uyarlanmis/${encodeURIComponent(kod)}`), getir("/api/gostergeler")]);
    analizVerisi = v;
    const secili = document.getElementById("alt-panel").value;
    altPanelSecenekleri(g.eklentiler);
    if ([...document.getElementById("alt-panel").options].some((o) => o.value === secili)) document.getElementById("alt-panel").value = secili;
    for (const z of ["4h", "1d"]) document.getElementById(`uyarlanmis-${z}`).innerHTML = uyarlanmisKarti(z, v.uyarlanmis[z]);
    document.getElementById("durustluk").innerHTML = durustlukKarti(v.durustluk);
    document.getElementById("basari").innerHTML = basariTablosu(v.basari[zd]);
    etiketleriKur(v.geri_bildirim);
  } catch (e) {
    document.getElementById("durustluk").innerHTML = `<p class="eksi">Analiz alınamadı: ${kacis(e.message)}</p>`;
  }
}

// grafikYukle her zaman dilimi değişiminde çağırır
function analizGrafikSonrasi(mumlar) {
  mumVerisi = mumlar;
  if (analizVerisi) {
    etiketleriKur(analizVerisi.geri_bildirim);
    document.getElementById("basari").innerHTML = basariTablosu(analizVerisi.basari[zd]);
    document.getElementById("durustluk").innerHTML = durustlukKarti(analizVerisi.durustluk);
  }
  altPanelGuncelle().catch(() => {});
}
