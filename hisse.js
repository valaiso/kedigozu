// Hisse detay: mum grafiği, hacim, derecelendirme puanı, AL/SAT okları, gösterge oyları.

const kod = (new URLSearchParams(location.search).get("kod") || "").toUpperCase();
const LW = LightweightCharts;
const RENK = { al: "#10b981", sat: "#f43f5e", tut: "#64748b", yazi: "#a3b0c8", cizgi: "#162038", sinir: "#24314d" };

let zd = "4h";
let hisse = null;
let isaretler = [];
let kediIsaretleri = [];
let mumZamanlari = [];

const grafik = LW.createChart(document.getElementById("grafik"), {
  autoSize: true,
  layout: { background: { type: "solid", color: "#111a2c" }, textColor: RENK.yazi, fontFamily: "Inter, Segoe UI, sans-serif", panes: { separatorColor: RENK.sinir } },
  grid: { vertLines: { color: RENK.cizgi }, horzLines: { color: RENK.cizgi } },
  rightPriceScale: { borderColor: RENK.sinir },
  timeScale: { borderColor: RENK.sinir, timeVisible: true, secondsVisible: false },
  crosshair: { mode: LW.CrosshairMode.Normal },
  localization: { locale: "tr-TR" },
});
const mumSerisi = grafik.addSeries(LW.CandlestickSeries, {
  upColor: RENK.al, downColor: RENK.sat, borderVisible: false, wickUpColor: RENK.al, wickDownColor: RENK.sat,
});
const hacimSerisi = grafik.addSeries(LW.HistogramSeries, {
  priceFormat: { type: "volume" }, priceScaleId: "hacim", lastValueVisible: false, priceLineVisible: false,
});
hacimSerisi.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
const puanSerisi = grafik.addSeries(LW.HistogramSeries, {
  priceFormat: { type: "price", precision: 2, minMove: 0.01 }, priceLineVisible: false,
}, 1);
for (const [deger, baslik] of [[0.5, "Güçlü AL"], [0.1, ""], [-0.1, ""], [-0.5, "Güçlü SAT"]]) {
  puanSerisi.createPriceLine({ price: deger, color: RENK.sinir, lineWidth: 1, lineStyle: LW.LineStyle.Dashed, axisLabelVisible: false, title: baslik });
}
const okEklentisi = LW.createSeriesMarkers(mumSerisi, []);
const panelBoyutu = () => { const p = grafik.panes(); if (p[1]) p[1].setHeight(110); };

function karar3(etiket) {
  if (etiket === "AL" || etiket === "GÜÇLÜ AL") return "AL";
  if (etiket === "SAT" || etiket === "GÜÇLÜ SAT") return "SAT";
  return "TUT";
}

// AL ya da SAT'a dönülen barlar. Kedi Gözü puanının dönüşleri "Kedi G." yazısıyla (AL yeşil, SAT kırmızı).
function okHesapla(gecmis, ad = "") {
  const sonuc = [];
  let onceki = null;
  for (const g of gecmis) {
    const k = karar3(g.etiket);
    if (onceki !== null && k !== onceki && k !== "TUT") {
      sonuc.push(k === "AL"
        ? { time: g.time, position: "belowBar", color: RENK.al, shape: "arrowUp", text: ad ? `${ad} AL` : "AL" }
        : { time: g.time, position: "aboveBar", color: RENK.sat, shape: "arrowDown", text: ad ? `${ad} SAT` : "SAT" });
    }
    onceki = k;
  }
  return sonuc;
}

function okGoster() {
  const oklar = document.getElementById("oklar").checked ? isaretler : [];
  const kediOklari = document.getElementById("kedi-isaret").checked ? kediIsaretleri : [];
  const haberler = document.getElementById("haber-isaret").checked ? haberIsaretleri(mumZamanlari, zd) : [];
  // Lightweight Charts işaretlerin zamana göre sıralı olmasını ister.
  const sira = (t) => (typeof t === "string" ? Date.parse(t) / 1000 : t);
  const etiketler = typeof etiketIsaretleri !== "undefined" ? etiketIsaretleri : [];
  okEklentisi.setMarkers([...oklar, ...kediOklari, ...haberler, ...etiketler].sort((a, b) => sira(a.time) - sira(b.time)));
}

async function grafikYukle() {
  const [mumlar, gecmis, kedi] = await Promise.all([
    getir(`/api/mumlar/${encodeURIComponent(kod)}?zd=${zd}`),
    getir(`/api/sinyal_gecmisi/${encodeURIComponent(kod)}?zd=${zd}`),
    getir(`/api/alt_panel/${encodeURIComponent(kod)}?zd=${zd}&kaynak=kedi`).catch(() => []),
  ]);
  mumSerisi.setData(mumlar.map(({ time, open, high, low, close }) => ({ time, open, high, low, close })));
  hacimSerisi.setData(mumlar.map((m) => ({
    time: m.time, value: m.volume ?? 0, color: m.close >= m.open ? "rgba(16,185,129,.32)" : "rgba(244,63,94,.32)",
  })));
  puanSerisi.setData(gecmis.map((g) => ({
    time: g.time, value: g.puan, color: g.puan > 0.1 ? RENK.al : g.puan < -0.1 ? RENK.sat : RENK.tut,
  })));
  isaretler = okHesapla(gecmis);
  kediIsaretleri = okHesapla(kedi, "Kedi G.");
  mumZamanlari = mumlar.map((m) => m.time);
  if (typeof analizGrafikSonrasi === "function") analizGrafikSonrasi(mumlar);
  okGoster();
  panelBoyutu();
  gorunurAraligiKur();
  const n = mumlar.length;
  document.getElementById("bar-bilgi").textContent =
    `${n} bar · ${isaretler.length} TradingView, ${kediIsaretleri.length} Kedi G. AL/SAT dönüşü · ${ZD_ADLARI[zd]}`;
}

// Dar ekranda daha az bar göster: bar başına yaklaşık 4 piksel. Grafik gizli sekmedeyse genişlik 0'dır; o zaman
// sekme açılınca (sekmeAc) yeniden kurulur.
function gorunurAraligiKur() {
  const n = mumZamanlari.length;
  const genislik = document.getElementById("grafik").clientWidth;
  if (!n) return;
  grafikGenislikliCizildi = genislik > 0;
  const gorunur = Math.max(60, Math.min(zd === "4h" ? 240 : 180, Math.round((genislik || 960) / 4)));
  grafik.timeScale().setVisibleLogicalRange({ from: Math.max(0, n - gorunur), to: n + 3 });
}

function dereceKarti(z, s) {
  if (!s) return `<h2>${ZD_ADLARI[z]}</h2><p class="soluk">Sinyal hesaplanmamış.</p>`;
  const say = (grup) => {
    const o = s.gostergeler.filter((g) => g.grup === grup);
    return { al: o.filter((g) => g.oy > 0).length, tut: o.filter((g) => g.oy === 0).length, sat: o.filter((g) => g.oy < 0).length };
  };
  const ma = say("ma"), osc = say("osc");
  return `
    <h2>${ZD_ADLARI[z]} derecelendirme</h2>
    <div class="buyuk">${rozet(s)}</div>
    <div class="puanlar">
      <div><span class="soluk kucuk">Genel</span><b>${sayi(s.puan, 3)}</b></div>
      <div><span class="soluk kucuk">Hareketli ort.</span><b>${sayi(s.ma_puan, 3)}</b>
        <span class="kucuk soluk">${ma.al} AL · ${ma.tut} TUT · ${ma.sat} SAT</span></div>
      <div><span class="soluk kucuk">Osilatörler</span><b>${sayi(s.osc_puan, 3)}</b>
        <span class="kucuk soluk">${osc.al} AL · ${osc.tut} TUT · ${osc.sat} SAT</span></div>
    </div>
    <p class="not">Son bar: ${zamanMetni(s.zaman)}${acikBarNotu(s.zaman, z)
      ? ` · <span class="acik-bar" title="Sinyal, henüz kapanmamış bu barın şimdiki fiyatıyla hesaplandı; bar kapanana kadar değişebilir">${acikBarNotu(s.zaman, z)}</span>` : ""}
      · hesaplama ${zamanMetni(s.hesaplama)}</p>`;
}

function tabloDoldur() {
  const s = hisse.sinyal[zd];
  document.getElementById("tablo-baslik").textContent = `Göstergeler (${ZD_ADLARI[zd]})`;
  document.getElementById("gostergeler").innerHTML = s
    ? s.gostergeler.map((g) => `<tr>
        <td>${kacis(g.ad)}</td>
        <td class="soluk">${g.grup === "ma" ? "Hareketli ortalama" : "Osilatör"}</td>
        <td class="sag">${sayi(g.deger, 2)}</td>
        <td>${oyRozeti(g.oy)}</td></tr>`).join("")
    : '<tr><td colspan="4" class="soluk">Sinyal hesaplanmamış.</td></tr>';
}

async function bilgiYukle() {
  hisse = await getir(`/api/hisse/${encodeURIComponent(kod)}`);
  document.title = `${hisse.kod} · Kedi Gözü`;
  document.getElementById("baslik").textContent = hisse.kod;
  document.getElementById("ad").textContent = hisse.ad || "";
  document.getElementById("fiyat").textContent = sayi(hisse.fiyat);
  const d = document.getElementById("degisim");
  d.textContent = yuzde(hisse.degisim);
  d.className = yonSinifi(hisse.degisim);
  document.getElementById("grup").textContent =
    `${GRUP_ADLARI[hisse.grup] || ""}${hisse.xu030 ? " · XU030" : ""}${hisse.xu100 === false && hisse.grup !== "emtia" ? " · XU100 dışı" : ""}`;
  for (const z of ["4h", "1d"]) document.getElementById(`derece-${z}`).innerHTML = dereceKarti(z, hisse.sinyal[z]);
  tabloDoldur();
  maliBaslat(hisse.grup);
  seviyeYukle();
  analizYukle();
  if (typeof konseyYukle === "function") konseyYukle();
  veriUyarisiYukle();
  siraYukle();
  olasilikYukle();
  baglamYukle();
  if (hisse.grup === "endeks" || hisse.grup === "emtia") {
    document.getElementById("haber-bolum").hidden = true;
    document.getElementById("deger-bolum").hidden = true;
    document.getElementById("temettu-bolum").hidden = true;
  } else {
    haberYukle();
    degerYukle();
    olayYukle();
    temettuYukle();
  }
  bolumNavGuncelle();
}

// Bilanço sürprizi ve KAP olaylarının ölçülmüş etkisi (motorlar/olay_etkisi.py)
const OLAY_ADLARI_KAP = { geri_alim: "Pay geri alımı", pay_alim_satim: "Pay alım satım bildirimi", kar_payi: "Kâr payı kararı",
  sermaye: "Sermaye işlemi", yeni_is: "Yeni iş ilişkisi", devre_kesici: "Devre kesici", ozel_durum: "Özel durum açıklaması" };
async function olayYukle() {
  let r;
  try { r = await getir(`/api/olay_etkisi?kod=${encodeURIComponent(kod)}`); } catch { return; }
  const o = r.ozet;
  const y = (x, b = 1) => (x === null || x === undefined ? "–" : `${x > 0 ? "+" : x < 0 ? "−" : ""}%${sayi(Math.abs(x) * 100, b)}`);
  // Bilanço sürprizi
  const b = o?.bilanco, son = r.bilanco?.[0];
  if (b?.dilimler && son) {
    const [alt, ust] = b.sinirlar;
    const dilim = son.sue >= ust ? "yuksek" : son.sue <= alt ? "dusuk" : "orta";
    const dilimAdi = { yuksek: "yüksek (iyi sürpriz)", orta: "olağan", dusuk: "düşük (kötü sürpriz)" }[dilim];
    const d = b.dilimler[dilim];
    document.getElementById("bilanco").innerHTML = `<div class="kart">
        <p><b>${kacis(son.donem)}</b> bilançosu (${zamanMetni(son.tarih)}): çeyreklik net kâr geçen yılın aynı çeyreğine göre
          <b class="${yonSinifi(son.degisim)}">${y(son.degisim, 0)}</b>. Şirketin olağan dalgalanmasına göre sürpriz <b>${sayi(son.sue, 1)}</b>
          → <b>${dilimAdi}</b>.</p>
        <p>Geçmişte (19 hisse, ${b.n} bilanço) bu dilimdeki bilançolardan sonraki 60 günde hisse XU100'ü ortalama
          <b class="${yonSinifi(d.car60.ort)}">${y(d.car60.ort)}</b> geçti (${d.car60.n} bilanço). İyi sürpriz ile kötü sürpriz arasındaki fark
          ${y(b.fark_car60)}; BIST'te iyi bilançodan sonra hisse bir süre daha iyi gitme eğiliminde.</p>
        <div class="tablo-kutu"><table class="sik"><thead><tr><th>Dönem</th><th>Yayım</th><th class="sag">Kâr değişimi</th>
          <th class="sag" title="Olağan dalgalanmaya göre sürpriz (standart sapma cinsinden)">Sürpriz</th>
          <th class="sag" title="Önceki kapanıştan 1 gün sonraya, XU100'e göre">İlk tepki</th><th class="sag">20 gün</th><th class="sag">60 gün</th></tr></thead>
          <tbody>${r.bilanco.map((x) => `<tr><td>${kacis(x.donem)}</td><td class="soluk">${zamanMetni(x.tarih)}</td>
            <td class="sag ${yonSinifi(x.degisim)}">${y(x.degisim, 0)}</td><td class="sag">${x.sue === null ? "–" : sayi(x.sue, 1)}</td>
            <td class="sag ${yonSinifi(x.tepki)}">${y(x.tepki)}</td><td class="sag ${yonSinifi(x.car20)}">${y(x.car20)}</td>
            <td class="sag ${yonSinifi(x.car60)}">${y(x.car60)}</td></tr>`).join("")}</tbody></table></div>
        <p class="not">Getiriler XU100'e göredir (anormal getiri). Yayım tarihi bilinmeyen eski dönemlerde yasal süre kullanıldı.</p>
      </div>`;
    document.getElementById("bilanco-bolum").hidden = false;
  }
  // KAP olayları
  if (o?.kap) {
    const satirlar = Object.entries(o.kap).filter(([, v]) => v.car1.n > 0);
    document.getElementById("kap-etki").innerHTML = `<div class="kart">
        <div class="tablo-kutu"><table class="sik"><thead><tr><th>Olay</th><th class="sag">Olay sayısı</th>
          <th class="sag">Ertesi gün</th><th class="sag">5 gün</th><th class="sag">20 gün</th></tr></thead>
          <tbody>${satirlar.map(([, v]) => `<tr><td>${kacis(v.ad)}</td><td class="sag">${v.car1.n}</td>
            ${["car1", "car5", "car20"].map((k) => `<td class="sag ${yonSinifi(v[k].ort)}">${y(v[k].ort)}${v[k].t !== null && Math.abs(v[k].t) >= 2 ? " *" : ""}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
        ${r.kap?.length ? `<p class="kucuk">Bu hissenin son bildirimleri: ${r.kap.slice(0, 6).map((k) => `${zamanMetni(k.yayin)} ${kacis(k.tip)}`).join(" · ")}</p>` : ""}
        <p class="not">19 hissenin son 1 yıldaki bildirimleri (${o.kap_ilk ? zamanMetni(o.kap_ilk) : "–"} sonrası); getiriler XU100'e göre.
          * güven t ≥ 2. Örnek az; ön bulgudur. Devre kesici sert düşüşle tetiklenir, düşüşün kendisi ölçüme dahildir.</p>
      </div>`;
    document.getElementById("kap-etki-bolum").hidden = false;
  }
  bolumNavGuncelle();
}

// Bağlam ve risk (motorlar/baglam.py): pozisyon büyüklüğü, piyasa rejimi, takvim etkisi
const AY_ADLARI = ["", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
async function baglamYukle() {
  const bolum = document.getElementById("baglam-bolum");
  let b;
  try { b = await getir(`/api/baglam/${encodeURIComponent(kod)}`); } catch { return; }
  const y = (x, d = 1) => (x === null || x === undefined ? "–" : `${x < 0 ? "−" : x > 0 && d !== "y" ? "" : ""}%${sayi(Math.abs(x) * 100, d === "y" ? 1 : d)}`);
  const ya = (x) => (x === null || x === undefined ? "–" : `${x > 0 ? "+" : x < 0 ? "−" : ""}%${sayi(Math.abs(x) * 100, 1)}`);
  const parca = [];
  const r = b.risk;
  if (r) {
    parca.push(`<div class="baglam-kutu"><div class="soluk kucuk">Risk ve pozisyon</div>
      <p>Günlük oynaklık (ATR) <b>${y(r.atr_yuzde)}</b>, yıllık oynaklık ${y(r.yillik_oynaklik, 0)}. Zarar durdurma 2 ATR aşağıda:
        <b>${sayi(r.stop, 2)} TL</b>.</p>
      <p>Portföyünün <b>%${sayi(r.risk_orani * 100, 0)}</b>'ini riske edeceksen bu hisseye ayıracağın pay: <b>${y(r.pozisyon_payi, 0)}</b>.
        Oynak hissede aynı sinyal daha küçük pozisyon ister.</p></div>`);
  }
  const rj = b.rejim, ro = b.rejim_olcumu;
  if (rj?.xu100) {
    const simdi = rj.yukselis ? ro?.yukselis : ro?.dusus;
    parca.push(`<div class="baglam-kutu"><div class="soluk kucuk">Piyasa rejimi</div>
      <p>XU100 50 günlük ortalamanın <b class="${rj.yukselis ? "arti" : "eksi"}">${rj.yukselis ? "üstünde (yükseliş)" : "altında (düşüş)"}</b>${rj.xu100 > rj.sma200 ? ", 200 günlüğün üstünde" : ", 200 günlüğün de altında"}.
        50 günlük ortalamasının üstündeki hisse oranı ${y(rj.sma50_ustu, 0)}${rj.faiz_ruzgari !== undefined ? `; faiz rüzgârı ${rj.faiz_ruzgari > 0 ? "+" : ""}${sayi(rj.faiz_ruzgari, 0)}` : ""}.</p>
      ${simdi ? `<p class="kucuk">Geçmişte (19 hisse, 5 yıl) bu rejimde verilen ${simdi.n} günlük AL sinyalinden sonraki ${ro.ufuk} günde hisse XU100'ü
        ortalama <b class="${yonSinifi(simdi.ort)}">${ya(simdi.ort)}</b> geçti; isabet ${y(simdi.isabet, 0)}.
        Öbür rejimde: ${ya((rj.yukselis ? ro.dusus : ro.yukselis)?.ort)}.</p>` : ""}</div>`);
  }
  const t = b.takvim, a = b.ay_etkisi;
  const tk = [];
  if (t?.bilanco) tk.push(`${kacis(t.bilanco.donem)} bilançosu için yasal son tarih <b>${zamanMetni(t.bilanco.son_tarih)}</b> (${t.bilanco.kalan_gun} gün).
    Bilançodan sonra fiyat sürprize göre bir süre aynı yönde gitme eğiliminde (Mali tablolar sekmesi).`);
  if (t?.temettu) tk.push(`Yaklaşan temettü: ${zamanMetni(t.temettu.tarih)}, hisse başı ${sayi(t.temettu.net_tl, 2)} TL net.`);
  if (a) tk.push(`Son ${a.n} yılda ${AY_ADLARI[a.ay]} ayında hisse XU100'ü ortalama ${ya(a.ortalama)} geçti (${a.pozitif}/${a.n} yıl pozitif).
    Yılda tek gözlem: bilgi, istatistik değil.`);
  if (tk.length) parca.push(`<div class="baglam-kutu"><div class="soluk kucuk">Takvim</div>${tk.map((x) => `<p>${x}</p>`).join("")}</div>`);
  if (!parca.length) { bolum.hidden = true; return; }
  bolum.hidden = false;
  document.getElementById("baglam").innerHTML = `<div class="kart baglam-kart">${parca.join("")}</div>`;
  bolumNavGuncelle();
}

// Meta-etiketleme (motorlar/meta_model.py): şu an AL olan sinyalin XU100'den iyi gitme olasılığı ve modelin sınaması
const KAYNAK_ADLARI = { uyarlanmis: "Uyarlanmış sinyal", tradingview: "TradingView sinyali" };
async function olasilikYukle() {
  const bolum = document.getElementById("olasilik-bolum");
  if (hisse?.grup === "endeks" || hisse?.grup === "emtia") { bolum.hidden = true; return; }
  let r;
  try { r = await getir(`/api/meta_model?kod=${encodeURIComponent(kod)}`); } catch { return; }
  const s = r.ozet?.[zd];
  if (!s?.n) { bolum.hidden = true; return; }
  bolum.hidden = false;
  const y = (x) => (x === null || x === undefined ? "–" : `%${sayi(x * 100, 0)}`);
  const ufuk = zd === "1d" ? "20 işlem günü" : "30 mum (yaklaşık 2 hafta)";
  const tahminler = r.tahminler.filter((t) => t.zd === zd);
  const sinyalMetni = tahminler.length
    ? tahminler.map((t) => `<p><b>${KAYNAK_ADLARI[t.kaynak]}</b> ${zamanMetni(t.al_baslangic)} tarihinden beri AL. Sonraki ${ufuk} içinde
        XU100'den iyi gitme olasılığı: <b class="durustluk-mini ${s.anlamli ? (t.olasilik > s.taban + 0.03 ? "al" : t.olasilik < s.taban - 0.03 ? "sat" : "tut") : "tut"}"
        style="font-size:20px">${y(t.olasilik)}</b> <span class="soluk">(bütün AL'larda ortalama ${y(t.taban)})</span></p>`).join("")
    : `<p class="soluk">Şu an ${ZD_ADLARI[zd].toLowerCase()} dilimde AL sinyali yok; olasılık yalnızca AL anları için hesaplanır.</p>`;
  const anlam = s.anlamli
    ? `<b class="arti">Model geçmişte AL'ları ayırt edebildi</b> (ayırma gücü ${sayi(s.auc, 2)}; yazı-tura 0,50).`
    : `<b>Model geçmişte iyi ve kötü AL'ları ayırt edemedi</b> (ayırma gücü ${sayi(s.auc, 2)}; yazı-tura 0,50). Bu yüzden olasılık
       ortalamaya yakın gösterilir: bu AL hakkında sinyalin kendisinden fazla bilgi yok.`;
  document.getElementById("olasilik").innerHTML = `<div class="kart">
      ${sinyalMetni}
      <p class="kucuk">${anlam}</p>
      <details class="durustluk-nasil"><summary>Nasıl hesaplanıyor?</summary>
        <p>19 hissenin geçmişindeki bütün AL anları (${s.n} örnek dışı AL) incelendi: hacim, göstergelerin kaçının AL dediği, piyasanın
          durumu, oynaklık, göreli güç, momentum, RSI ve dibe yakınlık. Model her yıl yalnızca önceki yıllarla eğitildi ve o yılın
          AL'larında sınandı. "Yüksek olasılık" denen %20'lik dilim ${y(s.ust_dilim_isabet)}, "düşük" denen dilim ${y(s.alt_dilim_isabet)}
          tuttu. Olasılıklar örnek dışı sonuçlarla kalibre edilir: "%55" denen AL'ların geçmişte gerçekten yaklaşık %55'i tutmuştur.</p>
      </details>
    </div>`;
  bolumNavGuncelle();
}

// XU100 içinde kesitsel bileşik puan (motorlar/faktor.py): bu hissenin sırası ve etken yüzdelikleri
async function siraYukle() {
  const bolum = document.getElementById("sira-bolum");
  let r;
  try { r = await getir(`/api/faktor?kod=${encodeURIComponent(kod)}`); } catch { return; }
  const p = r.puanlar?.[0];
  if (!p) { bolum.hidden = true; return; }
  bolum.hidden = false;
  const b = r.test?.etkenler?.bilesik;
  const cubuk = (ad, x) => `<div class="sira-etken"><span>${ad}</span><div class="sira-cubuk"><span style="width:${x ?? 0}%"></span></div>
      <b>${x === null || x === undefined ? "–" : sayi(x, 0)}</b></div>`;
  document.getElementById("sira").innerHTML = `<div class="kart sira-kart">
      <div class="sira-ust"><div><span class="buyuk-sayi">${p.sira}.</span> <span class="soluk">/ ${p.hisse_sayisi} hisse</span></div>
        <div>Bileşik puan <b>${sayi(p.bilesik, 0)}</b>/100 ${p.toparlanma ? '<span class="rozet hacimli">toparlanma adayı</span>' : ""}</div></div>
      ${cubuk("Momentum (6-1 ay)", p.momentum)}${cubuk("Kısa vadeli geri dönüş", p.geri_donus)}
      ${cubuk("Düşük oynaklık", p.dusuk_oynaklik)}${cubuk("52 haftalık zirveye yakınlık", p.zirve)}
      ${b ? `<p class="soluk kucuk">Bileşik puan ${b.ay} ay geleceğe bakmadan sınandı: en iyi %20, en kötü %20'yi ayda ortalama
        %${sayi((b.fark || 0) * 100, 1)} geçti (güven t = ${sayi(b.t || 0, 1)}). <a href="sirala.html">Bütün sıralama →</a></p>` : ""}
    </div>`;
  bolumNavGuncelle();
}

// Veri doğrulama: bu hissenin verisinde açık bulgu varsa sayfanın başında gösterilir (motorlar/veri_dogrulama.py).
async function veriUyarisiYukle() {
  const kutu = document.getElementById("veri-uyari");
  let r;
  try { r = await getir(`/api/veri_dogrulama?kod=${encodeURIComponent(kod)}`); } catch { return; }
  if (!r.bulgular.length) { kutu.hidden = true; return; }
  kutu.hidden = false;
  kutu.className = `veri-uyari ${r.hata ? "hata" : ""}`;
  kutu.innerHTML = `<b>Veri doğrulama: ${r.hata ? `${r.hata} hata` : ""}${r.hata && r.uyari ? ", " : ""}${r.uyari ? `${r.uyari} uyarı` : ""}.</b>
    Bu hissenin verisinde şüpheli değer bulundu; ilgili hesaplar (sinyal, karne, değerleme) etkilenmiş olabilir.
    <ul>${r.bulgular.map((b) => `<li><span class="rozet ${b.seviye === "HATA" ? "sat" : "tut"}">${b.seviye}</span>
      ${kacis(b.mesaj)}${b.islem ? ` <span class="soluk">· yapılan: ${kacis(b.islem)}</span>` : ""}</li>`).join("")}</ul>`;
}

// Sekmeler: her bölüm kendi sekmesinde açılır. Adresteki iz (#konsey gibi) sekmeyi seçer; geri tuşu çalışır.
// Eski bölüm bağlantıları (#konsey-bolum gibi, ör. Göstergeler sayfasından) karşılık gelen sekmeye gider.
const ESKI_CAPALAR = { "konsey-bolum": "konsey", "durustluk-bolum": "durustluk", "derece-4h": "sinyal", "basari-bolum": "basari",
  "seviyeler-bolum": "seviyeler", "deger-bolum": "deger", "haber-bolum": "haber", "mali-bolum": "mali" };
let grafikGenislikliCizildi = false;

function adrestekiSekme() {
  const iz = decodeURIComponent(location.hash.slice(1));
  return ESKI_CAPALAR[iz] || iz || "grafik";
}

function sekmeAc(ad, gecmise = false) {
  const baglanti = document.querySelector(`#bolum-nav a[data-sekme="${ad}"]`);
  if (!baglanti || baglanti.hidden) ad = "grafik";
  document.querySelectorAll(".sekme-icerik").forEach((p) => p.classList.toggle("aktif", p.dataset.sekme === ad));
  document.querySelectorAll("#bolum-nav a").forEach((a) => {
    const secili = a.dataset.sekme === ad;
    a.classList.toggle("aktif", secili);
    a.setAttribute("aria-selected", secili);
  });
  if (gecmise) history.pushState(null, "", `#${ad}`);
  else if (location.hash.slice(1) !== ad) history.replaceState(null, "", `#${ad}`);
  // Sayfa grafik dışındaki bir sekmeyle açıldıysa grafik gizliyken genişliği 0'dı: ilk gösterimde görünür aralığı yeniden kur
  // (iki kare sonra: grafik kütüphanesi yeni genişliği bir sonraki karede öğrenir)
  if (ad === "grafik" && !grafikGenislikliCizildi && mumZamanlari.length) {
    requestAnimationFrame(() => requestAnimationFrame(gorunurAraligiKur));
  }
}

// Sekmesindeki bütün bölümler gizliyse (ör. altında mali tablo, endekste haber) sekme de gizlenir.
function bolumNavGuncelle() {
  document.querySelectorAll("#bolum-nav a").forEach((a) => {
    const panel = document.querySelector(`.sekme-icerik[data-sekme="${a.dataset.sekme}"]`);
    const bolumler = panel ? [...panel.querySelectorAll("section")] : [];
    a.hidden = !panel || (bolumler.length > 0 && bolumler.every((s) => s.hidden));
  });
  const aktif = document.querySelector("#bolum-nav a.aktif");
  if (!aktif || aktif.hidden) sekmeAc(adrestekiSekme());
}

document.getElementById("bolum-nav").addEventListener("click", (e) => {
  const a = e.target.closest("a[data-sekme]");
  if (!a) return;
  e.preventDefault();               // sayfadaki aynı adlı kimliğe kaydırmasın
  sekmeAc(a.dataset.sekme, true);
});
window.addEventListener("popstate", () => sekmeAc(adrestekiSekme()));
sekmeAc(adrestekiSekme());

document.querySelectorAll(".arac-cubugu button[data-zd]").forEach((b) => b.addEventListener("click", () => {
  zd = b.dataset.zd;
  document.querySelectorAll(".arac-cubugu button[data-zd]").forEach((x) => x.classList.toggle("secili", x === b));
  grafikYukle();
  tabloDoldur();
  if (typeof konseyYukle === "function") konseyYukle();
  olasilikYukle();
}));
document.getElementById("oklar").addEventListener("change", okGoster);
document.getElementById("kedi-isaret").addEventListener("change", okGoster);
document.getElementById("haber-isaret").addEventListener("change", okGoster);

Promise.all([bilgiYukle(), grafikYukle()]).catch((e) => {
  document.getElementById("baslik").textContent = kod || "Hisse seçilmedi";
  document.getElementById("ad").innerHTML = `<span class="eksi">Veri alınamadı: ${kacis(e.message)}</span>`;
});
