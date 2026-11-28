// Sıralama sayfası: XU100 içinde kesitsel bileşik puan (motorlar/faktor.py) ve etkenlerin geçmiş sınaması.

const ETKEN_ADLARI = { momentum: "Momentum", geri_donus: "Geri dönüş", dusuk_oynaklik: "Düşük oynaklık", zirve: "Zirveye yakınlık" };
let veri = null;

function hukumMetni(t) {
  if (t === null || t === undefined) return '<span class="soluk">–</span>';
  if (t >= 2) return '<span class="rozet al">işe yaradı</span>';
  if (t <= -2) return '<span class="rozet sat">ters çalıştı</span>';
  return '<span class="rozet tut">belirsiz</span>';
}

function sinamaCiz(test) {
  if (!test) return '<p class="soluk">Henüz hesaplanmadı (analiz turunda, 19:30).</p>';
  const yuz = (x) => (x === null || x === undefined ? "–" : `${x > 0 ? "+" : x < 0 ? "−" : ""}%${sayi(Math.abs(x) * 100, 1)}`);
  const satir = (k, e) => `<tr${k === "bilesik" ? ' class="vurgulu"' : ""}><td><b>${kacis(e.ad)}</b></td>
      <td class="sag">${e.ic === null ? "–" : sayi(e.ic, 3)}</td><td class="sag">${e.t === null ? "–" : sayi(e.t, 1)}</td>
      <td class="sag">${yuz(e.fark)}</td><td class="sag">${e.son12_ic === null ? "–" : sayi(e.son12_ic, 3)}</td>
      <td class="sag">${k === "bilesik" ? "" : `%${sayi((test.agirlik[k] || 0) * 100, 0)}`}</td><td>${hukumMetni(e.t)}</td></tr>`;
  const b = test.etkenler.bilesik;
  return `<div class="kart">
      <p>${test.hisse} hisse, ${zamanMetni(test.ilk)} – ${zamanMetni(test.son)} arasında ${b.ay} ay sınandı: her ay etkenin sıralaması
        sonraki ${test.ufuk} işlem gününün getirisiyle kıyaslandı. Bileşik puanın ağırlıkları her ay yalnızca o güne kadarki
        sonuçlarla belirlendi, yani bileşik satırı da geleceğe bakmadan ölçüldü.</p>
      <div class="tablo-kutu"><table class="sik"><thead><tr><th>Etken</th>
        <th class="sag" title="Sıralama ile sonraki ay getirisi arasındaki sıra korelasyonu; 0 ilişki yok">Uyum (IC)</th>
        <th class="sag" title="Uyumun güvenilirliği; 2'nin üstü şans eseri olması zor">Güven (t)</th>
        <th class="sag" title="En iyi %20 ile en kötü %20 arasındaki ortalama aylık getiri farkı">Aylık fark</th>
        <th class="sag">Son 12 ay</th><th class="sag">Ağırlık</th><th>Sonuç</th></tr></thead>
        <tbody>${Object.entries(test.etkenler).map(([k, e]) => satir(k, e)).join("")}</tbody></table></div>
      <p class="not">Uyarı: evren bugünkü XU100 üyeleridir; geçmişte endeksten çıkan hisseler sınamada yok, sonuçlar biraz iyimser
        olabilir. Komisyon dahil değildir.</p>
    </div>`;
}

function siralamaCiz() {
  const kutu = document.getElementById("siralama");
  if (!veri?.puanlar?.length) { kutu.innerHTML = ""; return; }
  const yalniz = document.getElementById("yalniz-takip").checked;
  const takip = new Set(veri.takip);
  const liste = veri.puanlar.filter((p) => !yalniz || takip.has(p.kod));
  const hucre = (x) => `<td class="sag">${x === null || x === undefined ? "–" : sayi(x, 0)}</td>`;
  kutu.innerHTML = `<h3>${zamanMetni(veri.tarih)} sıralaması (${veri.puanlar[0].hisse_sayisi} hisse)</h3>
    <div class="tablo-kutu"><table class="sik"><thead><tr><th class="sag">Sıra</th><th>Hisse</th>
      <th class="sag" title="0–100; dört etkenin ağırlıklı yüzdeliği">Bileşik puan</th>
      ${Object.values(ETKEN_ADLARI).map((a) => `<th class="sag">${a}</th>`).join("")}<th></th></tr></thead>
      <tbody>${liste.map((p) => `<tr class="${takip.has(p.kod) ? "tik takipte" : ""}" ${takip.has(p.kod) ? `data-kod="${kacis(p.kod)}"` : ""}>
        <td class="sag">${p.sira}</td><td><b>${kacis(p.kod)}</b>${takip.has(p.kod) ? ' <span class="soluk kucuk">takipte</span>' : ""}</td>
        <td class="sag"><b>${sayi(p.bilesik, 0)}</b></td>
        ${Object.keys(ETKEN_ADLARI).map((k) => hucre(p[k])).join("")}
        <td>${p.toparlanma ? '<span class="rozet hacimli" title="Son 21 günde XU100\'de en çok düşen %20 içinde; BIST\'te kısa vadede toparlanma eğilimi ölçüldü">toparlanma adayı</span>' : ""}</td>
      </tr>`).join("")}</tbody></table></div>
    <p class="not">Etken sütunları 0–100 yüzdeliktir (100 o etkende en iyi). Geri dönüşte yüksek yüzdelik son 21 günde çok düşmüş
      demektir. Takip listendeki hisseye tıklayınca hisse sayfası açılır.</p>`;
}

async function yukle() {
  try {
    veri = await getir("/api/faktor");
  } catch (e) {
    document.getElementById("sinama").innerHTML = `<p class="eksi">Alınamadı: ${kacis(e.message)}</p>`;
    return;
  }
  document.getElementById("sinama").innerHTML = sinamaCiz(veri.test);
  siralamaCiz();
}

document.getElementById("yalniz-takip").addEventListener("change", siralamaCiz);
document.getElementById("siralama").addEventListener("click", (e) => {
  const tr = e.target.closest("tr[data-kod]");
  if (tr) location.href = `hisse.html?kod=${encodeURIComponent(tr.dataset.kod)}`;
});
yukle();
