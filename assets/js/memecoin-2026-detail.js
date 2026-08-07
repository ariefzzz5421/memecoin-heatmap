import { fmtClock, fmtPct, fmtPrice, fmtUsd, el } from './utils.js';
import { renderMarketHistoryChart } from './market-history-chart.js';
import { brandedSourceLink } from './source-brands.js';
import { startAutoRefresh } from './autorefresh.js';
import { fetchDexLaunch, renderDexScreenerChart } from './dexscreener.js';

const $ = (id) => document.getElementById(id);
const slug = document.body.dataset.event;
let eventRecord = null;
let historyPayload = null;
let dexLaunchPayload = null;

function setStatus(text, kind = 'busy') {
  $('statusText').textContent = text;
  $('statusDot').className = `dot ${kind}`;
}

const fmtDate = (value) => new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
}).format(new Date(`${value}T00:00:00Z`));

async function fetchRecords() {
  const response = await fetch('/api/market/?resource=meme2026', {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Backend HTTP ${response.status}`);
  const data = await response.json();
  if (!data?.ok) throw new Error(data?.error || 'Research record unavailable');
  return data;
}

function renderCurrent(data) {
  const record = data.events.find((event) => event.id === slug);
  if (!record) throw new Error('This research record was not found');
  eventRecord = record;

  if (record.current?.image) $('eventLogo').src = record.current.image;
  const live = $('liveSnapshot');
  if (record.current) {
    live.replaceChildren(
      el('div', { class: 'is-emphasis' },
        el('span', {}, 'Current market cap'),
        el('strong', { class: 'num' }, fmtUsd(record.current.mcap)),
      ),
      el('div', {},
        el('span', {}, 'Price · 24h'),
        el('strong', { class: `num ${Number(record.current.ch24h) >= 0 ? 'up' : 'down'}` },
          `${fmtPrice(record.current.price)} · ${fmtPct(record.current.ch24h, 1)}`),
      ),
    );
  } else {
    live.replaceChildren(
      el('div', {},
        el('span', {}, 'Current snapshot'),
        el('strong', {}, 'Unavailable'),
      ),
      el('div', {},
        el('span', {}, 'Record'),
        el('strong', {}, 'Historical evidence remains valid'),
      ),
    );
  }

  const social = record.officialX
    ? { label: record.socialLabel || 'Official X', url: record.officialX, note: 'public account' }
    : { label: 'Official X unavailable', url: 'https://x.com/', note: record.socialNote, disabled: true };
  const sources = [
    { label: 'CoinGecko', url: record.coingecko, note: 'market record' },
    { label: 'Contract explorer', url: record.explorer, note: 'contract address' },
    social,
    ...record.evidence,
  ].filter((source, index, rows) =>
    source.url && rows.findIndex((item) => item.url === source.url) === index);
  $('eventSources').replaceChildren(...sources.map((source) => brandedSourceLink({
    ...source,
    className: 'source-button',
  })));
  $('updatedAt').textContent = fmtClock(data.fetchedAt);
  setStatus(data.partial ? 'Article ready · live snapshot partial' : 'Article and live snapshot ready', data.partial ? 'busy' : 'ok');
}

function renderEventTimeline(errorMessage = '') {
  if (!eventRecord) return;
  $('eventChart').replaceChildren(
    el('div', { class: 'event-timeline-fallback', role: 'img', 'aria-label': `${eventRecord.name} sourced event timeline` },
      el('div', {},
        el('span', {}, '01'),
        el('small', {}, 'Launch'),
        el('strong', {}, fmtDate(eventRecord.launchAt)),
      ),
      el('div', { class: 'is-emphasis' },
        el('span', {}, '02'),
        el('small', {}, '$100M crossing'),
        el('strong', {}, fmtDate(eventRecord.crossedAt)),
      ),
      el('div', {},
        el('span', {}, '03'),
        el('small', {}, 'Documented peak'),
        el('strong', { class: 'num' }, fmtUsd(eventRecord.documentedPeak, 0)),
      ),
    ),
    el('p', { class: 'chart-fallback-note' },
      errorMessage
        ? 'The public providers returned no usable time series. Showing sourced event facts instead.'
        : 'Sourced events are shown without interpolating prices between them.'),
  );
  $('chartLoadState').textContent = 'Event timeline';
}

async function loadHistory() {
  if (!eventRecord) return;
  const response = await fetch(
    `/api/market/?resource=history&id=${encodeURIComponent(eventRecord.id)}&symbol=${encodeURIComponent(eventRecord.symbol)}`,
    { headers: { accept: 'application/json' } },
  );
  if (!response.ok) throw new Error(`History HTTP ${response.status}`);
  const data = await response.json();
  if (!data?.ok) throw new Error(data?.error || 'History unavailable');
  historyPayload = data;
  const hasSeries = Boolean(data.priceHistory?.length || data.marketCapHistory365d?.length);
  if (!hasSeries) {
    renderEventTimeline();
    return;
  }
  const chartData = dexLaunchPayload?.launch ? withDexLaunch(data) : data;
  renderMarketHistoryChart($('eventChart'), chartData, {
    launchAt: eventRecord.launchAt,
    symbol: eventRecord.symbol,
  });
  $('chartLoadState').textContent = data.partial ? 'Partial public history' : 'Public history ready';
}

function withDexLaunch(data) {
  if (!dexLaunchPayload?.launch) return data;
  return {
    ...data,
    milestones: {
      ...data.milestones,
      launch: {
        t: dexLaunchPayload.launch.t,
        price: dexLaunchPayload.launch.price,
        mcap: dexLaunchPayload.launch.metricKind === 'market-cap proxy'
          ? dexLaunchPayload.launch.valuation
          : null,
        source: dexLaunchPayload.launch.source,
      },
    },
    source: { ...data.source, launchMilestones: dexLaunchPayload.launch.source },
  };
}

async function loadDex() {
  const data = await fetchDexLaunch(slug);
  dexLaunchPayload = data;
  if (!eventRecord?.current && data.pair) {
    $('liveSnapshot').replaceChildren(
      el('div', { class: 'is-emphasis' },
        el('span', {}, 'Current DEX snapshot'),
        el('strong', { class: 'num' }, Number.isFinite(data.pair.marketCap)
          ? fmtUsd(data.pair.marketCap)
          : Number.isFinite(data.pair.fdv) ? `${fmtUsd(data.pair.fdv)} FDV` : fmtPrice(data.pair.priceUsd)),
      ),
      el('div', {},
        el('span', {}, 'Price · 24h'),
        el('strong', { class: `num ${Number(data.pair.change24h) >= 0 ? 'up' : 'down'}` },
          `${fmtPrice(data.pair.priceUsd)} · ${fmtPct(data.pair.change24h, 1)}`),
      ),
    );
  }
  renderDexScreenerChart(
    $('eventDexChart'),
    data.pair,
    eventRecord?.name || slug,
    data,
  );
  if (historyPayload) {
    renderMarketHistoryChart($('eventChart'), withDexLaunch(historyPayload), {
      launchAt: eventRecord.launchAt,
      symbol: eventRecord.symbol,
    });
  }
}

async function refreshRecord() {
  renderCurrent(await fetchRecords());
}

async function init() {
  try {
    await refreshRecord();
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => loadHistory().catch((error) => renderEventTimeline(error.message)), { timeout: 800 });
      window.requestIdleCallback(() => loadDex().catch((error) => {
        $('eventDexChart').replaceChildren(el('p', { class: 'dex-empty-note' }, error.message));
      }), { timeout: 1200 });
    } else {
      setTimeout(() => loadHistory().catch((error) => renderEventTimeline(error.message)), 0);
      setTimeout(() => loadDex().catch((error) => {
        $('eventDexChart').replaceChildren(el('p', { class: 'dex-empty-note' }, error.message));
      }), 0);
    }
  } catch (error) {
    console.error(error);
    setStatus('Live snapshot unavailable · article remains ready', 'err');
    $('liveSnapshot').replaceChildren(el('div', {},
      el('span', {}, 'Current snapshot'), el('strong', {}, 'Unavailable')));
    $('chartLoadState').textContent = 'Waiting for record';
  }

  startAutoRefresh([{ every: 10_000, run: refreshRecord }]);
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (historyPayload) renderMarketHistoryChart($('eventChart'), withDexLaunch(historyPayload), {
        launchAt: eventRecord?.launchAt,
        symbol: eventRecord?.symbol,
      });
    }, 180);
  });
  window.addEventListener('themechange', () => {
    if (historyPayload) renderMarketHistoryChart($('eventChart'), withDexLaunch(historyPayload), {
      launchAt: eventRecord?.launchAt,
      symbol: eventRecord?.symbol,
    });
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
