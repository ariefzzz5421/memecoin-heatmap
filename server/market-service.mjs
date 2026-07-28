/* Market data service shared by Vercel Functions and the Sites worker.
   Upstream refresh is controlled here; the UI only polls this same-origin API. */

const CG = 'https://api.coingecko.com/api/v3';
const YAHOO = 'https://query1.finance.yahoo.com/v8/finance/chart';
const cache = new Map();

const TTL = {
  overview: 30_000,
  history: 60 * 60 * 1000,
  sentiment: 60_000,
};

const PLATFORMS = [
  { id: 'pumpfun', name: 'Pump.fun', slug: 'pump.fun', category: 'Launchpad', logo: '/assets/img/platforms/pump.fun.webp' },
  { id: 'fomo', name: 'Fomo', slug: 'fomo-wallet', category: 'Wallet spot', logo: '/assets/img/platforms/fomo-wallet.webp' },
  { id: 'gmgn', name: 'GMGN', slug: 'gmgn', category: 'Trading bot', logo: '/assets/img/platforms/gmgn.webp' },
  { id: 'pons', name: 'Pons Launchpad', slug: 'pons', category: 'Launchpad', logo: '/assets/img/platforms/pons.webp' },
  { id: 'virtuals', name: 'Virtuals Protocol', slug: 'virtuals-protocol', category: 'AI-agent launchpad', logo: '/assets/img/platforms/virtuals-protocol.webp' },
];

const MEME_IDS = new Map(Object.entries({
  DOGE: 'dogecoin',
  SHIB: 'shiba-inu',
  PEPE: 'pepe',
  PUMP: 'pump-fun',
  PENGU: 'pudgy-penguins',
  TRUMP: 'official-trump',
  SPX: 'spx6900',
  BONK: 'bonk',
  FLOKI: 'floki',
  WIF: 'dogwifcoin',
  FARTCOIN: 'fartcoin',
  BRETT: 'based-brett',
  MOG: 'mog-coin',
  TOSHI: 'toshi',
  BABYDOGE: 'baby-doge-coin',
  POPCAT: 'popcat',
  TURBO: 'turbo',
  PNUT: 'peanut-the-squirrel',
  BOME: 'book-of-meme',
  MEW: 'cat-in-a-dogs-world',
  NEIRO: 'first-neiro-on-ethereum',
  GIGA: 'gigachad-2',
  COQ: 'coq-inu',
  PONKE: 'ponke',
  MELANIA: 'melania-meme',
  DEGEN: 'degen-base',
}));

const EXCHANGE_COUNTRIES = {
  bitget: 'Seychelles',
  binance: 'Cayman Islands',
  okx: 'Seychelles',
  bybit: 'British Virgin Islands',
  gateio: 'Cayman Islands',
  gate: 'Cayman Islands',
  mexc: 'Seychelles',
  kucoin: 'Seychelles',
  huobi: 'Seychelles',
  htx: 'Seychelles',
  coinbase: 'United States',
  kraken: 'United States',
  upbit: 'South Korea',
  bitfinex: 'British Virgin Islands',
  whitebit: 'Lithuania',
  gemini: 'United States',
  bitstamp: 'Luxembourg',
  crypto_com: 'Cayman Islands',
  cryptocom: 'Cayman Islands',
  lbank: 'British Virgin Islands',
  bithumb: 'South Korea',
  bitmart: 'Cayman Islands',
  phemex: 'British Virgin Islands',
  coinex: 'Samoa',
  deribit: 'Panama',
  indodax: 'Indonesia',
  tokocrypto: 'Indonesia',
};

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJSON(url, { timeout = 18_000, retries = 1 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          accept: 'application/json',
          'user-agent': 'CryptoHeatmapVolume/1.0',
        },
      });
      if (response.status === 429 && attempt < retries) {
        await pause(900 * (attempt + 1));
        continue;
      }
      if (!response.ok) throw new Error(`${response.status} ${new URL(url).hostname}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < retries) await pause(500 * (attempt + 1));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || new Error('Upstream unavailable');
}

async function cached(key, ttl, loader) {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.savedAt < ttl) {
    return { ...hit.value, cache: 'hit', ageMs: now - hit.savedAt };
  }
  try {
    const value = await loader();
    cache.set(key, { savedAt: now, value });
    return { ...value, cache: 'miss', ageMs: 0 };
  } catch (error) {
    if (hit) {
      return {
        ...hit.value,
        cache: 'stale',
        ageMs: now - hit.savedAt,
        warning: `Live refresh failed: ${error.message}`,
      };
    }
    throw error;
  }
}

function slimExchange(row) {
  return {
    id: row.id,
    name: row.name,
    country: row.country,
    year: row.year_established,
    url: row.url,
    image: row.image,
    trust: row.trust_score,
    rank: row.trust_score_rank,
    volBtc: Number(row.trade_volume_24h_btc) || 0,
  };
}

function slimCoin(row) {
  return {
    id: row.id,
    sym: String(row.symbol || '').toUpperCase(),
    name: row.name,
    image: row.image,
    price: Number(row.current_price) || null,
    mcap: Number(row.market_cap) || null,
    rank: row.market_cap_rank,
    vol: Number(row.total_volume) || 0,
    ch1h: row.price_change_percentage_1h_in_currency,
    ch24h: row.price_change_percentage_24h_in_currency ?? row.price_change_percentage_24h,
    ch7d: row.price_change_percentage_7d_in_currency,
    high24: row.high_24h,
    low24: row.low_24h,
    ath: row.ath,
    athDate: row.ath_date,
    athPct: row.ath_change_percentage,
    circulatingSupply: row.circulating_supply,
  };
}

async function yahooPrice(symbol) {
  const json = await fetchJSON(`${YAHOO}/${encodeURIComponent(symbol)}?range=5d&interval=5m`, {
    timeout: 12_000,
  });
  const result = json?.chart?.result?.[0];
  const meta = result?.meta;
  if (!meta || !Number.isFinite(meta.regularMarketPrice)) throw new Error(`Yahoo ${symbol} empty`);
  const previous = Number(meta.chartPreviousClose);
  return {
    price: meta.regularMarketPrice,
    previousClose: Number.isFinite(previous) ? previous : null,
    changePct: Number.isFinite(previous) && previous !== 0
      ? ((meta.regularMarketPrice - previous) / previous) * 100
      : null,
  };
}

async function yahooCryptoScreener() {
  const json = await fetchJSON(
    'https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved' +
    '?count=250&scrIds=all_cryptocurrencies_us',
    { timeout: 15_000 },
  );
  return (json?.finance?.result?.[0]?.quotes || [])
    .map((row) => {
      const sym = String(row.fromCurrency || row.symbol?.replace(/-USD$/, '') || '').toUpperCase();
      const id = MEME_IDS.get(sym);
      if (!id) return null;
      return {
        id,
        sym,
        name: String(row.shortName || row.longName || sym).replace(/\s+USD$/, ''),
        image: row.coinImageUrl || row.logoUrl || null,
        price: Number(row.regularMarketPrice) || null,
        mcap: Number(row.marketCap) || null,
        rank: null,
        vol: Number(row.volume24Hr || row.regularMarketVolume) || 0,
        ch1h: null,
        ch24h: Number.isFinite(row.regularMarketChangePercent) ? row.regularMarketChangePercent : null,
        ch7d: null,
        high24: Number(row.regularMarketDayHigh) || null,
        low24: Number(row.regularMarketDayLow) || null,
        ath: null,
        athDate: null,
        athPct: null,
        circulatingSupply: Number(row.circulatingSupply) || null,
      };
    })
    .filter(Boolean);
}

async function coinPaprikaExchanges() {
  const rows = await fetchJSON('https://api.coinpaprika.com/v1/exchanges', {
    timeout: 20_000,
  });
  return (rows || [])
    .filter((row) => row.active && Number.isFinite(row.quotes?.USD?.adjusted_volume_24h))
    .sort((a, b) => b.quotes.USD.adjusted_volume_24h - a.quotes.USD.adjusted_volume_24h)
    .slice(0, 200);
}

function fallbackCountry(row) {
  const keys = [
    String(row.id || '').toLowerCase().replaceAll('-', '_'),
    String(row.name || '').toLowerCase().replaceAll(/[^a-z0-9]+/g, ''),
  ];
  for (const key of keys) {
    if (EXCHANGE_COUNTRIES[key]) return EXCHANGE_COUNTRIES[key];
    const partial = Object.keys(EXCHANGE_COUNTRIES).find((known) => key.includes(known));
    if (partial) return EXCHANGE_COUNTRIES[partial];
  }
  return null;
}

async function loadOverview() {
  const globalPromise = fetchJSON(`${CG}/global`);
  const btcPromise = fetchJSON(`${CG}/simple/price?ids=bitcoin&vs_currencies=usd`);
  const exchangesPromise = Promise.all([
    fetchJSON(`${CG}/exchanges?per_page=100&page=1`),
    fetchJSON(`${CG}/exchanges?per_page=100&page=2`),
  ]);
  const memesPromise = fetchJSON(
    `${CG}/coins/markets?vs_currency=usd&category=meme-token&order=market_cap_desc` +
    '&per_page=100&page=1&sparkline=false&price_change_percentage=1h,24h,7d',
  );
  const yahooMemesPromise = yahooCryptoScreener();
  const paprikaExchangesPromise = coinPaprikaExchanges();

  const [globalResult, btcResult, exchangesResult, memesResult, yahooBtcResult, yahooMemesResult, paprikaResult] =
    await Promise.allSettled([
      globalPromise,
      btcPromise,
      exchangesPromise,
      memesPromise,
      yahooPrice('BTC-USD'),
      yahooMemesPromise,
      paprikaExchangesPromise,
    ]);

  const cgGlobal = globalResult.status === 'fulfilled' ? globalResult.value?.data : null;
  const cgBtc = btcResult.status === 'fulfilled' ? btcResult.value?.bitcoin?.usd : null;
  const yahooBtc = yahooBtcResult.status === 'fulfilled' ? yahooBtcResult.value : null;
  let exchangeRows = exchangesResult.status === 'fulfilled'
    ? exchangesResult.value.flat().map(slimExchange)
    : [];
  const yahooMemecoins = yahooMemesResult.status === 'fulfilled' ? yahooMemesResult.value : [];
  const memecoins = memesResult.status === 'fulfilled' && memesResult.value.length
    ? memesResult.value.map(slimCoin)
    : yahooMemecoins;
  const btcUsd = Number.isFinite(cgBtc) ? cgBtc : yahooBtc?.price ?? null;
  if (!exchangeRows.length && paprikaResult.status === 'fulfilled' && Number.isFinite(btcUsd)) {
    exchangeRows = paprikaResult.value.map((row, index) => ({
      id: row.id,
      name: row.name,
      country: fallbackCountry(row),
      year: null,
      url: row.links?.website?.[0] || null,
      image: null,
      trust: null,
      rank: index + 1,
      volBtc: row.quotes.USD.adjusted_volume_24h / btcUsd,
    }));
  }

  if (!cgGlobal && !cgBtc && !yahooBtc && !exchangeRows.length && !memecoins.length) {
    throw new Error('CoinGecko and Yahoo Finance unavailable');
  }

  return {
    ok: true,
    fetchedAt: Date.now(),
    source: {
      global: cgGlobal ? 'CoinGecko' : null,
      btc: Number.isFinite(cgBtc) ? 'CoinGecko' : yahooBtc ? 'Yahoo Finance' : null,
      exchanges: exchangesResult.status === 'fulfilled' && exchangesResult.value.flat().length
        ? 'CoinGecko'
        : exchangeRows.length ? 'CoinPaprika volume + curated jurisdiction fallback' : null,
      memecoins: memesResult.status === 'fulfilled' && memesResult.value.length
        ? 'CoinGecko'
        : yahooMemecoins.length ? 'Yahoo Finance' : null,
      fallbackReady: Boolean(yahooBtc || yahooMemecoins.length),
    },
    btcUsd,
    global: cgGlobal ? {
      mcapUsd: cgGlobal.total_market_cap?.usd || 0,
      volUsd: cgGlobal.total_volume?.usd || 0,
      btcDom: cgGlobal.market_cap_percentage?.btc || 0,
      markets: cgGlobal.markets || 0,
      coins: cgGlobal.active_cryptocurrencies || 0,
      mcapChange24h: cgGlobal.market_cap_change_percentage_24h_usd || 0,
    } : null,
    exchanges: exchangeRows,
    memecoins,
    leaders: memecoins
      .filter((coin) => Number.isFinite(coin.ch24h))
      .sort((a, b) => b.ch24h - a.ch24h)
      .slice(0, 25),
    over100m: memecoins
      .filter((coin) => Number.isFinite(coin.mcap) && coin.mcap >= 100_000_000)
      .sort((a, b) => b.mcap - a.mcap),
  };
}

function llamaMetric(summary) {
  if (!summary) return null;
  const chainBreakdown = {};
  for (const [chain, values] of Object.entries(summary.chainBreakdown || {})) {
    chainBreakdown[chain] = {
      total24h: Number.isFinite(values?.total24h) ? values.total24h : null,
      previous24h: Number.isFinite(values?.total48hto24h) ? values.total48hto24h : null,
      change1d: Number.isFinite(values?.change_1d) ? values.change_1d : null,
    };
  }
  return {
    total24h: Number.isFinite(summary.total24h) ? summary.total24h : null,
    previous24h: Number.isFinite(summary.total48hto24h) ? summary.total48hto24h : null,
    change1d: Number.isFinite(summary.change_1d) ? summary.change_1d : null,
    total7d: Number.isFinite(summary.total7d) ? summary.total7d : null,
    chains: Array.isArray(summary.chains) ? summary.chains : [],
    chainBreakdown,
  };
}

function momentum(volume, revenue) {
  const changes = [volume?.change1d, revenue?.change1d].filter(Number.isFinite);
  if (!changes.length) return { key: 'unknown', label: 'Data —', score: null };
  const score = changes.reduce((sum, value) => sum + value, 0) / changes.length;
  const label = `${score >= 0 ? '+' : ''}${score.toFixed(1)}% / 24j`;
  if (score >= 20) return { key: 'hot', label, score };
  if (score >= 5) return { key: 'up', label, score };
  if (score <= -20) return { key: 'cold', label, score };
  if (score <= -5) return { key: 'down', label, score };
  return { key: 'flat', label, score };
}

async function llamaSummary(kind, slug) {
  const params = new URLSearchParams({
    excludeTotalDataChart: 'true',
    excludeTotalDataChartBreakdown: 'false',
  });
  if (kind === 'fees') params.set('dataType', 'dailyRevenue');
  return fetchJSON(`https://api.llama.fi/summary/${kind}/${encodeURIComponent(slug)}?${params}`);
}

function buildChains(platforms) {
  const rows = new Map();
  for (const platform of platforms) {
    const names = new Set([
      ...Object.keys(platform.volume?.chainBreakdown || {}),
      ...Object.keys(platform.revenue?.chainBreakdown || {}),
    ]);
    for (const name of names) {
      if (!rows.has(name)) {
        rows.set(name, { name, volume24h: 0, revenue24h: 0, platforms: new Set() });
      }
      const row = rows.get(name);
      const volume = platform.volume?.chainBreakdown?.[name]?.total24h;
      const revenue = platform.revenue?.chainBreakdown?.[name]?.total24h;
      if (Number.isFinite(volume)) row.volume24h += volume;
      if (Number.isFinite(revenue)) row.revenue24h += revenue;
      if (Number.isFinite(volume) || Number.isFinite(revenue)) row.platforms.add(platform.name);
    }
  }
  return [...rows.values()]
    .map((row) => ({ ...row, platforms: [...row.platforms] }))
    .sort((a, b) => b.volume24h - a.volume24h || b.revenue24h - a.revenue24h);
}

async function loadSentiment() {
  const platforms = await Promise.all(PLATFORMS.map(async (definition) => {
    const [volumeResult, revenueResult] = await Promise.allSettled([
      llamaSummary('dexs', definition.slug),
      llamaSummary('fees', definition.slug),
    ]);
    const volume = volumeResult.status === 'fulfilled' ? llamaMetric(volumeResult.value) : null;
    const revenue = revenueResult.status === 'fulfilled' ? llamaMetric(revenueResult.value) : null;
    return {
      ...definition,
      volume,
      revenue,
      momentum: momentum(volume, revenue),
      volumeNote: volume
        ? 'Spot / swap volume tracked by DeFiLlama'
        : 'Volume 24 jam belum tersedia dari sumber',
      revenueNote: revenue
        ? 'Protocol revenue tracked by DeFiLlama'
        : 'Revenue 24 jam belum tersedia dari sumber',
    };
  }));
  const chains = buildChains(platforms);
  return {
    ok: true,
    platforms,
    chains,
    hottestChain: chains[0] || null,
    fetchedAt: Date.now(),
    source: 'DeFiLlama',
  };
}

function downsample(rows, maximum = 1200) {
  if (rows.length <= maximum) return rows;
  const step = Math.ceil(rows.length / maximum);
  return rows.filter((_, index) => index % step === 0 || index === rows.length - 1);
}

function nearest(rows, timestamp) {
  if (!rows.length) return null;
  return rows.find((row) => row.t >= timestamp) || rows.at(-1);
}

function buildPriceMilestones(rows, coin) {
  if (!rows.length) return {};
  const first = rows[0];
  const day7 = nearest(rows, first.t + 7 * 86400000);
  const day30 = nearest(rows, first.t + 30 * 86400000);
  const chartAth = rows.reduce((best, row) => row.price > best.price ? row : best, first);
  const ath = Number.isFinite(coin?.ath)
    ? { t: Date.parse(coin.athDate), price: coin.ath, source: 'CoinGecko' }
    : { ...chartAth, source: 'Yahoo Finance' };
  return { first, day7, day30, ath };
}

async function yahooHistory(symbol) {
  const json = await fetchJSON(
    `${YAHOO}/${encodeURIComponent(symbol)}?period1=0&period2=${Math.floor(Date.now() / 1000)}` +
    '&interval=1d&events=history',
    { timeout: 22_000 },
  );
  const result = json?.chart?.result?.[0];
  const timestamps = result?.timestamp || [];
  const closes = result?.indicators?.quote?.[0]?.close || [];
  const rows = timestamps
    .map((seconds, index) => ({ t: seconds * 1000, price: Number(closes[index]) }))
    .filter((row) => Number.isFinite(row.t) && Number.isFinite(row.price) && row.price > 0);
  if (!rows.length) throw new Error(`Yahoo history ${symbol} empty`);
  return rows;
}

async function coingeckoHistory(id) {
  const json = await fetchJSON(
    `${CG}/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=365&interval=daily`,
    { timeout: 22_000 },
  );
  return {
    prices: (json.prices || [])
      .map(([t, price]) => ({ t, price: Number(price) }))
      .filter((row) => Number.isFinite(row.price)),
    marketCaps: (json.market_caps || [])
      .map(([t, mcap]) => ({ t, mcap: Number(mcap) }))
      .filter((row) => Number.isFinite(row.mcap)),
  };
}

async function currentCoin(id) {
  const rows = await fetchJSON(
    `${CG}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(id)}` +
    '&order=market_cap_desc&sparkline=false&price_change_percentage=24h,7d',
  );
  if (!rows?.[0]) throw new Error(`CoinGecko coin ${id} empty`);
  return slimCoin(rows[0]);
}

async function loadHistory(id, symbol) {
  const yahooSymbol = `${String(symbol || '').toUpperCase()}-USD`;
  const overviewCoin = cache.get('overview')?.value?.memecoins?.find((row) => row.id === id) || null;
  const [coinResult, yahooResult, geckoResult] = await Promise.allSettled([
    overviewCoin ? Promise.resolve(overviewCoin) : currentCoin(id),
    yahooHistory(yahooSymbol),
    coingeckoHistory(id),
  ]);
  const coin = coinResult.status === 'fulfilled' ? coinResult.value : null;
  const yahooRows = yahooResult.status === 'fulfilled' ? yahooResult.value : [];
  const gecko = geckoResult.status === 'fulfilled'
    ? geckoResult.value
    : { prices: [], marketCaps: [] };
  const priceRows = yahooRows.length ? yahooRows : gecko.prices;

  if (!coin && !priceRows.length && !gecko.marketCaps.length) {
    throw new Error('Historical data unavailable');
  }

  const marketCapPeak365d = gecko.marketCaps.length
    ? gecko.marketCaps.reduce((best, row) => row.mcap > best.mcap ? row : best, gecko.marketCaps[0])
    : null;

  return {
    ok: true,
    partial: !coin?.ath || !gecko.marketCaps.length,
    fetchedAt: Date.now(),
    id,
    symbol: String(symbol || '').toUpperCase(),
    coin,
    priceHistory: downsample(priceRows),
    marketCapHistory365d: downsample(gecko.marketCaps),
    milestones: buildPriceMilestones(priceRows, coin),
    marketCapPeak365d,
    source: {
      priceHistory: yahooRows.length ? 'Yahoo Finance' : gecko.prices.length ? 'CoinGecko' : null,
      marketCapHistory: gecko.marketCaps.length ? 'CoinGecko (365d public window)' : null,
      current: coin ? 'CoinGecko' : null,
    },
    sources: [
      {
        label: 'CoinGecko market data',
        url: `https://www.coingecko.com/en/coins/${encodeURIComponent(id)}`,
      },
      {
        label: 'Yahoo Finance price history',
        url: `https://finance.yahoo.com/quote/${encodeURIComponent(yahooSymbol)}/history/`,
      },
    ],
  };
}

export async function getMarketPayload(urlLike) {
  const url = urlLike instanceof URL ? urlLike : new URL(urlLike, 'http://localhost');
  const resource = url.searchParams.get('resource') || 'overview';

  if (resource === 'health') {
    return { ok: true, fetchedAt: Date.now(), service: 'market-data' };
  }
  if (resource === 'history') {
    const id = url.searchParams.get('id');
    const symbol = url.searchParams.get('symbol');
    if (!id || !symbol) {
      return { ok: false, status: 400, error: 'id and symbol are required' };
    }
    const key = `history:${id}:${symbol}`;
    const partial = cache.get(key)?.value?.partial;
    return cached(key, partial ? 30_000 : TTL.history, () => loadHistory(id, symbol));
  }
  if (resource === 'sentiment') {
    return cached('sentiment', TTL.sentiment, loadSentiment);
  }
  return cached('overview', TTL.overview, loadOverview);
}
