/* ============================================================
   datasource.js — lapisan pengambilan data real
   Sumber: CoinGecko (volume bursa & memecoin), OKX/Binance/Kraken
   (candle 1 jam untuk analisa jam aktif).
   Semua di-cache di localStorage dengan TTL.
   ============================================================ */

import { TTL } from './config.js';

const CG = 'https://api.coingecko.com/api/v3';
const CACHE_PREFIX = 'chv:';

/* ---------------- cache helper ---------------- */

function cacheGet(key, ttl) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj.t !== 'number') return null;
    if (Date.now() - obj.t > ttl) return null;
    return obj.v;
  } catch {
    return null;
  }
}

function cacheSet(key, value) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ t: Date.now(), v: value }));
  } catch {
    // kuota penuh — buang cache lama lalu abaikan
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith(CACHE_PREFIX) && !k.includes('geo')) localStorage.removeItem(k);
      }
    } catch { /* noop */ }
  }
}

/* Baca cache TANPA memedulikan TTL — dipakai sebagai fallback saat sumber
   gagal (mis. 429). Data basi berlabel jelas lebih berguna daripada halaman
   error. */
function cacheGetStale(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return obj && 'v' in obj ? { value: obj.v, ageMs: Date.now() - obj.t } : null;
  } catch {
    return null;
  }
}

/* Jalankan fetcher; bila gagal dan ada cache lama, pakai cache lama. */
async function withStaleFallback(key, fetcher) {
  try {
    return await fetcher();
  } catch (err) {
    const stale = cacheGetStale(key);
    if (stale) {
      console.warn(`sumber gagal (${err.message}) — memakai cache ${Math.round(stale.ageMs / 60000)} menit untuk ${key}`);
      return stale.value;
    }
    throw err;
  }
}

export function cacheAge(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    return Date.now() - JSON.parse(raw).t;
  } catch {
    return null;
  }
}

export function clearCache() {
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith(CACHE_PREFIX)) localStorage.removeItem(k);
  }
}

/* ---------------- fetch helper ---------------- */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url, { retries = 2, timeout = 20000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/json' } });
      clearTimeout(timer);
      if (res.status === 429) {
        await sleep(1500 * (attempt + 1));
        lastErr = new Error('rate limited (429)');
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < retries) await sleep(600 * (attempt + 1));
    }
  }
  throw lastErr;
}

/* ============================================================
   1. Volume bursa per yurisdiksi (CoinGecko /exchanges)
   ============================================================ */

export async function fetchExchanges({ pages = 2, force = false } = {}) {
  const key = `exchanges:${pages}`;
  if (!force) {
    const hit = cacheGet(key, TTL.exchanges);
    if (hit) return hit;
  }
  return withStaleFallback(key, async () => {
    const out = [];
    for (let p = 1; p <= pages; p++) {
      const rows = await getJSON(`${CG}/exchanges?per_page=100&page=${p}`);
      if (!Array.isArray(rows) || rows.length === 0) break;
      out.push(...rows);
      if (p < pages) await sleep(400);
    }
    const slim = out.map((r) => ({
      id: r.id,
      name: r.name,
      country: r.country,
      year: r.year_established,
      url: r.url,
      image: r.image,
      trust: r.trust_score,
      rank: r.trust_score_rank,
      volBtc: r.trade_volume_24h_btc || 0,
    }));
    if (!slim.length) throw new Error('daftar bursa kosong');
    cacheSet(key, slim);
    return slim;
  });
}

/* Harga BTC untuk konversi volume BTC -> USD */
export async function fetchBtcPrice({ force = false } = {}) {
  const key = 'btcusd';
  if (!force) {
    const hit = cacheGet(key, TTL.global);
    if (hit) return hit;
  }
  return withStaleFallback(key, async () => {
    const j = await getJSON(`${CG}/simple/price?ids=bitcoin&vs_currencies=usd`);
    const p = j?.bitcoin?.usd;
    if (!p) throw new Error('harga BTC tidak tersedia');
    cacheSet(key, p);
    return p;
  });
}

/* ============================================================
   2. Pasar memecoin (CoinGecko /coins/markets, kategori meme-token)
   ============================================================ */

export async function fetchMemecoins({ limit = 100, force = false } = {}) {
  const key = `meme:${limit}`;
  if (!force) {
    const hit = cacheGet(key, TTL.markets);
    if (hit) return hit;
  }
  return withStaleFallback(key, async () => {
  const url =
    `${CG}/coins/markets?vs_currency=usd&category=meme-token&order=volume_desc` +
    `&per_page=${limit}&page=1&price_change_percentage=1h,24h,7d`;
  const rows = await getJSON(url);
  const slim = (rows || []).map((r) => ({
    id: r.id,
    sym: (r.symbol || '').toUpperCase(),
    name: r.name,
    image: r.image,
    price: r.current_price,
    mcap: r.market_cap,
    rank: r.market_cap_rank,
    vol: r.total_volume || 0,
    ch1h: r.price_change_percentage_1h_in_currency,
    ch24h: r.price_change_percentage_24h_in_currency ?? r.price_change_percentage_24h,
    ch7d: r.price_change_percentage_7d_in_currency,
    high24: r.high_24h,
    low24: r.low_24h,
  }));
  cacheSet(key, slim);
  return slim;
  });
}

/* Statistik pasar global */
export async function fetchGlobal({ force = false } = {}) {
  const key = 'global';
  if (!force) {
    const hit = cacheGet(key, TTL.global);
    if (hit) return hit;
  }
  return withStaleFallback(key, async () => {
    const j = await getJSON(`${CG}/global`);
    const d = j?.data || {};
    const slim = {
      mcapUsd: d.total_market_cap?.usd || 0,
      volUsd: d.total_volume?.usd || 0,
      btcDom: d.market_cap_percentage?.btc || 0,
      markets: d.markets || 0,
      coins: d.active_cryptocurrencies || 0,
      mcapChange24h: d.market_cap_change_percentage_24h_usd || 0,
    };
    cacheSet(key, slim);
    return slim;
  });
}

/* ============================================================
   3. Candle 1 jam — untuk analisa jam aktif
   Rantai fallback: Binance -> OKX -> Kraken.
   Bentuk keluaran: [{ t: msOpenTime, q: quoteVolumeUSD, c: close }]
   ============================================================ */

const HOUR = 3600 * 1000;

const PROVIDERS = [
  {
    id: 'binance',
    label: 'Binance',
    maxHours: 2160,
    pageSize: 1000,
    symbolOf: (c) => c.binance,
    async page(symbol, endMs, limit) {
      const bases = ['https://api.binance.com', 'https://api-gcp.binance.com', 'https://api1.binance.com'];
      let err;
      for (const b of bases) {
        try {
          const u = `${b}/api/v3/klines?symbol=${symbol}&interval=1h&limit=${limit}` +
                    (endMs ? `&endTime=${endMs}` : '');
          const rows = await getJSON(u, { retries: 0, timeout: 12000 });
          if (!Array.isArray(rows)) throw new Error('bentuk data tak terduga');
          return rows.map((r) => ({ t: +r[0], q: +r[7], c: +r[4] }));
        } catch (e) { err = e; }
      }
      throw err;
    },
  },
  {
    id: 'okx',
    label: 'OKX',
    maxHours: 2160,
    pageSize: 300,
    symbolOf: (c) => c.okx,
    async page(symbol, endMs, limit) {
      const u = `https://www.okx.com/api/v5/market/candles?instId=${symbol}&bar=1H&limit=${limit}` +
                (endMs ? `&after=${endMs}` : '');
      const j = await getJSON(u, { retries: 1, timeout: 15000 });
      if (j.code !== '0') throw new Error(`OKX ${j.code}: ${j.msg}`);
      // OKX: [ts, o, h, l, c, vol, volCcy, volCcyQuote, confirm] — urutan terbaru dulu
      return (j.data || []).map((r) => ({ t: +r[0], q: +r[7], c: +r[4] })).reverse();
    },
  },
  {
    id: 'kraken',
    label: 'Kraken',
    maxHours: 720,
    pageSize: 720,
    symbolOf: (c) => c.kraken,
    async page(symbol, endMs, limit) {
      const u = `https://api.kraken.com/0/public/OHLC?pair=${symbol}&interval=60`;
      const j = await getJSON(u, { retries: 1, timeout: 15000 });
      if (j.error?.length) throw new Error(`Kraken: ${j.error.join(', ')}`);
      const arrKey = Object.keys(j.result || {}).find((k) => k !== 'last');
      const rows = j.result?.[arrKey] || [];
      // Kraken: [time(s), o, h, l, c, vwap, volume, count]
      return rows.map((r) => ({ t: +r[0] * 1000, q: +r[6] * +r[5], c: +r[4] }));
    },
  },
];

/* Ambil candle 1 jam sebanyak `hours` untuk satu koin, dengan paginasi mundur. */
async function fetchCandlesFor(coin, hours, provider) {
  const symbol = provider.symbolOf(coin);
  if (!symbol) throw new Error(`${coin.key} tidak tersedia di ${provider.label}`);

  const want = Math.min(hours, provider.maxHours);
  const map = new Map();
  let cursor = null; // ms; ambil candle SEBELUM cursor

  for (let guard = 0; guard < 12 && map.size < want; guard++) {
    const limit = Math.min(provider.pageSize, want - map.size + 2);
    const rows = await provider.page(symbol, cursor, limit);
    if (!rows.length) break;

    let oldest = Infinity;
    for (const r of rows) {
      if (!Number.isFinite(r.t) || !Number.isFinite(r.q)) continue;
      map.set(r.t, r);
      if (r.t < oldest) oldest = r.t;
    }
    if (!Number.isFinite(oldest)) break;
    // provider yang tak mendukung paginasi (Kraken) berhenti di sini
    if (provider.pageSize >= provider.maxHours) break;
    const next = oldest;
    if (cursor !== null && next >= cursor) break; // tidak maju — hentikan
    cursor = next;
    await sleep(120);
  }

  const out = [...map.values()].sort((a, b) => a.t - b.t);
  return out.slice(-want);
}

/**
 * Ambil candle untuk sekumpulan koin.
 * @returns { provider, series: Map<coinKey, rows[]>, failed: [{key, reason}] }
 */
export async function fetchCandleSet(coins, hours, { force = false, onProgress } = {}) {
  const bucket = hours > 720 ? 2160 : 720; // simpan histori panjang, iris sesuai timeframe
  const cacheKey = `candles:${bucket}:${coins.map((c) => c.key).join(',')}`;

  if (!force) {
    const hit = cacheGet(cacheKey, TTL.candles);
    if (hit) {
      return {
        provider: hit.provider,
        series: new Map(Object.entries(hit.series)),
        failed: hit.failed || [],
        cached: true,
      };
    }
  }

  let lastErr = null;
  for (const provider of PROVIDERS) {
    const usable = coins.filter((c) => provider.symbolOf(c));
    if (!usable.length) continue;

    const series = new Map();
    const failed = [];
    let done = 0;

    for (const coin of usable) {
      try {
        const rows = await fetchCandlesFor(coin, bucket, provider);
        if (rows.length < 24) throw new Error('data terlalu sedikit');
        series.set(coin.key, rows);
      } catch (e) {
        failed.push({ key: coin.key, reason: e.message || String(e) });
      }
      done++;
      onProgress?.(done, usable.length, provider.label);
    }

    // provider dianggap berhasil bila mayoritas koin terambil
    if (series.size >= Math.max(1, Math.ceil(usable.length / 2))) {
      for (const c of coins) {
        if (!provider.symbolOf(c) && !series.has(c.key)) {
          failed.push({ key: c.key, reason: `tidak ada pair di ${provider.label}` });
        }
      }
      const payload = {
        provider: provider.label,
        series: Object.fromEntries(series),
        failed,
      };
      cacheSet(cacheKey, payload);
      return { provider: provider.label, series, failed, cached: false };
    }
    lastErr = new Error(`${provider.label} gagal (${failed.map((f) => f.key).join(', ')})`);
  }

  throw lastErr || new Error('Semua sumber candle gagal dihubungi');
}

/* ============================================================
   4. Geometri peta dunia (world-atlas 110m, TopoJSON)
   ============================================================ */

const GEO_URLS = [
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',
  'https://unpkg.com/world-atlas@2/countries-110m.json',
];

export async function fetchWorldTopo() {
  const key = 'geo:110m';
  const hit = cacheGet(key, TTL.geo);
  if (hit) return hit;
  let lastErr;
  for (const url of GEO_URLS) {
    try {
      const topo = await getJSON(url, { retries: 1, timeout: 25000 });
      cacheSet(key, topo);
      return topo;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('gagal memuat peta dunia');
}
