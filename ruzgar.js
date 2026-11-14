// Ana panel: Piyasa Rüzgârı kartı, ekonomist yorumu ve kural kitabı.

const PARAGRAF_ADLARI = { durum: "Durum", nedenler: "Nedenler", beklenti: "Beklenti", riskler: "Riskler", sektorler: "Sektörler" };

function ruzgarSinifi(p) {
  if (p === null || p === undefined || p === 0) return "soluk";
  return p > 0 ? "arti" : "eksi";
}

// Ekonomist metnindeki işaretler: [-olumsuz ifade-] kırmızı, [+olumlu ifade+] yeşil (motorlar/ekonomist.py).
function yorumMetni(metin) {
  return kacis(metin)
    .replace(/\[-(.+?)-\]/g, '<span class="eksi">$1</span>')
    .replace(/\[\+(.+?)\+\]/g, '<span class="arti">$1</span>');
}

function olcum(o, ad, birim = "%") {
  const v = o?.[ad]?.deger ?? o?.[ad];
  if (v === null || v === undefined || typeof v === "object") return "–";
  return birim === "%" ? `%${sayi(v, 2)}` : sayi(v, 4);
}

// Faiz Rüzgârı geçmişte XU100'ün sonraki 20 gününü tahmin etti mi? (motorlar/kalibrasyon.py, örtüşmesiz t)
function ruzgarOlcumu(m) {
  if (!m) return "";
  const uyum = `uyum ${m.ic > 0 ? "+" : m.ic < 0 ? "−" : ""}${sayi(Math.abs(m.ic), 2)}`;
  const ay = (t) => (t ? `${t.slice(5, 7)}.${t.slice(0, 4)}` : "–");
  const donem = `${ay(m.baslangic)}–${ay(m.bitis)}, ${m.gun} gün`;
  const hukum = {
    ise_yaradi: `<span class="arti">Geçmişte işe yaradı</span>: ${uyum}`,
    ters: `<span class="eksi">Geçmişte ters çalıştı</span>: ${uyum}`,
  }[m.hukum] || `<b>Geçmişte XU100'ün sonraki ${m.ileri_gun || 20} gününü tahmin etmedi</b>: ${uyum}, anlamlı değil`;
  const d = (m.dilimler || []).filter((x) => x.gun >= 20 && x.ort_ileri_getiri !== null);
  const dilim = d.length ? ` Puan ${kacis(d[0].dilim)} iken sonraki ${m.ileri_gun || 20} günde XU100 ortalama ${yuzde(d[0].ort_ileri_getiri)},
      ${kacis(d.at(-1).dilim)} iken ${yuzde(d.at(-1).ort_ileri_getiri)}.` : "";
  return `<p class="not">${hukum}, yön isabeti ${m.yon_isabeti != null ? "%" + sayi(m.yon_isabeti * 100, 0) : "–"} (${donem},
      yaklaşık ${m.bagimsiz_gozlem} bağımsız dönem).${dilim} ${m.hukum === "ise_yaradi" ? "" : "Al-sat işareti olarak değil, faiz ortamının özeti olarak okuyun."}</p>`;
}

function ruzgarKarti(r) {
  const f = r.faiz_ruzgari;
  if (!f) return '<p class="soluk">Faiz verisi henüz hesaplanmadı.</p>';
  const o = f.olcumler || {};
  const ppk = o.sonraki_ppk;
  const p = f.puan;
  return `
    <div class="ust-satir"><span class="baslik">Faiz Rüzgârı</span><span class="soluk kucuk">${zamanMetni(f.zaman)}</span></div>
    <div class="buyuk-puan"><span class="ruzgar ${ruzgarSinifi(p)}">${p === null ? "–" : (p > 0 ? "+" : "") + sayi(p, 0)}</span>
      <span class="soluk kucuk">−100 … +100 · artı değer hisseler lehine</span></div>
    ${ruzgarOlcumu(r.olcum)}
    <table class="sik ruzgar-tablo"><tbody>
      <tr><td>Fiili fonlama maliyeti</td><td class="sag">${olcum(o, "FONLAMA")}</td>
          <td class="soluk kucuk">politika faizi ${olcum(o, "POLITIKA")} (${o.POLITIKA?.karar_tarihi
            ? `${kacis(o.POLITIKA.karar_tarihi.split("-").reverse().join("."))} kararından beri`
            : kacis(o.POLITIKA?.tarih?.slice(0, 7) || "–")})</td></tr>
      <tr><td>Sıradaki PPK</td><td class="sag">${ppk?.tarih ? kacis(ppk.tarih.slice(0, 10).split("-").reverse().join(".")) : "–"}</td>
          <td class="soluk kucuk">anket beklentisi ${ppk?.anket_beklenti != null ? "%" + sayi(ppk.anket_beklenti, 2)
            : `– (bu toplantı için anket henüz yayımlanmadı; her ayın üçüncü haftası${o.ANKET_PPK?.deger != null ? `, son anket ${olcum(o, "ANKET_PPK")}` : ""})`}</td></tr>
      <tr><td>2 / 10 yıllık tahvil</td><td class="sag">${olcum(o, "TR02Y")} / ${olcum(o, "TR10Y")}</td>
          <td class="soluk kucuk">2Y 4 haftada ${o.TR02Y_4h_degisim != null ? (o.TR02Y_4h_degisim * 100 > 0 ? "+" : "") + sayi(o.TR02Y_4h_degisim * 100, 0) + " bp" : "–"}</td></tr>
      <tr><td>Reel faiz</td><td class="sag">${o.reel_faiz != null ? "%" + sayi(o.reel_faiz, 2) : "–"}</td>
          <td class="soluk kucuk">fonlama − 12 ay enflasyon beklentisi (${olcum(o, "TUFE_BEK_12AY")})</td></tr>
      <tr><td>USD/TRY</td><td class="sag">${olcum(o, "USDTRY", "")}</td>
          <td class="soluk kucuk">1 ayda ${o.USDTRY_1a_degisim_yuzde != null ? "%" + sayi(o.USDTRY_1a_degisim_yuzde, 1) : "–"}</td></tr>
      <tr><td>Mevduat (3 ay)</td><td class="sag">${olcum(o, "MEVDUAT_3AY")}</td>
          <td class="soluk kucuk">XU100 kazanç getirisi ${o.xu100_kazanc_getirisi != null ? "%" + sayi(o.xu100_kazanc_getirisi, 1) : "–"}</td></tr>
    </tbody></table>`;
}

function ekonomistKarti(r) {
  const y = r.ekonomist;
  if (!y) return '<p class="soluk">Yorum henüz yazılmadı.</p>';
  const kaynak = y.kaynak === "gemini" ? "Gemini (sayıları doğrulandı)" : "kural kitabından (Gemini yorumu yok)";
  return `
    <div class="ust-satir"><span class="baslik">Ekonomist yorumu</span><span class="soluk kucuk">${zamanMetni(y.zaman)} · ${kacis(kaynak)}</span></div>
    ${y.paragraflar.map((p) => `<p class="yorum"><b>${kacis(PARAGRAF_ADLARI[p.baslik] || p.baslik)}.</b> ${yorumMetni(p.metin)}</p>`).join("")}
    ${y.dogrulama ? `<p class="not">${kacis(y.dogrulama)}</p>` : ""}
    <p class="not">Yatırım tavsiyesi değildir. Yorum yalnızca aşağıdaki ölçümlere ve kurallara dayanır.</p>`;
}

function kuralKitabi(r) {
  const k = r.faiz_ruzgari?.kurallar || [];
  if (!k.length) return "";
  const satir = (x) => `<tr class="${x.aktif ? "" : "pasif"}">
      <td>${x.no}</td>
      <td>${x.aktif ? (x.belirsizlik ? '<span class="rozet tut">belirsizlik</span>' : etkiOku(x.sinyal)) : '<span class="soluk kucuk">devrede değil</span>'}</td>
      <td class="sarmal"><b>${kacis(x.ad)}</b><div class="kucuk">${kacis(x.gozlem)}</div>
        <div class="kucuk soluk">${kacis(x.yorum)} → ${kacis(x.etki)}</div></td>
      <td class="sag">${x.aktif && !x.belirsizlik ? (x.sinyal > 0 ? "+" : "") + sayi(x.sinyal, 2) : "–"}</td>
      <td class="sag soluk">${sayi(x.agirlik, 2)}</td></tr>`;
  return `<details class="kural-kitabi"><summary>Kural kitabı (${k.filter((x) => x.aktif).length}/${k.length} kural devrede)</summary>
    <div class="tablo-kutu"><table class="sik olay-tablosu">
      <thead><tr><th>#</th><th></th><th>Kural, gözlem ve yorum</th><th class="sag">Sinyal</th><th class="sag">Ağırlık</th></tr></thead>
      <tbody>${k.map(satir).join("")}</tbody></table></div>
    <p class="not">Faiz Rüzgârı = 100 × Σ(ağırlık × sinyal) / Σ ağırlık. Eşikler ve ağırlıklar ilk öneridir; Faz 6'da geçmiş veriyle ayarlanacak.</p>
  </details>`;
}

async function ruzgarYukle() {
  try {
    const r = await getir("/api/piyasa_ruzgari");
    document.getElementById("ruzgar-karti").innerHTML = ruzgarKarti(r);
    document.getElementById("ekonomist-karti").innerHTML = ekonomistKarti(r);
    document.getElementById("kural-kitabi").innerHTML = kuralKitabi(r);
  } catch (e) {
    document.getElementById("ruzgar-karti").innerHTML = `<p class="eksi">Piyasa rüzgârı alınamadı: ${kacis(e.message)}</p>`;
  }
}
