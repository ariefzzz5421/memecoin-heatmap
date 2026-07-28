# Crypto Heatmap Volume

Dasbor volume kripto dengan data real: peta dunia interaktif, heatmap volume memecoin,
dan analisa jam paling aktif untuk trading dalam **WIB (UTC+7)** dan **UTC**.

Tanpa dependensi runtime. HTML + CSS + JavaScript modul murni.

## Menjalankan

```bash
npm run dev
```

Lalu buka <http://localhost:5173>.

> Harus lewat `http://localhost`, **bukan** membuka `index.html` langsung dari file
> explorer. API OKX memantulkan header `Origin` dan menolak origin `null` yang
> dikirim oleh `file://`.

Alternatif tanpa Node:

```bash
python -m http.server 5173
```

## Isi halaman

| Bagian | Yang dijawab |
|---|---|
| **Peta volume global** | Di mana volume kripto terbesar tercatat. Zoom, geser, klik untuk detail per yurisdiksi. |
| **Jam paling aktif** | Jam berapa volume memuncak — dalam WIB dan UTC, dengan timeframe 24 jam / 7 hari / 30 hari / 90 hari. |
| **Heatmap memecoin** | Koin meme mana yang menyerap likuiditas, dan ke arah mana harganya bergerak. |

## Sumber data

| Data | Sumber | Endpoint |
|---|---|---|
| Volume bursa per yurisdiksi | CoinGecko | `/exchanges` (200 bursa teratas) |
| Harga BTC (konversi ke USD) | CoinGecko | `/simple/price` |
| Pasar memecoin | CoinGecko | `/coins/markets?category=meme-token` |
| Statistik pasar global | CoinGecko | `/global` |
| Volume per jam | Binance → OKX → Kraken | candle 1 jam, *quote volume* |
| Geometri peta | Natural Earth 110m (world-atlas) | TopoJSON, didekode sendiri di browser |

Candle memakai **rantai fallback otomatis**: Binance dicoba lebih dulu, dan bila
diblokir jaringan/ISP, halaman beralih sendiri ke OKX lalu Kraken. Nama sumber yang
akhirnya dipakai ditampilkan di bilah status.

Semua respons di-cache di `localStorage` (3–20 menit; geometri peta 30 hari) agar
hemat kuota API gratis. Tombol **Muat ulang data** mengosongkan cache dan menarik
data baru.

## Routing

| Route | Isi |
|---|---|
| `/` | Overview, jam aktif, dan heatmap memecoin |
| `/maps/` | Peta khusus dengan marker kuning `#1` untuk lokasi volume terbesar |
| `/sentiment/` | Volume 24 jam, revenue 24 jam, momentum aktivitas, dan chain volume tertinggi |
| `/cases/` | Hub studi memecoin ≥ $100M mcap: kartu token dengan filter tahun launch, dasbor volume koin, ranking launchpad |
| `/cases/{slug}/` | Halaman artikel per token (`doge`, `shib`, `pepe`, `wif`, `bonk`, `trump`, `floki`, `pengu`): logo resmi, tanggal launch, waktu launch → ATH, artikel, chart mingguan, katalis |

Halaman artikel di-generate dari `assets/js/cases-config.js`. Setelah mengubah daftar
token atau isi artikel, jalankan:

```bash
node scripts/generate-case-pages.cjs
```

### Pembaruan otomatis

Semua halaman menyegarkan datanya sendiri di latar belakang lewat
`assets/js/autorefresh.js`: tick tiap 10 detik, tapi tiap sumber punya jarak minimum
sendiri (snapshot pasar 60 detik, volume bursa 5 menit, kline 15 menit–6 jam) supaya
batas rate API gratis tidak tertabrak. Tidak ada hitung mundur atau teks di layar —
hanya titik ping kecil di bilah status yang berdenyut saat data benar-benar diperbarui.
Refresh berhenti saat tab disembunyikan dan langsung mengejar ketertinggalan saat tab
kembali aktif. Bila sebuah sumber gagal (mis. 429), halaman memakai cache terakhir
alih-alih mengosongkan tampilan.

### Logo

Logo token dan platform diunduh sekali dari sumber resminya (CoinGecko untuk token,
indeks DeFiLlama untuk platform) dan disimpan lokal di `assets/img/` — situs tidak
memuat gambar dari host pihak ketiga saat runtime.

Halaman Sentiment memakai metrik protokol DeFiLlama. Bila sebuah metrik belum
diindeks (saat ini volume protokol Pons), halaman menampilkan status tidak tersedia
dan tidak membuat estimasi.

Untuk menghasilkan artefak deployment:

```bash
npm run build
```

## Batasan yang penting dibaca

- **Negara bursa = yurisdiksi badan hukum, bukan lokasi trader.** Seychelles, Kepulauan
  Cayman, dan British Virgin Islands memuncaki peta karena bursa global mendaftarkan
  entitasnya di sana. Tidak ada API publik yang memetakan volume ke domisili trader
  sebenarnya. Untuk "trader aktif jam berapa", pakai bagian **Jam paling aktif** —
  itu diukur dari volume per jam yang nyata.
- Volume yang dilaporkan bursa bisa dibesar-besarkan; CoinGecko memberi *trust score*
  tapi tidak menyaring seluruhnya.
- Analisa jam memakai keranjang koin terbatas di satu bursa, jadi ia mewakili **pola**
  pasar, bukan volume total dunia.
- WIB diperlakukan tetap UTC+7 (tidak ada DST). Label sesi Eropa dan AS bergeser satu
  jam saat musim panas di sana.

## Catatan warna

Palet mengikuti aturan data-viz dan sudah lolos uji `validate_palette.js` pada
permukaan gelap `#14161a`:

- **Magnitude** (volume) — satu hue biru, gelap ke terang.
- **Polaritas** (perubahan harga) — **biru naik, merah turun**, abu netral di tengah.
  Hijau/merah sengaja dihindari: pasangan itu menyatu pada buta warna deuteranopia
  (ΔE 3,3), sedangkan biru/merah terpisah ΔE 15–20.
- Setiap ubin dan sel membawa angka langsung, dan tersedia tampilan tabel — warna
  tidak pernah jadi satu-satunya penanda.

## Struktur berkas

```
index.html
maps/  sentiment/  cases/            satu index.html per route
cases/{doge,shib,pepe,wif,bonk,trump,floki,pengu}/   halaman artikel per token
scripts/
  dev-server.cjs          server statis pengembangan (npm run dev)
  build.cjs               salin situs statis ke dist/client (npm run build)
  generate-case-pages.cjs generate ulang halaman artikel dari cases-config.js
vercel.json               deploy statis: build ke dist/client
assets/img/coins/         logo resmi token (unduhan sekali)
assets/img/platforms/     logo resmi platform/launchpad
assets/css/style.css
assets/js/
  config.js               tabel yurisdiksi, keranjang koin, timeframe
  datasource.js           pengambilan data + cache + fallback cache basi
  geo.js                  dekoder TopoJSON + proyeksi + zoom/pan
  analytics.js            agregasi, analisa jam, algoritma treemap
  worldmap.js             peta canvas interaktif
  hours.js                profil jam + matriks hari x jam
  treemap.js              heatmap memecoin
  autorefresh.js          pembaruan senyap di latar + titik ping
  cases-config.js         kurasi studi kasus (launch, katalis, artikel, logo)
  cases-data.js           kline mingguan + snapshot pasar + metrik launchpad
  cases-chart.js          chart mingguan skala log + tabel data
  cases-page.js           hub studi kasus (grid + filter tahun)
  cases-article.js        halaman artikel per token
  sentiment-data.js       metrik platform DeFiLlama
  sentiment-page.js       halaman sentiment
  maps-page.js            halaman peta khusus
  utils.js                palet, skala warna, pemformat
  app.js                  orkestrasi halaman utama
```

> Catatan deploy: jangan menaruh server Node bernama `server.js` di akar repo —
> Vercel mendeteksinya sebagai backend dan membungkusnya jadi fungsi, sehingga
> folder `assets/` tidak terdeploy (penyebab bug produksi Jul 2026).

## Menyesuaikan

- **Ganti koin yang dianalisa** — sunting `MEME_BASKET` / `MAJOR_BASKET` di
  `assets/js/config.js`. Isi simbol untuk tiap bursa (`binance`, `okx`, `kraken`);
  bursa yang tidak punya pair cukup diisi `null`.
- **Ganti zona waktu** — ubah `WIB_OFFSET` di `config.js`.
- **Tambah yurisdiksi** — tambahkan entri di `JURISDICTIONS` (`lat`, `lon`, `region`,
  `tz`, `iso`). Tanpa entri, yurisdiksi tetap masuk tabel tapi tidak muncul di peta.

---

Alat bantu riset, bukan nasihat keuangan. Volume tinggi berarti likuiditas tinggi —
bukan berarti harga akan naik.
