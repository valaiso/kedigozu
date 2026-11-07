// Hisse sayfasının mali bölümü: çarpanlar, çeyreklik seriler, oranlar ve özet tablolar (/api/mali).

const MALI_ANAHTAR = "kedigozu.mali.gorunum";
let maliGorunum = (() => { try { return localStorage.getItem(MALI_ANAHTAR) || "nominal"; } catch { return "nominal"; } })();

function ceyrekEtiketi(donem) {
  const [yil, ay] = donem.split("/");
  return `${Number(ay) / 3}Ç${yil.slice(2)}`;
}

function tutarBirimi(degerler) {
  const enBuyuk = Math.max(0, ...degerler.filter((x) => x !== null && x !== undefined).map(Math.abs));
  return enBuyuk >= 1e9 ? { bolen: 1e9, ad: "mlr TL" } : { bolen: 1e6, ad: "mn TL" };
}

function tutar(x, birim, basamak = 2) {
  return x === null || x === undefined ? "–" : sayi(x / birim.bolen, basamak);
}

function maliOranMetni(x, bicim) {
  if (x === null || x === undefined) return "–";
  if (bicim === "yuzde") return `%${sayi(x * 100, 1)}`;
  if (bicim === "tl") return `${sayi(x / 1e9, 1)} mlr`;
  if (bicim === "fiyat") return `${sayi(x, 2)} TL`;
  return sayi(x, 2);
}

// Basit SVG çubuk grafik: eksi değerler kırmızı, son çubuk vurgulu, her çubuğun altında çeyrek etiketi.
function cubukGrafik(donemler, degerler, bicimle) {
  const G = 340, Y = 150, ust = 18, alt = 22, sol = 4, sag = 4;
  const n = donemler.length;
  if (!n) return '<p class="soluk kucuk">Veri yok.</p>';
  const gecerli = degerler.filter((x) => x !== null && x !== undefined);
  const enB = Math.max(0, ...gecerli), enK = Math.min(0, ...gecerli);
  const aralik = enB - enK || 1;
  const yuk = Y - ust - alt;
  const sifirY = ust + (enB / aralik) * yuk;
  const adim = (G - sol - sag) / n, gen = Math.max(4, adim * 0.62);
  let svg = `<svg viewBox="0 0 ${G} ${Y}" class="cubuk-grafik" role="img">`;
  svg += `<line x1="${sol}" x2="${G - sag}" y1="${sifirY}" y2="${sifirY}" class="sifir"/>`;
  donemler.forEach((d, i) => {
    const v = degerler[i];
    const x = sol + adim * i + (adim - gen) / 2;
    if (v !== null && v !== undefined) {
      const h = (Math.abs(v) / aralik) * yuk;
      const y = v >= 0 ? sifirY - h : sifirY;
      const sinif = `${v < 0 ? "eksi" : "arti"}${i === n - 1 ? " son" : ""}`;
      svg += `<rect x="${x}" y="${y}" width="${gen}" height="${Math.max(h, 1)}" class="${sinif}"><title>${kacis(d)}: ${kacis(bicimle(v))}</title></rect>`;
      if (i === n - 1 || n <= 8) {
        const ty = v >= 0 ? y - 4 : y + h + 11;
        svg += `<text x="${x + gen / 2}" y="${Math.max(10, Math.min(Y - alt - 2, ty))}" class="deger">${kacis(bicimle(v))}</text>`;
      }
    }
    svg += `<text x="${x + gen / 2}" y="${Y - 6}" class="eksen">${ceyrekEtiketi(d)}</text>`;
  });
  return svg + "</svg>";
}

function carpanlarHtml(c) {
  const kutular = c.liste.map((x) => `
    <div class="carpan" title="${kacis(x.tanim)}">
      <span class="soluk kucuk">${kacis(x.ad)}</span>
      <b>${maliOranMetni(x.deger, x.bicim)}</b>
      ${x.deger === null ? `<span class="soluk kucuk">${kacis(x.neden || "")}</span>` : ""}
    </div>`).join("");
  return `<div class="carpanlar">${kutular}</div>
    <p class="not">Fiyat ${sayi(c.fiyat)} (${zamanMetni(c.fiyat_zamani)}) · bilanço ${kacis(c.bilanco_donemi || "–")} ·
    hesaplama ${zamanMetni(c.hesaplama)}. Tanımlar için kutuların üzerine gelin.</p>`;
}

// renkli: değişim, kalemin kâra etkisine göre boyanır (eksi satırlarda, yani giderlerde, artış kırmızıdır).
function ozetTablo(t, renkli = true) {
  const birim = tutarBirimi(t.satirlar.flatMap((s) => [s.simdi, s.once, s.ttm]));
  const ttmVar = t.sutunlar.length > 3;
  const degisim = (s) => {
    if (s.degisim === null) return '<td class="sag soluk">–</td>';
    const metin = `${s.degisim > 0 ? "+" : ""}${sayi(s.degisim * 100, 1)}%`;
    return `<td class="sag ${renkli ? yonSinifi(s.degisim * Math.sign(s.simdi || 1)) : ""}">${metin}</td>`;
  };
  const satirlar = t.satirlar.map((s) => `<tr>
      <td>${kacis(s.ad)}</td>
      <td class="sag">${tutar(s.simdi, birim)}</td>
      <td class="sag soluk">${tutar(s.once, birim)}</td>
      ${degisim(s)}
      ${ttmVar ? `<td class="sag">${tutar(s.ttm, birim)}</td>` : ""}
    </tr>`).join("");
  return `<div class="tablo-kutu"><table class="mali-tablo">
      <thead><tr><th>${kacis(t.baslik)} <span class="soluk">(${birim.ad})</span></th>
        ${t.sutunlar.map((s) => `<th class="sag">${kacis(s)}</th>`).join("")}</tr></thead>
      <tbody>${satirlar}</tbody></table></div>
    <p class="not">${kacis(t.aciklama)}</p>`;
}

function ceyreklikHtml(c) {
  const birim = tutarBirimi(c.seriler.flatMap((s) => s.degerler));
  return c.seriler.map((s) => {
    const son = s.degerler[s.degerler.length - 1];
    return `<div class="kart grafik-kart">
      <div class="ust-satir"><span class="baslik">${kacis(s.ad)}</span>
        <span class="soluk kucuk">son çeyrek ${tutar(son, birim, 1)} ${birim.ad}</span></div>
      ${cubukGrafik(c.donemler, s.degerler, (v) => sayi(v / birim.bolen, 1))}
    </div>`;
  }).join("");
}

function oranlarHtml(o) {
  return o.seriler.map((s) => {
    const son = s.degerler[s.degerler.length - 1];
    return `<div class="kart grafik-kart" title="${kacis(s.tanim)}">
      <div class="ust-satir"><span class="baslik">${kacis(s.ad)}</span>
        <span class="soluk kucuk">son ${maliOranMetni(son, s.bicim)}</span></div>
      ${cubukGrafik(o.donemler.slice(-8), s.degerler.slice(-8), (v) => maliOranMetni(v, s.bicim))}
    </div>`;
  }).join("");
}

async function maliYukle() {
  const kutu = document.getElementById("mali");
  let m;
  try {
    m = await getir(`/api/mali/${encodeURIComponent(kod)}?gorunum=${maliGorunum}`);
  } catch (e) {
    kutu.innerHTML = `<p class="eksi">Mali veri alınamadı: ${kacis(e.message)}</p>`;
    return;
  }
  if (!m.var) {
    kutu.innerHTML = `<p class="soluk">${kacis(m.mesaj)}</p>`;
    return;
  }
  const uyarilar = m.uyarilar.map((u) => `<p class="uyari">${kacis(u.donem)}: ${kacis(u.uyari)}</p>`).join("");
  kutu.innerHTML = `
    <p class="not ust-not">${kacis(m.kaynak)} · son dönem ${kacis(m.son_donem)}${m.gonderim ? ` (KAP'a gönderim ${zamanMetni(m.gonderim)})` : ""}
      · ${kacis(m.birim_notu)}</p>
    ${uyarilar}
    <h3>Çarpanlar</h3>
    ${carpanlarHtml(m.carpanlar)}
    <h3>Çeyreklik ${m.gorunum === "reel" ? "(enflasyon düzeltmeli)" : ""}</h3>
    <div class="grafikler">${ceyreklikHtml(m.ceyreklik)}</div>
    <h3>Marjlar ve oranlar</h3>
    <div class="grafikler">${oranlarHtml(m.oranlar)}</div>
    <h3>Özet tablolar</h3>
    <div class="ozet-tablolar">
      <div>${ozetTablo(m.gelir)}</div>
      <div>${ozetTablo(m.bilanco, false)}</div>
      ${m.nakit ? `<div>${ozetTablo(m.nakit)}</div>` : ""}
    </div>`;
}

function maliBaslat(grup) {
  const bolum = document.getElementById("mali-bolum");
  if (grup === "endeks" || grup === "emtia") { bolum.hidden = true; return; }
  bolum.hidden = false;
  const dugmeler = bolum.querySelectorAll("button[data-gorunum]");
  const isaretle = () => dugmeler.forEach((b) => b.classList.toggle("secili", b.dataset.gorunum === maliGorunum));
  dugmeler.forEach((b) => b.addEventListener("click", () => {
    maliGorunum = b.dataset.gorunum;
    try { localStorage.setItem(MALI_ANAHTAR, maliGorunum); } catch { /* yalnızca tercih */ }
    isaretle();
    maliYukle();
  }));
  isaretle();
  maliYukle();
}
