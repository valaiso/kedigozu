// Takvim sayfası: takip listesinin yaklaşan bilanço, temettü ve genel kurul tarihleri, PPK toplantıları.

const TUR_SINIFI = { "bilanço": "tut", "temettü": "al", "genel kurul": "tut", PPK: "yok" };

function tarihUzun(t) {
  return new Date(`${t}T12:00:00`).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric", weekday: "short" });
}

function olaySatiri(o) {
  const hisse = o.kod ? `<a href="hisse.html?kod=${encodeURIComponent(o.kod)}"><b>${kacis(o.kod)}</b></a>` : '<span class="soluk">Piyasa</span>';
  return `<tr class="${o.kirmizi ? "kirmizi" : ""}">
    <td>${kacis(tarihUzun(o.tarih))}</td>
    <td class="sag">${o.kalan_gun === 0 ? "bugün" : `${o.kalan_gun} gün`}</td>
    <td>${hisse}</td>
    <td><span class="rozet ${TUR_SINIFI[o.tur] || "yok"}">${kacis(o.tur)}</span></td>
    <td>${kacis(o.baslik)}</td>
    <td class="kucuk soluk">${kacis(o.ayrinti || "")}</td></tr>`;
}

function rozetSatiri([kod, r]) {
  const b = r.bilanco, t = r.temettu;
  return `<tr>
    <td><a href="hisse.html?kod=${encodeURIComponent(kod)}"><b>${kacis(kod)}</b></a></td>
    <td class="${b?.kirmizi ? "eksi" : ""}">${b ? (b.durum === "açıklandı" ? `${kacis(b.donem)} açıklandı (${kacis(b.aciklama)})` : `${kacis(b.donem)} · son gün ${kacis(b.son_gun)} · ${b.kalan_gun} gün`) : '<span class="soluk">–</span>'}</td>
    <td>${t ? `${sayi(t.brut_tl, 2)} TL brüt${t.verim != null ? ` · verim %${sayi(t.verim * 100, 2)}` : ""} · hak kullanım ${kacis(t.hak_kullanim || "–")} · ${kacis(t.durum_adi || t.durum)}` : '<span class="soluk">yaklaşan yok</span>'}</td>
    <td>${r.tedbir ? '<span class="eksi">aktif</span>' : '<span class="soluk">yok</span>'}</td></tr>`;
}

async function takvimYukle(gun) {
  try {
    const v = await getir(`/api/takvim?gun=${gun}`);
    document.getElementById("olaylar").innerHTML = v.olaylar.map(olaySatiri).join("")
      || '<tr><td colspan="6" class="soluk">Bu aralıkta olay yok.</td></tr>';
    document.getElementById("rozetler").innerHTML = Object.entries(v.rozetler).map(rozetSatiri).join("");
  } catch (e) {
    document.getElementById("olaylar").innerHTML = `<tr><td colspan="6" class="eksi">Takvim alınamadı: ${kacis(e.message)}</td></tr>`;
  }
}

document.querySelectorAll("button[data-gun]").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll("button[data-gun]").forEach((x) => x.classList.toggle("secili", x === b));
  takvimYukle(b.dataset.gun);
}));
takvimYukle(120);
