/* ============================================================
   cases-config.js — data kurasi studi kasus memecoin ≥ $100M.

   Yang dihitung mesin saat runtime (bukan dari file ini):
   harga, mcap, volume, ATH, tanggal ATH — dari CoinGecko;
   chart mingguan — dari kline bursa (urutan provider per koin
   dipilih berdasarkan listing paling awal yang tersedia).

   Yang dikurasi di sini: tanggal launch dan katalis — peristiwa
   terdokumentasi publik dengan tanggalnya. Katalis = korelasi
   waktu, bukan bukti sebab-akibat.
   ============================================================ */

export const CASES = [
  {
    id: 'dogecoin',
    sym: 'DOGE',
    name: 'Dogecoin',
    launch: '2013-12-06',
    launchNote: 'Dirilis Billy Markus & Jackson Palmer',
    providers: ['binance', 'kraken', 'okx'],
    symbols: { binance: 'DOGEUSDT', kraken: 'XDGUSD', okx: 'DOGE-USDT' },
    catalysts: [
      { d: '2014-01', t: 'Komunitas Reddit mendanai tim bobsled Jamaika ke Olimpiade ($30K dalam DOGE); liputan media pertama berskala besar.' },
      { d: '2019-07', t: 'Listing Binance.' },
      { d: '2021-01', t: 'Retail pump pasca-GameStop dari r/WallStreetBets & r/SatoshiStreetBets; harga naik >800% dalam 24 jam (28 Jan).' },
      { d: '2021-02', t: 'Tweet berulang Elon Musk; pembelian ritel komisi-nol via Robinhood.' },
      { d: '2021-05', t: 'ATH $0.7316 (7 Mei) sehari sebelum Musk tampil di Saturday Night Live (8 Mei).' },
    ],
    thesis: 'Komunitas aktif sejak 2013 + amplifikasi figur publik berjangkauan besar + akses ritel tanpa komisi.',
  },
  {
    id: 'shiba-inu',
    sym: 'SHIB',
    name: 'Shiba Inu',
    launch: '2020-08-01',
    launchNote: 'Deploy kontrak oleh "Ryoshi", Agustus 2020',
    providers: ['okx', 'binance', 'kraken'],
    symbols: { binance: 'SHIBUSDT', kraken: 'SHIBUSD', okx: 'SHIB-USDT' },
    catalysts: [
      { d: '2021-05', t: 'Vitalik Buterin membakar ~410T SHIB (~41% supply) dan mendonasikan ~50T SHIB ke dana COVID India.' },
      { d: '2021-05', t: 'Listing Binance (10 Mei).' },
      { d: '2021-09', t: 'Listing Coinbase.' },
      { d: '2021-10', t: 'Petisi listing Robinhood (>500 ribu tanda tangan) + tweet anak anjing Shiba milik Musk; ATH 27 Okt.' },
    ],
    thesis: 'Posisi "alternatif DOGE" di ERC-20, pengurangan supply 41% oleh pihak eksternal, dan listing bursa besar beruntun.',
  },
  {
    id: 'pepe',
    sym: 'PEPE',
    name: 'Pepe',
    launch: '2023-04-14',
    launchNote: 'Deploy kontrak di Ethereum',
    providers: ['okx', 'binance', 'kraken'],
    symbols: { binance: 'PEPEUSDT', kraken: 'PEPEUSD', okx: 'PEPE-USDT' },
    catalysts: [
      { d: '2023-04', t: 'Viral di X; mcap $100M tercapai dalam ~2 minggu setelah deploy.' },
      { d: '2023-05', t: 'Mcap $1B (5 Mei, hari yang sama dengan listing Binance) — 3 minggu setelah deploy.' },
      { d: '2024-11', t: 'Listing Coinbase (13 Nov) dan reli memecoin pasca-pemilu AS; ATH 9 Des 2024.' },
    ],
    thesis: 'Meme yang sudah dikenal luas sebelum token ada, unit harga sangat kecil, listing bursa besar dalam 3 minggu.',
  },
  {
    id: 'dogwifcoin',
    sym: 'WIF',
    name: 'dogwifhat',
    launch: '2023-11-20',
    launchNote: 'Launch di Solana',
    providers: ['kraken', 'binance', 'okx'],
    symbols: { binance: 'WIFUSDT', kraken: 'WIFUSD', okx: 'WIF-USDT' },
    catalysts: [
      { d: '2024-01', t: 'Rotasi modal ke memecoin Solana; mcap $100M pada pertengahan Januari (~2 bulan setelah launch).' },
      { d: '2024-03', t: 'Komunitas menggalang ~$700K untuk menampilkan logo WIF di Las Vegas Sphere; listing Binance (5 Mar); ATH 31 Mar.' },
    ],
    thesis: 'Satu gambar meme sederhana + momentum ekosistem Solana + kampanye komunitas yang diliput media.',
  },
  {
    id: 'bonk',
    sym: 'BONK',
    name: 'Bonk',
    launch: '2022-12-25',
    launchNote: 'Airdrop 50% supply ke pengguna & kolektor NFT Solana',
    providers: ['kraken', 'binance', 'okx'],
    symbols: { binance: 'BONKUSDT', kraken: 'BONKUSD', okx: 'BONK-USDT' },
    catalysts: [
      { d: '2022-12', t: 'Airdrop saat harga SOL di titik terendah pasca-FTX; harga SOL naik >30% pada minggu yang sama.' },
      { d: '2023-12', t: 'Listing Coinbase (14 Des); insentif airdrop untuk pembeli ponsel Solana Saga membuat Saga terjual habis.' },
      { d: '2024-11', t: 'Reli memecoin pasca-pemilu AS; ATH 19 Nov.' },
    ],
    thesis: 'Distribusi awal sangat luas via airdrop, terikat pada pemulihan ekosistem Solana 2023–2024.',
  },
  {
    id: 'official-trump',
    sym: 'TRUMP',
    name: 'OFFICIAL TRUMP',
    launch: '2025-01-17',
    launchNote: 'Diumumkan akun resmi Donald Trump, 3 hari sebelum pelantikan',
    providers: ['okx', 'kraken', 'binance'],
    symbols: { binance: 'TRUMPUSDT', kraken: 'TRUMPUSD', okx: 'TRUMP-USDT' },
    catalysts: [
      { d: '2025-01-17', t: 'Launch di Solana; mcap melewati $1B dalam <24 jam.' },
      { d: '2025-01-18', t: 'Listing kilat di bursa-bursa terbesar dalam 48 jam.' },
      { d: '2025-01-19', t: 'ATH $73 — 2 hari setelah launch, sehari sebelum pelantikan (20 Jan).' },
    ],
    thesis: 'Figur publik dengan jangkauan maksimum + momen politik terjadwal + supply beredar awal kecil (20% dari total).',
  },
  {
    id: 'floki',
    sym: 'FLOKI',
    name: 'Floki',
    launch: '2021-06-25',
    launchNote: 'Dibuat setelah tweet Musk "My Shiba Inu will be named Floki"',
    providers: ['okx', 'binance', 'kraken'],
    symbols: { binance: 'FLOKIUSDT', kraken: 'FLOKIUSD', okx: 'FLOKI-USDT' },
    catalysts: [
      { d: '2021-06', t: 'Tweet Musk 25 Jun tentang nama anjingnya; token dinamai mengikutinya.' },
      { d: '2021-10', t: 'Kampanye iklan transportasi umum London & sponsor klub sepak bola (Napoli, dll).' },
      { d: '2024-06', t: 'ATH 4 Jun 2024 pada reli memecoin 2024.' },
    ],
    thesis: 'Penamaan menumpang peristiwa viral + belanja pemasaran off-crypto (iklan transit, sponsor olahraga).',
  },
  {
    id: 'pudgy-penguins',
    sym: 'PENGU',
    name: 'Pudgy Penguins',
    launch: '2024-12-17',
    launchNote: 'Token Solana dari brand NFT Pudgy Penguins (2021)',
    providers: ['okx', 'kraken', 'binance'],
    symbols: { binance: 'PENGUUSDT', kraken: 'PENGUUSD', okx: 'PENGU-USDT' },
    catalysts: [
      { d: '2023-09', t: 'Sebelum token: mainan Pudgy Penguins dijual di Walmart (2.000 gerai) — brand sudah dikenal di luar crypto.' },
      { d: '2024-12-17', t: 'Launch + airdrop ke holder NFT & komunitas; mcap >$2B dan ATH pada hari pertama.' },
      { d: '2025-03', t: 'Pengajuan ETF Canary PENGU ke SEC.' },
    ],
    thesis: 'Brand konsumen yang sudah terdistribusi di ritel AS + airdrop luas hari pertama.',
  },
];

/* Launchpad yang dilacak untuk dasbor fees/revenue (slug DeFiLlama). */
export const LAUNCHPADS = [
  { slug: 'pump.fun', name: 'Pump.fun', chain: 'Solana' },
  { slug: 'four.meme', name: 'Four.meme', chain: 'BSC' },
  { slug: 'virtuals-protocol', name: 'Virtuals Protocol', chain: 'Base/Solana' },
  { slug: 'bonk.fun', name: 'BONK.fun', chain: 'Solana' },
];

export const MCAP_THRESHOLD = 100e6;
