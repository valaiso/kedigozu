// Ana panel: endeksler, takip listesi, zamanlanmış işler.

function endeksKarti(e) {
  return `
    <a class="kart tik" href="hisse.html?kod=${encodeURIComponent(e.kod)}">
      <div class="ust-satir"><span class="baslik">${kacis(e.ad)}</span><span class="soluk kucuk">${kacis(e.kod)}</span></div>
      <div class="fiyat">${sayi(e.fiyat)} <span class="kucuk ${yonSinifi(e.degisim)}">${yuzde(e.degisim)}</span></div>
      <div class="sinyaller">
        <div><span class="soluk kucuk">4 saatlik</span>${rozet(e.sinyal["4h"])}</div>
        <div><span class="soluk kucuk">Günlük</span>${rozet(e.sinyal["1d"])}</div>
      </div>
    </a>`;
}

function genislikKarti(g) {
  if (!g?.son) return "";
  const s = g.son;
  const renk = (x) => (x >= 0.6 ? "arti" : x <= 0.3 ? "eksi" : "");
  return `<div class="kart">
      <div class="ust-satir"><span class="baslik">Piyasa genişliği</span><span class="soluk kucuk">${kacis(s.tarih)}</span></div>
      <div class="fiyat"><span class="${renk(s.sma50_ustu)}">%${sayi(s.sma50_ustu * 100, 0)}</span>
        <span class="kucuk soluk">XU100 hisselerinin 50 günlük ortalama üstündeki oranı</span></div>
      <div class="kucuk">200 günlük üstü <b class="${renk(s.sma200_ustu)}">%${s.sma200_ustu === null ? "–" : sayi(s.sma200_ustu * 100, 0)}</b>
        · USD bazlı XU100 <b>${g.usd_xu100 ? sayi(g.usd_xu100.deger, 1) : "–"}</b>
        ${g.usd_xu100_yillik !== null && g.usd_xu100_yillik !== undefined ? `<span class="${yonSinifi(g.usd_xu100_yillik)}">(1 yıl ${yuzde(g.usd_xu100_yillik)})</span>` : ""}</div>
    </div>`;
}

// En yakın destek ya da direnç ve şimdiki fiyata uzaklığı; altında bir sonraki seviye. Üstüne gelince 3 seviye ve güçleri.
function seviyeHucresi(liste, fiyat, tur) {
  if (!liste?.length || !fiyat) return '<td class="sag soluk">–</td>';
  const harf = tur === "destek" ? "D" : "R";
  const uzaklik = (s) => `${s.fiyat > fiyat ? "+" : "−"}%${sayi(Math.abs(s.fiyat / fiyat - 1) * 100, 1)}`;
  const baslik = liste.map((s, i) => `${harf}${i + 1}: ${sayi(s.fiyat, 2)} (${uzaklik(s)}, güç ${sayi(s.guc, 0)})`).join("\n");
  const [ilk, ikinci] = liste;
  return `<td class="sag" title="${kacis(baslik)}">
      <b class="${tur === "destek" ? "arti" : "eksi"}">${sayi(ilk.fiyat, 2)}</b> <span class="kucuk soluk">${uzaklik(ilk)}</span>
      ${ikinci ? `<br><span class="kucuk soluk">${harf}2 ${sayi(ikinci.fiyat, 2)}</span>` : ""}</td>`;
}

function hisseSatiri(h) {
  const xu = h.xu100 === false && h.grup !== "emtia" ? ' <span class="rozet sat" title="Güncel XU100 listesinde değil">XU100 dışı</span>' : "";
  const hazir = h.sinyal["4h"] || h.sinyal["1d"];
  const sinyalHucreleri = hazir
    ? `<td>${rozet(h.sinyal["4h"])}</td><td>${rozet(h.sinyal["1d"])}</td>`
    : '<td colspan="2" class="yukleniyor">Veri çekiliyor…</td>';
  const uy = h.uyarlanmis || {};
  const uyRozet = (u) => u ? `<span class="rozet ${etiketSinifi(u.etiket)}" style="min-width:0" title="Uyarlanmış puan ${sayi(u.puan, 3)}${u.guven === "zayıf" ? " · güven düşük" : ""}">${kacis(u.etiket)}${u.guven === "zayıf" ? "*" : ""}</span>` : "–";
  const uyarlanmisHucre = hazir ? `<td class="kucuk">${uyRozet(uy["4h"])} ${uyRozet(uy["1d"])}</td>` : "<td></td>";
  const ko = h.konsey || {};
  const konseyRozet = (z) => ko[z]
    ? `<span class="rozet ${etiketSinifi(ko[z].karar)}" style="min-width:0" title="${ZD_ADLARI[z]}: ${ko[z].al + ko[z].sat + ko[z].tut} göstergeden ${ko[z].al} AL, ${ko[z].tut} TUT, ${ko[z].sat} SAT; rozet Kedi Gözü puanı (bu hissede geçmişte en isabetli 5 göstergenin oyu, her ay yeniden seçilir)${ko[z].kedi_puan !== null && ko[z].kedi_puan !== undefined ? ' ' + sayi(ko[z].kedi_puan, 1) : ''}">${kacis(ko[z].karar || "–")} <span class="kucuk">${ko[z].al}/${ko[z].sat}</span></span>`
    : "–";
  const konseyHucre = hazir ? `<td class="kucuk">${konseyRozet("4h")} ${konseyRozet("1d")}</td>` : "<td></td>";
  const seviyeler = `${seviyeHucresi(h.seviyeler?.destek, h.fiyat, "destek")}${seviyeHucresi(h.seviyeler?.direnc, h.fiyat, "direnc")}`;
  return `
    <tr class="tik" data-kod="${kacis(h.kod)}">
      <td><b>${kacis(h.kod)}</b> <span class="soluk">${kacis(h.ad)}</span>${xu}${rozetlerHtml(h.rozetler)}</td>
      <td>${kacis(GRUP_ADLARI[h.grup] || h.grup || "–")}</td>
      <td class="sag">${sayi(h.fiyat)}</td>
      <td class="sag ${yonSinifi(h.degisim)}">${yuzde(h.degisim)}</td>
      ${sinyalHucreleri}
      ${uyarlanmisHucre}
      ${konseyHucre}
      ${seviyeler}
      <td><button class="cikar" data-cikar="${kacis(h.kod)}" title="Takipten çıkar">×</button></td>
    </tr>`;
}

function sektorSatiri(e) {
  const hazir = e.sinyal["4h"] || e.sinyal["1d"];
  return `
    <tr class="tik" data-kod="${kacis(e.kod)}">
      <td><b>${kacis(e.ad)}</b> <span class="soluk kucuk">${kacis(e.kod)}</span></td>
      <td class="sag">${sayi(e.fiyat)}</td>
      <td class="sag ${yonSinifi(e.degisim)}">${yuzde(e.degisim)}</td>
      ${hazir ? `<td>${rozet(e.sinyal["4h"])}</td><td>${rozet(e.sinyal["1d"])}</td>` : '<td colspan="2" class="yukleniyor">Veri çekiliyor…</td>'}
      <td class="soluk kucuk">${zamanMetni(e.zaman)}</td>
    </tr>`;
}

async function evrenYukle() {
  const evren = await getir("/api/evren");
  document.getElementById("evren-listesi").innerHTML = evren
    .filter((h) => !h.takipte)
    .map((h) => `<option value="${kacis(h.kod)}">${kacis(h.ad)} · ${kacis(GRUP_ADLARI[h.grup] || h.grup)}${h.xu030 ? " · XU030" : ""}</option>`)
    .join("");
  return evren;
}

function mesaj(metin, sinif = "") {
  const p = document.getElementById("ekle-mesaj");
  p.textContent = metin;
  p.className = `not ${sinif}`;
}

let bekleyenler = new Set();
let geminiVar = true;   // /api/ozet'ten; yoksa haber puanı "kapalı" / "kural" gösterilir
let yoklama = null;

function yoklamayiBaslat() {
  if (yoklama) return;
  const baslangic = Date.now();
  yoklama = setInterval(async () => {
    const ozet = await yukle();
    const hazir = new Set(ozet.hisseler.filter((h) => h.sinyal["4h"] || h.sinyal["1d"]).map((h) => h.kod));
    bekleyenler = new Set([...bekleyenler].filter((k) => !hazir.has(k)));
    if (bekleyenler.size === 0 || Date.now() - baslangic > 6 * 60 * 1000) {
      clearInterval(yoklama);
      yoklama = null;
      if (bekleyenler.size === 0) mesaj("Veriler hazır.", "arti");
    }
  }, 10000);
}

document.getElementById("ekle-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const kutu = document.getElementById("ekle-kutu");
  const kod = kutu.value.trim().toUpperCase();
  if (!kod) return;
  const yanit = await fetch(`/api/takip/${encodeURIComponent(kod)}`, { method: "POST" });
  const veri = await yanit.json().catch(() => ({}));
  if (!yanit.ok) {
    mesaj(veri.detail || "Eklenemedi.", "eksi");
    return;
  }
  mesaj(veri.mesaj, veri.eklendi ? "" : "soluk");
  kutu.value = "";
  if (veri.eklendi) {
    bekleyenler.add(kod);
    yoklamayiBaslat();
  }
  await Promise.all([yukle(), evrenYukle()]);
});

document.getElementById("liste").addEventListener("click", async (e) => {
  const dugme = e.target.closest("button[data-cikar]");
  if (!dugme) return;
  e.stopPropagation();
  const kod = dugme.dataset.cikar;
  if (!confirm(`${kod} takip listesinden çıkarılsın mı? Geçmiş verisi saklanır, yeniden eklersen kaldığı yerden devam eder.`)) return;
  const yanit = await fetch(`/api/takip/${encodeURIComponent(kod)}`, { method: "DELETE" });
  const veri = await yanit.json().catch(() => ({}));
  mesaj(yanit.ok ? `${kod} takipten çıkarıldı.` : (veri.detail || "Çıkarılamadı."), yanit.ok ? "" : "eksi");
  await Promise.all([yukle(), evrenYukle()]);
});

async function yukle() {
  const [ozet, isler] = await Promise.all([getir("/api/ozet"), getir("/api/isler")]);
  geminiVar = ozet.gemini_var !== false;
  document.getElementById("endeksler").innerHTML = ozet.endeksler.map(endeksKarti).join("") + genislikKarti(ozet.genislik);
  const sektorler = document.getElementById("sektorler");
  sektorler.innerHTML = ozet.sektorler.map(sektorSatiri).join("")
    || '<tr><td colspan="6" class="soluk">ayarlar.yaml içinde sektör endeksi yok</td></tr>';
  sektorler.querySelectorAll("tr.tik").forEach((tr) => tr.addEventListener("click", () => {
    location.href = `hisse.html?kod=${encodeURIComponent(tr.dataset.kod)}`;
  }));
  const liste = document.getElementById("liste");
  liste.innerHTML = ozet.hisseler.map(hisseSatiri).join("")
    || '<tr><td colspan="11" class="soluk">Takip listen boş. Yukarıdan XU100 hissesi ekleyebilirsin.</td></tr>';
  liste.querySelectorAll("tr.tik").forEach((tr) => tr.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    location.href = `hisse.html?kod=${encodeURIComponent(tr.dataset.kod)}`;
  }));

  const z = isler.zamanlayici;
  document.getElementById("zamanlayici").textContent = z.calisiyor || window.kediYayin ? "" : "Zamanlayıcı kapalı (önizleme)";
  document.getElementById("yenile").disabled = !z.calisiyor;
  return ozet;
}

document.getElementById("yenile").addEventListener("click", (e) => guncellemeBaslat("mum", e.currentTarget));
gundemYukle();
ruzgarYukle();
Promise.all([yukle(), evrenYukle()]).then(([ozet]) => {
  // Veri çekimi süren (sinyali henüz olmayan) hisse varsa hazır olana kadar yokla.
  ozet.hisseler.filter((h) => !h.sinyal["4h"] && !h.sinyal["1d"]).forEach((h) => bekleyenler.add(h.kod));
  if (bekleyenler.size) yoklamayiBaslat();
}).catch((e) => {
  document.getElementById("liste").innerHTML = `<tr><td colspan="11" class="eksi">Veri alınamadı: ${kacis(e.message)}</td></tr>`;
});
