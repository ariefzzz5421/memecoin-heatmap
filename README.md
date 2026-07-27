# Crypto Heatmap Volume

Dasbor volume kripto dengan data real: peta dunia interaktif, heatmap volume memecoin,
dan analisa jam paling aktif untuk trading dalam **WIB (UTC+7)** dan **UTC**.

Tanpa dependensi runtime. HTML + CSS + JavaScript modul murni.

## Menjalankan

```bash
node server.js
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
| `/sentiment/` | Volume 24 jam, revenue 24 jam, momentum aktivitas, dan chain terpanas |

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
server.js                 server statis tanpa dependensi
assets/css/style.css
assets/js/
  config.js               tabel yurisdiksi, keranjang koin, timeframe
  datasource.js           pengambilan data + cache + rantai fallback
  geo.js                  dekoder TopoJSON + proyeksi + zoom/pan
  analytics.js            agregasi, analisa jam, algoritma treemap
  worldmap.js             peta canvas interaktif
  hours.js                profil jam + matriks hari x jam
  treemap.js              heatmap memecoin
  utils.js                palet, skala warna, pemformat
  app.js                  orkestrasi halaman
```

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
