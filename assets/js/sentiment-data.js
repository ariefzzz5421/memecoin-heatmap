/* ============================================================
   sentiment-data.js — metrik aktivitas platform dari DeFiLlama.
   "Sentiment" di halaman ini berarti momentum volume/revenue,
   bukan analisis opini media sosial.
   ============================================================ */

const LLAMA = 'https://api.llama.fi';
const CACHE_KEY = 'chv:platform-pulse:v2';
const CACHE_TTL = 5 * 60 * 1000;

export const PLATFORM_DEFINITIONS = [
  { id: 'pumpfun', name: 'Pump.fun', slug: 'pump.fun', accent: '#6da7ec' },
  { id: 'fomo', name: 'Fomo', slug: 'fomo-wallet', accent: '#b7d3f6' },
  { id: 'gmgn', name: 'GMGN', slug: 'gmgn', accent: '#f0b429' },
  { id: 'pons', name: 'Pons Launchpad', slug: 'pons', accent: '#ec835a' },
  { id: 'virtuals', name: 'Virtuals Protocol', slug: 'virtuals-protocol', accent: '#d05d5d' },
];

function readCache() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (!parsed || Date.now() - parsed.savedAt > CACHE_TTL) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

function writeCache(value) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), value }));
  } catch {
    // Data tetap bisa ditampilkan tanpa cache.
  }
}

async function getSummary(kind, slug, { signal } = {}) {
  const params = new URLSearchParams({
    excludeTotalDataChart: 'true',
    excludeTotalDataChartBreakdown: 'false',
  });
  if (kind === 'fees') params.set('dataType', 'dailyRevenue');

  const response = await fetch(`${LLAMA}/summary/${kind}/${encodeURIComponent(slug)}?${params}`, {
    signal,
    headers: { accept: 'application/json' },
  });
  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || `HTTP ${response.status}`);
  }
  return response.json();
}

function cleanChainBreakdown(summary) {
  const out = {};
  for (const [chain, values] of Object.entries(summary?.chainBreakdown || {})) {
    out[chain] = {
      total24h: Number.isFinite(values?.total24h) ? values.total24h : null,
      previous24h: Number.isFinite(values?.total48hto24h) ? values.total48hto24h : null,
      change1d: Number.isFinite(values?.change_1d) ? values.change_1d : null,
    };
  }
  return out;
}

function metric(summary) {
  if (!summary) return null;
  return {
    total24h: Number.isFinite(summary.total24h) ? summary.total24h : null,
    previous24h: Number.isFinite(summary.total48hto24h) ? summary.total48hto24h : null,
    change1d: Number.isFinite(summary.change_1d) ? summary.change_1d : null,
    total7d: Number.isFinite(summary.total7d) ? summary.total7d : null,
    chains: Array.isArray(summary.chains) ? summary.chains : [],
    chainBreakdown: cleanChainBreakdown(summary),
  };
}

function momentumLabel(volume, revenue) {
  const available = [volume?.change1d, revenue?.change1d].filter(Number.isFinite);
  if (!available.length) return { key: 'unknown', label: 'Belum ada data', score: null };
  const score = available.reduce((sum, value) => sum + value, 0) / available.length;
  if (score >= 20) return { key: 'hot', label: 'Memanas', score };
  if (score >= 5) return { key: 'up', label: 'Menguat', score };
  if (score <= -20) return { key: 'cold', label: 'Mendingin', score };
  if (score <= -5) return { key: 'down', label: 'Melemah', score };
  return { key: 'flat', label: 'Netral', score };
}

async function fetchOne(definition, signal) {
  const [volumeResult, revenueResult] = await Promise.allSettled([
    getSummary('dexs', definition.slug, { signal }),
    getSummary('fees', definition.slug, { signal }),
  ]);

  const volume = volumeResult.status === 'fulfilled' ? metric(volumeResult.value) : null;
  const revenue = revenueResult.status === 'fulfilled' ? metric(revenueResult.value) : null;

  return {
    ...definition,
    volume,
    revenue,
    momentum: momentumLabel(volume, revenue),
    volumeState: volume ? 'available' : 'unavailable',
    revenueState: revenue ? 'available' : 'unavailable',
    volumeNote: volume
      ? 'Spot / swap volume tracked by DeFiLlama'
      : definition.id === 'pons'
        ? 'Protocol trading volume belum diindeks; angka volume tidak diestimasi'
        : 'Volume 24 jam tidak tersedia dari sumber',
    revenueNote: revenue
      ? 'Protocol revenue tracked by DeFiLlama'
      : 'Revenue 24 jam tidak tersedia dari sumber',
  };
}

function buildChains(platforms) {
  const chains = new Map();
  for (const platform of platforms) {
    const names = new Set([
      ...Object.keys(platform.volume?.chainBreakdown || {}),
      ...Object.keys(platform.revenue?.chainBreakdown || {}),
    ]);
    for (const name of names) {
      if (!chains.has(name)) {
        chains.set(name, { name, volume24h: 0, revenue24h: 0, platforms: new Set(), volumeCoverage: 0 });
      }
      const row = chains.get(name);
      const volume = platform.volume?.chainBreakdown?.[name]?.total24h;
      const revenue = platform.revenue?.chainBreakdown?.[name]?.total24h;
      if (Number.isFinite(volume)) {
        row.volume24h += volume;
        row.volumeCoverage++;
      }
      if (Number.isFinite(revenue)) row.revenue24h += revenue;
      if (Number.isFinite(volume) || Number.isFinite(revenue)) row.platforms.add(platform.name);
    }
  }

  return [...chains.values()]
    .map((row) => ({ ...row, platforms: [...row.platforms] }))
    .sort((a, b) => b.volume24h - a.volume24h || b.revenue24h - a.revenue24h);
}

export async function fetchPlatformPulse({ force = false } = {}) {
  if (!force) {
    const cached = readCache();
    if (cached) return { ...cached, cached: true };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const platforms = await Promise.all(
      PLATFORM_DEFINITIONS.map((definition) => fetchOne(definition, controller.signal)),
    );
    const chains = buildChains(platforms);
    const value = {
      platforms,
      chains,
      hottestChain: chains[0] || null,
      fetchedAt: Date.now(),
      source: 'DeFiLlama',
    };
    writeCache(value);
    return { ...value, cached: false };
  } finally {
    clearTimeout(timer);
  }
}

export function clearPlatformPulseCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // noop
  }
}
