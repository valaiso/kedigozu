// Hisse sayfasının haber bölümü: haber puanı, puanı oluşturan olaylar, olay listesi ve grafikteki haber işaretleri.

const TUR_ADLARI = { kap: "KAP", haber: "Haber", piyasa_haber: "Ekonomi" };
let haberVerisi = null;
let tumOlaylar = false;

function puanKarti(baslik, p, alt) {
  return `<div class="kart">
    <div class="ust-satir"><span class="baslik">${kacis(baslik)}</span><span class="soluk kucuk">${zamanMetni(p?.zaman)}</span></div>
    <div class="buyuk-puan">${puanRozeti(p, haberVerisi?.gemini_var)}<span class="soluk kucuk">${kacis(alt)}</span></div>
  </div>`;
}

function etkiliOlay(o) {
  return `<li>${etkiOku(o.katki)} <span class="kucuk soluk">${kacis(TUR_ADLARI[o.kaynak_turu] || "")} · ${zamanMetni(o.yayin)}
      · katkı ${o.katki > 0 ? "+" : ""}${sayi(o.katki, 3)}</span><br>
    ${o.url ? `<a href="${kacis(o.url)}" target="_blank" rel="noopener">${kacis(o.baslik)}</a>` : kacis(o.baslik)}
    ${o.gerekce ? `<div class="kucuk soluk">${kacis(o.gerekce)}</div>` : ""}</li>`;
}

function olaySatiri(o) {
  const kaynak = o.kaynak_turu === "haber" ? `${kacis(o.kaynak || "")}${o.kaynak_sayisi > 1 ? ` +${o.kaynak_sayisi - 1}` : ""}` : "KAP";
  return `<tr>
    <td class="soluk kucuk">${zamanMetni(o.yayin)}</td>
    <td>${etkiOku(o.etki)}</td>
    <td class="sarmal">${o.url ? `<a href="${kacis(o.url)}" target="_blank" rel="noopener">${kacis(o.baslik)}</a>` : kacis(o.baslik)}
      ${o.gerekce ? `<div class="kucuk soluk">${kacis(o.gerekce)}</div>` : ""}</td>
    <td class="kucuk">${kaynak}</td>
    <td class="kucuk soluk">${kacis(o.tip || o.olay_turu || "")}</td>
    <td class="kucuk soluk">${kacis(o.durum_adi)}${o.model && o.model !== "kural" ? ` · ${kacis(o.model)}` : ""}</td>
  </tr>`;
}

function olayTablosu() {
  const liste = haberVerisi.olaylar.filter((o) => tumOlaylar || o.durum === "bekliyor" || Math.abs(o.etki || 0) > 0.001);
  document.getElementById("olay-sayaci").textContent =
    `${liste.length} / ${haberVerisi.olaylar.length} olay (son 30 gün)`;
  document.getElementById("olaylar").innerHTML = liste.map(olaySatiri).join("")
    || '<tr><td colspan="6" class="soluk">Etkisi olan olay yok.</td></tr>';
}

async function haberYukle() {
  const bolum = document.getElementById("haber-bolum");
  try {
    haberVerisi = await getir(`/api/haberler/${encodeURIComponent(kod)}`);
  } catch (e) {
    bolum.querySelector("#haber-kartlar").innerHTML = `<p class="eksi">Haberler alınamadı: ${kacis(e.message)}</p>`;
    return;
  }
  const v = haberVerisi;
  // Haber puanı ne kadar isabetli? (motorlar/kalibrasyon: olay yönü ile sonraki 5 günün XU100'e göre getirisi)
  const i = v.isabet;
  const hi = document.getElementById("haber-isabet");
  if (i?.olay) {
    hi.hidden = false;
    hi.innerHTML = `<b>Haber puanı ne kadar isabetli?</b> Puanlanmış ${i.olay} olayda, olayın yönü sonraki 5 günde hissenin XU100'e göre
      yönünü %${sayi((i.yon_isabeti5 || 0) * 100, 0)} oranında doğru buldu; uyum (IC) ${sayi(i.ic5 || 0, 2)}. Olay sayısı az; arttıkça ölçüm güncellenir.`;
  }
  document.getElementById("haber-kartlar").innerHTML =
    (v.gemini_var === false
      ? `<p class="not eksi" style="grid-column:1/-1;margin:0">Gemini anahtarı tanımlı değil: haber puanı kapalı. Haberlerin ve
          KAP bildirimlerinin çoğu değerlendirilmeden bekliyor; yalnızca kural tablosundaki olaylar (geri alım, temettü,
          devre kesici …) puana giriyor. Anahtar eklenince son 7 günün bekleyen olayları değerlendirilir.</p>`
      : "")
    + puanKarti("Haber puanı", v.puan, "KAP + haberler, 50 nötr")
    + (v.sektor ? puanKarti(`Sektör: ${v.sektor.ad}`, v.sektor.puan, "ekonomi olaylarından") : "")
    + puanKarti("Piyasa", v.piyasa, "ekonomi olaylarından");
  const etkili = v.puan?.en_etkili || [];
  document.getElementById("etkili-olaylar").innerHTML = etkili.length
    ? `<ul class="etkili">${etkili.map(etkiliOlay).join("")}</ul>`
    : '<p class="soluk kucuk">Puanı etkileyen olay yok (puan nötr).</p>';
  document.getElementById("dil-modelsiz").hidden = !v.puan?.dil_modelsiz;
  olayTablosu();
  haberIsaretleriniKur(v.isaretler);
}

// Olayı grafikteki bara yerleştirir: seans içindeyse içinde olduğu bar, seans dışıysa (akşam, hafta sonu)
// piyasanın tepki verdiği bir sonraki bar.
function barBul(zamanlar, yayin, zd) {
  const duvar = Date.parse(yayin.slice(0, 19) + "Z") / 1000;   // Türkiye saati, grafikteki gibi UTC sayılır
  if (zd === "1d") {
    const gun = yayin.slice(0, 10);
    const saat = Number(yayin.slice(11, 13)) + Number(yayin.slice(14, 16)) / 60;
    const i = zamanlar.findIndex((t) => t >= gun);
    if (i < 0) return null;
    return zamanlar[i] === gun && saat >= 18.17 ? zamanlar[i + 1] ?? null : zamanlar[i];
  }
  for (let i = zamanlar.length - 1; i >= 0; i--) {
    if (zamanlar[i] <= duvar) {
      return duvar - zamanlar[i] < 4 * 3600 ? zamanlar[i] : zamanlar[i + 1] ?? null;
    }
  }
  return null;
}

let haberOlaylari = [];
function haberIsaretleriniKur(liste) {
  haberOlaylari = liste || [];
  if (typeof okGoster === "function") okGoster();
}

function haberIsaretleri(zamanlar, zd) {
  const barlar = new Map();
  for (const o of haberOlaylari) {
    const t = barBul(zamanlar, o.yayin, zd);
    if (t === null) continue;
    const anahtar = `${t}|${o.etki > 0 ? 1 : -1}`;
    const b = barlar.get(anahtar) || { t, olumlu: o.etki > 0, n: 0, kap: false, basliklar: [] };
    b.n += 1;
    b.kap ||= o.kaynak_turu === "kap";
    barlar.set(anahtar, b);
  }
  return [...barlar.values()].map((b) => ({
    time: b.t, position: b.olumlu ? "belowBar" : "aboveBar", shape: "circle", size: 0.6,
    color: b.olumlu ? "#1fd1a5" : "#ff6b81", text: `${b.kap ? "K" : "H"}${b.n > 1 ? b.n : ""}`,
  }));
}

document.getElementById("olay-filtre").addEventListener("click", (e) => {
  tumOlaylar = !tumOlaylar;
  e.currentTarget.textContent = tumOlaylar ? "Yalnızca etkili olaylar" : "Rutin ve elenenler dahil tümü";
  olayTablosu();
});
