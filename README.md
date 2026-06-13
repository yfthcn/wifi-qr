# wifi-qr

**Sıfır DIŞ/CDN bağımlılığı**, tek dosya, çevrimdışı WiFi QR kod üreticisi. Üretim QR motoru, dosyaya **inline gömülü** Nayuki kütüphanesidir (MIT) — CDN yok, ağ isteği yok, her şey tek `index.html` içinde. Ayrıca ISO/IEC 18004'e göre sıfırdan saf JavaScript ile yazılmış, CI'da referansa karşı **bit-identical** doğrulanan bir reference reimplementation (`qr.js`) bulunur.

A single-file, offline WiFi QR code generator with **zero external/CDN dependencies** — everything ships inside one `index.html`. The production QR engine is the Nayuki library (MIT), inlined into the file (no CDN, no network). It also ships a from-scratch reference reimplementation (`qr.js`), written per ISO/IEC 18004 and verified **bit-identical** against a reference encoder in CI.

---

## Neden / Why

Çoğu çevrimiçi WiFi QR üreticisi kodu sunucu tarafında üretir; yani SSID ve şifren internete gider. Bu araç her şeyi tarayıcında yapar ve hiçbir ağ isteği yapamayacak şekilde kilitlenmiştir (bkz. Güvenlik). Şifren cihazından çıkmaz.

Most online WiFi QR generators render server-side, which means your SSID and password travel over the internet. This tool does everything in your browser and is locked down so it *cannot* make any network request (see Security). Your password never leaves your device.

## Özellikler / Features

- **Sıfır dış/CDN bağımlılığı** — tek `index.html`, dış `<script src>` yok, internet gerekmez. Çift tıkla aç.
- **Üretim QR motoru** — vendor Nayuki qrcodegen (inline): **40 versiyon**, tüm modlar, otomatik versiyon, mask=auto, **boost kapalı → seçilen ECC (L/M/Q/H) birebir uygulanır**.
- **Ayrıca kendi sıfırdan reference reimplementation'ı** (`qr.js`) — byte modu, versiyon 1–40, GF(256) Reed-Solomon, 8 maske penaltı puanlaması; üretimde kullanılmaz, doğruluk testlerinin temeli.
- **UTF-8** — Türkçe SSID/şifreler dahil tam Unicode.
- PNG ve **SVG** (vektörel, baskıya uygun) indirme, yazdırma, metni kopyalama.
- Doğru WiFi URI kaçışlaması (`\ ; , : "`).

## Kullanım / Usage

```
index.html dosyasını herhangi bir tarayıcıda aç. Sunucu, kurulum, internet gerekmez.
Open index.html in any browser. No server, no install, no internet.
```

SSID ve şifreyi gir; QR anında oluşur. Telefon kamerasıyla tarat.

## Doğruluk doğrulaması / Correctness verification

Bu projenin ayırt edici yanı: sıfırdan yazılan reference reimplementation'ın (`qr.js`) doğruluğu **kanıtlanmıştır ve CI ile sürekli denetlenir.** (Doğrulanan motor `qr.js`'tir; üretimdeki Nayuki motoru ondan bağımsızdır — bkz. aşağıdaki not.)

- **Yapısal (sert kapı):** `qr.js`, 40 versiyon × 4 ECC = **160 konfigürasyonun tamamında**, ISO-doğrulanmış referans kodlayıcının (Python `qrcode`) aynı parametrelerle (sabit versiyon + maske) ürettiği matrisle **bit-identical** (diff = 0). Tek bir modül farkı bile CI'yı kırar.
- **İşlevsel (yumuşak):** `qr.js`'in otomatik-maske çıktısı OpenCV QR dedektörüyle çözülüp geri okunur (v1–25 aralığında; OpenCV dedektörü daha yüksek versiyonlarda güvenilmezdir, kodlayıcı değil).

Her `git push`'ta `.github/workflows/ci.yml` bu testleri çalıştırır:

```bash
python test/gen_specs.py   # v1-40 x L/M/Q/H test girdileri
node   test/run.js         # qr.js (reference reimplementation) ile kodla
python test/verify.py      # Python qrcode referansiyla bit-identical dogrula (diff=0 sart)
```

> **Not — Nayuki ≠ qr.js (ve olması da gerekmez):** Yukarıdaki bit-identical kanıt `qr.js` içindir. Üretimde kullanılan Nayuki qrcodegen, **bağımsız, spec-doğru bir üretim motorudur**; otomatik mod seçimi yapar (sayısal/alfasayısal/byte), `qr.js` ise yalnızca byte modu kullanır — bu yüzden ikisinin matrisleri genelde **bit-identical değildir ve olması beklenmez**. İkisi de geçerli, ISO 18004 uyumlu QR üretir.

## Güvenlik / Security

Tasarımca saldırı yüzeyi minimumda tutulmuştur:

- **Ağ yok / sızıntı yok.** Sayfa katı bir Content-Security-Policy ile gelir: `connect-src 'none'` her türlü ağ isteğini (fetch/XHR/WebSocket/beacon) engeller, `default-src 'none'` dış kaynak yüklemesini engeller. Şifre fiziksel olarak dışarı gönderilemez.
- **XSS yok.** Kullanıcı girdisi (SSID/şifre) HTML'e enjekte edilmez. SSID yalnızca `textContent` ile yazılır; QR'ın SVG çıktısı yalnızca sayısal koordinatlardan oluşur, kullanıcı metni içermez. `"><script>` gibi kötü niyetli SSID etkisizdir.
- **Kalıcı veri yok.** localStorage/cookie kullanılmaz; şifre yalnızca bellekte tutulur, sayfa kapanınca gider.
- **Minimal tedarik zinciri.** Tek üçüncü taraf kod, inline gömülü Nayuki QR kütüphanesidir (MIT); **CDN yok, ağ isteği yok**, hepsi denetlenebilir tek dosyada. Çalışma anında paket çekilmez → kurulum/CDN kaynaklı tedarik zinciri riski yok.
- **`eval` yok**, dinamik kod üretimi yok.

> Not: Yazdırılan/kaydedilen QR, şifrenin kendisini taşır — onu da şifre gibi gizli tut. İndirme blob/dataURL üzerinden yapılır; eğer bir tarayıcı katı CSP altında indirmeyi engellerse `img-src` yönergesine `blob:` zaten eklidir.

## Tarayıcı desteği / Browser support

Modern tarayıcıların hepsi (Chrome, Firefox, Safari, Edge). Clipboard API olmayan çok eski tarayıcılarda "Metni kopyala" sessizce çalışmaz; diğer her şey çalışır.

## Credits / Üçüncü taraf

- **[Nayuki qrcodegen](https://www.nayuki.io/page/qr-code-generator-library)** (MIT License) — **üretim QR motoru.** `vendor/qrcodegen.js` içine derlenip `index.html`'e inline gömülmüştür (CSP `default-src 'none'` gereği dış `<script src>` yok). Telif/lisans notu o dosyada korunmuştur; ayrıca bkz. `NOTICE`.
- **`qr.js`** — kendi sıfırdan ISO/IEC 18004 kodlayıcımız; üretimde kullanılmaz, **referans (reference reimplementation)** olarak tutulur ve testlerde karşılaştırma temeli olur.

## Lisans / License

MIT (bkz. `LICENSE`). Güçlü copyleft tercih edersen AGPL-3.0'a çevirebilirsin.

— [github.com/yfthcn](https://github.com/yfthcn) · kaktusdev.net
