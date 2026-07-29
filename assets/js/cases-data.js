/* ============================================================
   cases-data.js — data runtime halaman Cases.
   - Snapshot pasar 8 koin: CoinGecko /coins/markets (1 panggilan).
   - Kline mingguan per koin: bursa dengan listing paling awal
     yang tersedia (urutan provider dikurasi per koin), fallback
     otomatis bila provider diblokir jaringan.
   - Metrik launchpad: DeFiLlama summary dexs (volume) + fees
     (dailyRevenue).
   Semua di-cache localStorage.
   ============================================================ */

import { CASES, LAUNCHPADS } from './cases-config.js';

const CACHE_PREFIX = 'chv:cases:';
const TTL_MARKETS = 5 * 60 * 1000;
const TTL_KLINES = 24 * 60 * 60 * 1000; // histori mingguan: cukup 1x/hari
const TTL_LAUNCHPADS = 5 * 60 * 1000;

function cacheGet(key, ttl) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || Date.now() - obj.t > ttl) return null;
    return obj.v;
  } catch {
    return null;
  }
}

function cacheSet(key, value) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ t: Date.now(), v: value }));
  } catch { /* kuota penuh — lewati */ }
}

/* Cache tanpa TTL — dipakai saat sumber gagal (mis. 429 CoinGecko).
   Dengan auto-refresh tiap menit, batas rate sesekali pasti tersentuh;
   data sedikit basi jauh lebih berguna daripada halaman kosong. */
function cacheGetStale(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return obj && 'v' in obj ? obj.v : null;
  } catch {
    return null;
  }
}

async function withStaleFallback(key, fetcher) {
  try {
    return await fetcher();
  } catch (err) {
    const stale = cacheGetStale(key);
    if (stale) {
      console.warn(`source failed (${err.message}) — using stale cache for ${key}`);
      return stale;
    }
    throw err;
  }
}

export function clearCasesCache() {
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith(CACHE_PREFIX)) localStorage.removeItem(k);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url, { timeout = 20000, retries = 2 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/json' } });
      if (res.status === 429) throw new Error('rate limit (429)');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await sleep(1200 * (attempt + 1));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

/* ---------------- 1. Snapshot pasar ---------------- */

export async function fetchCaseMarkets({ force = false } = {}) {
  const key = 'markets';
  if (!force) {
    const hit = cacheGet(key, TTL_MARKETS);
    if (hit) return hit;
  }
  return withStaleFallback(key, async () => {
    try {
      const response = await fetch(`/api/market?resource=overview&t=${Math.floor(Date.now() / 10_000)}`);
      if (response.ok) {
        const payload = await response.json();
        const selected = (payload.memecoins || []).filter((row) => CASES.some((item) => item.id === row.id));
        if (selected.length) {
          const byId = Object.fromEntries(selected.map((row) => [row.id, {
            id: row.id,
            price: row.price,
            mcap: row.mcap,
            vol: row.vol,
            ath: row.ath,
            athDate: row.athDate,
            athPct: row.athPct,
            ch24h: row.ch24h,
            ch7d: row.ch7d,
            rank: row.rank,
            image: row.image,
          }]));
          cacheSet(key, byId);
          return byId;
        }
      }
    } catch (error) {
      console.warn('backend cases fallback:', error.message);
    }
    const ids = CASES.map((c) => c.id).join(',');
    const rows = await getJSON(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&price_change_percentage=24h,7d`,
    );
    if (!Array.isArray(rows) || !rows.length) throw new Error('snapshot pasar kosong');
    const byId = {};
    for (const r of rows) {
      byId[r.id] = {
        id: r.id,
        price: r.current_price,
        mcap: r.market_cap,
        vol: r.total_volume,
        ath: r.ath,
        athDate: r.ath_date,
        athPct: r.ath_change_percentage,
        ch24h: r.price_change_percentage_24h_in_currency ?? r.price_change_percentage_24h,
        ch7d: r.price_change_percentage_7d_in_currency,
        rank: r.market_cap_rank,
        image: r.image,
      };
    }
    cacheSet(key, byId);
    return byId;
  });
}

/* ---------------- 2. Kline mingguan ---------------- */

/**
 * Ambil kline mingguan untuk satu kasus.
 * Provider dicoba sesuai urutan kurasi (listing paling awal dulu).
 * @returns { provider, rows, failed[] }
 */
export async function fetchWeekly(caseDef, { force = false } = {}) {
  const key = `weekly:${caseDef.id}`;
  if (!force) {
    const hit = cacheGet(key, TTL_KLINES);
    if (hit) return { ...hit, cached: true };
  }
  const payload = await getJSON(
    `/api/market?resource=caseweekly&id=${encodeURIComponent(caseDef.id)}&t=${Math.floor(Date.now() / 10_000)}`,
    { timeout: 30_000 },
  );
  if (!payload?.ok || !Array.isArray(payload.rows)) {
    throw new Error(payload?.error || 'Weekly candle data is unavailable');
  }
  const value = {
    provider: payload.provider,
    rows: payload.rows,
    failed: payload.failed || [],
  };
  cacheSet(key, value);
  return { ...value, cached: payload.cache === 'hit' };
}

/* ---------------- 3. Metrik launchpad ---------------- */

async function llamaSummary(kind, slug) {
  const params = new URLSearchParams({
    excludeTotalDataChart: 'true',
    excludeTotalDataChartBreakdown: 'true',
  });
  if (kind === 'fees') params.set('dataType', 'dailyRevenue');
  return getJSON(`https://api.llama.fi/summary/${kind}/${encodeURIComponent(slug)}?${params}`);
}

const num = (v) => (Number.isFinite(v) ? v : null);

export async function fetchLaunchpads({ force = false } = {}) {
  const key = 'launchpads';
  if (!force) {
    const hit = cacheGet(key, TTL_LAUNCHPADS);
    if (hit) return hit;
  }

  return withStaleFallback(key, async () => {
  const rows = await Promise.all(LAUNCHPADS.map(async (lp) => {
    const [vol, rev] = await Promise.allSettled([
      llamaSummary('dexs', lp.slug),
      llamaSummary('fees', lp.slug),
    ]);
    const v = vol.status === 'fulfilled' ? vol.value : null;
    const r = rev.status === 'fulfilled' ? rev.value : null;
    return {
      ...lp,
      vol24h: num(v?.total24h),
      vol7d: num(v?.total7d),
      volCh1d: num(v?.change_1d),
      rev24h: num(r?.total24h),
      rev7d: num(r?.total7d),
      revCh1d: num(r?.change_1d),
    };
  }));

  rows.sort((a, b) => (b.rev24h ?? -1) - (a.rev24h ?? -1));
  cacheSet(key, rows);
  return rows;
  });
}
