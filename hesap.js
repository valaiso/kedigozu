// Sanal hesap: Kedi Gözü puanıyla 100.000 TL'lik al-sat simülasyonu (motorlar/hesap.py). Gerçek işlem değildir.

const TL = (x, b = 0) => (x === null || x === undefined ? "–" : `${sayi(x, b)} TL`);
// İşaret, gösterilen (yuvarlanmış) değere göre: −0,00 ya da +0,00 yazılmaz.
const yuvarla = (x, b = 0) => Math.round(x * 10 ** b) / 10 ** b;
const isaretli = (x, b = 0) => {
  if (x === null || x === undefined) return "–";
  const r = yuvarla(x, b);
  return `${r > 0 ? "+" : r < 0 ? "−" : ""}${sayi(Math.abs(r), b)}`;
};
const yuzdeMetni = (x) => (x === null || x === undefined ? "–" : `${isaretli(x * 100, 2)}%`);

function seansMetni(tarih, seans) {
  const t = new Date(`${tarih}T${seans || "10:15"}:00+03:00`);
  return `${t.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Istanbul" })} ${seans || ""}`;
}

function uzunSeans(iso) {
  const t = new Date(iso);
  return t.toLocaleString("tr-TR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
}

function etiketRozeti(etiket) {
  if (!etiket) return '<span class="rozet yok">–</span>';
  return `<span class="rozet ${etiketSinifi(etiket)}">${kacis(etiket)}</span>`;
}

function hisseLinki(kod) {
  return `<a href="hisse.html?kod=${encodeURIComponent(kod)}"><b>${kacis(kod)}</b></a>`;
}

function kutucuk(baslik, deger, alt = "", sinif = "") {
  return `<div class="kart hesap-kutu"><div class="etiket">${baslik}</div><div class="deger ${sinif}">${deger}</div>
    ${alt ? `<div class="alt soluk">${alt}</div>` : ""}</div>`;
}

// Grafik çizgileri, kıyas kutuları ve dağılım çubuğu aynı renkleri kullanır.
const HESAP_RENK = "#34d399";
const KIYAS_RENK = { XU100: "#fb923c", XU030: "#facc15", NAKIT: "#60a5fa" };
const DAGILIM_RENK = { hisse: "#34d399", altin: "#f5b83d", nema: "#60a5fa" };

function renkliKutu(renk, baslik, deger, alt = "", sinif = "") {
  return `<div class="kart hesap-kutu renkli" style="--renk:${renk}"><div class="etiket">${baslik}</div>
    <div class="deger ${sinif}">${deger}</div>${alt ? `<div class="alt soluk">${alt}</div>` : ""}</div>`;
}

// Nakdin durduğu yer: para piyasası fonu tanımlıysa fon (ör. "ZBJ fonu"), değilse Midas nema.
const nakitAdi = (a) => (a && a.nakit_fonu ? `${a.nakit_fonu.kod} fonu` : "nema");
const nakitYeri = (a) => (a && a.nakit_fonu ? `${a.nakit_fonu.kod} fonunda` : "nemada");

function dagilimCiz(r) {
  // Paranın nerede durduğu: hisseler, altın kolu ve nakit (para piyasası fonunda ya da Midas nemasında büyür).
  const altinKodu = r.ayar.altin_kolu?.acik ? r.ayar.altin_kolu.kod : null;
  const altin = r.pozisyonlar.filter((p) => p.kod === altinKodu).reduce((t, p) => t + p.deger, 0);
  const hisse = r.hisse_degeri - altin;
  const toplam = r.toplam || 1;
  const hisseAdet = r.pozisyonlar.filter((p) => p.kod !== altinKodu).length;
  const parcalar = [
    { ad: "Hissede", renk: DAGILIM_RENK.hisse, tl: hisse, acik: hisseAdet ? `${hisseAdet} hisse` : "elde hisse yok" },
    ...(altinKodu ? [{ ad: "Altında", renk: DAGILIM_RENK.altin, tl: altin, acik: altin ? "Darphane sertifikası" : `altın kolu ${nakitYeri(r.ayar)} bekliyor` }] : []),
    { ad: r.ayar.nakit_fonu ? `${r.ayar.nakit_fonu.kod} fonunda (nakit)` : "Nemada (nakit)", renk: DAGILIM_RENK.nema, tl: r.nakit,
      acik: `${r.ayar.nakit_fonu ? "fon getirisi" : "faiz geliri"} ${TL(r.faiz_toplam)}` },
  ];
  return `<div class="kart hesap-dagilim">
      <div class="ust-satir"><b>Paranın dağılımı</b><span class="soluk kucuk">toplam ${TL(r.toplam)}</span></div>
      <div class="dagilim-cubuk">${parcalar.filter((p) => p.tl > 0)
        .map((p) => `<span style="width:${(p.tl / toplam) * 100}%;background:${p.renk}" title="${kacis(p.ad)}"></span>`).join("")}</div>
      <div class="dagilim-satirlari">${parcalar.map((p) => `<div class="dagilim-satir"><i style="background:${p.renk}"></i>
        <span>${kacis(p.ad)} <span class="acik">· ${kacis(p.acik)}</span></span>
        <span class="yuzde">%${sayi((p.tl / toplam) * 100, 1)}</span><span class="tl">${TL(p.tl)}</span></div>`).join("")}</div>
    </div>`;
}

function ozetCiz(r) {
  const a = r.ayar;
  const kar = r.toplam - a.nakit;
  const islemYok = !r.islemler.length;
  const kiyasKutusu = (kod) => {
    const k = r.kiyaslar[kod];
    const fark = k.getiri === null ? null : r.getiri - k.getiri;
    return renkliKutu(KIYAS_RENK[kod], `${k.ad} aynı dönemde`, yuzdeMetni(k.getiri),
      fark === null ? "İlk emir saatinden sonra hesaplanır"
        : `Kedi Gözü farkı: <b class="${yonSinifi(yuvarla(fark * 100, 2))}">${isaretli(fark * 100, 2)} puan</b>`, yonSinifi(k.getiri));
  };
  return `${islemYok ? `<p class="hesap-bilgi">Hesap <b>${seansMetni(a.baslangic_tarihi, "").trim()}</b> tarihinde
      <b>${TL(a.nakit)}</b> nakitle açıldı. ${r.son_seans ? `Henüz hisse alınmadı (koşullar oluşmadı, para ${nakitYeri(a)}); sıradaki emir saati`
        : "İlk emirler"} <b>${kacis(uzunSeans(r.bekleyen.seans))}</b>${r.son_seans ? "." : " seansında verilecek."}</p>` : ""}
    <div class="hesap-ust">
      <div class="kart hesap-ana">
        <div class="etiket">Kedi Gözü hesabının değeri</div>
        <div class="buyuk">${TL(r.toplam)}</div>
        <span class="kar ${yonSinifi(kar)}">${isaretli(kar)} TL <span>${yuzdeMetni(r.getiri)}</span></span>
        <div class="alt soluk">Başlangıç ${TL(a.nakit)} · ${seansMetni(a.baslangic_tarihi, "").trim()}</div>
      </div>
      ${dagilimCiz(r)}
    </div>
    <div class="hesap-ozet">
      ${kiyasKutusu("NAKIT")}
      ${kiyasKutusu("XU100")}
      ${kiyasKutusu("XU030")}
      ${renkliKutu("#a78bfa", "Kapanan işlemler", `${r.kazanan + r.kaybeden}`,
        r.kazanan + r.kaybeden ? `${r.kazanan} kazançlı · ${r.kaybeden} zararlı` : "Henüz satış yok")}
      ${renkliKutu("#f472b6", "Bekleme farkı", islemYok ? "–" : `${isaretli(r.bekleme_toplam)} TL`,
        "Sinyal anında değil emir saatinde işlem yapmanın etkisi", islemYok ? "" : yonSinifi(r.bekleme_toplam))}
    </div>`;
}
let grafik = null;
function grafikCiz(r) {
  const egri = r.egri;
  const kutu = document.getElementById("grafik-kutu");
  kutu.hidden = false;
  const alan = document.getElementById("hesap-grafik");
  if (!egri.length) {
    alan.hidden = true;
    document.getElementById("grafik-lejant").innerHTML = `<p class="soluk">Grafik ilk emir saatinden sonra çizilir
      (${kacis(uzunSeans(r.bekleyen.seans))}). Kedi Gözü hesabı, nakit kıyası, BIST 100 ve BIST 30 aynı andan başlar.</p>`;
    return;
  }
  alan.hidden = false;
  const LW = LightweightCharts;
  if (!grafik) {
    grafik = LW.createChart(document.getElementById("hesap-grafik"), {
      autoSize: true,
      layout: { background: { type: "solid", color: "#111a2c" }, textColor: "#a3b0c8", fontFamily: "Inter, Segoe UI, sans-serif" },
      grid: { vertLines: { color: "#162038" }, horzLines: { color: "#162038" } },
      // Pencere ya da panel boyu değişince görünen tarih aralığı korunur (yoksa kısa geçmişte çizgiler bir kenara sıkışır).
      rightPriceScale: { borderColor: "#24314d" }, timeScale: { borderColor: "#24314d", lockVisibleTimeRangeOnResize: true },
      localization: { locale: "tr-TR", priceFormatter: (x) => `${sayi(x, 0)} TL` },
    });
  }
  // Bütün çizgiler hesabın açıldığı günde başlangıç parasından başlar (ilk gün tek nokta kalmasın).
  const bas = r.ayar.baslangic_tarihi < egri[0].tarih ? [{ time: r.ayar.baslangic_tarihi, value: r.ayar.nakit }] : [];
  const sade = { priceLineVisible: false, lastValueVisible: false, title: "" };
  // Önce kıyaslar ve gölgeler, en son (en üstte) Kedi Gözü. Lejanttaki her düğme kendi çizgisini açıp kapatır.
  const cizgiler = [];   // {anahtar, ad, renk, seri, son}
  const ekle = (anahtar, ad, renk, secenek, veri) => {
    const seri = grafik.addSeries(LW.LineSeries, { color: renk, ...secenek });
    seri.setData([...bas, ...veri]);
    cizgiler.push({ anahtar, ad, renk, seri, son: veri.length ? veri[veri.length - 1].value : null });
    return seri;
  };
  for (const [kod, k] of Object.entries(r.kiyaslar)) {
    const veri = egri.filter((e) => e.kiyas[kod] !== null && e.kiyas[kod] !== undefined).map((e) => ({ time: e.tarih, value: e.kiyas[kod] }));
    if (!veri.length) continue;
    const nakit = kod === "NAKIT";
    ekle(kod, `${k.ad}${nakit ? " (hiç hisse almadan)" : " al-tut"}`, KIYAS_RENK[kod],
      { ...sade, lineWidth: 2, lineStyle: nakit ? LW.LineStyle.Dotted : LW.LineStyle.Dashed }, veri);
  }
  for (const g of r.golgeler || []) {
    if (!g.egri.length) continue;
    ekle(g.ad, `${g.ad}${g.aciklama ? ` (${g.aciklama})` : " gölge hesap"}`, GOLGE_RENK[g.ad] || "#a78bfa", { ...sade, lineWidth: 2 },
      g.egri.map((e) => ({ time: e.tarih, value: e.deger })));
  }
  const hesapSeri = ekle("HESAP", "Kedi Gözü hesabı", HESAP_RENK, { lineWidth: 3, title: "Kedi Gözü", priceLineVisible: false },
    egri.map((e) => ({ time: e.tarih, value: e.deger })));
  hesapSeri.createPriceLine({ price: r.ayar.nakit, color: "#33446a", lineWidth: 1, lineStyle: LW.LineStyle.Dotted, axisLabelVisible: false, title: "" });
  cizgiler.unshift(cizgiler.pop());   // lejantta Kedi Gözü başta
  const gizli = gizliCizgiler();
  for (const c of cizgiler) c.seri.applyOptions({ visible: !gizli.has(c.anahtar) });
  const lejant = document.getElementById("grafik-lejant");
  lejant.innerHTML = cizgiler.map((c) => `<button type="button" class="cizgi-dugme${gizli.has(c.anahtar) ? " kapali" : ""}"
      data-anahtar="${kacis(c.anahtar)}" aria-pressed="${!gizli.has(c.anahtar)}" title="Grafikte göster / gizle">
      <i style="background:${c.renk}"></i>${kacis(c.ad)}${c.son !== null ? ` <b>${TL(c.son)}</b>` : ""}</button>`).join("");
  lejant.onclick = (e) => {
    const d = e.target.closest(".cizgi-dugme");
    if (!d) return;
    const c = cizgiler.find((x) => x.anahtar === d.dataset.anahtar);
    const acik = d.classList.toggle("kapali") === false;
    d.setAttribute("aria-pressed", String(acik));
    c.seri.applyOptions({ visible: acik });
    if (acik) gizli.delete(c.anahtar); else gizli.add(c.anahtar);
    try { localStorage.setItem(GIZLI_ANAHTAR, JSON.stringify([...gizli])); } catch (_) { /* tarayıcı saklamaya izin vermiyor */ }
  };
  grafik.timeScale().fitContent();
}

const GIZLI_ANAHTAR = "hesap-grafik-gizli";
function gizliCizgiler() {
  try { return new Set(JSON.parse(localStorage.getItem(GIZLI_ANAHTAR) || "[]")); } catch (_) { return new Set(); }
}

const GOLGE_RENK = { G1: "#a78bfa", G2: "#f472b6", G3: "#fb923c" };

function ekKuralMetni(g) {
  const p = [];
  if (g.kedi_isabet_esigi === null) p.push("Kedi isabet filtresi yok");
  if (g.dusuk_oynaklik === false) p.push("oynaklık süzgeci yok");
  if (g.deger_suzgeci?.acik) p.push(`değer/kârlılık süzgeci (${g.deger_suzgeci.kip === "karma" ? "BIST 100'e ve sektörüne göre" : g.deger_suzgeci.kip === "sektor" ? "sektörüne göre" : "BIST 100'e göre"}, alt yarı alınmaz)`);
  if (g.zarar_kes === null) p.push("zarar kes yok");
  if (g.iceriden_alim?.acik) p.push(`içeriden alım (${g.iceriden_alim.tutma_gun} işlem günü tut)`);
  return p.join(" + ") || "ek kural yok";
}

function golgeBekleyen(g) {
  const b = g.bekleyen;
  const satir = [];
  for (const e of b.satis) satir.push(`<li><span class="rozet sat">SAT</span> ${hisseLinki(e.kod)} <span class="soluk">${kacis(e.neden || "Kedi puanı SAT")}</span></li>`);
  for (const e of b.alis) satir.push(`<li><span class="rozet al">AL</span> ${hisseLinki(e.kod)} <span class="soluk">${kacis(e.neden || "")}</span></li>`);
  const ek = [];
  if (b.iceriden) {
    ek.push(b.iceriden.length
      ? `Önceki emir saatinden bu yana içeriden alım bildirimi: ${b.iceriden.map((o) => `<b>${kacis(o.kod)}</b> (${kacis((o.gorev || o.grup).slice(0, 40))})`).join(", ")}.`
      : "Önceki emir saatinden bu yana üst yönetim/ortak pay alımı bildirimi yok.");
  }
  return `<p><b>${kacis(uzunSeans(b.seans))}</b> seansında: ${satir.length ? "" : "emir yok."}</p>
    ${satir.length ? `<ul class="hesap-kurallar">${satir.join("")}</ul>` : ""}
    ${ek.map((x) => `<p class="soluk kucuk">${x}</p>`).join("")}`;
}

function golgelerCiz(r) {
  const gl = r.golgeler || [];
  if (!gl.length) return "";
  const satirlar = gl.map((g) => {
    const fark = g.getiri - r.getiri;
    return `<tr><td><span class="golge-ad" style="--renk:${GOLGE_RENK[g.ad] || "#a78bfa"}">${kacis(g.ad)}</span></td>
      <td class="kucuk sarmal"><b>${kacis(g.aciklama || "")}</b><br><span class="soluk">${kacis(ekKuralMetni(g))}</span></td>
      <td class="sag">${TL(g.toplam)}</td><td class="sag ${yonSinifi(g.getiri)}">${yuzdeMetni(g.getiri)}</td>
      <td class="sag ${yonSinifi(fark)}">${isaretli(fark * 100, 2)} puan</td>
      <td class="sag">${TL(g.nakit)}</td><td>${g.pozisyonlar.map((p) => kacis(p.kod)).join(", ") || "–"}</td>
      <td class="sag">${g.islem_sayisi}</td><td class="sag">${g.kazanan + g.kaybeden ? `${g.kazanan} / ${g.kaybeden}` : "–"}</td></tr>`;
  }).join("");
  const detay = gl.map((g) => `<details class="hesap-golge" style="--renk:${GOLGE_RENK[g.ad] || "#a78bfa"}"><summary><span class="golge-ad">${kacis(g.ad)}</span>
      ${kacis(g.aciklama || "")} · ${TL(g.toplam)} <span class="${yonSinifi(g.getiri)}">(${yuzdeMetni(g.getiri)})</span></summary>
      <h4>Sıradaki emirler</h4>${golgeBekleyen(g)}
      <h4>Eldeki hisseler</h4>${g.pozisyonlar.length ? `<div class="tablo-kutu"><table class="sik"><thead><tr><th>Hisse</th>
        <th class="sag">Adet</th><th>Alış</th><th class="sag">Alış fiyatı</th><th class="sag">Son fiyat</th><th class="sag">Değer</th>
        <th class="sag">Kâr / zarar</th><th class="sag">Zarar kes</th><th>Neden alındı</th></tr></thead><tbody>
        ${g.pozisyonlar.map((p) => `<tr><td>${hisseLinki(p.kod)}</td><td class="sag">${sayi(p.adet, 0)}</td>
          <td>${seansMetni(p.alis_tarihi, p.alis_seans)}</td><td class="sag">${sayi(p.alis, 2)}</td><td class="sag">${sayi(p.fiyat, 2)}</td>
          <td class="sag">${TL(p.deger)}</td><td class="sag ${yonSinifi(p.getiri)}">${yuzdeMetni(p.getiri)}</td>
          <td class="sag">${p.zarar_kes ? sayi(p.zarar_kes, 2) : "–"}</td><td class="soluk kucuk">${kacis(p.neden || "")}</td></tr>`).join("")}
        </tbody></table></div>` : '<p class="soluk">Elde hisse yok; hesabın tamamı nakit.</p>'}
      <h4>Son işlemler</h4>${g.islemler.length ? `<div class="tablo-kutu"><table class="sik"><thead><tr><th>Tarih</th><th>Hisse</th>
        <th>İşlem</th><th class="sag">Adet</th><th class="sag">Fiyat</th><th class="sag">Tutar</th><th>Neden</th><th class="gizle-sutun"></th></tr></thead><tbody>
        ${g.islemler.map((i) => `<tr><td>${seansMetni(i.tarih, i.seans)}</td><td>${hisseLinki(i.kod)}</td><td>${etiketRozeti(i.yon)}</td>
          <td class="sag">${sayi(i.adet, 0)}</td><td class="sag">${sayi(i.fiyat, 2)}</td><td class="sag">${TL(i.tutar)}</td>
          <td class="soluk">${kacis(i.neden || "")}</td>
          <td class="gizle-sutun"><button type="button" class="islem-gizle" data-islem="${i.id}" title="Listeden kaldır (hesabın değeri değişmez)" aria-label="Listeden kaldır">×</button></td></tr>`).join("")}</tbody></table></div>
        <p class="soluk kucuk">Son ${g.islemler.length} işlem (en fazla 10). Çarpı yalnızca listeden kaldırır; işlem hesabın
          kayıtlarında kalır, nakit ve kâr/zarar değişmez.</p>` : '<p class="soluk">Henüz işlem yok.</p>'}
    </details>`).join("");
  return `<p class="not">Ana hesabın bütün kurallarıyla, aynı gün ve aynı emir saatlerinde yürüyen ayrı sanal hesaplar; yalnızca
      ek kural farklı. Ana hesabı etkilemezler. 3 yıllık sınama sonuçları aşağıda, <b>Hesaplar nasıl çalışır ve sınama
      sonuçları</b> bölümünde; asıl sınav bu canlı kayıt.</p>
    <div class="tablo-kutu"><table class="sik golge-tablo"><thead><tr><th>Hesap</th><th>Kural</th><th class="sag">Değer</th>
      <th class="sag">Kâr / zarar</th><th class="sag">Ana hesaba göre</th><th class="sag">Nakit</th><th>Elde</th>
      <th class="sag">İşlem</th><th class="sag" title="Kapanan işlemler: kazançlı / zararlı">Kapanan</th></tr></thead>
      <tbody>${satirlar}</tbody></table></div>
    ${detay}
    <p class="not"><b>İçeriden alım:</b> şirketin yönetim kurulu üyesi, genel müdürü ya da büyük ortağı kendi parasıyla hisse
      aldığında KAP'a "Pay Alım Satım Bildirimi" gelir. Bir önceki emir saatinden bu yana böyle bir bildirim gelen hisse (takip
      listesinde olmasa da) boş bir yer kadar alınır, 5 işlem günü tutulup satılır; Kedi puanı bu hisseyi sattırmaz, zarar kes
      geçerli. Şirketin kendi hissesini geri alması ("Payların Geri Alınmasına İlişkin Bildirim", örneğin GARAN 3 Kasım 2026)
      sayılmaz.</p>`;
}

function nemaMetni(n, a) {
  if (!a.nakit_faizi || !n) return "";
  if (n.fon) return `Nakit getirisi (${kacis(n.fon.ad)}, TEFAS fiyatından son 30 gün): net yıllık %${sayi(n.net * 100, 2)} =
    brüt %${sayi(n.brut * 100, 2)} − stopaj %${sayi(n.stopaj * 100, 1)} (bireysel yatırımcı; stopaj nihai vergi, ayrıca beyanname yok).`;
  if (n.elle) return `Nakit faizi (Midas nema, ayarlardan): net yıllık %${sayi(n.net * 100, 2)}.`;
  return `Nakit faizi (Midas nema tahmini): net yıllık %${sayi(n.net * 100, 2)} = brüt %${sayi(n.brut * 100, 2)}
    (politika faizi %${sayi(n.politika * 100, 2)} − ${sayi(a.nema_brut_fark, 1)} puan) − stopaj ve komisyon %${sayi(a.nema_kesinti * 100, 0)}.`;
}

function rejimMetni(b, a) {
  const rj = b.rejim;
  if (!a.reel_faiz_kurali || !rj) return "";
  const yz = (x) => (x === null || x === undefined ? "–" : `%${sayi(x * 100, 1)}`);
  const reel = rj.reel === null ? "bilinmiyor" : `${rj.reel > 0 ? "+" : rj.reel < 0 ? "−" : ""}%${sayi(Math.abs(rj.reel) * 100, 1)}`;
  const dayanak = `reel faiz ${reel} = politika faizi ${yz(rj.politika)} − ${rj.kaynak ? kacis(rj.kaynak) : "enflasyon"} ${yz(rj.enflasyon)}`;
  if (rj.rejim === "faktor") {
    return `<p class="hesap-bilgi hesap-uyari"><b>Faiz rejimi (${kacis(rj.ay)}):</b> ${dayanak}. Faiz enflasyonun altında, nakit eriyor:
      bu ay para XU100'ün en iyi faktör hisselerinde (${rj.hedef.length ? rj.hedef.map(kacis).join(", ") : `piyasa filtresi SAT, bu ay ${nakitYeri(a)}`}).
      Ay içinde dokunulmaz; Kedi sinyalleri ve zarar kes bu ay uygulanmaz.</p>`;
  }
  return `<p class="hesap-bilgi"><b>Faiz rejimi (${kacis(rj.ay)}):</b> ${dayanak}. Faiz enflasyonun üstünde: Kedi kuralları; boş para ${nakitYeri(a)}.
    Reel faiz sıfırın altına inerse hesap ay başında XU100'ün en iyi 5 faktör hissesine geçer.</p>`;
}

function altinMetni(b, a) {
  const al = b.altin;
  if (!al) return "";
  const k = al.ayar, ay = al.bu_ay, s = al.simdi;
  const yz = (x) => (x === null || x === undefined ? "–" : `${x > 0 ? "+" : x < 0 ? "−" : ""}%${sayi(Math.abs(x) * 100, 1)}`);
  const olcu = (o) => `gram altın ${o.ivme_ay || k.ivme_ay} ayda ${yz(o.ivme)} (${nakitAdi(a)} ${yz(o.nema)}), sertifika primi ${yz(o.prim)} (sınır %${sayi(k.prim_sinir * 100, 0)})`;
  return `<p class="hesap-bilgi ${ay.sinyal ? "" : ""}"><b>Altın kolu (hesabın %${sayi(k.pay * 100, 0)} payı, ${kacis(k.kod)}):</b>
    ${kacis(ay.ay)} kararı <b>${ay.sinyal ? "altında kal" : `${nakitYeri(a)} bekle`}</b> (${kacis((ay.neden || "").replace(/(\d)\.(\d)/g, "$1,$2"))}).
    Bugünkü verilerle: ${s.sinyal ? "altın" : nakitAdi(a)} — ${olcu(s)}. Karar her ayın ilk işlem günü 10:15'te verilir.</p>`;
}

function piyasaDurumuCiz(r) {
  const b = r.bekleyen;
  const p = b.piyasa || {};
  const piyasaSatiri = r.ayar.piyasa_filtresi
    ? `<p class="hesap-bilgi ${p.engel ? "hesap-uyari" : ""}"><b>Piyasa filtresi:</b> BIST 100 TradingView günlük sinyali
        ${etiketRozeti(p.etiket)} (${kacis(zamanMetni(p.zaman))}). ${p.engel ? "Piyasa SAT'ta: <b>yeni hisse alınmaz</b>, para faizde bekler."
        : "Piyasa SAT'ta değil: filtreden geçen hisseler alınabilir."} ${nemaMetni(b.nema, r.ayar)}</p>` : "";
  return `${rejimMetni(b, r.ayar)}${altinMetni(b, r.ayar)}${piyasaSatiri}`;
}

function bekleyenCiz(r) {
  const b = r.bekleyen;
  const satirlar = [
    ...b.satis.map((e) => ({ ...e, yon: "SAT", tutar: null })),
    ...b.alis.map((e) => ({ ...e, yon: "AL", tutar: b.hedef })),
  ];
  const p = b.piyasa || {};
  const seans = `<b>${kacis(uzunSeans(b.seans))}</b> seansı için şu anki puanlara göre:`;
  const baslik = `<p class="hesap-emir-satiri">${seans}</p>`;
  const elenen = b.elenen.length
    ? `<h3>Puanı AL ama filtreye takılanlar</h3><div class="tablo-kutu"><table class="sik"><thead><tr><th>Hisse</th>
        <th>Günlük</th><th>4 saatlik</th><th class="sag">Ortalama</th><th>Neden alınmıyor</th></tr></thead>
        <tbody>${b.elenen.map((e) => `<tr><td>${hisseLinki(e.kod)}</td><td>${etiketRozeti(e.gunluk)}</td>
          <td>${etiketRozeti(e.dort_saat)}</td><td class="sag">${e.puan === null ? "–" : sayi(e.puan, 2)}</td>
          <td class="soluk">${e.engel.map(kacis).join("; ")}</td></tr>`).join("")}</tbody></table></div>` : "";
  const engel = (b.bugun_islem_goren.length
    ? `<p class="not">Bugün işlem gördüğü için bu seansta dokunulmayacak: ${b.bugun_islem_goren.map(kacis).join(", ")}.</p>` : "") + elenen;
  if (!satirlar.length) {
    const takilan = b.elenen.length ? ` Puanı AL olan ${b.elenen.length} hisse (${b.elenen.map((e) => kacis(e.kod)).join(", ")}) bu yüzden alınmıyor.` : "";
    const neden = r.pozisyonlar.length >= r.ayar.en_cok_hisse ? `${r.ayar.en_cok_hisse} hisselik yer dolu ve eldekilerde satış sinyali yok.`
      : b.rejim?.rejim === "faktor" ? "bu ay faktör portföyü; ay içinde alım satım yapılmaz."
      : p.engel && r.ayar.piyasa_filtresi ? `BIST 100'ün günlük sinyali ${kacis(p.etiket || "SAT")}, piyasa filtresi yeni hisse alımını durduruyor; para ${nakitYeri(r.ayar)} bekliyor.${takilan}`
      : `puanı güçlü AL olup filtrelerden geçen hisse yok; para ${nakitYeri(r.ayar)} bekliyor.${takilan}`;
    return `<p class="hesap-bilgi hesap-emir-yok">${seans} <b>Emir yok</b>: ${neden}</p>${engel}`;
  }
  return `${baslik}<div class="tablo-kutu"><table class="sik"><thead><tr><th>Hisse</th><th>Emir</th>
      <th>Günlük puan</th><th>4 saatlik puan</th><th class="sag">Ortalama</th>
      <th class="sag" title="Son bilinen fiyat; işlem seans saatindeki ilk fiyattan yapılır">Yaklaşık fiyat</th>
      <th class="sag">Yaklaşık adet / tutar</th>
      <th class="sag" title="Yaklaşık fiyatın %5 altı; kesin seviye alış fiyatına göre, alımdan sonra yazılır">Yaklaşık zarar kes</th>
      <th>Neden</th></tr></thead>
      <tbody>${satirlar.map((e) => `<tr><td>${hisseLinki(e.kod)}</td><td>${etiketRozeti(e.yon)}</td>
        <td>${etiketRozeti(e.gunluk)}</td><td>${etiketRozeti(e.dort_saat)}</td>
        <td class="sag">${e.puan === null || e.puan === undefined ? "–" : sayi(e.puan, 2)}</td>
        <td class="sag">${e.yaklasik_fiyat ? `~${sayi(e.yaklasik_fiyat, 2)}` : "–"}</td>
        <td class="sag">${e.yon === "AL" ? (e.yaklasik_adet ? `~${sayi(e.yaklasik_adet, 0)} adet<br><span class="kucuk soluk">~${TL(e.yaklasik_tutar)}</span>` : "–")
          : `${sayi(e.adet, 0)} adet`}</td>
        <td class="sag">${e.yaklasik_zarar_kes ? `~${sayi(e.yaklasik_zarar_kes, 2)}` : "–"}</td>
        <td class="soluk">${kacis(e.neden)}</td></tr>`).join("")}</tbody></table></div>
    <p class="not">Yaklaşık değerler son bilinen fiyata göredir; liste de kesin değil (4 saatlik puan seans saatine kadar değişebilir).
      İşlem seans saatindeki ilk fiyattan yapılır; kesin alış fiyatı, adet ve zarar kes seviyesi alımdan sonra
      <b>Eldeki hisseler</b> bölümünde yazar. Kâr al emri yok.</p>${engel}`;
}

function pozisyonlarCiz(r) {
  if (!r.pozisyonlar.length) return '<p class="soluk">Elde hisse yok; hesabın tamamı nakit.</p>';
  return `<div class="tablo-kutu"><table class="sik"><thead><tr><th>Hisse</th><th class="sag">Adet</th><th>Alış</th>
      <th class="sag">Alış fiyatı</th><th class="sag">Son fiyat</th><th class="sag">Değer</th><th class="sag">Kâr / zarar</th>
      <th class="sag" title="Fiyat buraya inerse emir saatini beklemeden satılır (alımın ertesi gününden)">Zarar kes</th>
      <th>Satış koşulu</th><th>Günlük</th><th>4 saatlik</th><th>Sıradaki seansta</th></tr></thead>
      <tbody>${r.pozisyonlar.map((p) => {
        const s = p.sinyal || {};
        const altinKodu = r.bekleyen.altin?.ayar?.kod;
        const faktorde = r.bekleyen.rejim?.rejim === "faktor";
        const kosul = p.kod === altinKodu ? `Altın kolu: ay başında altın ${nakitAdi(r.ayar)} getirisini geçmiyorsa ya da prim sınırı aşılmışsa satılır`
          : faktorde ? "Faktör portföyü: ay başında listeden çıkarsa satılır"
          : `Kedi puanı SAT (emir saatinde)${p.zarar_kes ? ` ya da fiyat ${sayi(p.zarar_kes, 2)} TL'ye inerse hemen` : ""}; kâr al emri yok`;
        const karar = s.karar === "SAT" && p.kod !== altinKodu && !faktorde ? '<span class="rozet sat">satılacak</span>'
          : r.bekleyen.bugun_islem_goren.includes(p.kod) ? '<span class="rozet tut">bugün alındı, tutulur</span>'
          : '<span class="rozet tut">tutulacak</span>';
        return `<tr><td>${hisseLinki(p.kod)}</td><td class="sag">${sayi(p.adet, 0)}</td>
          <td>${seansMetni(p.alis_tarihi, p.alis_seans)}</td><td class="sag">${sayi(p.alis, 2)}</td>
          <td class="sag">${sayi(p.fiyat, 2)}</td><td class="sag">${TL(p.deger)}</td>
          <td class="sag ${yonSinifi(p.kar)}">${isaretli(p.kar)} TL<br><span class="kucuk">${yuzdeMetni(p.getiri)}</span></td>
          <td class="sag">${p.zarar_kes && p.kod !== altinKodu && !faktorde ? sayi(p.zarar_kes, 2) : "–"}</td>
          <td class="soluk kucuk">${kacis(kosul)}</td>
          <td>${etiketRozeti(s.gunluk?.etiket)}</td><td>${etiketRozeti(s.dort_saat?.etiket)}</td><td>${karar}</td></tr>`;
      }).join("")}</tbody></table></div>
    <p class="not">Alış: tarih ve emir saati, alış fiyatı o saatteki ilk fiyat. Son fiyat, son günlük mumun kapanışıdır (gün içindeyse
      o anki fiyat). Kâr/zarar komisyon dahildir. Kâr al emri kural olarak yok: sınamada kazanan hisseleri erken sattırdı.</p>`;
}

function islemlerCiz(r) {
  if (!r.islemler.length) return '<p class="soluk">Henüz işlem yok.</p>';
  const sonuc = new Map(r.kapanan.map((k) => [`${k.kod}|${k.satis_tarihi}|${k.satis_seans}`, k]));
  return `<div class="tablo-kutu"><table class="sik"><thead><tr><th>Tarih</th><th>Hisse</th><th>İşlem</th>
      <th class="sag">Adet</th><th class="sag">Fiyat</th><th class="sag">Tutar</th><th class="sag">Komisyon</th>
      <th class="sag" title="Kararın belli olduğu andaki fiyat: kullanılan 4 saatlik mumun kapanışı">Sinyal fiyatı</th>
      <th class="sag" title="Sinyal anında değil emir saatinde işlem yapmanın etkisi; artı = lehe">Bekleme farkı</th>
      <th>Günlük</th><th>4 saatlik</th><th class="sag">Sonuç</th><th>Neden</th></tr></thead>
      <tbody>${r.islemler.map((i) => {
        const k = i.yon === "SAT" ? sonuc.get(`${i.kod}|${i.tarih}|${i.seans}`) : null;
        return `<tr><td>${seansMetni(i.tarih, i.seans)}</td><td>${hisseLinki(i.kod)}</td><td>${etiketRozeti(i.yon)}</td>
          <td class="sag">${sayi(i.adet, 0)}</td><td class="sag">${sayi(i.fiyat, 2)}</td><td class="sag">${TL(i.tutar)}</td>
          <td class="sag">${sayi(i.komisyon, 2)}</td>
          <td class="sag">${i.sinyal_fiyati ? sayi(i.sinyal_fiyati, 2) : "–"}</td>
          <td class="sag ${yonSinifi(i.bekleme)}">${i.bekleme === null || i.bekleme === undefined ? "–" : `${isaretli(i.bekleme)} TL`}</td>
          <td>${etiketRozeti(i.gunluk)}</td><td>${etiketRozeti(i.dort_saat)}</td>
          <td class="sag ${k ? yonSinifi(k.kar) : ""}">${k ? `${isaretli(k.kar)} TL<br><span class="kucuk">${yuzdeMetni(k.getiri)}</span>` : ""}</td>
          <td class="soluk">${kacis(i.neden || "")}</td></tr>`;
      }).join("")}</tbody></table></div>`;
}

function haberSinyaliCiz(h) {
  if (!h) return '<p class="soluk">Henüz ölçülmedi (her akşam analiz turunda, 19:30).</p>';
  const yz = (x) => (x === null || x === undefined ? "–" : `${isaretli(x * 100, 2)}%`);
  const durum = { birikiyor: "tut", ise_yariyor: "al", ters: "sat", belirsiz: "tut" }[h.hukum.durum] || "tut";
  const ozet = (yon) => h.ozet.filter((o) => o.yon === yon).map((o) => `<tr><td>${o.ufuk} iş günü</td>
      <td class="sag">${o.n}${o.bekleyen ? ` <span class="soluk kucuk">(+${o.bekleyen} bekliyor)</span>` : ""}</td>
      <td class="sag">${o.isabet === null ? "–" : `%${sayi(o.isabet * 100, 0)}`}</td>
      <td class="sag">${o.taban === null ? "–" : `%${sayi(o.taban * 100, 0)}`}</td>
      <td class="sag">${o.z === null ? "–" : sayi(o.z, 2)}</td>
      <td class="sag ${yonSinifi(o.ort_fazla)}">${yz(o.ort_fazla)}</td>
      <td class="sag ${yonSinifi(o.ort_nemaya_gore)}">${yz(o.ort_nemaya_gore)}</td></tr>`).join("");
  const tablo = (yon, baslik) => `<h3>${baslik}</h3><div class="tablo-kutu"><table class="sik"><thead><tr><th>Ufuk</th>
      <th class="sag">Sonuçlanan</th><th class="sag" title="${yon === "olumlu" ? "BIST 100'ü geçme" : "BIST 100'ün gerisinde kalma"} oranı">İsabet</th>
      <th class="sag" title="Aynı hisselerde rastgele bir günden girilseydi">Taban</th><th class="sag">z</th>
      <th class="sag">BIST 100'e göre</th><th class="sag">Nakde göre</th></tr></thead><tbody>${ozet(yon)}</tbody></table></div>`;
  const olaylar = h.olaylar.map((s) => `<tr><td>${hisseLinki(s.kod)}</td><td>${kacis(zamanMetni(s.zaman))}</td>
      <td class="sag">${sayi(s.puan, 0)}</td><td>${s.yon === "olumlu" ? '<span class="rozet al">olumlu</span>' : '<span class="rozet sat">olumsuz</span>'}</td>
      <td>${s.giris ? kacis(zamanMetni(s.giris)) : '<span class="soluk">bekliyor</span>'}</td>
      ${h.ufuklar.map((n) => { const u = s.ufuk[String(n)]; return `<td class="sag ${u ? yonSinifi(u.fazla) : ""}">${u ? yz(u.fazla) : '<span class="soluk">–</span>'}</td>`; }).join("")}</tr>`).join("");
  return `<p class="hesap-bilgi"><span class="rozet ${durum}">${kacis(h.hukum.metin)}</span></p>
    <p class="not ust-not" data-katlama="yok">Haber puanı ${h.esik.olumlu} ve üstüne çıktığı an olumlu, ${h.esik.olumsuz} ve altına indiği an olumsuz sinyal sayılır;
      aynı bölgede kalındıkça yeni sinyal sayılmaz. Giriş sinyalden sonraki ilk açılış fiyatı; sonuç ${h.ufuklar.join(", ")} iş günü sonraki kapanış.
      Henüz hesabın kararlarına girmiyor: ${h.karar_ufku} günlük ufukta en az ${h.en_az_olay} sonuçlanmış olumlu sinyal birikip z ≥ 2 ve nakde göre artı
      olursa kural olarak eklenebilir. Haber puanı geçmişi ${h.ilk ? kacis(zamanMetni(h.ilk)) : "20 Ekim 2026"}'den başlıyor; geriye dönük sınanamaz.</p>
    ${tablo("olumlu", "Olumlu sinyaller (haber puanı ≥ " + h.esik.olumlu + ")")}
    ${tablo("olumsuz", "Olumsuz sinyaller (haber puanı ≤ " + h.esik.olumsuz + ")")}
    <h3>Son sinyaller (BIST 100'e göre fark)</h3>
    ${h.olaylar.length ? `<div class="tablo-kutu"><table class="sik"><thead><tr><th>Hisse</th><th>Sinyal</th><th class="sag">Puan</th><th>Yön</th>
      <th>Giriş</th>${h.ufuklar.map((n) => `<th class="sag">${n} gün</th>`).join("")}</tr></thead><tbody>${olaylar}</tbody></table></div>`
      : '<p class="soluk">Henüz sinyal yok.</p>'}`;
}

function kurallarCiz(a) {
  return `<ul class="hesap-kurallar">
      <li><b>Emir saatleri:</b> her işlem günü ${a.seanslar.join(" ve ")}. İşlem, o saatteki ilk fiyattan yapılır.</li>
      <li><b>Karar:</b> emir saatinden önce kesinleşmiş iki Kedi Gözü puanına bakılır. Biri dünkü kapanışın günlük puanı;
        diğeri o saatten önce kapanmış son 4 saatlik puan (10:15'te dünün son mumu, 14:15'te bugünün 13:00'te kapanan mumu).</li>
      <li><b>Al:</b> iki puan da AL ya da GÜÇLÜ AL <b>ve</b> ikisinin ortalaması ${sayi(a.alim_esigi, 1)}'in (GÜÇLÜ AL eşiği)
        üstündeyse. Alınan hisse en az bir gece tutulmak zorunda olduğu için zayıf AL'larda alınmaz, para nakitte bekler. En çok ${a.en_cok_hisse} hisse tutulur; her alım hesap değerinin
        ${a.hisse_payi ? '%' + sayi(a.hisse_payi * 100, 0) + "'si" : 'yaklaşık 1/' + a.en_cok_hisse + "'i"} kadardır (nakit yetmezse kalan nakit kadar); alımdan sonra büyüyen hisseye dokunulmaz. Yer azsa iki puanın ortalaması yüksek olan önce alınır.</li>
      ${a.reel_faiz_kurali ? `<li><b>Faiz rejimi (ayda bir):</b> ayın ilk işlem gününde reel faize bakılır (politika faizi − TCMB'nin
        12 aylık enflasyon beklentisi). Artıysa aşağıdaki Kedi kuralları geçerlidir, boş para ${nakitYeri(a)} bekler. Sıfır ya da eksiyse nakit enflasyon
        karşısında erir: para XU100'de sıralaması en iyi ${a.en_cok_hisse} hisseye eşit dağıtılır, ay boyunca tutulur, ay başında
        yenilenir (piyasa filtresi SAT ise o ay ${nakitYeri(a)}). Önceki sınamada (2022–2026, nakit Midas nema tahminiyle) +%1.068
        (BIST 100 +%340, nema +%214); rejim bu
        dönemde yalnız bir kez değiştiği için kanıt sınırlıdır.</li>` : ""}
      ${a.altin_kolu && a.altin_kolu.acik ? `<li><b>Altın kolu (hesabın %${sayi(a.altin_kolu.pay * 100, 0)} payı):</b> BIST 100'den bağımsız.
        Her ayın ilk işlem günü 10:15'te bakılır: gram altın son ${a.altin_kolu.ivme_ay} ayda ${nakitAdi(a)} getirisinden çok kazandırdıysa <b>ve</b>
        Darphane sertifikası altına göre %${sayi(a.altin_kolu.prim_sinir * 100, 0)}'dan pahalı değilse ${kacis(a.altin_kolu.kod)} tutulur;
        değilse satılır ve bu pay ${nakitYeri(a)} bekler. Kedi kuralları, piyasa filtresi ve zarar kes altına uygulanmaz; hisseler kalan
        %${sayi((1 - a.altin_kolu.pay) * 100, 0)} ile çalışır. Önceki sınamada (2023–2026, nakit Midas nema tahminiyle) +%702 (sertifika al-tut +%474, nema +%200),
        en büyük düşüş −%10; prim filtresi 2025 sonundaki %65'lik prim şişmesinden önce sattırdı.</li>` : ""}
      <li><b>Alım filtreleri</b> (puan AL olsa da şunlar yoksa alınmaz):
        ${a.piyasa_filtresi ? "<b>piyasa</b>: BIST 100'ün dünkü TradingView günlük sinyali SAT ya da GÜÇLÜ SAT ise hiç yeni alım yapılmaz; " : ""}
        ${a.kedi_isabet_esigi !== null ? `<b>Kedi isabeti</b>: Kedi puanı o hissede geçmişte rastgeleden belirgin iyi çalışmış olmalı (z ≥ ${sayi(a.kedi_isabet_esigi, 1)}); ` : ""}
        ${a.dusuk_oynaklik ? "<b>düşük oynaklık</b>: son 60 günde izlenen hisselerin ortancasından az oynamış olmalı." : ""}
        2024–2026 sınamasında bu filtreler Ekim 2026'daki −%7,8'lik kaybı +%3,1'e çevirdi ve en büyük düşüşü −%2,8'e indirdi.</li>
      ${a.nakit_faizi && a.nakit_fonu ? `<li><b>Nakit (${kacis(a.nakit_fonu.ad)}):</b> hisseye girmeyen her tutar
        ${kacis(a.nakit_fonu.kod)} para piyasası fonunda bekler ve fonun TEFAS'ta her gün yayımlanan birim fiyatıyla büyür (tahmin
        değil, gerçek fiyat). Bir emir anında bilinen fiyat önceki günün fiyatıdır. Kazançtan bireysel yatırımcı stopajı düşülür;
        oran payın alındığı döneme göre: Nisan 2024'e kadar %0, Mayıs–Ekim 2024 %7,5, Kasım 2024–Ocak 2025 %10, Şubat–8 Temmuz
        2025 %15, 9 Temmuz 2025'ten beri %17,5. Stopaj nihai vergidir; ayrıca yıllık beyanname yoktur. Kıyastaki nakit çizgisi
        de aynı fondur.</li>` : a.nakit_faizi ? `<li><b>Nakit faizi (Midas nema):</b> hisseye girmeyen her tutar, 50 TL bile olsa, Midas'ın TL
        nemalandırması gibi her gün faiz kazanır. Midas oranı yayımlamadığı için tahmin edilir: brüt = politika faizi −
        ${sayi(a.nema_brut_fark, 1)} puan (Midas, Takasbank gecelik faizini kullanıyor), net = brüt − %${sayi(a.nema_kesinti * 100, 0)}
        stopaj ve komisyon. Uygulamadaki oran farklıysa <code>ayarlar.yaml</code> → <code>hesap.nema_orani</code> yazılır.
        Türkiye'de nakitte beklemek sıfır getiri değildir; asıl kıyas "Midas nema"dır.</li>` : ""}
      <li><b>Sat:</b> emir saatinde (${a.seanslar.join(" ya da ")}) puanlardan biri SAT ya da GÜÇLÜ SAT ise eldeki hissenin tamamı o saatin fiyatından satılır. Hisse o gün alındıysa satış en erken ertesi günün ilk emir saatinde olur. Takip listesinden çıkarılan hisse de aynı kuralla satılır.</li>
      <li><b>Tut:</b> diğer durumlarda eldeki hisse tutulur, yeni alım yapılmaz.</li>
      ${a.zarar_kes ? `<li><b>Gün içi zarar kes:</b> aracı kurumdaki otomatik emir gibi; alımın ertesi gününden itibaren fiyat
        alış fiyatının %${sayi(a.zarar_kes * 100, 0)} altına inerse emir saatini beklemeden o seviyeden satılır (sabah seviyenin
        altında açılırsa açılıştan). Kâr al emri yok: sınamada kazanan hisseleri erken sattırdı.</li>` : ""}
      <li><b>Nakit:</b> paranın tamamı hisseye yatırılmak zorunda değil. Güçlü aday yoksa para nakitte bekler. Yeni hisse
        almak için eldeki hisse hiçbir zaman satılmaz; satış yalnızca o hissenin SAT sinyaliyle olur. Yer ya da nakit yetmezse
        alım yapılmaz.</li>
      <li><b>Neden ana panelden farklı:</b> ana paneldeki AL/SAT her mumda anında değişir; bu hesap yalnızca emir saatlerinde
        işlem yapabilir. Bu yüzden yalnızca güçlü AL'da alır ve her işlemde sinyalin belli olduğu andaki fiyatı da saklar.
        Aradaki fark "bekleme farkı" sütununda görünür: anında işlem yapılamamasının kazandırdığı ya da kaybettirdiği tutar.</li>
      <li><b>Bir hissede günde en çok bir işlem:</b> o gün alınan hisse en erken ertesi gün satılır; satılan hisse o gün geri alınmaz.</li>
      <li><b>Masraf:</b> ${a.komisyon ? `her alış ve satışta binde ${sayi(a.komisyon * 1000, 1)} komisyon düşülür` : "komisyon yok (aracı kurum hisse işleminde komisyon almıyor)"}. Adetler tam sayıdır.</li>
      <li><b>Kıyas:</b> hesabın ilk emir saatinde ${TL(a.nakit)} ile BIST 100 ya da BIST 30 alınıp hiç satılmasaydı, ya da
        para hiç hisseye girmeden nakitte (para piyasası fonunda) bekleseydi. Hesap o gün hiç hisse almasa da kıyas o andan başlar.</li>
      <li>Bilgisayar kapalıyken kaçan seanslar açılınca işlenir. Yalnızca o saatte bilinen puanlar ve o saatin fiyatı kullanılır;
        sonuç o saatte işlenseydi alınacak sonuçla aynıdır. Yapılmış işlemler sonradan değişmez.</li>
    </ul>
    <p class="not">Gerçek alım satım değildir; yatırım tavsiyesi değildir. Kurallar <code>ayarlar.yaml</code> → <code>hesap</code>
      bölümündedir. Başlangıç tarihi ya da nakit değiştirilirse hesap sıfırlanıp yeniden başlar.</p>`;
}

// Hesapların çalışma özeti ve sınama sonuçları (Kurallar'ın üstünde). Sınama: bugünkü motor ve ayarlarla (hisse başına
// %20, komisyonsuz (aracı kurum komisyon almıyor; ayarlar.yaml → hesap.komisyon), temettü dahil), her hesap Kasım 2023'te 100.000 TL ile; 3 Kasım 2026'da yapıldı. Takvim yılı 2023
// sınanamıyor: 4 saatlik Kedi puanı Aralık 2023'te başlıyor.
const HESAP_OZET = [
  { ad: "Kedi Gözü", renk: HESAP_RENK, fark: "Ana hesap",
    ozet: "Günlük ve 4 saatlik Kedi puanı birlikte güçlü AL verince hisse alınır (her biri hesabın %20'si, en çok 5 hisse); "
      + "puan SAT'a dönünce ya da fiyat alıştan %5 düşünce satılır. BIST 100 SAT'tayken yeni hisse alınmaz; oynaklığı yüksek "
      + "ya da Kedi'nin geçmişte isabetsiz olduğu hisseler alınmaz (isabet filtresi). Boş para ZBJ para piyasası fonunda büyür, "
      + "bir payı altın kuralıyla yönetilir." },
  { ad: "G1", fark: "Ana kural + yönetici alımı",
    ozet: "Ana hesabın aynısı; ek olarak KAP'ta yönetim kurulu üyesi, genel müdür ya da büyük ortak kendi parasıyla hisse "
      + "aldığını bildirirse o hisse (BIST 100'deyse) boş bir yer kadar alınır, 5 işlem günü tutulup satılır." },
  { ad: "G2", fark: "Değer/kârlılık süzgeci, zarar kes yok",
    ozet: "Ana hesabın aynısı, ama isabet filtresi yerine her ay başında Ziraat Yatırım çarpanlarıyla şirketin ucuzluğu "
      + "(PD/DD, F/K) ve kârlılığı (özkaynak kârlılığı) hem BIST 100'e hem kendi sektörüne göre sıralanır; alt yarıda kalan "
      + "hisse o ay alınmaz. %5 zarar kes yok: bu hisselerdeki düşüşler sınamada çoğunlukla geri döndü, hisse Kedi SAT "
      + "verince satılır." },
  { ad: "G3", fark: "Senin seçimin + sistemin zamanlaması",
    ozet: "Hisseleri sen seçersin: takip listendeki her BIST 100 hissesi alınabilir; isabet ve oynaklık süzgeçleri kapalı. "
      + "Ne zaman alınıp satılacağına sistem karar verir: piyasa filtresi, Kedi puanının AL/SAT kuralları ve %5 zarar kes ana "
      + "hesapla aynı. Geçmişte sınanamaz (bugün seçilen liste geçmişin kazananlarını bilir); asıl sınav canlı kayıt, ilk "
      + "resmi bakış Mayıs 2027." },
];
const SINAMA_DONEM = ["Kas 23 – Eki 24", "Kas 24 – Eki 25", "Kas 25 – Eki 26"];
const SINAMA_AYLAR = ["May", "Haz", "Tem", "Ağu", "Eyl", "Eki"];   // 2026
// SINAMA_BAS (scratchpad tum_sim.json'dan üretildi, 5 Kasım 2026; nakit ZBJ fonu, stopaj sonrası)
const SINAMA = [
  {"ad": "Kedi Gözü", "yil": [51.8, 47.2, 46.6], "ay": [1.0, 1.9, 9.1, 2.8, 2.7, 2.4], "uc": 227.6, "dusus": -1.8, "not": "3 yılda fonu 15,6 puan geçti; 2/3 yılda fonu geçti; en büyük düşüş −%1,8."},
  {"ad": "G1", "yil": [60.3, 48.7, 50.6], "ay": [2.5, 2.5, 8.3, 2.8, 2.2, 1.3], "uc": 259.1, "dusus": -2.6, "not": "3 yılda fonu 47,2 puan geçti; 3/3 yılda fonu geçti; en büyük düşüş −%2,6. Ana hesaba göre +31,6 puan. Takip dışı hisselerin sınama fiyatı yaklaşık."},
  {"ad": "G2", "yil": [54.6, 49.3, 48.0], "ay": [1.9, 4.1, 0.9, 5.0, 2.7, 2.4], "uc": 241.4, "dusus": -6.6, "not": "3 yılda fonu 29,5 puan geçti; 2/3 yılda fonu geçti; en büyük düşüş −%6,6. Ana hesaba göre +13,9 puan."},
  {"ad": "G3", "yil": [56.8, 55.0, 18.3], "ay": [-10.8, -2.5, 6.1, 2.2, -1.4, 2.2], "uc": 187.4, "dusus": -17.7, "not": "3 yılda fonun 24,5 puan gerisinde; 2/3 yılda fonu geçti; en büyük düşüş −%17,7. Ana hesaba göre −40,1 puan. Takip listesi Ekim 2026'da seçildiği için geçmişin kazananlarını biliyor; sonuç olduğundan iyi görünür. Asıl sınav canlı kayıt."},
  {"ad": "ZBJ fonu", "kiyas": true, "yil": [55.6, 46.5, 36.8], "ay": [2.3, 3.2, 2.8, 2.6, 2.7, 2.4], "uc": 211.9, "dusus": -0.1},
  {"ad": "BIST 100 al-tut", "kiyas": true, "yil": [17.1, 23.8, -1.9], "ay": [-5.4, 3.4, -4.7, 6.5, -16.7, -9.9], "uc": 42.2, "dusus": -28.9},
];
// SINAMA_SON

function golgeFarklariCiz(r) {
  const var_ = new Set(["Kedi Gözü", ...(r.golgeler || []).map((g) => g.ad)]);
  const rozet = (ad) => {
    const renk = ad === "Kedi Gözü" ? HESAP_RENK : GOLGE_RENK[ad];
    return renk ? `<span class="golge-ad" style="--renk:${renk}">${kacis(ad)}</span>` : `<span class="soluk">${kacis(ad)}</span>`;
  };
  const yuzde = (x) => `${x >= 0 ? "+" : "−"}%${Math.abs(x).toFixed(1).replace(".", ",")}`;
  const nema = SINAMA.find((s) => s.ad === "ZBJ fonu");
  // Renk işarete göre (artı yeşil, eksi kırmızı); aynı dönemde nakit fonunu geçen hesap hücresi kalın ve ▲ işaretli.
  const hucre = (x, n, kiyas) => {
    const renk = x > 0 ? "arti" : x < 0 ? "eksi" : "";
    const gecti = !kiyas && x > n;
    return `<td class="sag ${renk}${kiyas ? " soluk" : ""}"${gecti ? ' title="ZBJ fonunu geçti"' : ""}>${gecti
      ? `<b>▲ ${yuzde(x)}</b>` : yuzde(x)}</td>`;
  };
  const ozet = HESAP_OZET.filter((h) => var_.has(h.ad));
  const satirlar = SINAMA.filter((s) => s.kiyas || var_.has(s.ad));
  return `<ul class="hesap-ozet">${ozet.map((h) => `<li>${rozet(h.ad)} <b>${kacis(h.fark)}:</b> ${kacis(h.ozet)}</li>`).join("")}</ul>
    <p class="not">Ayrıntılar aşağıda <b>Kurallar</b> bölümünde. Gölge hesaplar ana hesabın bütün kurallarını aynen kullanır;
      yukarıdaki tek fark dışında. Canlı hesapların hepsi 31 Ekim 2026'da 100.000 TL ile açıldı.</p>
    <div class="tablo-kutu"><table class="sik golge-tablo golge-fark sinama-tablo"><thead>
      <tr><th rowspan="2">Hesap</th><th class="orta" colspan="3">Yıl yıl (Kasım – Ekim)</th>
        <th class="orta ay-bas" colspan="6">Son 6 ay (2026)</th><th class="sag ay-bas" rowspan="2" title="Parantez içi: 3 yılda en büyük düşüş">3 yılın kazancı</th></tr>
      <tr>${SINAMA_DONEM.map((d) => `<th class="sag">${d}</th>`).join("")}${SINAMA_AYLAR.map((a, i) =>
        `<th class="sag${i ? "" : " ay-bas"}">${a}</th>`).join("")}</tr></thead><tbody>
      ${satirlar.map((s) => `<tr${s.kiyas ? ' class="soluk"' : ""}><td>${rozet(s.ad)}</td>
        ${s.yil.map((x, i) => hucre(x, nema.yil[i], s.kiyas)).join("")}
        ${s.ay.map((x, i) => hucre(x, nema.ay[i], s.kiyas).replace("<td class=\"", `<td class="${i ? "" : "ay-bas "}`)).join("")}
        ${hucre(s.uc, nema.uc, s.kiyas).replace('<td class="', '<td class="ay-bas ').replace("</td>",
          `${s.dusus ? `<br><span class="soluk kucuk" title="3 yılda en büyük düşüş">(${yuzde(s.dusus)})</span>` : ""}</td>`)}</tr>`).join("")}
    </tbody></table></div>
    <ul class="sinama-not">${satirlar.filter((s) => s.not).map((s) => `<li>${rozet(s.ad)} ${kacis(s.not)}</li>`).join("")}</ul>
    <p class="not">Sınama: bugünkü kurallarla (hisse başına %20, komisyonsuz, temettü dahil), her hesap Kasım 2023'te
      100.000 TL ile. Yeşil artı, kırmızı eksi getiri; <b>▲ kalın</b>: aynı dönemde ZBJ fonunu geçti. Nakit ZBJ fonunda, stopaj sonrası. 2023 takvim yılı sınanamıyor, çünkü
      4 saatlik Kedi puanı Aralık 2023'te başlıyor. Bu yıllar kural seçerken çok kez kullanıldı; asıl sınav canlı kayıt.</p>`;
}

// Gölge hesap "Son işlemler": çarpıyla listeden kaldır (hesap defterinde kalır)
document.addEventListener("click", async (olay) => {
  const d = olay.target.closest(".islem-gizle");
  if (!d) return;
  d.disabled = true;
  try {
    const y = await fetch(`/api/hesap/islem_gizle/${d.dataset.islem}`, { method: "POST" });
    if (!y.ok) throw new Error(await y.text());
    d.closest("tr").remove();
  } catch (e) {
    d.disabled = false;
    alert("İşlem listeden kaldırılamadı: " + e.message);
  }
});

async function yukle() {
  let r;
  try {
    r = await getir("/api/hesap");
  } catch (e) {
    document.getElementById("ozet").innerHTML = `<p class="eksi">Alınamadı: ${kacis(e.message)}</p>`;
    return;
  }
  document.getElementById("ozet").innerHTML = ozetCiz(r);
  grafikCiz(r);
  document.getElementById("bekleyen").innerHTML = bekleyenCiz(r);
  document.getElementById("pozisyonlar").innerHTML = pozisyonlarCiz(r);
  document.getElementById("islemler").innerHTML = islemlerCiz(r);
  if ((r.golgeler || []).length) {
    document.getElementById("golge-bolum").hidden = false;
    document.getElementById("golgeler").innerHTML = golgelerCiz(r);
  }
  document.getElementById("haber-sinyali").innerHTML = haberSinyaliCiz(r.haber_sinyali);
  document.getElementById("piyasa-durumu").innerHTML = piyasaDurumuCiz(r);
  const farklar = golgeFarklariCiz(r);
  if (farklar) {
    document.getElementById("golge-fark-bolum").hidden = false;
    document.getElementById("golge-farklar").innerHTML = farklar;
  }
  document.getElementById("kurallar").innerHTML = kurallarCiz(r.ayar);
}

yukle();
