// Hisse sayfası: gösterge konseyi. Şu anki oylar, geçmişte en isabetli 5, seçim testi ve bütün karne.
// analiz.js'ten sonra yüklenir (yuzdeMetni, kod, zd, grafik oradan gelir).

const KATMAN_ADLARI = { trend: "Trend", osilator: "Osilatör", hacim: "Hacim", diger: "Diğer", referans: "Referans" };
let konseyVerisi = null;
let karneSirasi = { alan: "sira", artan: true };
let enIyiOlcut = "kazanc";      // kazanc | dogruluk | erken
const EN_AZ_SINYAL = 15;
const OLCUT_ADLARI = {
  kazanc: { dugme: "Kazanca göre", baslik: "Geçmişte en isabetli 5 (kazanca göre)",
    not: "Sinyal başına kazancın güvenilirliğine (skor) göre. Trend göstergeleri öne çıkar: doğrulukları düşük, kazançları yüksek." },
  dogruluk: { dugme: "Doğruluğa göre", baslik: "En yüksek doğruluklu 5",
    not: "Doğru yönde biten sinyal oranına göre (en az 15 sinyal). Dönüş göstergeleri öne çıkar: sık haklı çıkarlar ama kazanç/kayıp oranlarına bak; küçük kazanıp büyük kaybedebilirler." },
  erken: { dugme: "Erken yakalamaya göre", baslik: "Dipleri en erken yakalayan 5",
    not: "Gerçek diplerde (sonradan bulunur, 2 ATR) dipte ya da en geç 2 bar sonra AL verme oranının rastgele zamanlamaya göre fazlasına göre." },
};

function cogunluk(liste) {
  const say = { AL: liste.filter((g) => g.son_sinyal === 1).length, SAT: liste.filter((g) => g.son_sinyal === -1).length,
    TUT: liste.filter((g) => g.son_sinyal === 0).length };
  const en = Math.max(...Object.values(say));
  const kazanan = Object.keys(say).filter((k) => say[k] === en);
  return kazanan.length === 1 ? kazanan[0] : "TUT";
}

function enIyiListesi(v) {
  const e = v.karne.filter((r) => !r.referans && (r.sinyal_sayisi ?? 0) >= EN_AZ_SINYAL);
  if (enIyiOlcut === "dogruluk") {
    return e.filter((r) => r.dogruluk !== null).sort((a, b) => b.dogruluk - a.dogruluk || (b.ort_getiri ?? 0) - (a.ort_getiri ?? 0)).slice(0, 5);
  }
  if (enIyiOlcut === "erken") {
    return e.filter((r) => r.dip_yakalama !== null && r.dip_yakalama !== undefined && r.rastgele_dip_yakalama !== null)
      .sort((a, b) => (b.dip_yakalama - b.rastgele_dip_yakalama) - (a.dip_yakalama - a.rastgele_dip_yakalama)).slice(0, 5);
  }
  return v.konsey.en_iyi.map((a) => v.karne.find((r) => r.gosterge === a)).filter(Boolean);
}

function tarihUzun(t) {
  return t ? `${t.slice(8, 10)}.${t.slice(5, 7)}.${t.slice(0, 4)}${t.length > 10 ? " " + t.slice(11, 16) : ""}` : "–";
}

function oranMetni(x) {
  return x === null || x === undefined ? "–" : `%${sayi(x * 100, 0)}`;
}

function oyCubugu(k) {
  const toplam = k.al + k.sat + k.tut || 1;
  const p = (x) => `${(x / toplam) * 100}%`;
  return `<div class="oy-cubugu" title="${k.al} AL · ${k.tut} TUT · ${k.sat} SAT">
      <span class="al" style="width:${p(k.al)}"></span><span class="tut" style="width:${p(k.tut)}"></span><span class="sat" style="width:${p(k.sat)}"></span>
    </div>
    <div class="oy-sayilari"><span class="arti">${k.al} AL</span> · <span class="soluk">${k.tut} TUT</span> · <span class="eksi">${k.sat} SAT</span></div>`;
}

function enIyiKarti(g, sira) {
  const beri = g.son_degisim ? `Başlangıç ${tarihUzun(g.son_degisim)}` : "";
  return `<div class="kart konsey-kart tik" data-eklenti="${kacis(g.gosterge)}" title="${kacis(g.aciklama || "")}">
      <div class="ust-satir"><span class="soluk kucuk">#${sira}${g.fdr_anlamli ? ' <span class="rozet al" title="70 gösterge sınandığı hesaba katıldıktan sonra da kazancı şans eseri olmaktan ayrılabiliyor (yanlış keşif oranı %10)">anlamlı</span>' : ""}</span><span>${oyRozeti(g.son_sinyal)}${hacimRozeti(g)}</span></div>
      <div class="baslik">${kacis(g.ad)}</div>
      <div class="soluk kucuk">${beri}${g.donem_getiri !== null ? ` · <span class="${yonSinifi(g.donem_getiri)}">${yuzdeMetni(g.donem_getiri)}</span>` : ""}</div>
      <div class="konsey-olcu">
        <div title="Aynı sıklıkta, rastgele zamanlanmış sinyalin doğruluğu parantez içinde"><span class="soluk kucuk">Doğruluk</span><b>${oranMetni(g.dogruluk)}</b>
          <span class="soluk kucuk">rastgele ${oranMetni(g.rastgele_dogruluk)}</span></div>
        <div><span class="soluk kucuk">Sinyal başına</span><b class="${yonSinifi(g.ort_getiri)}">${yuzdeMetni(g.ort_getiri)}</b>
          <span class="soluk kucuk">rastgele ${yuzdeMetni(g.rastgele_ort_getiri)}</span></div>
        <div title="Kazançlar toplamı / kayıplar toplamı"><span class="soluk kucuk">Kâr/zarar</span><b>${g.kar_zarar === null ? "–" : sayi(g.kar_zarar, 2)}</b>
          <span class="soluk kucuk">${g.sinyal_sayisi} sinyal</span></div>
      </div>
      <div class="soluk kucuk" style="margin-top:6px" title="Gerçek diplerde dipte ya da en geç 2 bar sonra AL verme oranı; parantezde rastgele zamanlama">
        Dipte yakalama ${oranMetni(g.dip_yakalama)} (rastgele ${oranMetni(g.rastgele_dip_yakalama)}) ·
        ${g.dip_gecikme === null || g.dip_gecikme === undefined ? "–" : `${g.dip_gecikme > 0 ? "+" : ""}${sayi(g.dip_gecikme, 0)} bar`}</div>
    </div>`;
}

// Kedi Gözü puanı (motorlar/kedi_puani.py): bu hissede geçmişte en isabetli 5 göstergenin oyu; göstergeler her ay başında
// yalnızca o güne kadarki sonuçlarla seçilir. Dürüstlüğü bu dizinin kendisinden ölçülür (geleceğe bakmadan).
// Kedi Gözü puanının bileşenleri: teknik (en isabetli 5) + XU100 sıralaması + bilanço sürprizi + kurum revizyonları
function bilesenSatirlari(b) {
  if (!b) return "";
  const deger = (x) => (x === null || x === undefined ? '<span class="soluk">bilgi yok</span>'
    : `<b class="${yonSinifi(x)}">${x > 0 ? "+" : x < 0 ? "−" : ""}${sayi(Math.abs(x) * 100, 0)}</b>`);
  const dayanak = {
    teknik: () => "Aşağıdaki 5 göstergenin oy ortalaması",
    sira: (v) => (v.yuzdelik === undefined ? "XU100 sıralamasında yok (endeks ya da emtia)"
      : `100 hisse içinde yüzdelik ${sayi(v.yuzdelik, 0)}${v.izlenen_gore
        ? `; puana izlediğiniz hisselerin ortalamasına göre farkı girer (${v.deger > 0 ? "ortalamanın üstünde" : v.deger < 0 ? "ortalamanın altında" : "ortalamada"})` : ""} (bir önceki kapanışa kadar)`),
    bilanco: (v) => (v.donem ? `${kacis(v.donem)} bilançosu, ${kacis(tarihUzun(v.tarih))}: sürpriz ${v.sue < 0 ? "−" : ""}${sayi(Math.abs(v.sue), 2)}${v.deger === null || v.deger === undefined ? " (orta dilim ya da 60 gün geçti)" : v.deger > 0 ? " (yüksek dilim)" : " (düşük dilim)"}` : "Bilanço sürprizi yok"),
    revizyon: (v) => (v.yukselten || v.dusuren ? `Son 30 günde ${v.yukselten} kurum hedef yükseltti, ${v.dusuren} kurum düşürdü` : "Son 30 günde hedef değişikliği yok"),
    haber: (v) => (v.puan === undefined ? "Haber puanı yok"
      : `Haber puanı ${sayi(v.puan, 0)}/100 (${v.olay_sayisi} olay, ${kacis(tarihUzun(v.tarih))})${v.deger === null || v.deger === undefined ? " · 7 günden eski ya da nötr" : ""}${
        v.kalibrasyon_olay ? ` · geçmişte ${v.kalibrasyon_olay} olayda 5 gün sonraki yön isabeti ${oranMetni(v.kalibrasyon_isabet)}; geçmişi kısa (20 Ekim'den beri)` : ""}`),
  };
  return ["teknik", "sira", "bilanco", "revizyon", "haber"].filter((c) => b[c]).map((c) => `<tr>
      <td>${kacis(b[c].ad)}</td><td class="sag soluk">%${sayi(b[c].agirlik * 100, 0)}</td>
      <td class="sag">${deger(b[c].deger)}</td><td class="kucuk soluk">${dayanak[c](b[c])}</td></tr>`).join("");
}

function birlesikKiyasi(o, hv) {
  const fark = (x) => (x?.isabet === null || x?.isabet === undefined || x?.taban === null ? "–"
    : `${oranMetni(x.isabet)} <span class="soluk kucuk">(rastgele ${oranMetni(x.taban)})</span>`);
  const bar = (x) => (x?.fark === null || x?.fark === undefined ? "–" : `<span class="${yonSinifi(x.fark)}">${x.fark > 0 ? "+" : x.fark < 0 ? "−" : ""}${sayi(Math.abs(x.fark) * 100, 2)} puan</span>`);
  const satir = (ad, k, t) => `<tr><td>${ad}</td><td class="sag">${k}</td><td class="sag">${t}</td></tr>`;
  const tablo = (x, baslik) => `<div class="tablo-kutu"><table class="sik"><thead><tr><th>${baslik}</th><th class="sag">Kedi Gözü (birleşik)</th><th class="sag">Yalnız teknik</th></tr></thead><tbody>
      ${satir("Dönüşten kısa süre sonra doğru yön", fark(x.kedi), fark(x.teknik))}
      ${satir(`Dönüşten ${x.goreli_ufuk === 60 ? "60 mum" : "20 gün"} sonra XU100'e göre doğru yön`, fark(x.kedi_goreli), fark(x.teknik_goreli))}
      ${satir(`AL ve SAT barları arasında ${x.goreli_ufuk === 60 ? "60 mum" : "20 gün"} sonraki XU100'e göre getiri farkı`, bar(x.kedi_bar), bar(x.teknik_bar))}
    </tbody></table></div>`;
  return `${tablo(o, "Bu hissede")}${hv?.kedi?.n ? tablo(hv, "Bütün hisselerde birlikte") : ""}`;
}

function kediPuaniKarti(kd) {
  if (!kd) return `<div class="kart kedi-puani"><div class="baslik">Kedi Gözü puanı</div>
      <p class="soluk">Henüz hesaplanmadı: bir sonraki mum turunda (ya da <code>python -m isler.calistir kedi_puani</code>) dolar.</p></div>`;
  const o = kd.olcum || {}, d = kd.durustluk, hv = kd.havuz;
  const puan100 = kd.puan === null || kd.puan === undefined ? "–" : `${kd.puan > 0 ? "+" : kd.puan < 0 ? "−" : ""}${sayi(Math.abs(kd.puan) * 100, 0)}`;
  const ufuk = zd === "4h" ? `${o.ileri} mum (yaklaşık 2 gün)` : `${o.ileri} işlem günü`;
  const secilen = kd.secilenler.map((g) => `<tr data-eklenti="${kacis(g.gosterge)}" class="tik">
      <td>${kacis(g.ad)}</td><td>${oyRozeti(g.oy)}</td>
      <td class="sag">${oranMetni(g.isabet)} <span class="soluk kucuk">(${g.sinyal})</span></td>
      <td class="sag"><span class="durustluk-mini-kucuk ${puanSinifi(g.puan)}">${g.puan === null ? "–" : sayi(g.puan, 0)}</span></td></tr>`).join("");
  const kiyas = (x) => (x ? `${oranMetni(x.isabet)} isabet, puan <b>${x.puan === null ? "–" : sayi(x.puan, 0)}</b>` : "–");
  return `<div class="kart kedi-puani">
      <div class="ust-satir"><span class="baslik">Kedi Gözü puanı · ${ZD_ADLARI[zd]}</span>
        <span class="soluk kucuk">son bar ${kacis(tarihUzun(kd.zaman))}</span></div>
      <div class="kedi-ust">
        <div class="kedi-karar">
          <div class="buyuk">${rozet({ etiket: kd.etiket })}</div>
          <div class="kedi-sayi ${yonSinifi(kd.puan)}" title="Bileşenlerin ağırlıklı ortalaması × 100 (−100 hepsi SAT yönünde, +100 hepsi AL yönünde)">${puan100}</div>
          <div class="soluk kucuk">${kacis(tarihUzun(kd.baslangic))} tarihinden beri</div>
        </div>
        <div class="kedi-durustluk" title="Kedi Gözü puanının kendi geçmişinden: dönüşten sonra fiyat söylenen yöne gitti mi ve diplerde AL zamanında geldi mi, ikisi de rastgeleye göre">
          <div class="soluk kucuk">Bu puanın dürüstlüğü</div>
          <div class="durustluk-mini ${puanSinifi(d?.puan)}">${d?.puan === null || d?.puan === undefined ? "–" : sayi(d.puan, 0)}<span class="soluk kucuk">/100</span></div>
          <div class="kucuk">${kacis(d?.hukum || "Ölçülemedi")}</div>
          ${d ? `<div class="soluk kucuk">${d.yon_sinyal} sinyalin ${oranMetni(d.yon_isabet)} kadarı ${ufuk} içinde doğru yöne gitti; rastgele tahmin ${oranMetni(d.yon_taban)}</div>` : ""}
          ${d && d.dip_yakalama !== null && d.dip_yakalama !== undefined ? `<div class="soluk kucuk">${d.dip_sayisi} gerçek dibin ${oranMetni(d.dip_yakalama)} kadarında AL dipte ya da en geç 2 mum sonra geldi; rastgele zamanlama ${oranMetni(d.rastgele_dip)}. Puan ikisinden birlikte hesaplanır (yön 2, zaman 1 ağırlıklı).</div>` : ""}
        </div>
      </div>
      <div class="tablo-kutu"><table class="sik"><thead><tr><th>Bileşen</th><th class="sag">Ağırlık</th><th class="sag">Şimdi</th><th>Dayanak</th></tr></thead>
        <tbody>${bilesenSatirlari(kd.bilesenler)}</tbody></table></div>
      <p class="not">Puan bileşenlerin ağırlıklı ortalamasıdır; o an bilgisi olmayan bileşen (ör. bilanço sürprizi ya da hedef değişikliği yoksa)
        ağırlığa girmez. Ağırlıklar önceden sabitlendi, geçmişe göre ayarlanmadı. Her bileşen yalnızca o bardan önce yayımlanmış veriyi kullanır.
        +10'un üstü AL, +50'nin üstü GÜÇLÜ AL.</p>
      <div class="tablo-kutu"><table class="sik"><thead><tr><th>Seçilen 5 gösterge</th><th>Şimdi</th>
        <th class="sag" title="Seçim anına kadar AL/SAT dönüşlerinin yüzde kaçında fiyat ${ufuk} içinde söylenen yöne gitti (parantezde sinyal sayısı)">İsabet</th>
        <th class="sag" title="Seçim anındaki dürüstlük puanı: isabetin rastgeleden farkı ve sinyal sayısına göre (50 yazı-tura)">Puan</th></tr></thead>
        <tbody>${secilen || '<tr><td colspan="4" class="soluk">Bu ay kanıt gösteren gösterge yok: puan TUT.</td></tr>'}</tbody></table></div>
      <p class="not">Göstergeler ${kacis(tarihUzun(kd.secim_tarihi))} tarihinde yalnızca o güne kadarki sinyallerle seçildi ve her ay başında yeniden
        seçilir (her ay ortalama ${o.degisim === null || o.degisim === undefined ? "–" : "%" + sayi(o.degisim * 100, 0)} değişiyor). Ölçüt dürüstlük puanıyla
        aynı: AL'dan sonra yükseldi mi, SAT'tan sonra düştü mü, ve gerçek diplerde AL en geç 2 mum içinde geldi mi (yön 2, zaman
        1 ağırlıklı); ikisi de rastgeleye göre ve sinyal sayısı hesaba katılarak. Teknik bileşen bu 5
        göstergenin oy ortalamasıdır. Bir satıra tıklayınca gösterge grafikte açılır.</p>
      <details class="kedi-kiyas"><summary>Bu puan gerçekten işe yarıyor mu? (${kacis(tarihUzun(o.baslangic))} sonrası, ${o.ay} ay)</summary>
        <p><b>Fiyat dışı bileşenler işe yarıyor mu?</b> Aynı dönemde birleşik puan ile yalnız teknik puan:</p>
        ${birlesikKiyasi(o, hv)}
        <p class="not">Bütün hisselerde birlikte birleşik puan, teknik puanı altı ölçünün beşinde geçti; farklar küçük. İyileşme
          çoğunlukla bilanço sürprizi ve kurum revizyonlarından geliyor. Bu bileşenler aynı yıllardaki ölçümlerimizde işe yaradığı için
          seçildi; ağırlıklar sabit olsa da bu yüzden sonuç biraz iyimser olabilir.</p>
        <p><b>Teknik bileşenin seçimi:</b></p>
        <ul class="kisa-liste">
          <li><b>Seçilen 5 gösterge (teknik):</b> ${kiyas(o.teknik || o.kedi)} (rastgele ${oranMetni((o.teknik || o.kedi)?.taban)}).</li>
          <li><b>70 göstergenin ortalaması</b> (seçim yapılmasaydı): ${kiyas(o.hepsi)}.</li>
          <li><b>Geriye bakarak seçilseydi</b> (bugünün en iyi 5'i: ${(o.geriye_secilen || []).map(kacis).join(", ")}): ${kiyas(o.geriye_bakarak)}.
            Bu gerçekte elde edilemez: sonradan bakınca en iyi görünen göstergeyi önceden bilemezsin.</li>
          ${hv?.teknik?.n ? `<li><b>Bütün hisselerde birlikte:</b> seçilen 5 gösterge ${hv.teknik.n} sinyalde ${oranMetni(hv.teknik.isabet)} (rastgele ${oranMetni(hv.teknik.taban)});
            70 göstergenin ortalaması ${oranMetni(hv.hepsi?.isabet)}; geriye bakarak seçim ${oranMetni(hv.geriye_bakarak?.isabet)} görünürdü.</li>` : ""}
        </ul>
        <p class="not">Geriye bakarak seçilen 5'in yüksek görünmesi, aşağıdaki "en isabetli 5" listelerinin neden iyimser olduğunu gösterir:
          bir hissede geçmişte en iyi çıkan gösterge sonraki aylarda çoğunlukla ortalamaya döner. Kedi Gözü puanının dürüstlüğü bu yüzden
          daha düşük ama gerçekçidir. Barlar örtüştüğü için getiri farkının güvenilirliği tablodaki sayılardan azdır. Komisyon ve vergi dahil değildir.</p>
      </details>
    </div>`;
}

// Bu serideki göstergelerin ortalamalarıyla "doğruluk neden düşük?" açıklaması
function dogrulukAciklamasi(karne) {
  const e = karne.filter((r) => !r.referans && r.dogruluk !== null);
  if (!e.length) return "";
  const ort = (alan) => { const x = e.map((r) => r[alan]).filter((v) => v !== null && v !== undefined); return x.length ? x.reduce((a, b) => a + b, 0) / x.length : null; };
  const ortanca = (alan) => { const x = e.map((r) => r[alan]).filter((v) => v !== null && v !== undefined).sort((a, b) => a - b); return x.length ? x[Math.floor(x.length / 2)] : null; };
  const gecen = e.filter((r) => r.ort_getiri !== null && r.rastgele_ort_getiri !== null && r.ort_getiri > r.rastgele_ort_getiri).length;
  return `<div class="kart secim-testi">
      <div class="baslik">Doğruluk neden düşük?</div>
      <p>Bu hissede ${e.length} göstergenin ortalama doğruluğu <b>${oranMetni(ort("dogruluk"))}</b>. Aynı sıklıkta ama rastgele zamanda verilen
        sinyal <b>${oranMetni(ort("rastgele_dogruluk"))}</b> doğru çıkardı. Göstergeler yazı-turadan bile daha az "doğru", çünkü
        çoğu trend göstergesi: fiyat yükseldikten <i>sonra</i> AL'a döner, geri düştükten <i>sonra</i> çıkar. Yatay piyasada bu her
        seferinde küçük bir zarardır; kazanç az sayıdaki büyük trendden gelir.</p>
      <p>Önemli olan kazanç: kazanan sinyal ortalama <b class="arti">${yuzdeMetni(ort("kazanan_ort"))}</b>, kaybeden
        <b class="eksi">${yuzdeMetni(ort("kaybeden_ort"))}</b>; kâr/zarar oranı (ortanca) <b>${ortanca("kar_zarar") === null ? "–" : sayi(ortanca("kar_zarar"), 2)}</b>.
        Sinyal başına kazançta rastgeleyi geçen gösterge: <b class="${gecen * 2 > e.length ? "arti" : "eksi"}">${gecen} / ${e.length}</b>
        ${gecen * 2 > e.length ? "— düşük doğruluğa rağmen küçük bir avantaj var." : "— bu hissede ve zaman diliminde göstergelerin belirgin bir avantajı yok."}</p>
      <p>Dönüş göstergeleri (Williams %R, KDJ, ivme dönüşü, TD Sequential, Bollinger dönüşü…) tam tersidir: dibe yakın ve daha
        sık doğru sinyal verirler, ama küçük kazanıp ara sıra büyük kaybedebilirler. Yukarıdaki "Doğruluğa göre" ve
        "Erken yakalamaya göre" düğmeleri onları öne çıkarır; kâr/zarar oranına birlikte bak.</p>
      <p class="soluk kucuk">Enflasyon etkisi de ölçüldü: SAT'ı "mevduatta beklemekten iyi miydi" diye ölçünce ortalama doğruluk
        ${oranMetni(ort("mevduat_dogruluk"))} (SAT'lar iyileşir, AL'lar mevduatı geçemediği için düşer). Piyasa rejimi, hissenin kendi
        trendi ve günlük teyit filtreleri de denendi; tutarlı bir iyileşme vermediler. İki dönemde de küçük ama tutarlı katkı veren
        hacim onayı ve (günlükte) genişliktir; bunlar aşağıda bu hisse için ayrıca ölçülüyor. Geçmişe göre parametre ayarlayıp yüksek
        doğruluk göstermek mümkün ama ileride tutmaz.</p>
    </div>`;
}

// AL filtreleri (karne.py: hacim onayı ve genişlik). Etiket yalnızca bilgi; kararı değiştirmez.
const HACIM_KAT = 1.2, GENIS_ESIK = 0.6;
const hacimRozeti = (g) => (g.son_sinyal === 1 && g.hacimli_al === 1
  ? ' <span class="rozet hacimli" title="Bu AL, hacmin önceki 20 bar ortalamasının 1,2 katını aştığı barda başladı">hacimli</span>' : "");

function filtreKarti(k) {
  const gen = k.genislik, kat = k.son_hacim_kat;
  const genis = gen !== null && gen !== undefined && gen >= GENIS_ESIK;
  const hacimli = kat !== null && kat !== undefined && kat > HACIM_KAT;
  return `<div class="kart"><div class="baslik">AL filtreleri</div>
      <div class="filtre-rozetleri">
        <span class="rozet ${genis ? "al" : "tut"}" title="Göstergelerin en az %60'ı AL derken geniş AL sayılır">${genis ? "Geniş AL" : "Geniş AL değil"} · %${gen === null || gen === undefined ? "–" : sayi(gen * 100, 0)}</span>
        <span class="rozet ${hacimli ? "al" : "tut"}" title="Son barın hacmi / önceki 20 barın ortalaması; 1,2'nin üstü hacim onaylı">${hacimli ? "Hacim onaylı" : "Hacim onaysız"} · ${kat === null || kat === undefined ? "–" : sayi(kat, 2) + "×"}</span>
      </div>
      <p class="not">Şu an AL diyen ${k.al} göstergenin <b>${k.hacimli_al_sayisi ?? 0}</b> tanesi hacim onaylı bir barda AL'a döndü
        (karnede "hacimli" işaretli). Bu filtrelerin bu hissede işe yarayıp yaramadığı aşağıda ölçüldü.</p></div>`;
}

function filtreTestiMetni(f) {
  if (!f || !f.tum) return "";
  const satir = (ad, x, ipucu) => `<tr title="${ipucu}"><td>${ad}</td>
      <td class="sag">${x.n}</td><td class="sag"><b>${oranMetni(x.isabet)}</b></td><td class="sag ${yonSinifi(x.ort)}">${yuzdeMetni(x.ort, 2)}</td>
      <td class="sag">${x.son6.n}</td><td class="sag"><b>${oranMetni(x.son6.isabet)}</b></td><td class="sag ${yonSinifi(x.son6.ort)}">${yuzdeMetni(x.son6.ort, 2)}</td></tr>`;
  const fark = (a) => (a.isabet === null || f.tum.isabet === null ? null : a.isabet - f.tum.isabet);
  const yorum = (ad, a) => {
    const d = fark(a), d6 = a.son6.isabet === null || f.tum.son6.isabet === null ? null : a.son6.isabet - f.tum.son6.isabet;
    if (d === null || a.n < 30) return `${ad}: yeterli örnek yok.`;
    const isaret = (x) => (x === null || Math.abs(x) < 0.01 ? 0 : Math.sign(x));   // 1 puandan küçük fark yok sayılır
    const s = isaret(d), s6 = a.son6.n >= 15 ? isaret(d6) : null;
    const karar = s6 === null ? (s > 0 ? "işe yarar görünüyor (son 6 ayda yeterli örnek yok)" : s < 0 ? "işe yaramıyor görünüyor (son 6 ayda yeterli örnek yok)" : "fark yok")
      : s >= 0 && s6 >= 0 && s + s6 > 0 ? '<b class="arti">bu hissede işe yarıyor</b>'
        : s <= 0 && s6 <= 0 && s + s6 < 0 ? '<b class="eksi">bu hissede işe yaramıyor</b>'
          : s === 0 && s6 === 0 ? "fark yok" : "tutarsız (iki dönem ters yönde)";
    return `${ad}: isabet ${d >= 0 ? "+" : ""}${sayi(d * 100, 1)} puan${d6 === null ? "" : `, son 6 ayda ${d6 >= 0 ? "+" : ""}${sayi(d6 * 100, 1)} puan`} — ${karar}.`;
  };
  return `<div class="kart secim-testi">
      <div class="baslik">Hacim ve genişlik filtresi bu hissede işe yarıyor mu?</div>
      <p>Bütün göstergelerin AL'a döndüğü barlar: ${f.ufuk} bar sonra fiyat daha yüksek miydi? Taban, rastgele bir bardır.</p>
      <div class="tablo-kutu"><table class="sik"><thead><tr><th>AL'lar</th><th class="sag">Sayı</th><th class="sag">İsabet</th><th class="sag">Ort. getiri</th>
        <th class="sag">Son 6 ay</th><th class="sag">İsabet</th><th class="sag">Ort. getiri</th></tr></thead><tbody>
        ${satir("Rastgele bar (taban)", f.taban, "Herhangi bir barda aynı süre sonra fiyat yüksek miydi")}
        ${satir("Bütün AL'lar", f.tum, "Filtresiz")}
        ${satir("Hacim onaylı", f.hacimli, "AL barının hacmi önceki 20 bar ortalamasının 1,2 katından fazla")}
        ${satir("Geniş AL", f.genis, "AL anında göstergelerin en az %60'ı AL")}
        ${satir("İkisi birden", f.ikisi, "Hacim onaylı ve geniş")}
      </tbody></table></div>
      <p>${yorum("Hacim onayı", f.hacimli)}<br>${yorum("Genişlik", f.genis)}</p>
      <p class="not">Bütün hisselerde toplam (29 Ekim): hacim onayı isabeti 4 saatlikte +1,7, günlükte +1,8 puan artırdı; son 6 ayda da tuttu.
        Genişlik yalnızca günlükte işe yaradı. Etiketler bilgi içindir, konseyin kararını değiştirmez.</p>
    </div>`;
}

function secimTestiMetni(s, adlar) {
  if (!s || !s.secilen?.length) return "";
  const fark = s.secilen_ort !== null && s.hepsi_ort !== null ? s.secilen_ort - s.hepsi_ort : null;
  const sonuc = fark === null ? "" : fark > 0.002
    ? '<b class="arti">Seçim işe yaradı:</b> geçmişin en iyileri sonraki dönemde de ortalamanın üstünde kaldı.'
    : fark < -0.002
      ? '<b class="eksi">Seçim tutmadı:</b> geçmişin en iyileri sonraki dönemde ortalamanın altında kaldı.'
      : '<b>Fark yok:</b> geçmişin en iyileri sonraki dönemde ortalamayla aynı sonucu verdi.';
  return `<div class="kart secim-testi">
      <div class="baslik">Kendini tartma: geçmişte en iyi olan sonra da iyi mi?</div>
      <p>${kacis(s.kesim)} tarihine kadarki verilerle seçilen en iyi 5 (${s.secilen.map((a) => kacis(adlar[a] || a)).join(", ")})
        sonraki 6 ayda <b>${s.secilen_sinyal}</b> sinyalde <b>${oranMetni(s.secilen_dogruluk)}</b> doğru,
        sinyal başına <b class="${yonSinifi(s.secilen_ort)}">${yuzdeMetni(s.secilen_ort, 2)}</b>.
        Aynı dönemde bütün göstergeler: ${s.hepsi_sinyal} sinyal, ${oranMetni(s.hepsi_dogruluk)} doğru,
        sinyal başına <span class="${yonSinifi(s.hepsi_ort)}">${yuzdeMetni(s.hepsi_ort, 2)}</span>.</p>
      <p>${sonuc}</p>
    </div>`;
}

function karneTablosu(satirlar) {
  const { alan, artan } = karneSirasi;
  const deger = (r) => (r[alan] === null || r[alan] === undefined ? (artan ? Infinity : -Infinity) : r[alan]);
  const sirali = [...satirlar].sort((a, b) => {
    if (a.referans !== b.referans) return b.referans - a.referans;
    const x = deger(a), y = deger(b);
    if (typeof x === "string" || typeof y === "string") return artan ? String(x).localeCompare(String(y), "tr") : String(y).localeCompare(String(x), "tr");
    return artan ? x - y : y - x;
  });
  const th = (a, metin, ipucu = "", sag = true) =>
    `<th class="${sag ? "sag " : ""}siralanir${alan === a ? " secili" : ""}" data-alan="${a}" title="${ipucu}">${metin}${alan === a ? (artan ? " ▲" : " ▼") : ""}</th>`;
  return `<div class="tablo-kutu"><table class="sik karne">
    <thead><tr>${th("sira", "#")}${th("ad", "Gösterge", "", false)}${th("katman", "Tür", "", false)}${th("son_sinyal", "Şimdi", "", false)}
      ${th("son_degisim", "Başlangıç", "Şimdiki sinyalin başladığı bar", false)}${th("donem_getiri", "Bu dönem", "Şimdiki sinyal başladığından beri sinyal yönündeki getiri")}
      ${th("sinyal_sayisi", "Sinyal", "Kapanmış AL ve SAT dönemleri")}${th("dogruluk", "Doğruluk", "Dönemlerin yüzde kaçında fiyat sinyal yönünde gitti")}
      ${th("rastgele_dogruluk", "Rastgele", "Aynı sıklıkta, rastgele zamanlanmış sinyalin doğruluğu (20 deneme ortalaması)")}
      ${th("mevduat_dogruluk", "Mevduata göre", "AL dönemi mevduatı geçti mi, SAT dönemi mevduatın gerisinde mi kaldı")}
      ${th("al_dogruluk", "AL doğr.")}${th("sat_dogruluk", "SAT doğr.")}
      ${th("ort_getiri", "Sinyal başına", "Dönem başına sinyal yönündeki ortalama getiri; altında rastgele sinyalinki")}
      ${th("kar_zarar", "Kâr/zarar", "Kazançlar toplamı / kayıplar toplamı; 1'in üstü kârlı. Altında kazanan / kaybeden ortalaması")}
      ${th("skor", "Skor", "Ortalama getiri / standart hata; sıralama buna göre")}
      ${th("kisa_dogruluk", "Kısa vade", "Sinyalden 6 bar (4 saatlik) ya da 5 gün (günlük) sonra doğru yönde mi")}
      ${th("goreli_dogruluk", "XU100'e göre", "AL/SAT dönemlerinin yüzde kaçında hisse XU100'e göre doğru yönde gitti (piyasanın genel yönü ayrılmış)")}
      ${th("bariyer_isabet", "Bariyer", "Sinyalden sonra fiyat önce 2 ATR kâr seviyesine mi zarar seviyesine mi dokundu (4 saatlikte 30, günlükte 20 bar içinde); altında rastgele bar")}
      ${th("hacimli_al_isabet", "Hacimli AL", "Hacim onaylı barda başlayan AL'ların kısa vade isabeti (parantezde sayısı); altında bütün AL'larınki")}
      ${th("dip_yakalama", "Dipte yakalama", "Gerçek diplerin yüzde kaçında dipte ya da en geç 2 bar sonra AL verdi; altında rastgele zamanlama")}
      ${th("dip_gecikme", "Gecikme", "Dipten ilk AL'a bar sayısı (ortanca); eksi: dipten önce")}
      ${th("kacirilan_yukselis", "Kaçan yükseliş", "AL geldiğinde dipten tepeye yükselişin çoktan olmuş kısmı (ortanca); hiç AL gelmediyse %100")}
      ${th("kural_getiri", "Kural / al-tut", "AL'da tut, diğer sinyallerde nakit kuralının toplam getirisi; yanında aynı dönemde al-tut")}</tr></thead>
    <tbody>${sirali.map((r) => `<tr class="${r.referans ? "referans" : "tik"}" ${r.referans ? "" : `data-eklenti="${kacis(r.gosterge)}"`} title="${kacis(r.aciklama || "")}${r.kaynak ? "\nKaynak: " + kacis(r.kaynak) : ""}">
        <td class="sag">${r.referans ? "–" : r.sira ?? "–"}</td>
        <td>${kacis(r.ad)}${r.sira !== null && r.sira <= 5 ? ' <span class="rozet en-iyi">en iyi 5</span>' : ""}</td>
        <td class="soluk">${KATMAN_ADLARI[r.katman] || r.katman || ""}</td>
        <td>${oyRozeti(r.son_sinyal)}${hacimRozeti(r)}</td>
        <td class="soluk">${kacis(tarihUzun(r.son_degisim))}</td>
        <td class="sag ${yonSinifi(r.donem_getiri)}">${yuzdeMetni(r.donem_getiri)}</td>
        <td class="sag">${r.sinyal_sayisi ?? "–"}</td>
        <td class="sag"><b>${oranMetni(r.dogruluk)}</b></td>
        <td class="sag soluk">${oranMetni(r.rastgele_dogruluk)}</td>
        <td class="sag">${oranMetni(r.mevduat_dogruluk)}</td>
        <td class="sag">${oranMetni(r.al_dogruluk)}</td><td class="sag">${oranMetni(r.sat_dogruluk)}</td>
        <td class="sag"><span class="${yonSinifi(r.ort_getiri)}">${yuzdeMetni(r.ort_getiri, 2)}</span>
          <div class="kucuk soluk">rastgele ${yuzdeMetni(r.rastgele_ort_getiri, 2)}</div>
          <div class="kucuk soluk" title="Her sinyal bir alış ve bir satış: işlem maliyeti (%0,2) düşülmüş">net ${yuzdeMetni(r.net_ort_getiri, 2)}</div></td>
        <td class="sag">${r.kar_zarar === null || r.kar_zarar === undefined ? "–" : sayi(r.kar_zarar, 2)}
          <div class="kucuk soluk"><span class="arti">${yuzdeMetni(r.kazanan_ort)}</span> / <span class="eksi">${yuzdeMetni(r.kaybeden_ort)}</span></div></td>
        <td class="sag">${r.skor === null ? "–" : sayi(r.skor, 2)}</td>
        <td class="sag">${oranMetni(r.kisa_dogruluk)}</td>
        <td class="sag">${oranMetni(r.goreli_dogruluk)}</td>
        <td class="sag">${oranMetni(r.bariyer_isabet)}<div class="kucuk soluk">rastgele ${oranMetni(r.rastgele_bariyer)}</div></td>
        <td class="sag">${oranMetni(r.hacimli_al_isabet)} <span class="soluk kucuk">(${r.hacimli_al_sayisi ?? 0})</span>
          <div class="kucuk soluk">tüm AL ${oranMetni(r.al_kisa_isabet)}</div></td>
        <td class="sag">${oranMetni(r.dip_yakalama)}<div class="kucuk soluk">rastgele ${oranMetni(r.rastgele_dip_yakalama)}</div></td>
        <td class="sag">${r.dip_gecikme === null || r.dip_gecikme === undefined ? "–" : `${r.dip_gecikme > 0 ? "+" : ""}${sayi(r.dip_gecikme, 0)}`}</td>
        <td class="sag">${oranMetni(r.kacirilan_yukselis)}</td>
        <td class="sag"><span class="${yonSinifi(r.kural_getiri)}">${yuzdeMetni(r.kural_getiri, 0)}</span> <span class="soluk">/ ${yuzdeMetni(r.al_tut, 0)}</span></td>
      </tr>`).join("")}</tbody></table></div>`;
}

function konseyCiz() {
  const kutu = document.getElementById("konsey");
  const v = konseyVerisi;
  document.getElementById("konsey-baslik").textContent = `Gösterge konseyi (${v?.karne ? v.karne.filter((r) => !r.referans).length + " gösterge, " : ""}${ZD_ADLARI[zd]})`;
  if (!v?.konsey) {
    kutu.innerHTML = '<p class="soluk">Henüz hesaplanmadı: bir sonraki mum turunda (ya da <code>python -m isler.calistir uyarlanmis</code>) dolar.</p>';
    return;
  }
  const k = v.konsey;
  const adlar = Object.fromEntries(v.karne.map((r) => [r.gosterge, r.ad]));
  const enIyi = enIyiListesi(v);
  const say = (s) => enIyi.filter((g) => g.son_sinyal === s).length;
  const referanslar = v.karne.filter((r) => r.referans);
  const olcut = OLCUT_ADLARI[enIyiOlcut];
  kutu.innerHTML = `
    ${kediPuaniKarti(v.kedi)}
    <div class="konsey-ust" style="margin-top:12px">
      <div class="kart"><div class="baslik">Şu an ${k.al + k.sat + k.tut} göstergenin oyu</div>${oyCubugu(k)}
        <p class="not">Son bar: ${kacis(tarihUzun(k.zaman))}. Referans: ${referanslar.map((r) => `${kacis(r.ad)} ${oyRozeti(r.son_sinyal)}`).join(" · ")}</p></div>
      ${filtreKarti(k)}
    </div>
    <div class="bolum-baslik" style="margin-top:22px">
      <h3 style="margin:0">${olcut.baslik}</h3>
      <div class="arac-cubugu" style="margin:0">${Object.entries(OLCUT_ADLARI).map(([a, o]) =>
        `<button data-olcut="${a}" class="${a === enIyiOlcut ? "secili" : ""}">${o.dugme}</button>`).join("")}</div>
    </div>
    <p class="not" style="margin-top:4px">${olcut.not} Bu liste bütün geçmişe bakılarak hazırlanır, bu yüzden iyimserdir;
      Kedi Gözü puanı ise göstergeleri her ay yalnızca o güne kadarki sonuçlarla seçer.</p>
    <div class="oy-sayilari" style="margin-bottom:8px">Bu 5'in şimdiki oyu: <span class="arti">${say(1)} AL</span> · <span class="soluk">${say(0)} TUT</span> · <span class="eksi">${say(-1)} SAT</span></div>
    <p class="kucuk">${k.anlamli_sayisi === null || k.anlamli_sayisi === undefined ? "" : k.anlamli_sayisi > 0
      ? `Çoklu test düzeltmesinden sonra ${v.karne.filter((r) => !r.referans).length} göstergenin <b>${k.anlamli_sayisi}</b> tanesinin kazancı şans eseri olmaktan ayrılabiliyor (aşağıda "anlamlı" işaretli).`
      : `Çoklu test düzeltmesinden sonra ${v.karne.filter((r) => !r.referans).length} göstergenin <b>hiçbiri</b> şans eseri olmaktan ayrılamıyor: bu kadar gösterge arasından birkaçının iyi görünmesi tek başına kanıt değil.`}</p>
    <div class="konsey-en-iyi">${enIyi.map((g, i) => enIyiKarti(g, i + 1)).join("") || '<p class="soluk">Yeterli sinyali olan gösterge yok.</p>'}</div>
    ${dogrulukAciklamasi(v.karne)}
    ${secimTestiMetni(k.secim_testi, adlar)}
    ${filtreTestiMetni(k.filtre_testi)}
    <h3>Bütün göstergelerin karnesi</h3>
    ${karneTablosu(v.karne)}
    <p class="not">Sinyal dönemi: göstergenin AL'a (ya da SAT'a) döndüğü bardan başka bir değere geçtiği bara kadar. Doğruluk: kapanmış
      dönemlerin yüzde kaçında fiyat sinyal yönünde gitti. Sıralama "skor"a göredir (sinyal başına getiri / belirsizliği), böylece
      az sinyalle şans eseri iyi görünen gösterge öne çıkmaz; 15'ten az kapanmış sinyali olan gösterge sıralamaya girmez. Trend göstergelerinde doğruluğun %30–40 olması normaldir: çok sayıda
      küçük yanlış sinyale karşılık az sayıda büyük doğru sinyal verirler. Bir satıra tıklayınca gösterge grafikte alt panelde açılır.
      Komisyon ve vergi dahil değildir; geçmişteki başarı gelecek için güvence değildir.</p>`;
}

async function konseyYukle() {
  try {
    konseyVerisi = await getir(`/api/konsey/${encodeURIComponent(kod)}?zd=${zd}`);
  } catch (e) {
    document.getElementById("konsey").innerHTML = `<p class="eksi">Konsey alınamadı: ${kacis(e.message)}</p>`;
    return;
  }
  konseyCiz();
}

document.getElementById("konsey").addEventListener("click", (e) => {
  const olcut = e.target.closest("button[data-olcut]");
  if (olcut) {
    enIyiOlcut = olcut.dataset.olcut;
    konseyCiz();
    return;
  }
  const th = e.target.closest("th[data-alan]");
  if (th) {
    const a = th.dataset.alan;
    karneSirasi = karneSirasi.alan === a ? { alan: a, artan: !karneSirasi.artan } : { alan: a, artan: ["sira", "ad", "katman", "son_degisim"].includes(a) };
    konseyCiz();
    return;
  }
  const satir = e.target.closest("[data-eklenti]");
  if (!satir) return;
  const secim = document.getElementById("alt-panel");
  const deger = `eklenti:${satir.dataset.eklenti}`;
  if (![...secim.options].some((o) => o.value === deger)) return;
  secim.value = deger;
  secim.dispatchEvent(new Event("change"));
  sekmeAc("grafik", true);             // gösterge grafikte alt panelde açılır
  window.scrollTo({ top: 0, behavior: "smooth" });
});
