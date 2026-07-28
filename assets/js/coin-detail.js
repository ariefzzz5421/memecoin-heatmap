import { fmtUsd, fmtPrice, fmtPct, fmtClock, el } from './utils.js';
import { startAutoRefresh } from './autorefresh.js';
import { CASES } from './cases-config.js';

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

const fmtDate = (timestamp) => new Intl.DateTimeFormat('id-ID', {
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
    holder.append(el('p', { class: 'empty-state' }, 'Riwayat ini belum tersedia dari sumber publik.'));
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
    'aria-label': `Chart dari ${fmtDate(minT)} sampai ${fmtDate(maxT)}`,
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

function fact(label, value, note = '') {
  return el('article', { class: 'dossier-stat' },
    el('span', {}, label),
    el('strong', { class: 'num' }, value),
    note ? el('small', {}, note) : null,
  );
}

function render() {
  const coin = payload.coin;
  const milestones = payload.milestones || {};
  const marketCapPeak = payload.marketCapPeak365d;
  document.title = `${coin?.name || symbol} (${symbol}) — Memecoin Detail`;
  $('tokenName').textContent = coin?.name || symbol;
  $('tokenSym').textContent = symbol;
  $('crumbToken').textContent = symbol;
  $('tokenLogo').src = coin?.image || '';
  $('tokenLogo').alt = coin ? `Logo ${coin.name}` : '';
  $('tokenSummary').textContent =
    `Harga ${fmtPrice(coin?.price)} · market cap ${fmtUsd(coin?.mcap)} · perubahan 24 jam ${fmtPct(coin?.ch24h, 1)}.`;

  const facts = [
    curated ? fact('Launch terdokumentasi', fmtDate(Date.parse(curated.launch)), curated.launchNote) : null,
    fact('Harga sekarang', fmtPrice(coin?.price), `${fmtPct(coin?.ch24h, 1)} / 24j`),
    fact('Market cap', fmtUsd(coin?.mcap), `Peringkat #${coin?.rank || '—'}`),
    fact('Volume 24 jam', fmtUsd(coin?.vol)),
    fact('ATH harga', fmtPrice(coin?.ath), coin?.athDate ? fmtDate(Date.parse(coin.athDate)) : ''),
    fact('Dari ATH', fmtPct(coin?.athPct, 1)),
    fact('Puncak mcap 365h', marketCapPeak ? fmtUsd(marketCapPeak.mcap) : '—',
      marketCapPeak ? fmtDate(marketCapPeak.t) : 'Tidak tersedia'),
  ].filter(Boolean);
  $('caseFacts').replaceChildren(...facts);

  const markerRows = [
    milestones.first && { ...milestones.first, label: 'Data awal' },
    milestones.day7 && { ...milestones.day7, label: 'Hari 7' },
    milestones.day30 && { ...milestones.day30, label: 'Hari 30' },
    milestones.ath && { ...milestones.ath, label: 'ATH' },
  ].filter(Boolean);
  renderLineChart($('priceChart'), payload.priceHistory, 'price', fmtPrice, markerRows);
  renderLineChart($('mcapChart'), payload.marketCapHistory365d, 'mcap', fmtUsd);

  $('milestones').replaceChildren(...markerRows.map((row) =>
    fact(row.label, fmtPrice(row.price), fmtDate(row.t))));
  $('sourceLinks').replaceChildren(...payload.sources.map((source) =>
    el('a', { href: source.url, target: '_blank', rel: 'noreferrer', class: 'source-link' },
      el('span', {}, source.label),
      el('span', { 'aria-hidden': 'true' }, '↗'),
    )));
  $('updatedAt').textContent = fmtClock(payload.fetchedAt);
  setStatus(`Data siap · harga: ${payload.source.priceHistory || 'tidak tersedia'} · mcap: ${payload.source.marketCapHistory || 'tidak tersedia'}`, 'ok');
}

async function load() {
  if (!id || !symbol) throw new Error('Parameter id dan symbol tidak lengkap');
  const response = await fetch(
    `/api/market?resource=history&id=${encodeURIComponent(id)}&symbol=${encodeURIComponent(symbol)}&t=${Math.floor(Date.now() / 10_000)}`,
  );
  if (!response.ok) throw new Error(`Backend HTTP ${response.status}`);
  payload = await response.json();
  if (!payload?.ok) throw new Error(payload?.error || 'Riwayat tidak tersedia');
  render();
}

function init() {
  load().catch((error) => {
    console.error(error);
    setStatus(error.message, 'err');
    $('priceChart').replaceChildren(el('p', { class: 'error' }, error.message));
  });
  startAutoRefresh([{ every: 10_000, run: load }]);
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (payload) render();
    }, 160);
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
