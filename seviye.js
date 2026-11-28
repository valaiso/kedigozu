// Hisse sayfası: grafikte destek/direnç ve pivot çizgileri, seviye listesi, temettü yaşam döngüsü ve geçmişi.

let seviyeVerisi = null;
let cizgiler = [];

function cizgileriKur() {
  for (const c of cizgiler) mumSerisi.removePriceLine(c);
  cizgiler = [];
  if (!seviyeVerisi) return;
  const ciz = (fiyat, renk, baslik, stil = LW.LineStyle.Solid, kalinlik = 1) =>
    cizgiler.push(mumSerisi.createPriceLine({ price: fiyat, color: renk, lineWidth: kalinlik, lineStyle: stil, axisLabelVisible: true, title: baslik }));
  if (document.getElementById("seviye-isaret").checked) {
    seviyeVerisi.destek.forEach((s, i) => ciz(s.fiyat, "rgba(38,166,154,.85)", `D${i + 1} · ${sayi(s.guc, 0)}`, LW.LineStyle.Solid, s.guc >= 70 ? 2 : 1));
    seviyeVerisi.direnc.forEach((s, i) => ciz(s.fiyat, "rgba(239,83,80,.85)", `R${i + 1} · ${sayi(s.guc, 0)}`, LW.LineStyle.Solid, s.guc >= 70 ? 2 : 1));
  }
  const pivot = document.getElementById("pivot-secim").value;
  if (pivot) {
    for (const p of seviyeVerisi[pivot] || []) {
      ciz(p.fiyat, p.ad === "P" ? "rgba(91,156,246,.9)" : "rgba(139,147,163,.6)", `${pivot === "pivot_gunluk" ? "G" : "H"}·${p.ad}`, LW.LineStyle.Dotted);
    }
  }
}

function seviyeTablosu(v) {
  const satir = (s, tur, i) => `<tr>
      <td><span class="rozet ${tur === "destek" ? "al" : "sat"}">${tur === "destek" ? "D" : "R"}${i + 1}</span></td>
      <td class="sag"><b>${sayi(s.fiyat, 2)}</b></td>
      <td class="sag ${tur === "destek" ? "eksi" : "arti"}">${v.fiyat ? (s.fiyat / v.fiyat - 1 > 0 ? "+" : "") + sayi((s.fiyat / v.fiyat - 1) * 100, 1) + "%" : "–"}</td>
      <td class="sag">${sayi(s.guc, 0)}</td>
      <td class="kucuk soluk">${s.ayrinti.dokunus ?? 0} dokunuş · son ${kacis(s.ayrinti.son_dokunus || "–")} · ${kacis(s.ayrinti.kaynak || "")}</td></tr>`;
  const direncler = v.direnc.map((s, i) => satir(s, "direnc", i)).reverse().join("");
  const destekler = v.destek.map((s, i) => satir(s, "destek", i)).join("");
  return `<div class="tablo-kutu"><table class="seviye-listesi">
      <thead><tr><th></th><th class="sag">Seviye</th><th class="sag">Uzaklık</th><th class="sag">Güç</th><th>Ayrıntı</th></tr></thead>
      <tbody>${direncler}<tr><td></td><td class="sag" colspan="2"><span class="soluk">fiyat</span> <b>${sayi(v.fiyat, 2)}</b></td><td colspan="2" class="kucuk soluk">ATR ${sayi(v.atr, 2)}</td></tr>${destekler}</tbody>
    </table></div>
    <p class="not">Seviyeler son 3 yılın tepe ve diplerinden (hacim ve yakınlıkla ağırlıklı) yoğunluk tahminiyle, boşluklar hacim profiliyle
      bulunur. Güç (0-100): dokunuş sayısı, son dokunuşun yakınlığı, tepki büyüklüğü ve hacim. Pivotlar grafikte ayrı katmandır.
      Hesaplama ${zamanMetni(v.zaman)}.</p>`;
}

function temettuBolumu(t) {
  const d = t.dagitimlar || [];
  const satirlar = d.map((x) => `<tr>
      <td>${kacis(x.karar_tarihi || x.yayin?.slice(0, 10) || "–")}</td>
      <td><span class="rozet ${x.durum === "ÖDENDİ" ? "tut" : x.durum === "DAĞITILMAYACAK" ? "sat" : "al"}">${kacis(x.durum)}</span></td>
      <td class="sag">${x.dagitilmayacak ? "–" : sayi(x.brut_tl, 4)}</td><td class="sag">${x.dagitilmayacak ? "–" : sayi(x.net_tl, 4)}</td>
      <td>${kacis(x.gk_tarihi || "–")} <span class="soluk kucuk">${kacis(x.gk_gorusuldu || "")}</span></td>
      <td>${(x.taksitler || []).map((k) => `${kacis(k.ad)}: hak ${kacis(k.kesin_hak || k.teklif_hak || "–")}${k.kesin_hak ? "" : " (teklif)"}, ödeme ${kacis(k.odeme || "–")}`).join("<br>") || "–"}</td>
      <td><a href="https://www.kap.org.tr/tr/Bildirim/${x.bildirim_id}" target="_blank" rel="noopener" class="kucuk">KAP</a></td></tr>`).join("");
  const g = (t.gecmis || []).slice(-10);
  const enb = Math.max(...g.map((x) => x.brut_tl || 0), 0.0001);
  const cubuklar = g.map((x) => `<div class="tgecmis"><span class="kucuk soluk">${kacis(x.yil)}</span>
      <div class="bilesen-cubuk"><span style="width:${(x.brut_tl / enb) * 100}%; background: var(--al)"></span></div>
      <span class="kucuk">${sayi(x.brut_tl, 2)} TL${x.verim != null ? ` · %${sayi(x.verim, 2)}` : ""}${x.odeme_sayisi > 1 ? ` · ${x.odeme_sayisi} ödeme` : ""}</span></div>`).join("");
  return `
    <h3>Kâr payı dağıtımları (KAP)</h3>
    <div class="tablo-kutu"><table class="olay-tablosu">
      <thead><tr><th>Karar</th><th>Durum</th><th class="sag">Brüt (TL)</th><th class="sag">Net (TL)</th><th>Genel kurul</th><th>Tarihler</th><th></th></tr></thead>
      <tbody>${satirlar || '<tr><td colspan="7" class="soluk">Son 10 ayda kâr payı bildirimi yok.</td></tr>'}</tbody></table></div>
    <p class="not">Yaşam döngüsü: yönetim kurulu teklifi → genel kurulda kesinleşme → hak kullanım (payın kâr payı olmadan işlem
      görmeye başladığı gün) → ödeme. Tutarlar 1 TL nominal pay başına.</p>
    <h3>Yıllara göre temettü (son 10 yıl, brüt, 1 TL nominal pay başına)</h3>
    ${cubuklar || '<p class="soluk kucuk">Geçmiş yok.</p>'}
    <p class="not">Kaynak: FVT kurumsal işlemler. Verim, ödeme günündeki fiyata göre. Tutarlar o günkü pay başınadır;
      aradaki bedelsiz sermaye artırımlarına göre düzeltilmemiştir.</p>`;
}

async function seviyeYukle() {
  try {
    seviyeVerisi = await getir(`/api/seviyeler/${encodeURIComponent(kod)}`);
    cizgileriKur();
    document.getElementById("seviyeler").innerHTML = seviyeVerisi.fiyat ? seviyeTablosu(seviyeVerisi)
      : '<p class="soluk">Seviyeler henüz hesaplanmadı.</p>';
  } catch (e) {
    document.getElementById("seviyeler").innerHTML = `<p class="eksi">Seviyeler alınamadı: ${kacis(e.message)}</p>`;
  }
}

async function temettuYukle() {
  try {
    const t = await getir(`/api/temettu/${encodeURIComponent(kod)}`);
    document.getElementById("rozet-satiri").innerHTML = rozetlerHtml(t.rozetler);
    document.getElementById("temettu").innerHTML = temettuBolumu(t);
  } catch (e) {
    document.getElementById("temettu").innerHTML = `<p class="eksi">Temettü bilgisi alınamadı: ${kacis(e.message)}</p>`;
  }
}

document.getElementById("seviye-isaret").addEventListener("change", cizgileriKur);
document.getElementById("pivot-secim").addEventListener("change", cizgileriKur);
