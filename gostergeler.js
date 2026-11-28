// Göstergeler sayfası: eklentiler, gösterge başarısı, ağırlık önerisi, faiz ve haber kalibrasyonu, geri bildirim analizi.

let veri = null;
let secZd = "4h";
let secDonem = "12ay";
let karneZd = "4h";
const KATMAN = { trend: "Trend", osilator: "Osilatör", hacim: "Hacim", diger: "Diğer", referans: "Referans" };
const oran = (x) => (x === null || x === undefined ? "–" : `%${sayi(x * 100, 0)}`);
const KURAL_ADLARI = { 1: "Piyasanın faiz beklentisi", 2: "Kısa vadeli faizde sert artış", 3: "Getiri eğrisi dikleşiyor",
  4: "Ülke riski artıyor", 5: "PPK güvercin sürpriz", 6: "PPK şahin sürpriz", 7: "Reel faiz yüksek ve artıyor",
  8: "Reel faiz ve mevduat geriliyor", 9: "Hisse mi, mevduat mı", 10: "Piyasa ankete inanmıyor", 11: "Kurum tahminleri dağınık" };

const yz = (x, b = 1) => (x === null || x === undefined ? "–" : `${x > 0 ? "+" : x < 0 ? "−" : ""}%${sayi(Math.abs(x) * 100, b)}`);
const ad = (g) => veri.gosterge_adlari[g] || g.replace("eklenti:", "Eklenti: ");

function secimTestleri() {
  const liste = veri.karne?.[karneZd]?.secim_testleri || [];
  if (!liste.length) return '<p class="soluk">Henüz hesaplanmadı (mum turunda uyarlanmış sinyalden sonra).</p>';
  const sonuc = (s) => {
    if (s.secilen_ort === null || s.hepsi_ort === null) return ["–", ""];
    const f = s.secilen_ort - s.hepsi_ort;
    return f > 0.002 ? ["daha iyi", "al"] : f < -0.002 ? ["daha kötü", "sat"] : ["aynı", "tut"];
  };
  const iyi = liste.filter((s) => sonuc(s)[0] === "daha iyi").length;
  const kotu = liste.filter((s) => sonuc(s)[0] === "daha kötü").length;
  return `<p>Her seride son 6 ay dışarıda bırakılarak seçilen en iyi 5 gösterge, son 6 ayda bütün göstergelerle karşılaştırıldı:
      <b>${liste.length}</b> serinin <b class="arti">${iyi}</b> tanesinde daha iyi, <b class="eksi">${kotu}</b> tanesinde daha kötü,
      ${liste.length - iyi - kotu} tanesinde aynı.</p>
    <div class="tablo-kutu"><table class="sik"><thead><tr><th>Seri</th><th>Şu an (bütün göstergeler)</th><th>En iyi 5'in kararı</th>
      <th class="sag">Seçilen 5: sinyal</th><th class="sag">doğruluk</th><th class="sag">sinyal başına</th>
      <th class="sag">Hepsi: sinyal</th><th class="sag">doğruluk</th><th class="sag">sinyal başına</th><th>Seçim</th></tr></thead>
      <tbody>${liste.map((s) => { const [m, c] = sonuc(s); return `<tr class="tik" data-kod="${kacis(s.kod)}">
        <td><b>${kacis(s.kod)}</b></td>
        <td><span class="arti">${s.al} AL</span> · <span class="soluk">${s.tut} TUT</span> · <span class="eksi">${s.sat} SAT</span></td>
        <td><span class="rozet ${etiketSinifi(s.karar)}">${kacis(s.karar || "–")}</span></td>
        <td class="sag">${s.secilen_sinyal}</td><td class="sag">${oran(s.secilen_dogruluk)}</td><td class="sag ${yonSinifi(s.secilen_ort)}">${yz(s.secilen_ort, 2)}</td>
        <td class="sag">${s.hepsi_sinyal}</td><td class="sag">${oran(s.hepsi_dogruluk)}</td><td class="sag ${yonSinifi(s.hepsi_ort)}">${yz(s.hepsi_ort, 2)}</td>
        <td><span class="rozet ${c}">${m}</span></td></tr>`; }).join("")}</tbody></table></div>
    <p class="not">"Daha iyi" yalnızca sinyal başına getirinin 0,2 puandan fazla yüksek olması demektir; 6 aylık tek bir dönem şans eseri de iyi
      çıkabilir. Seriye tıklayınca hissenin konsey bölümü açılır.</p>
    ${filtreOzeti(liste)}`;
}

// Bütün serilerde toplam: AL'lardan sonra fiyat yükseldi mi (filtresiz, hacim onaylı, geniş AL)
function filtreOzeti(liste) {
  const topla = (ad, son6) => {
    let n = 0, dogru = 0;
    for (const s of liste) {
      const x = s.filtre_testi?.[ad];
      const y = son6 ? x?.son6 : x;
      if (!y || y.isabet === null) continue;
      n += y.n; dogru += y.isabet * y.n;
    }
    return n ? { n, isabet: dogru / n } : { n: 0, isabet: null };
  };
  if (!liste.some((s) => s.filtre_testi)) return "";
  const satir = (metin, ad) => { const a = topla(ad, false), b = topla(ad, true);
    return `<tr><td>${metin}</td><td class="sag">${a.n}</td><td class="sag"><b>${oran(a.isabet)}</b></td><td class="sag">${b.n}</td><td class="sag"><b>${oran(b.isabet)}</b></td></tr>`; };
  const genisSayi = liste.filter((s) => s.genislik !== null && s.genislik !== undefined && s.genislik >= 0.6).length;
  return `<h3>Hacim ve genişlik filtresi (bütün seriler)</h3>
    <p>AL'a dönüşten ${karneZd === "4h" ? "6 bar" : "5 gün"} sonra fiyat daha yüksek miydi? Şu an ${liste.length} serinin <b>${genisSayi}</b>
      tanesinde göstergelerin en az %60'ı AL (geniş AL).</p>
    <div class="tablo-kutu"><table class="sik"><thead><tr><th>AL'lar</th><th class="sag">Sayı</th><th class="sag">İsabet</th>
      <th class="sag">Son 6 ay</th><th class="sag">İsabet</th></tr></thead><tbody>
      ${satir("Rastgele bar (taban)", "taban")}${satir("Bütün AL'lar", "tum")}${satir("Hacim onaylı", "hacimli")}
      ${satir("Geniş AL", "genis")}${satir("İkisi birden", "ikisi")}</tbody></table></div>
    <p class="not">Hacim onaylı: AL barının hacmi önceki 20 bar ortalamasının 1,2 katından fazla. Hisse bazında sonuç hisse sayfasındaki
      konsey bölümünde. Etiketler bilgi içindir, kararı değiştirmez.</p>`;
}

function karneGenel() {
  const liste = veri.karne?.[karneZd]?.tablo || [];
  if (!liste.length) return "";
  const eklentiler = liste.filter((g) => !g.referans);
  const ortalama = (alan) => { const x = eklentiler.map((g) => g[alan]).filter((v) => v !== null && v !== undefined); return x.length ? x.reduce((a, b) => a + b, 0) / x.length : null; };
  const gecen = eklentiler.filter((g) => g.ort_getiri !== null && g.rastgele_ort_getiri !== null && g.ort_getiri > g.rastgele_ort_getiri).length;
  return `<p>${eklentiler.length} göstergenin ortalama doğruluğu <b>${oran(ortalama("dogruluk"))}</b>; aynı sıklıkta rastgele zamanlanmış sinyal
      <b>${oran(ortalama("rastgele_dogruluk"))}</b>. Trend göstergeleri çok sayıda küçük yanlış, az sayıda büyük doğru sinyal verir; bu yüzden
      asıl ölçü doğruluk değil, sinyal başına kazanç ve kâr/zarar oranıdır.
      ${gecen * 2 > eklentiler.length
        ? `Sinyal başına kazançta <b class="arti">${gecen} / ${eklentiler.length}</b> gösterge rastgeleyi geçiyor: düşük doğruluğa rağmen küçük bir avantaj var.`
        : `Sinyal başına kazançta da yalnızca <b class="eksi">${gecen} / ${eklentiler.length}</b> gösterge rastgeleyi geçiyor: bu zaman diliminde göstergelerin belirgin bir avantajı yok.`}</p>
    <div class="tablo-kutu"><table class="sik"><thead><tr><th>Gösterge</th><th>Tür</th><th class="sag">Seri</th><th class="sag">Sinyal</th>
      <th class="sag" title="Serilerin ortancası">Doğruluk</th><th class="sag" title="Aynı sıklıkta rastgele zamanlanmış sinyal">Rastgele</th>
      <th class="sag" title="AL/SAT dönemlerinde XU100'e göre doğru yönde olma oranı (piyasanın genel yönü ayrılmış)">XU100'e göre</th>
      <th class="sag" title="Sinyalden sonra fiyat önce 2 ATR kâr seviyesine mi, zarar seviyesine mi dokundu; yanında rastgele bar">Bariyer</th>
      <th class="sag" title="AL mevduatı geçti mi, SAT mevduatın gerisinde mi kaldı">Mevduata göre</th>
      <th class="sag">Sinyal başına</th><th class="sag" title="Kazançlar toplamı / kayıplar toplamı">Kâr/zarar</th>
      <th class="sag" title="Sinyal başına kazançta rastgeleyi geçtiği seri sayısı">Rastgeleden iyi</th><th class="sag">Skor</th><th class="sag">Kısa vade</th>
      <th class="sag">Kural / al-tut</th>
      <th class="sag" title="Gerçek diplerde dipte ya da en geç 2 bar sonra AL verme oranı; yanında rastgele zamanlama">Dipte yakalama</th>
      <th class="sag" title="Dipten ilk AL'a bar (ortanca); eksi: dipten önce">Gecikme</th>
      <th class="sag" title="Kaç seride ilk 5'te">İlk 5</th><th>Şu an</th></tr></thead>
    <tbody>${liste.map((g) => `<tr${g.referans ? ' class="referans"' : ""} title="${kacis(g.aciklama || "")}${g.kaynak ? " · Kaynak: " + kacis(g.kaynak) : ""}">
      <td>${kacis(g.ad)}</td><td class="soluk">${KATMAN[g.katman] || g.katman || ""}</td><td class="sag">${g.seri}</td><td class="sag">${g.sinyal_sayisi}</td>
      <td class="sag"><b>${oran(g.dogruluk)}</b></td><td class="sag soluk">${oran(g.rastgele_dogruluk)}</td><td class="sag">${oran(g.goreli_dogruluk)}</td><td class="sag">${oran(g.bariyer_isabet)} <span class="kucuk soluk">/ ${oran(g.rastgele_bariyer)}</span></td><td class="sag">${oran(g.mevduat_dogruluk)}</td>
      <td class="sag"><span class="${yonSinifi(g.ort_getiri)}">${yz(g.ort_getiri, 2)}</span> <span class="kucuk soluk">/ ${yz(g.rastgele_ort_getiri, 2)}</span></td>
      <td class="sag">${g.kar_zarar === null || g.kar_zarar === undefined ? "–" : sayi(g.kar_zarar, 2)}</td>
      <td class="sag">${g.rastgeleden_iyi ?? "–"} / ${g.seri}</td>
      <td class="sag">${g.skor === null ? "–" : sayi(g.skor, 2)}</td><td class="sag">${oran(g.kisa_dogruluk)}</td>
      <td class="sag"><span class="${yonSinifi(g.kural_getiri)}">${yz(g.kural_getiri, 0)}</span> <span class="soluk">/ ${yz(g.al_tut, 0)}</span></td>
      <td class="sag">${oran(g.dip_yakalama)} <span class="kucuk soluk">/ ${oran(g.rastgele_dip_yakalama)}</span></td>
      <td class="sag">${g.dip_gecikme === null || g.dip_gecikme === undefined ? "–" : (g.dip_gecikme > 0 ? "+" : "") + sayi(g.dip_gecikme, 1)}</td>
      <td class="sag">${g.referans ? "–" : g.ilk5}</td>
      <td class="kucuk"><span class="arti">${g.al} AL</span> · <span class="eksi">${g.sat} SAT</span></td></tr>`).join("")}</tbody></table></div>
    <p class="not">Her sütun serilerin (hisse ve endeks) ortancasıdır (medyan; tek bir hissedeki uç sonuç tabloyu çarpıtmasın); sıralama ortanca skora göre. Ayrıntı ve sinyal dönemi tanımı hisse
      sayfasının "Gösterge konseyi" bölümünde.</p>`;
}

function eklentiTablosu(liste) {
  if (!liste.length) return '<p class="soluk">Eklenti yok. gostergeler/ klasörüne bir .py dosyası bırak.</p>';
  return `<details><summary>${liste.filter((e) => e.durum === "gecerli").length} geçerli, ${liste.filter((e) => e.durum !== "gecerli").length} hatalı eklenti: listeyi aç</summary>
    <div class="tablo-kutu"><table class="olay-tablosu">
    <thead><tr><th>Dosya</th><th>Ad</th><th>Katman</th><th>Durum</th><th>Kontrol</th><th>Kaynak</th></tr></thead>
    <tbody>${liste.map((e) => `<tr><td>${kacis(e.dosya)}</td><td>${kacis(e.ad)}<div class="kucuk soluk">${kacis(e.aciklama || "")}</div></td>
      <td>${kacis(e.katman || "–")}</td><td><span class="rozet ${e.durum === "gecerli" ? "al" : "sat"}">${e.durum === "gecerli" ? "geçerli" : "hatalı"}</span></td>
      <td class="kucuk sarmal">${kacis(e.mesaj)}${e.dogrulama?.sinyal_dagilimi ? `<div class="soluk">örnekte ${Object.entries(e.dogrulama.sinyal_dagilimi).map(([k, v]) => `${k > 0 ? "AL" : k < 0 ? "SAT" : "TUT"} ${v}`).join(" · ")} · ${sayi(e.dogrulama.sure_sn, 2)} sn</div>` : ""}</td>
      <td class="kucuk soluk">${kacis(e.kaynak || "")}</td></tr>`).join("")}</tbody></table></div></details>`;
}

function basariTablosu() {
  const liste = veri.basari[secZd][secDonem];
  if (!liste.length) return '<p class="soluk">Ölçülmedi (analiz turu hafta içi 19:30).</p>';
  return `<div class="tablo-kutu"><table class="sik">
    <thead><tr><th>Gösterge</th><th class="sag">Olay</th><th class="sag">1 bar</th><th class="sag">3 bar</th><th class="sag">6 bar</th>
      <th class="sag">İsabet</th><th class="sag">Erken/geç (bar)</th><th class="sag">Kapsama</th></tr></thead>
    <tbody>${liste.map((g) => `<tr><td>${kacis(g.ad)}</td><td class="sag">${g.olay}</td>
      <td class="sag ${yonSinifi(g.getiri1)}">${yz(g.getiri1, 2)}</td><td class="sag ${yonSinifi(g.getiri3)}">${yz(g.getiri3, 2)}</td>
      <td class="sag ${yonSinifi(g.getiri6)}"><b>${yz(g.getiri6, 2)}</b></td><td class="sag">${g.isabet === null ? "–" : "%" + sayi(g.isabet * 100, 0)}</td>
      <td class="sag">${g.erken_gec === null ? "–" : (g.erken_gec > 0 ? "+" : "") + sayi(g.erken_gec, 1)}</td>
      <td class="sag">${g.kapsama === null ? "–" : "%" + sayi(g.kapsama * 100, 0)}</td></tr>`).join("")}</tbody></table></div>
    <p class="not">Olay: göstergenin oyunun AL'a ya da SAT'a döndüğü bar. Getiri olay yönünde (SAT'tan sonra düşüş kazanç sayılır).
      Erken/geç: gerçek dip ve tepelere (2 ATR eşikli zikzak, sonradan bulunur) göre ortalama bar farkı; eksi erken.
      Kapsama: dip ve tepelerin yüzde kaçını ±10 bar içinde yakaladı.</p>`;
}

function oneriBolumu() {
  const kutular = ["4h", "1d"].map((z) => {
    const o = veri.agirlik_onerileri[z];
    if (!o) return `<div class="kart"><b>${ZD_ADLARI[z]}</b><p class="soluk">Hesaplanmadı.</p></div>`;
    const agirlik = Object.entries(o.agirliklar || {}).sort((a, b) => b[1] - a[1]);
    return `<div class="kart">
      <div class="ust-satir"><span class="baslik">${ZD_ADLARI[z]}</span>
        <span class="rozet ${o.uygulanabilir ? "al" : "tut"}">${o.uygulanabilir ? "uygulanabilir" : "uygulanmaz"}</span></div>
      <p class="kucuk">Görülmemiş dönem testi (${kacis(o.test?.[0] || "?")} → ${kacis(o.test?.[1] || "?")}): puanın 6 bar sonraki getiriyle
        sıra korelasyonu eşit ağırlıkta <b>${o.ic_esit === null ? "–" : sayi(o.ic_esit, 3)}</b>, öneride <b>${o.ic_onerilen === null ? "–" : sayi(o.ic_onerilen, 3)}</b>.
        Eğitim: ${kacis(o.egitim?.[0] || "?")} → ${kacis(o.egitim?.[1] || "?")} (${o.egitim_olay} olay).</p>
      ${o.gruplar?.length ? `<p class="kucuk soluk">Aynı bilgiyi taşıyan gruplar (ağırlık grup boyuna bölünür): ${o.gruplar.map((g) => g.map(ad).join(", ")).join(" | ")}</p>` : ""}
      <details><summary class="kucuk">Önerilen ağırlıklar (1 = eşit)</summary>
        <table class="sik"><tbody>${agirlik.map(([g, w]) => `<tr><td>${kacis(ad(g))}</td><td class="sag">${sayi(w, 2)}</td></tr>`).join("")}</tbody></table></details>
    </div>`;
  }).join("");
  return `<div class="gundem">${kutular}</div>
    <p class="not">Öneri, son 12 ayın ilk 9 ayında göstergelerin olay sonrası getirisinden çıkarılır, olay sayısına göre eşit ağırlığa çekilir
      ve son 3 ayda sınanır. Uyarlanmış sinyale uygulanması ayrıca açılmalı (ayarlar.yaml → uyarlanmis_sinyal.olcum_agirliklari_kullan:
      şu an <b>${veri.olcum_agirliklari_kullan ? "açık" : "kapalı"}</b>); açık olsa bile yalnızca "uygulanabilir" öneri kullanılır.
      TradingView standart sinyali hiçbir zaman değişmez.</p>`;
}

function faizBolumu(f) {
  if (!f || f.durum !== "tamam") return `<p class="soluk">${kacis(f?.durum || "Hesaplanmadı")}</p>`;
  const kurallar = Object.entries(f.kurallar).map(([no, k]) => `<tr><td>${no}. ${kacis(KURAL_ADLARI[no] || "")}</td><td class="sag">${k.gun}</td>
      <td class="sag">${k.gun ? yz(k.ort_ileri_getiri) : "–"}</td><td class="sag">${k.gun ? "%" + sayi(k.yon_isabeti * 100, 0) : "–"}</td>
      <td class="sag ${yonSinifi(k.yonlu_ort_getiri)}">${k.gun ? yz(k.yonlu_ort_getiri) : "–"}</td><td class="kucuk">${kacis(k.oneri || (k.gun ? "" : "devrede olmadı"))}</td></tr>`).join("");
  return `<p>${kacis(f.baslangic)} → ${kacis(f.bitis)}, ${f.gun} işlem günü. Faiz Rüzgârı ile XU100'ün sonraki ${f.ileri_gun} işlem günü getirisi:
      sıra korelasyonu <b class="${yonSinifi(f.ic)}">${sayi(f.ic, 3)}</b>, |rüzgâr| ≥ 10 olan ${f.yonlu_gun} günde yön isabeti
      <b>%${sayi(f.yon_isabeti * 100, 0)}</b>.</p>
    <div class="gundem">
      <div class="tablo-kutu"><table class="sik"><thead><tr><th>Faiz Rüzgârı</th><th class="sag">Gün</th><th class="sag">Sonraki ${f.ileri_gun} gün XU100</th></tr></thead>
        <tbody>${f.dilimler.map((d) => `<tr><td>${kacis(d.dilim)}</td><td class="sag">${d.gun}</td><td class="sag ${yonSinifi(d.ort_ileri_getiri)}">${yz(d.ort_ileri_getiri)}</td></tr>`).join("")}</tbody></table></div>
      <div class="tablo-kutu"><table class="sik"><thead><tr><th>Kural</th><th class="sag">Gün</th><th class="sag">Ort. ileri getiri</th>
        <th class="sag">Yön isabeti</th><th class="sag">Yönlü getiri</th><th>Öneri</th></tr></thead><tbody>${kurallar}</tbody></table></div>
    </div>
    <p class="not">${kacis(f.not)} Belirsizlik kuralları (10, 11) yön vermediği için burada ölçülmez. Öneriler otomatik uygulanmaz.</p>`;
}

function haberBolumu(h) {
  if (!h || h.durum !== "tamam") return `<p class="soluk">Yetersiz veri: puanlanmış olay birikiyor (${h?.olay ?? 0} olay).</p>`;
  return `<p>${h.olay} olay. Etkinin 5 gün sonraki XU100'e göre fazladan getiriyle yön isabeti %${sayi(h.yon_isabeti5 * 100, 0)}${h.ic5 !== null ? `, sıra korelasyonu ${sayi(h.ic5, 3)}` : ""}.</p>
    <div class="tablo-kutu"><table class="sik"><thead><tr><th>Olay türü</th><th>Kaynak</th><th class="sag">Olay</th><th class="sag">Ort. etki</th>
      <th class="sag">Ertesi gün fazla</th><th class="sag">5 gün fazla</th><th class="sag">Yön isabeti</th><th></th></tr></thead>
      <tbody>${h.turler.map((t) => `<tr><td>${kacis(t.tur)}</td><td>${kacis(t.kaynak)}</td><td class="sag">${t.olay}</td>
        <td class="sag">${sayi(t.ort_etki, 2)}</td><td class="sag ${yonSinifi(t.ort_fazla1)}">${yz(t.ort_fazla1)}</td>
        <td class="sag ${yonSinifi(t.ort_fazla5)}">${yz(t.ort_fazla5)}</td><td class="sag">%${sayi(t.yon_isabeti5 * 100, 0)}</td>
        <td class="kucuk soluk">${t.yeterli ? "" : "yetersiz örnek"}</td></tr>`).join("")}</tbody></table></div>
    <p class="not">${kacis(h.not)}</p>`;
}

function geriBolumu(g) {
  if (!g || !g.etiket_sayisi) return '<p class="soluk">Henüz işaret yok. Hisse sayfasında "Grafikte işaretle" ile gerçek dip/tepe ya da yanlış sinyal işaretleyebilirsin.</p>';
  return `<p>${g.etiket_sayisi} işaret.</p>
    <div class="tablo-kutu"><table class="sik"><thead><tr><th>Gösterge</th><th class="sag">Yakaladığı dip/tepe</th>
      <th class="sag">Ortalama bar farkı</th><th class="sag">Yanlış sinyale katkı</th></tr></thead>
      <tbody>${g.gostergeler.map((x) => `<tr><td>${kacis(ad(x.gosterge))}</td><td class="sag">${x.yakaladi}</td>
        <td class="sag">${x.ort_fark === null ? "–" : (x.ort_fark > 0 ? "+" : "") + sayi(x.ort_fark, 1)}</td><td class="sag">${x.yanlis_katki}</td></tr>`).join("")}</tbody></table></div>
    <p class="not">İşaretler ağırlığı doğrudan değiştirmez; hangi göstergelerin senin gördüğün olayları erken yakaladığını gösterir.</p>`;
}

function karneCiz() {
  document.getElementById("secim-testleri").innerHTML = secimTestleri();
  document.getElementById("karne-genel").innerHTML = karneGenel();
}

function ciz() {
  karneCiz();
  document.getElementById("eklentiler").innerHTML = eklentiTablosu(veri.eklentiler);
  document.getElementById("basari").innerHTML = basariTablosu();
  document.getElementById("oneri").innerHTML = oneriBolumu();
  document.getElementById("faiz").innerHTML = faizBolumu(veri.faiz);
  document.getElementById("haber").innerHTML = haberBolumu(veri.haber);
  document.getElementById("geri").innerHTML = geriBolumu(veri.geri_bildirim);
}

document.querySelectorAll("button[data-zd], button[data-donem]").forEach((b) => b.addEventListener("click", () => {
  const grup = b.dataset.zd ? "zd" : "donem";
  document.querySelectorAll(`button[data-${grup}]`).forEach((x) => x.classList.toggle("secili", x === b));
  if (grup === "zd") secZd = b.dataset.zd; else secDonem = b.dataset.donem;
  document.getElementById("basari").innerHTML = basariTablosu();
}));

document.querySelectorAll("button[data-kzd]").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll("button[data-kzd]").forEach((x) => x.classList.toggle("secili", x === b));
  karneZd = b.dataset.kzd;
  karneCiz();
}));
document.getElementById("secim-testleri").addEventListener("click", (e) => {
  const r = e.target.closest("tr[data-kod]");
  if (r) location.href = `hisse.html?kod=${encodeURIComponent(r.dataset.kod)}#konsey-bolum`;
});

getir("/api/gostergeler").then((v) => { veri = v; ciz(); }).catch((e) => {
  document.getElementById("eklentiler").innerHTML = `<p class="eksi">Alınamadı: ${kacis(e.message)}</p>`;
});
