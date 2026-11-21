// Telefon kopyası (GitHub Pages, isler/yayin.py): şifreli paketleri tarayıcıda çözer; ortak.js'teki getir() buradan okur.
// Yalnızca kopyada yüklenir (yayin-bilgi.js'ten sonra). Şifre bir kez sorulur; türetilen anahtar bu cihazda saklanır.

(() => {
  const B = window.KEDI_YAYIN;
  if (!B) return;
  const ANAHTAR = "kedigozu.yayin.anahtar";
  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const paketler = {};
  let anaSoz = null;

  document.documentElement.classList.add("statik");

  async function indir(dosya) {
    const r = await fetch(`${dosya}?v=${B.surum}`, { cache: "no-cache" });
    if (!r.ok) throw new Error(`${dosya}: ${r.status}`);
    return new Uint8Array(await r.arrayBuffer());
  }

  async function coz(veri, anahtar) {
    const acik = await crypto.subtle.decrypt({ name: "AES-GCM", iv: veri.slice(0, 12) }, anahtar, veri.slice(12));
    const akis = new Blob([acik]).stream().pipeThrough(new DecompressionStream("gzip"));
    return JSON.parse(await new Response(akis).text());
  }

  async function turet(sifre) {
    const ham = await crypto.subtle.importKey("raw", new TextEncoder().encode(sifre), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64(B.tuz), iterations: B.tur, hash: "SHA-256" },
      ham, { name: "AES-GCM", length: 256 }, true, ["decrypt"]);
  }

  function sakla(anahtar) {
    crypto.subtle.exportKey("raw", anahtar).then((ham) => {
      try { localStorage.setItem(ANAHTAR, btoa(String.fromCharCode(...new Uint8Array(ham)))); } catch { /* gizli sekme */ }
    });
  }

  async function saklanan() {
    let s = null;
    try { s = localStorage.getItem(ANAHTAR); } catch { /* gizli sekme */ }
    return s ? crypto.subtle.importKey("raw", b64(s), "AES-GCM", true, ["decrypt"]) : null;
  }

  // Giriş yap: e-posta tanımlıysa (yayin-bilgi.js → eposta) e-posta + şifre, değilse yalnız şifre. Anahtar
  // isler/yayin.giris_metni ile aynı metinden türetilir: küçük harfli e-posta + satır sonu + şifre.
  function girisSor(hata) {
    return new Promise((tamam) => {
      const k = document.createElement("div");
      k.className = "yayin-perde";
      k.innerHTML = `<form class="yayin-kutu" autocomplete="on">
          <img src="logo-64.png" alt="" width="48" height="48">
          <h2>Giriş yap</h2>
          <p class="soluk kucuk">Kedi Gözü telefon kopyası. ${B.eposta ? "E-posta adresin ve şifrenle gir." : "Bilgisayarındaki sistemde belirlediğin şifreyi gir."}</p>
          ${B.eposta ? '<input type="email" name="eposta" placeholder="E-posta" autocomplete="username" required>' : ""}
          <input type="password" name="sifre" placeholder="Şifre" autocomplete="current-password" required>
          ${hata ? `<p class="eksi kucuk">${hata}</p>` : ""}
          <button type="submit">Giriş yap</button>
        </form>`;
      document.body.appendChild(k);
      const form = k.querySelector("form");
      form.querySelector("input").focus();
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const eposta = form.eposta ? form.eposta.value.trim().toLowerCase() : "";
        const sifre = form.sifre.value;
        k.remove();
        tamam(eposta ? `${eposta}\n${sifre}` : sifre);
      });
    });
  }

  async function anaYukle() {
    const veri = await indir("p/ana.bin");
    let anahtar = await saklanan();
    if (anahtar) {
      try { return { anahtar, ana: await coz(veri, anahtar) }; } catch { /* şifre değişmiş: yeniden sor */ }
    }
    let hata = "";
    for (;;) {
      if (document.readyState === "loading") await new Promise((r) => document.addEventListener("DOMContentLoaded", r, { once: true }));
      const giris = await girisSor(hata);
      const bekle = seritYaz("Giriş yapılıyor…");
      anahtar = await turet(giris);
      try {
        const ana = await coz(veri, anahtar);
        sakla(anahtar);
        bekle?.remove();
        return { anahtar, ana };
      } catch {
        bekle?.remove();
        hata = B.eposta ? "E-posta ya da şifre yanlış." : "Şifre yanlış.";
      }
    }
  }

  function seritYaz(metin) {
    if (!document.body) return null;
    const s = document.createElement("div");
    s.className = "yayin-serit";
    s.textContent = metin;
    document.body.prepend(s);
    return s;
  }

  function zamanYazisi(t) {
    return `${t.slice(8, 10)}.${t.slice(5, 7)}.${t.slice(0, 4)} ${t.slice(11, 16)}`;
  }

  window.kediYayin = {
    zaman: B.zaman,
    async getir(url) {
      anaSoz ??= anaYukle();
      const { anahtar, ana } = await anaSoz;
      const dosya = ana._adresler?.[url];
      if (!dosya) throw new Error("Bu bölüm telefon kopyasında yok; bilgisayardaki sitede açılır.");
      if (dosya === "p/ana.bin") return ana[url];
      paketler[dosya] ??= indir(dosya).then((v) => coz(v, anahtar));
      const p = await paketler[dosya];
      if (!(url in p)) throw new Error("Bu bölüm telefon kopyasında yok.");
      return p[url];
    },
    cikis() {
      try { localStorage.removeItem(ANAHTAR); } catch { /* yok */ }
      location.reload();
    },
  };

  document.addEventListener("DOMContentLoaded", () => {
    const yas = (Date.now() - Date.parse(B.zaman)) / 3.6e6;
    const s = seritYaz("");
    s.innerHTML = `Telefon kopyası · son güncelleme <b>${zamanYazisi(B.zaman)}</b>${yas > 24 ? ` <span class="eksi">(${Math.floor(yas / 24)} gün önce)</span>` : ""}
      · bilgisayar açıkken güncellenir`;
    // Üst menünün sağında: giriş yapılmışsa "Çıkış yap" (bu cihazdaki anahtarı siler, giriş ekranı yeniden gelir)
    const ust = document.querySelector("header.ust");
    if (ust) {
      const d = document.createElement("button");
      d.type = "button";
      d.className = "yayin-giris";
      d.textContent = "Çıkış yap";
      d.title = "Bu cihazda kayıtlı girişi sil";
      d.addEventListener("click", () => window.kediYayin.cikis());
      ust.appendChild(d);
    }
  });
})();
