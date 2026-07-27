import { fetchExchanges, fetchBtcPrice, fetchWorldTopo, clearCache } from './datasource.js';
import { aggregateJurisdictions } from './analytics.js';
import { WorldMap } from './worldmap.js';
import { renderSeqLegend } from './hours.js';
import { fmtUsd, fmtUsdShort, fmtNum, fmtClock, el, seqColor, perceptual } from './utils.js';

const $ = (id) => document.getElementById(id);
let map;
let aggregate;
let btcPrice = 0;

function setStatus(text, kind = 'busy') {
  $('statusText').textContent = text;
  $('statusDot').className = `dot ${kind}`;
}

function renderDetail(row) {
  const card = $('detailCard');
  if (!row) {
    card.hidden = true;
    card.replaceChildren();
    return;
  }
  const rank = aggregate.rows.indexOf(row) + 1;
  card.replaceChildren(
    el('div', { class: 'detail-head' },
      el('h3', {}, row.name),
      el('span', { class: 'pill' }, `Peringkat #${rank}`),
      el('span', { class: 'pill ghost' }, row.region),
      el('button', { class: 'btn sm ghost', type: 'button', onclick: () => map.reset() }, 'Tutup'),
    ),
    el('div', { class: 'detail-stats' },
      stat('Volume 24 jam', fmtUsd(row.volUsd)),
      stat('Pangsa terpetakan', `${(row.share * 100).toFixed(2)}%`),
      stat('Jumlah bursa', fmtNum(row.count)),
      stat('Rata-rata / bursa', fmtUsd(row.avgUsd)),
    ),
    exchangeTable(row),
  );
  card.hidden = false;
}

function stat(label, value) {
  return el('div', { class: 'stat' },
    el('span', { class: 'stat-l' }, label),
    el('span', { class: 'stat-v num' }, value),
  );
}

function exchangeTable(row) {
  const table = el('table', { class: 'data-table compact' });
  table.append(el('thead', {}, el('tr', {},
    el('th', {}, 'Bursa'),
    el('th', { class: 'r' }, 'Volume 24j'),
    el('th', { class: 'r' }, 'Trust score'),
  )));
  const body = el('tbody');
  for (const exchange of row.exchanges.slice(0, 10)) {
    body.append(el('tr', {},
      el('td', {}, exchange.name),
      el('td', { class: 'r num' }, fmtUsd(exchange.volBtc * btcPrice)),
      el('td', { class: 'r num' }, exchange.trust ?? '—'),
    ));
  }
  table.append(body);
  return el('div', { class: 'table-scroll' }, table);
}

function renderRankings() {
  const top = aggregate.rows.find((row) => row.lat != null && row.lon != null) || aggregate.rows[0];
  $('topLocation').textContent = top?.name || '—';
  $('topVolume').textContent = top ? fmtUsd(top.volUsd) : '—';
  $('topShare').textContent = top ? `${(top.share * 100).toFixed(1)}% dari volume terpetakan` : '—';
  $('mapCoverage').textContent = `${fmtNum(aggregate.exchangeCount)} bursa · ${aggregate.rows.length} yurisdiksi`;

  const list = $('rankList');
  list.replaceChildren();
  aggregate.rows.slice(0, 15).forEach((row, index) => {
    const intensity = perceptual(row.volUsd, top.volUsd);
    const item = el('li', { class: 'rank-item', tabindex: '0', role: 'button' },
      el('span', { class: 'rank-n' }, String(index + 1)),
      el('span', { class: 'rank-dot', style: { background: index === 0 ? '#fab219' : seqColor(0.25 + intensity * 0.75) } }),
      el('span', { class: 'rank-name' }, row.name),
      el('span', { class: 'rank-val num' }, fmtUsd(row.volUsd, 1)),
      el('span', { class: 'rank-share num' }, `${(row.share * 100).toFixed(1)}%`),
    );
    const focus = () => map.focus(row.name);
    item.addEventListener('click', focus);
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        focus();
      }
    });
    list.append(item);
  });
}

function renderTable() {
  const table = el('table', { class: 'data-table' });
  table.append(el('thead', {}, el('tr', {},
    el('th', {}, '#'),
    el('th', {}, 'Yurisdiksi'),
    el('th', {}, 'Kawasan'),
    el('th', { class: 'r' }, 'Volume 24j'),
    el('th', { class: 'r' }, 'Pangsa'),
    el('th', { class: 'r' }, 'Bursa'),
  )));
  const body = el('tbody');
  aggregate.rows.forEach((row, index) => {
    const tr = el('tr', { class: 'clickable', tabindex: '0' },
      el('td', { class: 'muted' }, String(index + 1)),
      el('td', {}, el('strong', {}, row.name)),
      el('td', { class: 'muted' }, row.region),
      el('td', { class: 'r num' }, fmtUsd(row.volUsd)),
      el('td', { class: 'r num' }, `${(row.share * 100).toFixed(2)}%`),
      el('td', { class: 'r num' }, fmtNum(row.count)),
    );
    const focus = () => map.focus(row.name);
    tr.addEventListener('click', focus);
    tr.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') focus();
    });
    body.append(tr);
  });
  table.append(body);
  $('jurTable').replaceChildren(table);
}

async function load({ force = false } = {}) {
  setStatus('Memuat peta dan volume bursa…', 'busy');
  $('mapLoading').hidden = false;

  const [topology, btc, exchanges] = await Promise.all([
    fetchWorldTopo(),
    fetchBtcPrice({ force }),
    fetchExchanges({ pages: 2, force }),
  ]);
  btcPrice = btc;
  aggregate = aggregateJurisdictions(exchanges, btc);
  map.setTopology(topology);
  map.setData(aggregate);
  $('mapLoading').hidden = true;
  renderSeqLegend($('mapLegend'), {
    min: 0,
    max: aggregate.rows[0]?.volUsd || 0,
    label: 'Volume 24 jam',
    fmt: fmtUsdShort,
  });
  renderRankings();
  renderTable();
  $('updatedAt').textContent = fmtClock(Date.now());
  setStatus('Peta volume siap', 'ok');
}

function init() {
  map = new WorldMap($('mapCanvas'), { tooltip: $('mapTip'), onSelect: renderDetail });
  $('btnZoomIn').addEventListener('click', () => map.zoom(1.4));
  $('btnZoomOut').addEventListener('click', () => map.zoom(1 / 1.4));
  $('btnMapReset').addEventListener('click', () => map.reset());
  $('chkLabels').addEventListener('change', (event) => {
    map.showLabels = event.target.checked;
    map.render();
  });
  $('btnRefresh').addEventListener('click', async () => {
    clearCache();
    $('btnRefresh').disabled = true;
    try {
      await load({ force: true });
    } finally {
      $('btnRefresh').disabled = false;
    }
  });

  load().catch((error) => {
    console.error(error);
    $('mapLoading').innerHTML = `<span class="error">Peta gagal dimuat: ${error.message}</span>`;
    setStatus('Sebagian data gagal dimuat', 'err');
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
