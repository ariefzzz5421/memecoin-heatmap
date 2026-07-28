/* ============================================================
   cases-config.js — data kurasi studi kasus memecoin ≥ $100M.

   Yang dihitung mesin saat runtime (bukan dari file ini):
   harga, mcap, volume, ATH, tanggal ATH — dari CoinGecko;
   chart mingguan — dari kline bursa (urutan provider per koin
   dipilih berdasarkan listing paling awal yang tersedia).

   Yang dikurasi di sini: tanggal launch, katalis, dan artikel —
   peristiwa terdokumentasi publik dengan tanggalnya. Katalis =
   korelasi waktu, bukan bukti sebab-akibat.

   Logo: berkas resmi masing-masing proyek (sumber: CoinGecko),
   disimpan lokal di /assets/img/coins/.
   ============================================================ */

export const CASES = [
  {
    id: 'dogecoin',
    slug: 'doge',
    sym: 'DOGE',
    name: 'Dogecoin',
    logo: '/assets/img/coins/doge.png',
    launch: '2013-12-06',
    launchNote: 'Dirilis Billy Markus & Jackson Palmer',
    providers: ['binance', 'kraken', 'okx'],
    symbols: { binance: 'DOGEUSDT', kraken: 'XDGUSD', okx: 'DOGE-USDT' },
    article: [
      'Dogecoin dirilis 6 Desember 2013 oleh Billy Markus dan Jackson Palmer sebagai fork dari Luckycoin (turunan Litecoin), memakai gambar meme anjing Shiba Inu. Tidak ada batas supply: sekitar 5 miliar DOGE baru diterbitkan tiap tahun.',
      'Koin ini bertahan beberapa siklus pasar tanpa harga yang berarti. Januari 2014, komunitas Reddit mengumpulkan $30.000 dalam DOGE untuk mengirim tim bobsled Jamaika ke Olimpiade — liputan media besar pertamanya. Listing Binance menyusul Juli 2019.',
      'Kenaikan utamanya terjadi 2021: pump ritel dari r/WallStreetBets pada 28 Januari (naik >800% dalam 24 jam), rangkaian tweet Elon Musk sepanjang Februari–April, dan akses beli tanpa komisi lewat Robinhood. ATH tercapai 7–8 Mei 2021, sehari sebelum Musk tampil di Saturday Night Live — 7,4 tahun setelah launch.',
    ],
    catalysts: [
      { d: '2014-01', t: 'Komunitas Reddit mendanai tim bobsled Jamaika ke Olimpiade ($30K dalam DOGE); liputan media pertama berskala besar.' },
      { d: '2019-07', t: 'Listing Binance.' },
      { d: '2021-01', t: 'Retail pump pasca-GameStop dari r/WallStreetBets & r/SatoshiStreetBets; harga naik >800% dalam 24 jam (28 Jan).' },
      { d: '2021-02', t: 'Tweet berulang Elon Musk; pembelian ritel komisi-nol via Robinhood.' },
      { d: '2021-05', t: 'ATH sehari sebelum Musk tampil di Saturday Night Live (8 Mei).' },
    ],
    thesis: 'Komunitas aktif sejak 2013 + amplifikasi figur publik berjangkauan besar + akses ritel tanpa komisi.',
  },
  {
    id: 'shiba-inu',
    slug: 'shib',
    sym: 'SHIB',
    name: 'Shiba Inu',
    logo: '/assets/img/coins/shib.png',
    launch: '2020-08-01',
    launchNote: 'Deploy kontrak oleh "Ryoshi", Agustus 2020',
    providers: ['okx', 'binance', 'kraken'],
    symbols: { binance: 'SHIBUSDT', kraken: 'SHIBUSD', okx: 'SHIB-USDT' },
    article: [
      'Shiba Inu di-deploy di Ethereum pada Agustus 2020 oleh figur anonim "Ryoshi" dengan supply 1 kuadriliun token. Separuh supply dikirim ke dompet Vitalik Buterin — keputusan yang kemudian menjadi katalis terbesarnya.',
      'Mei 2021, Vitalik membakar sekitar 410 triliun SHIB (~41% supply) dan mendonasikan ~50 triliun SHIB ke dana bantuan COVID India. Pada bulan yang sama SHIB listing di Binance, disusul Coinbase September 2021.',
      'Oktober 2021, petisi listing Robinhood melewati 500 ribu tanda tangan dan Musk men-tweet foto anak anjing Shiba miliknya. ATH tercapai 27–28 Oktober 2021 — sekitar 15 bulan setelah deploy. Sejak itu harga tidak pernah kembali ke ATH.',
    ],
    catalysts: [
      { d: '2021-05', t: 'Vitalik Buterin membakar ~410T SHIB (~41% supply) dan mendonasikan ~50T SHIB ke dana COVID India.' },
      { d: '2021-05', t: 'Listing Binance (10 Mei).' },
      { d: '2021-09', t: 'Listing Coinbase.' },
      { d: '2021-10', t: 'Petisi listing Robinhood (>500 ribu tanda tangan) + tweet anjing Shiba Musk; ATH 27–28 Okt.' },
    ],
    thesis: 'Posisi "alternatif DOGE" di ERC-20, pengurangan supply 41% oleh pihak eksternal, dan listing bursa besar beruntun.',
  },
  {
    id: 'pepe',
    slug: 'pepe',
    sym: 'PEPE',
    name: 'Pepe',
    logo: '/assets/img/coins/pepe.jpg',
    launch: '2023-04-14',
    launchNote: 'Deploy kontrak di Ethereum',
    providers: ['okx', 'binance', 'kraken'],
    symbols: { binance: 'PEPEUSDT', kraken: 'PEPEUSD', okx: 'PEPE-USDT' },
    article: [
      'PEPE di-deploy di Ethereum 14 April 2023, memakai karakter Pepe the Frog yang sudah dikenal sebagai meme internet lebih dari satu dekade. Supply 420,69 triliun, tanpa pajak transaksi.',
      'Distribusinya sangat cepat: kapitalisasi $100 juta tercapai dalam sekitar dua minggu, dan $1 miliar pada 5 Mei 2023 — hari yang sama dengan listing Binance, tiga minggu setelah deploy.',
      'Siklus keduanya datang akhir 2024: listing Coinbase 13 November dan reli memecoin pasca-pemilu AS membawa PEPE ke ATH pada awal Desember 2024 — sekitar 20 bulan setelah deploy.',
    ],
    catalysts: [
      { d: '2023-04', t: 'Viral di X; mcap $100M tercapai dalam ~2 minggu setelah deploy.' },
      { d: '2023-05', t: 'Mcap $1B (5 Mei, hari yang sama dengan listing Binance) — 3 minggu setelah deploy.' },
      { d: '2024-11', t: 'Listing Coinbase (13 Nov) dan reli memecoin pasca-pemilu AS; ATH awal Des 2024.' },
    ],
    thesis: 'Meme yang sudah dikenal luas sebelum token ada, unit harga sangat kecil, listing bursa besar dalam 3 minggu.',
  },
  {
    id: 'dogwifcoin',
    slug: 'wif',
    sym: 'WIF',
    name: 'dogwifhat',
    logo: '/assets/img/coins/wif.jpg',
    launch: '2023-11-20',
    launchNote: 'Launch di Solana',
    providers: ['kraken', 'binance', 'okx'],
    symbols: { binance: 'WIFUSDT', kraken: 'WIFUSD', okx: 'WIF-USDT' },
    article: [
      'dogwifhat diluncurkan di Solana pada November 2023 — satu gambar anjing Shiba Inu bertopi rajut, tanpa utilitas yang diklaim. Supply hanya ~999 juta token, jauh lebih kecil dari kebanyakan memecoin.',
      'Kapitalisasi $100 juta terlewati pada pertengahan Januari 2024, sekitar dua bulan setelah launch, saat rotasi modal ke memecoin Solana dimulai.',
      'Maret 2024: komunitas menggalang sekitar $700 ribu untuk menampilkan logo WIF di Las Vegas Sphere, WIF listing di Binance pada 5 Maret, dan ATH tercapai 31 Maret 2024 — sekitar 4,5 bulan setelah launch.',
    ],
    catalysts: [
      { d: '2024-01', t: 'Rotasi modal ke memecoin Solana; mcap $100M pada pertengahan Januari (~2 bulan setelah launch).' },
      { d: '2024-03', t: 'Komunitas menggalang ~$700K untuk menampilkan logo WIF di Las Vegas Sphere; listing Binance (5 Mar); ATH 31 Mar.' },
    ],
    thesis: 'Satu gambar meme sederhana + momentum ekosistem Solana + kampanye komunitas yang diliput media.',
  },
  {
    id: 'bonk',
    slug: 'bonk',
    sym: 'BONK',
    name: 'Bonk',
    logo: '/assets/img/coins/bonk.jpg',
    launch: '2022-12-25',
    launchNote: 'Airdrop 50% supply ke pengguna & kolektor NFT Solana',
    providers: ['kraken', 'binance', 'okx'],
    symbols: { binance: 'BONKUSDT', kraken: 'BONKUSD', okx: 'BONK-USDT' },
    article: [
      'BONK diluncurkan 25 Desember 2022 dengan membagikan 50% supply sebagai airdrop ke pengguna, developer, dan kolektor NFT Solana — beberapa minggu setelah kejatuhan FTX menekan harga SOL ke titik terendahnya.',
      'Sepanjang 2023 BONK menjadi token yang paling terasosiasi dengan pemulihan ekosistem Solana. Desember 2023: listing Coinbase (14 Des), dan insentif airdrop BONK untuk pembeli ponsel Solana Saga membuat perangkat itu terjual habis.',
      'ATH tercapai 19–20 November 2024 pada reli memecoin pasca-pemilu AS — hampir dua tahun setelah airdrop pertamanya.',
    ],
    catalysts: [
      { d: '2022-12', t: 'Airdrop saat harga SOL di titik terendah pasca-FTX; harga SOL naik >30% pada minggu yang sama.' },
      { d: '2023-12', t: 'Listing Coinbase (14 Des); insentif airdrop untuk pembeli ponsel Solana Saga membuat Saga terjual habis.' },
      { d: '2024-11', t: 'Reli memecoin pasca-pemilu AS; ATH 19–20 Nov.' },
    ],
    thesis: 'Distribusi awal sangat luas via airdrop, terikat pada pemulihan ekosistem Solana 2023–2024.',
  },
  {
    id: 'official-trump',
    slug: 'trump',
    sym: 'TRUMP',
    name: 'OFFICIAL TRUMP',
    logo: '/assets/img/coins/trump.png',
    launch: '2025-01-17',
    launchNote: 'Diumumkan akun resmi Donald Trump, 3 hari sebelum pelantikan',
    providers: ['okx', 'kraken', 'binance'],
    symbols: { binance: 'TRUMPUSDT', kraken: 'TRUMPUSD', okx: 'TRUMP-USDT' },
    article: [
      'OFFICIAL TRUMP diumumkan lewat akun resmi Donald Trump pada 17 Januari 2025, tiga hari sebelum pelantikan presiden, dan diluncurkan di Solana. Hanya 20% dari 1 miliar total supply yang beredar saat launch; 80% sisanya dipegang entitas terafiliasi dengan jadwal vesting.',
      'Kecepatannya belum pernah terjadi pada kasus lain di halaman ini: kapitalisasi melewati $1 miliar dalam waktu kurang dari 24 jam, dan bursa-bursa terbesar melistingnya dalam 48 jam.',
      'ATH tercapai 19 Januari 2025 — dua hari setelah launch, sehari sebelum pelantikan. Setelahnya harga turun dalam; drawdown dari ATH termasuk yang terdalam di antara koin studi.',
    ],
    catalysts: [
      { d: '2025-01-17', t: 'Launch di Solana; mcap melewati $1B dalam <24 jam.' },
      { d: '2025-01-18', t: 'Listing kilat di bursa-bursa terbesar dalam 48 jam.' },
      { d: '2025-01-19', t: 'ATH — 2 hari setelah launch, sehari sebelum pelantikan (20 Jan).' },
    ],
    thesis: 'Figur publik dengan jangkauan maksimum + momen politik terjadwal + supply beredar awal kecil (20% dari total).',
  },
  {
    id: 'floki',
    slug: 'floki',
    sym: 'FLOKI',
    name: 'Floki',
    logo: '/assets/img/coins/floki.png',
    launch: '2021-06-25',
    launchNote: 'Dibuat setelah tweet Musk "My Shiba Inu will be named Floki"',
    providers: ['okx', 'binance', 'kraken'],
    symbols: { binance: 'FLOKIUSDT', kraken: 'FLOKIUSD', okx: 'FLOKI-USDT' },
    article: [
      'FLOKI dibuat akhir Juni 2021, dinamai mengikuti tweet Elon Musk "My Shiba Inu will be named Floki" (25 Juni 2021). Token berjalan di Ethereum dan BNB Chain.',
      'Berbeda dari kebanyakan memecoin, FLOKI membelanjakan dana besar untuk pemasaran di luar crypto: iklan di jaringan transportasi umum London, sponsor klub sepak bola termasuk Napoli, dan kampanye di beberapa negara sepanjang akhir 2021.',
      'Harga memuncak dua kali: siklus pertama akhir 2021, lalu ATH pada 4–5 Juni 2024 di reli memecoin 2024 — hampir tiga tahun setelah launch.',
    ],
    catalysts: [
      { d: '2021-06', t: 'Tweet Musk 25 Jun tentang nama anjingnya; token dinamai mengikutinya.' },
      { d: '2021-10', t: 'Kampanye iklan transportasi umum London & sponsor klub sepak bola (Napoli, dll).' },
      { d: '2024-06', t: 'ATH 4–5 Jun 2024 pada reli memecoin 2024.' },
    ],
    thesis: 'Penamaan menumpang peristiwa viral + belanja pemasaran off-crypto (iklan transit, sponsor olahraga).',
  },
  {
    id: 'pudgy-penguins',
    slug: 'pengu',
    sym: 'PENGU',
    name: 'Pudgy Penguins',
    logo: '/assets/img/coins/pengu.png',
    launch: '2024-12-17',
    launchNote: 'Token Solana dari brand NFT Pudgy Penguins (2021)',
    providers: ['okx', 'kraken', 'binance'],
    symbols: { binance: 'PENGUUSDT', kraken: 'PENGUUSD', okx: 'PENGU-USDT' },
    article: [
      'PENGU adalah token dari Pudgy Penguins, koleksi NFT yang ada sejak 2021. Sebelum token diluncurkan, brand ini sudah keluar dari lingkup crypto: mainan Pudgy Penguins dijual di sekitar 2.000 gerai Walmart sejak 2023, kemudian di Target.',
      'Token diluncurkan di Solana pada 17 Desember 2024 dengan airdrop ke holder NFT dan komunitas. Kapitalisasi melewati $2 miliar pada hari pertama, dan ATH tercatat pada hari yang sama dengan launch.',
      'Maret 2025, Canary Capital mengajukan ETF PENGU ke SEC — pengajuan ETF pertama untuk token dari brand NFT.',
    ],
    catalysts: [
      { d: '2023-09', t: 'Sebelum token: mainan Pudgy Penguins dijual di 2.000 gerai Walmart — brand dikenal di luar crypto.' },
      { d: '2024-12-17', t: 'Launch + airdrop ke holder NFT & komunitas; mcap >$2B dan ATH pada hari pertama.' },
      { d: '2025-03', t: 'Pengajuan ETF Canary PENGU ke SEC.' },
    ],
    thesis: 'Brand konsumen yang sudah terdistribusi di ritel AS + airdrop luas hari pertama.',
  },
];

export const CASE_BY_SLUG = Object.fromEntries(CASES.map((c) => [c.slug, c]));

/* Launchpad yang dilacak untuk dasbor fees/revenue (slug DeFiLlama).
   Logo: berkas resmi dari indeks DeFiLlama, disimpan lokal. */
export const LAUNCHPADS = [
  { slug: 'pump.fun', name: 'Pump.fun', chain: 'Solana', logo: '/assets/img/platforms/pump.fun.webp' },
  { slug: 'four.meme', name: 'Four.meme', chain: 'BSC', logo: '/assets/img/platforms/four.meme.webp' },
  { slug: 'virtuals-protocol', name: 'Virtuals Protocol', chain: 'Base/Solana', logo: '/assets/img/platforms/virtuals-protocol.webp' },
  { slug: 'bonk.fun', name: 'BONK.fun', chain: 'Solana', logo: '/assets/img/platforms/bonk.fun.webp' },
];

export const MCAP_THRESHOLD = 100e6;
