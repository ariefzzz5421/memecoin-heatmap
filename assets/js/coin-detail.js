import { fmtUsd, fmtPrice, fmtPct, fmtClock, el } from './utils.js';
import { startAutoRefresh } from './autorefresh.js';
import { CASES } from './cases-config.js';
import { renderMarketHistoryChart } from './market-history-chart.js';
import { brandedSourceLink } from './source-brands.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const id = params.get('id');
const symbol = params.get('symbol');
const curated = CASES.find((item) => item.id === id);
let payload = null;

function setStatus(text, kind = 'busy') {
  $('statusText').textContent = text;
  $('statusDot').className = `dot ${kind}`;
}

const fmtDate = (timestamp) => new Intl.DateTimeFormat('en-US', {
  day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
}).format(new Date(timestamp));

function svgNode(tag, attrs = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
  return node;
}

function renderLineChart(holder, rows, valueKey, formatter, markers = []) {
  holder.replaceChildren();
  if (!rows?.length) {
    holder.append(el('p', { class: 'empty-state' }, 'This history is unavailable from the public source.'));
    return;
  }

  const width = Math.max(holder.clientWidth || 760, 320);
  const height = width < 560 ? 300 : 380;
  const pad = { top: 28, right: 18, bottom: 42, left: width < 560 ? 58 : 76 };
  const values = rows.map((row) => row[valueKey]).filter((value) => Number.isFinite(value) && value > 0);
  const minT = rows[0].t;
  const maxT = rows.at(-1).t || minT + 1;
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const minLog = Math.log10(minValue);
  const maxLog = Math.log10(maxValue);
  const rangeLog = Math.max(maxLog - minLog, 0.0001);
  const x = (timestamp) => pad.left + ((timestamp - minT) / Math.max(maxT - minT, 1)) * (width - pad.left - pad.right);
  const y = (value) => pad.top + (1 - (Math.log10(Math.max(value, minValue)) - minLog) / rangeLog) * (height - pad.top - pad.bottom);

  const svg = svgNode('svg', {
    viewBox: `0 0 ${width} ${height}`,
    role: 'img',
    'aria-label': `Chart from ${fmtDate(minT)} to ${fmtDate(maxT)}`,
  });
  for (let index = 0; index <= 4; index++) {
    const ratio = index / 4;
    const gy = pad.top + ratio * (height - pad.top - pad.bottom);
    const value = 10 ** (maxLog - ratio * rangeLog);
    svg.append(svgNode('line', { x1: pad.left, y1: gy, x2: width - pad.right, y2: gy, class: 'chart-grid-line' }));
    const label = svgNode('text', { x: pad.left - 10, y: gy + 4, 'text-anchor': 'end', class: 'chart-axis-label' });
    label.textContent = formatter(value);
    svg.append(label);
  }
  [0, 0.5, 1].forEach((ratio) => {
    const timestamp = minT + ratio * (maxT - minT);
    const label = svgNode('text', {
      x: x(timestamp), y: height - 12, 'text-anchor': ratio === 0 ? 'start' : ratio === 1 ? 'end' : 'middle',
      class: 'chart-axis-label',
    });
    label.textContent = fmtDate(timestamp);
    svg.append(label);
  });

  const path = rows
    .filter((row) => Number.isFinite(row[valueKey]) && row[valueKey] > 0)
    .map((row, index) => `${index ? 'L' : 'M'}${x(row.t).toFixed(2)},${y(row[valueKey]).toFixed(2)}`)
    .join(' ');
  svg.append(svgNode('path', { d: path, class: 'history-line' }));

  const validMarkers = markers.filter((marker) => marker && Number.isFinite(marker[valueKey]));
  validMarkers.forEach((marker, index) => {
    const cx = x(marker.t);
    const cy = y(marker[valueKey]);
    svg.append(svgNode('circle', { cx, cy, r: 5, class: 'history-marker' }));
    const clustered = index > 0 && Math.abs(cx - x(validMarkers[0].t)) < width * 0.08;
    const labelX = clustered
      ? Math.min(pad.left + 28 + index * 58, width - pad.right - 30)
      : Math.min(Math.max(cx, pad.left + 30), width - pad.right - 30);
    if (clustered) {
      svg.append(svgNode('line', {
        x1: cx, y1: cy - 6, x2: labelX, y2: Math.max(cy - 18, 18),
        class: 'history-marker-guide',
      }));
    }
    const label = svgNode('text', {
      x: labelX,
      y: Math.max(cy - 12, 15),
      'text-anchor': 'middle',
      class: 'history-marker-label',
    });
    label.textContent = marker.label;
    svg.append(label);
  });
  holder.append(svg);
}

function fact(label, value, note = '', emphasis = false) {
  return el('article', { class: `dossier-stat${emphasis ? ' is-emphasis' : ''}` },
    el('span', {}, label),
    el('strong', { class: 'num' }, value),
    note ? el('small', {}, note) : null,
  );
}

function render() {
  const coin = payload.coin;
  const milestones = payload.milestones || {};
  const launch = milestones.launch;
  const lastPrice = payload.priceHistory?.at(-1)?.price;
  const currentPrice = Number.isFinite(coin?.price) ? coin.price : lastPrice;
  const displayName = coin?.name || curated?.name || symbol;
  const athPrice = Number.isFinite(coin?.ath) ? coin.ath : milestones.ath?.price;
  const athTimestamp = coin?.athDate ? Date.parse(coin.athDate) : milestones.ath?.t;
  document.title = `${displayName} (${symbol}) — Memecoin Detail`;
  $('tokenName').textContent = displayName;
  $('tokenSym').textContent = symbol;
  $('crumbToken').textContent = symbol;
  $('tokenLogo').src = coin?.image || curated?.logo || '/assets/img/brand/heatmap-volume-mark.png';
  $('tokenLogo').alt = `${displayName} logo`;
  const summary = [
    Number.isFinite(currentPrice) ? `Price ${fmtPrice(currentPrice)}` : null,
    Number.isFinite(coin?.mcap) ? `market cap ${fmtUsd(coin.mcap)}` : null,
    Number.isFinite(coin?.ch24h) ? `24h change ${fmtPct(coin.ch24h, 1)}` : null,
  ].filter(Boolean);
  $('tokenSummary').textContent = summary.length
    ? `${summary.join(' · ')}.`
    : 'Current snapshot unavailable; historical source data remains below.';

  const facts = [
    curated ? fact('Launch date', fmtDate(Date.parse(curated.launch)), curated.launchNote, true) : null,
    fact('Launch price', Number.isFinite(launch?.price) ? fmtPrice(launch.price) : 'Unavailable',
      launch?.source || 'No public snapshot returned'),
    fact('Launch market cap', Number.isFinite(launch?.mcap) ? fmtUsd(launch.mcap) : 'Unavailable',
      launch?.source || 'No public snapshot returned'),
    fact('Current price', Number.isFinite(currentPrice) ? fmtPrice(currentPrice) : 'Unavailable',
      Number.isFinite(coin?.ch24h) ? `${fmtPct(coin.ch24h, 1)} / 24h` : payload.source?.priceHistory || ''),
    fact('Market cap', Number.isFinite(coin?.mcap) ? fmtUsd(coin.mcap) : 'Unavailable',
      coin?.rank ? `Rank #${coin.rank}` : payload.source?.marketCapHistory || 'No public series returned'),
    fact('Price ATH', fmtPrice(athPrice), Number.isFinite(athTimestamp) ? fmtDate(athTimestamp) : ''),
  ].filter(Boolean);
  $('caseFacts').replaceChildren(...facts);

  renderMarketHistoryChart($('marketHistoryChart'), payload, {
    launchAt: curated?.launch || payload.launchAt,
    symbol,
  });
  const curatedSources = curated ? [
    { label: 'Official X', url: curated.officialX, note: new URL(curated.officialX).pathname },
    {
      label: 'Official site',
      url: curated.officialSite,
      note: new URL(curated.officialSite).hostname,
      logo: curated.logo,
    },
    { label: 'CoinGecko', url: curated.coingecko, note: 'current market and ATH' },
    ...curated.contracts.map((contract) => ({
      label: `${contract.network} explorer`,
      url: contract.explorer,
      note: contract.address ? 'verified contract' : 'native chain',
    })),
  ] : [];
  const allSources = [...curatedSources, ...(payload.sources || []).map((source) => ({
    ...source,
    note: source.label.includes('Yahoo') ? 'daily price history' : 'historical market data',
  }))]
    .filter((source, index, rows) => rows.findIndex((item) => item.url === source.url) === index);
  $('sourceLinks').replaceChildren(...allSources.map((source) => brandedSourceLink(source)));
  $('updatedAt').textContent = fmtClock(payload.fetchedAt);
  setStatus(`Data ready · price: ${payload.source.priceHistory || 'unavailable'} · market cap: ${payload.source.marketCapHistory || 'unavailable'}`, 'ok');
}

async function load() {
  if (!id || !symbol) throw new Error('The id and symbol parameters are required');
  const response = await fetch(
    `/api/market?resource=history&id=${encodeURIComponent(id)}&symbol=${encodeURIComponent(symbol)}&t=${Math.floor(Date.now() / 10_000)}`,
  );
  if (!response.ok) throw new Error(`Backend HTTP ${response.status}`);
  payload = await response.json();
  if (!payload?.ok) throw new Error(payload?.error || 'History is unavailable');
  render();
}

function init() {
  load().catch((error) => {
    console.error(error);
    setStatus(error.message, 'err');
    $('marketHistoryChart').replaceChildren(el('p', { class: 'error' }, error.message));
  });
  startAutoRefresh([{ every: 10_000, run: load }]);
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (payload) render();
    }, 160);
  });
  window.addEventListener('themechange', () => {
    if (payload) render();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
