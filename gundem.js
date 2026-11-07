// Ana paneldeki Piyasa gündemi: Piyasa Haber Puanı, sektör puanları, önemli ekonomi olayları, kurum faiz tahminleri.

const KATEGORI_ADLARI = {
  para_politikasi: "Para politikası", duzenleyici_kurum: "Düzenleyici kurum", maliye_vergi: "Maliye / vergi",
  siyaset: "Siyaset", jeopolitik: "Jeopolitik", kur: "Kur", kredi_notu: "Kredi notu", hukuk_guven: "Hukuk / güven",
  makro_veri: "Makro veri", kuresel: "Küresel", sirket_sektor: "Şirket / sektör", diger: "Diğer",
};
const SURE_ADLARI = { kisa: "kısa vade", orta: "orta vade", uzun: "uzun vade" };
const HEDEF_ADLARI = { sonraki_ppk: "Sonraki PPK", yil_sonu: "Yıl sonu", diger: "Diğer" };

function piyasaPuaniKarti(g) {
  const p = g.puan;
  const enEtkili = (p?.en_etkili || []).slice(0, 3).map((o) =>
    `<li>${etkiOku(o.katki)} ${kacis(o.baslik)}</li>`).join("");
  return `
    <div class="ust-satir"><span class="baslik">Piyasa Haber Puanı</span><span class="soluk kucuk">${zamanMetni(p?.zaman)}</span></div>
    <div class="buyuk-puan">${puanRozeti(p)}<span class="soluk kucuk">50 nötr · 100 çok olumlu · 0 çok olumsuz</span></div>
    ${enEtkili ? `<ul class="kisa-liste">${enEtkili}</ul>` : '<p class="soluk kucuk">Puanı etkileyen olay yok.</p>'}`;
}

function sektorPuanlari(g) {
  if (!g.sektorler.length) return '<div class="ust-satir"><span class="baslik">Sektörler</span></div><p class="soluk kucuk">Sektör etkisi olan olay yok.</p>';
  return `<div class="ust-satir"><span class="baslik">Sektörler</span><span class="soluk kucuk">olaylardan</span></div>
    <table class="sik"><tbody>${g.sektorler.slice(0, 8).map((s) => `
      <tr><td>${kacis(s.ad)}</td><td class="sag">${puanRozeti({ puan: s.puan, olay_sayisi: s.olay_sayisi })}</td></tr>`).join("")}
    </tbody></table>`;
}

function piyasaOlayi(o) {
  const sektor = Object.entries(o.sektor_etkileri || {}).map(([s, e]) => `${s} ${e > 0 ? "+" : ""}${sayi(e, 1)}`).join(", ");
  return `<div class="olay">
    <div class="olay-ust">${etkiOku(o.etki)} <a href="${kacis(o.url)}" target="_blank" rel="noopener">${kacis(o.baslik)}</a></div>
    <div class="soluk kucuk">${kacis(KATEGORI_ADLARI[o.kategori] || o.kategori || "")} · ${kacis(SURE_ADLARI[o.sure] || "")} ·
      ${o.kaynak_sayisi} kaynak · ${zamanMetni(o.yayin)} · piyasa etkisi ${sayi(o.etki, 2)}</div>
    ${o.mekanizma ? `<div class="kucuk">${kacis(o.mekanizma)}</div>` : ""}
    ${o.gerekce ? `<div class="kucuk soluk">${kacis(o.gerekce)}${sektor ? ` · Sektörler: ${kacis(sektor)}` : ""}</div>` : ""}
  </div>`;
}

// Önemli olaylar: piyasaya en büyük etki beklenen 3 olay. Ağırlık = |etki| × güven × kaynak sayısı katkısı; aynı konudaki
// ikinci haber (başlık kelimelerinin yarıya yakını ortak) atlanır. Az kişiyi ilgilendiren olay etkisi küçük puanlandığı için elenir.
const ONEMLI_OLAY = 3;
function olayAgirligi(o) {
  return Math.abs(o.etki || 0) * (o.guven ?? 1) * (1 + 0.3 * Math.log2(Math.max(1, o.kaynak_sayisi || 1)));
}
function kelimeler(baslik) {
  return new Set((baslik || "").toLocaleLowerCase("tr").split(/[^a-zçğıöşü0-9]+/).filter((k) => k.length > 3));
}
function enOnemliOlaylar(olaylar) {
  const secilen = [];
  for (const o of [...olaylar].filter((o) => Math.abs(o.etki || 0) >= 0.1 && o.kategori !== "diger")
    .sort((a, b) => olayAgirligi(b) - olayAgirligi(a))) {
    const k = kelimeler(o.baslik);
    const benzer = secilen.some((s) => {
      const ks = kelimeler(s.baslik);
      const ortak = [...k].filter((x) => ks.has(x)).length;
      return ortak / Math.max(1, Math.min(k.size, ks.size)) >= 0.4;
    });
    if (!benzer) secilen.push(o);
    if (secilen.length === ONEMLI_OLAY) break;
  }
  return secilen;
}

function kurumTahminleri(liste) {
  if (!liste.length) return "";
  return `<h3>Kurumların faiz tahminleri (son 30 gün, haberlerden)</h3>
    <div class="tablo-kutu"><table class="sik">
      <thead><tr><th>Kurum</th><th>Hedef</th><th class="sag">Tahmin</th><th>Not</th><th class="soluk">Haber</th></tr></thead>
      <tbody>${liste.map((t) => `<tr>
        <td>${kacis(t.kurum)}</td><td>${kacis(HEDEF_ADLARI[t.hedef] || t.hedef)}</td>
        <td class="sag ${t.birim === "baz_puan" ? yonSinifi(t.deger) : ""}">${t.birim === "baz_puan" ? `${t.deger > 0 ? "+" : t.deger < 0 ? "−" : ""}${sayi(Math.abs(t.deger), 0)} bp` : `%${sayi(t.deger, 2)}`}</td>
        <td class="kucuk soluk">${kacis(t.aciklama || "")}</td><td class="soluk kucuk">${zamanMetni(t.tarih)}</td></tr>`).join("")}
      </tbody></table></div>`;
}

function geminiDurumu(gm) {
  if (!gm.anahtar_var) return "Gemini anahtarı tanımlı değil: puanlar yalnızca kural tablosuyla (geçici)";
  const k = gm.kullanim;
  return `Gemini bugün: ${k.hafif.istek}/${k.hafif.sinir ?? "?"} (${k.hafif.model}) · ${k.guclu.istek}/${k.guclu.sinir ?? "?"} (${k.guclu.model})`
    + (gm.bekleyen_olay ? ` · ${gm.bekleyen_olay} olay bekliyor` : "");
}

async function gundemYukle() {
  try {
    const g = await getir("/api/piyasa_gundemi");
    document.getElementById("piyasa-puani").innerHTML = piyasaPuaniKarti(g);
    document.getElementById("sektor-puanlari").innerHTML = sektorPuanlari(g);
    const onemli = enOnemliOlaylar(g.olaylar);
    document.getElementById("piyasa-olaylari").innerHTML = `
      <div class="ust-satir"><span class="baslik">En önemli ${ONEMLI_OLAY} ekonomi olayı (son 7 gün)</span>
        <span class="soluk kucuk" title="Piyasaya beklenen etki × güven × kaynak sayısına göre seçildi">${g.olaylar.length} olay puanlandı</span></div>
      ${onemli.length ? onemli.map(piyasaOlayi).join("") : '<p class="soluk kucuk">Henüz puanlanmış önemli olay yok.</p>'}`;
    document.getElementById("kurum-tahminleri").innerHTML = kurumTahminleri(g.kurum_tahminleri);
    document.getElementById("gemini-durum").textContent = geminiDurumu(g.gemini);
  } catch (e) {
    document.getElementById("piyasa-puani").innerHTML = `<p class="eksi">Gündem alınamadı: ${kacis(e.message)}</p>`;
  }
}
