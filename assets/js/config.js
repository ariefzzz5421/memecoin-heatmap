/* ============================================================
   config.js — konstanta, tabel yurisdiksi, daftar koin
   ============================================================ */

export const WIB_OFFSET = 7; // WIB = UTC+7 (tetap, tanpa DST)

/* ---------- Basket memecoin default (pair USDT) ---------- */
export const MEME_BASKET = [
  { key: 'DOGE',  name: 'Dogecoin',   binance: 'DOGEUSDT',  okx: 'DOGE-USDT',  kraken: 'XDGUSD' },
  { key: 'SHIB',  name: 'Shiba Inu',  binance: 'SHIBUSDT',  okx: 'SHIB-USDT',  kraken: 'SHIBUSD' },
  { key: 'PEPE',  name: 'Pepe',       binance: 'PEPEUSDT',  okx: 'PEPE-USDT',  kraken: 'PEPEUSD' },
  { key: 'WIF',   name: 'dogwifhat',  binance: 'WIFUSDT',   okx: 'WIF-USDT',   kraken: 'WIFUSD' },
  { key: 'BONK',  name: 'Bonk',       binance: 'BONKUSDT',  okx: 'BONK-USDT',  kraken: 'BONKUSD' },
  { key: 'FLOKI', name: 'Floki',      binance: 'FLOKIUSDT', okx: 'FLOKI-USDT', kraken: null },
  { key: 'TRUMP', name: 'OFFICIAL TRUMP', binance: 'TRUMPUSDT', okx: 'TRUMP-USDT', kraken: 'TRUMPUSD' },
  { key: 'PENGU', name: 'Pudgy Penguins', binance: 'PENGUUSDT', okx: 'PENGU-USDT', kraken: null },
];

/* Basket pembanding non-meme, untuk mode "Major" */
export const MAJOR_BASKET = [
  { key: 'BTC', name: 'Bitcoin',  binance: 'BTCUSDT', okx: 'BTC-USDT', kraken: 'XBTUSD' },
  { key: 'ETH', name: 'Ethereum', binance: 'ETHUSDT', okx: 'ETH-USDT', kraken: 'ETHUSD' },
  { key: 'SOL', name: 'Solana',   binance: 'SOLUSDT', okx: 'SOL-USDT', kraken: 'SOLUSD' },
  { key: 'XRP', name: 'XRP',      binance: 'XRPUSDT', okx: 'XRP-USDT', kraken: 'XRPUSD' },
];

/* ---------- Timeframe untuk analisa jam aktif ---------- */
export const TIMEFRAMES = [
  { key: '24h', label: '24 Jam',  hours: 24,   deep: false },
  { key: '7d',  label: '7 Hari',  hours: 168,  deep: false },
  { key: '30d', label: '30 Hari', hours: 720,  deep: false },
  { key: '90d', label: '90 Hari', hours: 2160, deep: true  },
];

/* ---------- Sesi pasar global (jam UTC) ----------
   Dipakai sebagai overlay pada heatmap jam.                */
export const SESSIONS = [
  { key: 'asia',   label: 'Sesi Asia',   utcStart: 0,  utcEnd: 8,  color: 'var(--warn)' },
  { key: 'europe', label: 'Sesi Eropa',  utcStart: 7,  utcEnd: 16, color: 'var(--up)' },
  { key: 'us',     label: 'Sesi AS',     utcStart: 13, utcEnd: 21, color: 'var(--down)' },
];

/* ---------- Alias nama negara: CoinGecko -> world-atlas ---------- */
export const GEO_NAME_ALIAS = {
  'United States': 'United States of America',
  'Republic of Lithuania': 'Lithuania',
  'Czech Republic': 'Czechia',
  'Russia': 'Russia',
  'Bosnia and Herzegovina': 'Bosnia and Herz.',
  'Dominican Republic': 'Dominican Rep.',
  'Central African Republic': 'Central African Rep.',
  'South Sudan': 'S. Sudan',
  'Solomon Islands': 'Solomon Is.',
  'Equatorial Guinea': 'Eq. Guinea',
  'Falkland Islands': 'Falkland Is.',
};

/* ---------- Region untuk breakdown ---------- */
const REGION = {
  OFFSHORE: 'Offshore / Kepulauan',
  ASIA: 'Asia-Pasifik',
  EUROPE: 'Eropa',
  NAM: 'Amerika Utara',
  LATAM: 'Amerika Latin',
  MEA: 'Timur Tengah & Afrika',
};
export const REGIONS = REGION;

/* ---------- Tabel yurisdiksi: koordinat + region + zona waktu ----------
   lat/lon dipakai untuk menempatkan bubble di peta. tz = offset UTC jam
   kerja lokal (dipakai untuk keterangan, bukan perhitungan volume).      */
export const JURISDICTIONS = {
  'Seychelles':                       { lat: -4.62,  lon: 55.45,   region: REGION.OFFSHORE, tz: 4,    iso: 'SC' },
  'Cayman Islands':                   { lat: 19.30,  lon: -81.38,  region: REGION.OFFSHORE, tz: -5,   iso: 'KY' },
  'British Virgin Islands':           { lat: 18.42,  lon: -64.62,  region: REGION.OFFSHORE, tz: -4,   iso: 'VG' },
  'Marshall Islands':                 { lat: 7.09,   lon: 171.38,  region: REGION.OFFSHORE, tz: 12,   iso: 'MH' },
  'Samoa':                            { lat: -13.76, lon: -172.10, region: REGION.OFFSHORE, tz: 13,   iso: 'WS' },
  'Saint Vincent and the Grenadines': { lat: 13.25,  lon: -61.19,  region: REGION.OFFSHORE, tz: -4,   iso: 'VC' },
  'Vanuatu':                          { lat: -17.73, lon: 168.32,  region: REGION.OFFSHORE, tz: 11,   iso: 'VU' },
  'Bahamas':                          { lat: 25.03,  lon: -77.40,  region: REGION.OFFSHORE, tz: -5,   iso: 'BS' },
  'Bermuda':                          { lat: 32.31,  lon: -64.75,  region: REGION.OFFSHORE, tz: -4,   iso: 'BM' },
  'Gibraltar':                        { lat: 36.14,  lon: -5.35,   region: REGION.OFFSHORE, tz: 1,    iso: 'GI' },
  'Isle of Man':                      { lat: 54.24,  lon: -4.55,   region: REGION.OFFSHORE, tz: 0,    iso: 'IM' },
  'Malta':                            { lat: 35.90,  lon: 14.51,   region: REGION.OFFSHORE, tz: 1,    iso: 'MT' },
  'Curacao':                          { lat: 12.17,  lon: -68.99,  region: REGION.OFFSHORE, tz: -4,   iso: 'CW' },
  'Belize':                           { lat: 17.19,  lon: -88.50,  region: REGION.OFFSHORE, tz: -6,   iso: 'BZ' },
  'Anguilla':                         { lat: 18.22,  lon: -63.07,  region: REGION.OFFSHORE, tz: -4,   iso: 'AI' },
  'Saint Kitts and Nevis':            { lat: 17.36,  lon: -62.78,  region: REGION.OFFSHORE, tz: -4,   iso: 'KN' },
  'Turks and Caicos Islands':         { lat: 21.69,  lon: -71.80,  region: REGION.OFFSHORE, tz: -5,   iso: 'TC' },
  'Mauritius':                        { lat: -20.35, lon: 57.55,   region: REGION.OFFSHORE, tz: 4,    iso: 'MU' },
  'Jersey':                           { lat: 49.21,  lon: -2.13,   region: REGION.OFFSHORE, tz: 0,    iso: 'JE' },
  'Guernsey':                         { lat: 49.45,  lon: -2.58,   region: REGION.OFFSHORE, tz: 0,    iso: 'GG' },
  'Cook Islands':                     { lat: -21.24, lon: -159.78, region: REGION.OFFSHORE, tz: -10,  iso: 'CK' },
  'Jamaica':                          { lat: 18.11,  lon: -77.30,  region: REGION.OFFSHORE, tz: -5,   iso: 'JM' },
  'Barbados':                         { lat: 13.19,  lon: -59.54,  region: REGION.OFFSHORE, tz: -4,   iso: 'BB' },
  'Panama':                           { lat: 8.98,   lon: -79.52,  region: REGION.LATAM,    tz: -5,   iso: 'PA' },
  'Costa Rica':                       { lat: 9.93,   lon: -84.09,  region: REGION.LATAM,    tz: -6,   iso: 'CR' },
  'El Salvador':                      { lat: 13.69,  lon: -89.22,  region: REGION.LATAM,    tz: -6,   iso: 'SV' },
  'Brazil':                           { lat: -15.79, lon: -47.88,  region: REGION.LATAM,    tz: -3,   iso: 'BR' },
  'Chile':                            { lat: -33.45, lon: -70.67,  region: REGION.LATAM,    tz: -4,   iso: 'CL' },
  'Argentina':                        { lat: -34.60, lon: -58.38,  region: REGION.LATAM,    tz: -3,   iso: 'AR' },
  'Mexico':                           { lat: 19.43,  lon: -99.13,  region: REGION.LATAM,    tz: -6,   iso: 'MX' },
  'Colombia':                         { lat: 4.71,   lon: -74.07,  region: REGION.LATAM,    tz: -5,   iso: 'CO' },
  'Peru':                             { lat: -12.05, lon: -77.04,  region: REGION.LATAM,    tz: -5,   iso: 'PE' },
  'Uruguay':                          { lat: -34.90, lon: -56.16,  region: REGION.LATAM,    tz: -3,   iso: 'UY' },
  'Venezuela':                        { lat: 10.48,  lon: -66.90,  region: REGION.LATAM,    tz: -4,   iso: 'VE' },
  'United States':                    { lat: 39.50,  lon: -98.35,  region: REGION.NAM,      tz: -5,   iso: 'US' },
  'Canada':                           { lat: 45.42,  lon: -75.70,  region: REGION.NAM,      tz: -5,   iso: 'CA' },
  'Lithuania':                        { lat: 54.69,  lon: 25.28,   region: REGION.EUROPE,   tz: 2,    iso: 'LT' },
  'Estonia':                          { lat: 59.44,  lon: 24.75,   region: REGION.EUROPE,   tz: 2,    iso: 'EE' },
  'Latvia':                           { lat: 56.95,  lon: 24.11,   region: REGION.EUROPE,   tz: 2,    iso: 'LV' },
  'United Kingdom':                   { lat: 51.51,  lon: -0.13,   region: REGION.EUROPE,   tz: 0,    iso: 'GB' },
  'Luxembourg':                       { lat: 49.61,  lon: 6.13,    region: REGION.EUROPE,   tz: 1,    iso: 'LU' },
  'Netherlands':                      { lat: 52.37,  lon: 4.90,    region: REGION.EUROPE,   tz: 1,    iso: 'NL' },
  'Germany':                          { lat: 52.52,  lon: 13.40,   region: REGION.EUROPE,   tz: 1,    iso: 'DE' },
  'France':                           { lat: 48.86,  lon: 2.35,    region: REGION.EUROPE,   tz: 1,    iso: 'FR' },
  'Spain':                            { lat: 40.42,  lon: -3.70,   region: REGION.EUROPE,   tz: 1,    iso: 'ES' },
  'Italy':                            { lat: 41.90,  lon: 12.50,   region: REGION.EUROPE,   tz: 1,    iso: 'IT' },
  'Austria':                          { lat: 48.21,  lon: 16.37,   region: REGION.EUROPE,   tz: 1,    iso: 'AT' },
  'Switzerland':                      { lat: 46.95,  lon: 7.44,    region: REGION.EUROPE,   tz: 1,    iso: 'CH' },
  'Poland':                           { lat: 52.23,  lon: 21.01,   region: REGION.EUROPE,   tz: 1,    iso: 'PL' },
  'Norway':                           { lat: 59.91,  lon: 10.75,   region: REGION.EUROPE,   tz: 1,    iso: 'NO' },
  'Sweden':                           { lat: 59.33,  lon: 18.07,   region: REGION.EUROPE,   tz: 1,    iso: 'SE' },
  'Denmark':                          { lat: 55.68,  lon: 12.57,   region: REGION.EUROPE,   tz: 1,    iso: 'DK' },
  'Finland':                          { lat: 60.17,  lon: 24.94,   region: REGION.EUROPE,   tz: 2,    iso: 'FI' },
  'Ireland':                          { lat: 53.35,  lon: -6.26,   region: REGION.EUROPE,   tz: 0,    iso: 'IE' },
  'Portugal':                         { lat: 38.72,  lon: -9.14,   region: REGION.EUROPE,   tz: 0,    iso: 'PT' },
  'Belgium':                          { lat: 50.85,  lon: 4.35,    region: REGION.EUROPE,   tz: 1,    iso: 'BE' },
  'Czech Republic':                   { lat: 50.08,  lon: 14.44,   region: REGION.EUROPE,   tz: 1,    iso: 'CZ' },
  'Slovakia':                         { lat: 48.15,  lon: 17.11,   region: REGION.EUROPE,   tz: 1,    iso: 'SK' },
  'Slovenia':                         { lat: 46.06,  lon: 14.51,   region: REGION.EUROPE,   tz: 1,    iso: 'SI' },
  'Croatia':                          { lat: 45.81,  lon: 15.98,   region: REGION.EUROPE,   tz: 1,    iso: 'HR' },
  'Serbia':                           { lat: 44.79,  lon: 20.45,   region: REGION.EUROPE,   tz: 1,    iso: 'RS' },
  'Romania':                          { lat: 44.43,  lon: 26.10,   region: REGION.EUROPE,   tz: 2,    iso: 'RO' },
  'Bulgaria':                         { lat: 42.70,  lon: 23.32,   region: REGION.EUROPE,   tz: 2,    iso: 'BG' },
  'Hungary':                          { lat: 47.50,  lon: 19.04,   region: REGION.EUROPE,   tz: 1,    iso: 'HU' },
  'Greece':                           { lat: 37.98,  lon: 23.73,   region: REGION.EUROPE,   tz: 2,    iso: 'GR' },
  'Cyprus':                           { lat: 35.13,  lon: 33.43,   region: REGION.EUROPE,   tz: 2,    iso: 'CY' },
  'Iceland':                          { lat: 64.15,  lon: -21.94,  region: REGION.EUROPE,   tz: 0,    iso: 'IS' },
  'Liechtenstein':                    { lat: 47.14,  lon: 9.52,    region: REGION.EUROPE,   tz: 1,    iso: 'LI' },
  'Monaco':                           { lat: 43.74,  lon: 7.42,    region: REGION.EUROPE,   tz: 1,    iso: 'MC' },
  'Ukraine':                          { lat: 50.45,  lon: 30.52,   region: REGION.EUROPE,   tz: 2,    iso: 'UA' },
  'Belarus':                          { lat: 53.90,  lon: 27.57,   region: REGION.EUROPE,   tz: 3,    iso: 'BY' },
  'Russia':                           { lat: 55.75,  lon: 37.62,   region: REGION.EUROPE,   tz: 3,    iso: 'RU' },
  'Singapore':                        { lat: 1.35,   lon: 103.82,  region: REGION.ASIA,     tz: 8,    iso: 'SG' },
  'Hong Kong':                        { lat: 22.32,  lon: 114.17,  region: REGION.ASIA,     tz: 8,    iso: 'HK' },
  'China':                            { lat: 39.90,  lon: 116.41,  region: REGION.ASIA,     tz: 8,    iso: 'CN' },
  'Japan':                            { lat: 35.68,  lon: 139.69,  region: REGION.ASIA,     tz: 9,    iso: 'JP' },
  'South Korea':                      { lat: 37.57,  lon: 126.98,  region: REGION.ASIA,     tz: 9,    iso: 'KR' },
  'Taiwan':                           { lat: 25.03,  lon: 121.57,  region: REGION.ASIA,     tz: 8,    iso: 'TW' },
  'Australia':                        { lat: -33.87, lon: 151.21,  region: REGION.ASIA,     tz: 10,   iso: 'AU' },
  'New Zealand':                      { lat: -41.29, lon: 174.78,  region: REGION.ASIA,     tz: 12,   iso: 'NZ' },
  'Thailand':                         { lat: 13.75,  lon: 100.50,  region: REGION.ASIA,     tz: 7,    iso: 'TH' },
  'Indonesia':                        { lat: -6.21,  lon: 106.85,  region: REGION.ASIA,     tz: 7,    iso: 'ID' },
  'Malaysia':                         { lat: 3.14,   lon: 101.69,  region: REGION.ASIA,     tz: 8,    iso: 'MY' },
  'Philippines':                      { lat: 14.60,  lon: 120.98,  region: REGION.ASIA,     tz: 8,    iso: 'PH' },
  'Vietnam':                          { lat: 21.03,  lon: 105.85,  region: REGION.ASIA,     tz: 7,    iso: 'VN' },
  'India':                            { lat: 28.61,  lon: 77.21,   region: REGION.ASIA,     tz: 5.5,  iso: 'IN' },
  'Pakistan':                         { lat: 33.69,  lon: 73.05,   region: REGION.ASIA,     tz: 5,    iso: 'PK' },
  'Bangladesh':                       { lat: 23.81,  lon: 90.41,   region: REGION.ASIA,     tz: 6,    iso: 'BD' },
  'Sri Lanka':                        { lat: 6.93,   lon: 79.86,   region: REGION.ASIA,     tz: 5.5,  iso: 'LK' },
  'Cambodia':                         { lat: 11.56,  lon: 104.92,  region: REGION.ASIA,     tz: 7,    iso: 'KH' },
  'Kazakhstan':                       { lat: 51.17,  lon: 71.45,   region: REGION.ASIA,     tz: 5,    iso: 'KZ' },
  'Mongolia':                         { lat: 47.89,  lon: 106.91,  region: REGION.ASIA,     tz: 8,    iso: 'MN' },
  'Uzbekistan':                       { lat: 41.30,  lon: 69.24,   region: REGION.ASIA,     tz: 5,    iso: 'UZ' },
  'Nepal':                            { lat: 27.72,  lon: 85.32,   region: REGION.ASIA,     tz: 5.75, iso: 'NP' },
  'United Arab Emirates':             { lat: 25.20,  lon: 55.27,   region: REGION.MEA,      tz: 4,    iso: 'AE' },
  'Turkey':                           { lat: 41.01,  lon: 28.98,   region: REGION.MEA,      tz: 3,    iso: 'TR' },
  'Israel':                           { lat: 31.77,  lon: 35.21,   region: REGION.MEA,      tz: 2,    iso: 'IL' },
  'Georgia':                          { lat: 41.72,  lon: 44.78,   region: REGION.MEA,      tz: 4,    iso: 'GE' },
  'Armenia':                          { lat: 40.18,  lon: 44.51,   region: REGION.MEA,      tz: 4,    iso: 'AM' },
  'Azerbaijan':                       { lat: 40.41,  lon: 49.87,   region: REGION.MEA,      tz: 4,    iso: 'AZ' },
  'Saudi Arabia':                     { lat: 24.71,  lon: 46.68,   region: REGION.MEA,      tz: 3,    iso: 'SA' },
  'Qatar':                            { lat: 25.29,  lon: 51.53,   region: REGION.MEA,      tz: 3,    iso: 'QA' },
  'Bahrain':                          { lat: 26.07,  lon: 50.55,   region: REGION.MEA,      tz: 3,    iso: 'BH' },
  'Kuwait':                           { lat: 29.38,  lon: 47.99,   region: REGION.MEA,      tz: 3,    iso: 'KW' },
  'Oman':                             { lat: 23.59,  lon: 58.41,   region: REGION.MEA,      tz: 4,    iso: 'OM' },
  'Jordan':                           { lat: 31.95,  lon: 35.93,   region: REGION.MEA,      tz: 3,    iso: 'JO' },
  'Lebanon':                          { lat: 33.89,  lon: 35.50,   region: REGION.MEA,      tz: 3,    iso: 'LB' },
  'South Africa':                     { lat: -26.20, lon: 28.05,   region: REGION.MEA,      tz: 2,    iso: 'ZA' },
  'Nigeria':                          { lat: 9.08,   lon: 8.68,    region: REGION.MEA,      tz: 1,    iso: 'NG' },
  'Kenya':                            { lat: -1.29,  lon: 36.82,   region: REGION.MEA,      tz: 3,    iso: 'KE' },
  'Ghana':                            { lat: 5.60,   lon: -0.19,   region: REGION.MEA,      tz: 0,    iso: 'GH' },
  'Egypt':                            { lat: 30.04,  lon: 31.24,   region: REGION.MEA,      tz: 2,    iso: 'EG' },
  'Morocco':                          { lat: 33.97,  lon: -6.85,   region: REGION.MEA,      tz: 1,    iso: 'MA' },
  'Tunisia':                          { lat: 36.81,  lon: 10.18,   region: REGION.MEA,      tz: 1,    iso: 'TN' },
  'Tanzania':                         { lat: -6.79,  lon: 39.21,   region: REGION.MEA,      tz: 3,    iso: 'TZ' },
  'Uganda':                           { lat: 0.35,   lon: 32.58,   region: REGION.MEA,      tz: 3,    iso: 'UG' },
};

/* Label untuk bursa tanpa negara terdaftar */
export const UNKNOWN_LABELS = new Set(['Unknown', 'Unknown or Invalid Region', '', null, undefined]);

/* ---------- TTL cache (ms) ---------- */
export const TTL = {
  exchanges: 10 * 60 * 1000,
  markets: 3 * 60 * 1000,
  global: 10 * 60 * 1000,
  candles: 20 * 60 * 1000,
  geo: 30 * 24 * 60 * 60 * 1000,
};
