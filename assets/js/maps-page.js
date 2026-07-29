import {
  fetchExchanges,
  fetchBtcPrice,
  fetchWorldTopo,
  getExchangeSourceState,
} from './datasource.js';
import { aggregateJurisdictions } from './analytics.js';
import { WorldMap } from './worldmap.js';
import { renderSeqLegend } from './hours.js';
import { fmtUsd, fmtUsdShort, fmtNum, fmtClock, el, seqColor, perceptual } from './utils.js';
import { startAutoRefresh } from './autorefresh.js';
import { flagImage } from './country-flags.js';

const $ = (id) => document.getElementById(id);
let map;
let aggregate;
let btcPrice = 0;

function setStatus(text, kind = 'busy') {
  $('statusText').textContent = text;
  $('statusDot').className = `dot ${kind}`;
}

function renderSourceState() {
  const state = getExchangeSourceState();
  const source = state.source || 'exchange source';
  const text = state.preserved
    ? `Volume map ready · retained broader cached coverage (${state.coverage.countries} jurisdictions)`
    : `Volume map ready · ${source}`;
  setStatus(text, 'ok');
  $('updatedAt').textContent = fmtClock(state.fetchedAt || Date.now());
}

function renderMapData(exchanges, btc) {
  btcPrice = btc;
  aggregate = aggregateJurisdictions(exchanges, btc);
  map.setData(aggregate);
  renderSeqLegend($('mapLegend'), {
    min: 0,
    max: aggregate.rows[0]?.volUsd || 0,
    label: '24h volume',
    fmt: fmtUsdShort,
  });
  renderRankings();
  renderTable();
  renderSourceState();
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
      flagImage(row.name),
      el('h3', {}, row.name),
      el('span', { class: 'pill' }, `Rank #${rank}`),
      el('span', { class: 'pill ghost' }, row.region),
      el('button', { class: 'btn sm ghost', type: 'button', onclick: () => map.reset() }, 'Close'),
    ),
    el('div', { class: 'detail-stats' },
      stat('24h volume', fmtUsd(row.volUsd)),
      stat('Mapped share', `${(row.share * 100).toFixed(2)}%`),
      stat('Exchanges', fmtNum(row.count)),
      stat('Average / exchange', fmtUsd(row.avgUsd)),
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
    el('th', {}, 'Exchange'),
    el('th', { class: 'r' }, '24h volume'),
    el('th', { class: 'r' }, 'Trust score'),
  )));
  const body = el('tbody');
  for (const exchange of row.exchanges.slice(0, 10)) {
    const image = /^https?:\/\//i.test(exchange.image || '') ? exchange.image : '';
    const fallback = el(
      'span',
      { class: 'exchange-logo-fallback', 'aria-hidden': 'true' },
      (exchange.name || '?').slice(0, 1).toUpperCase(),
    );
    const logo = image
      ? el('img', {
        class: 'exchange-logo',
        src: image,
        alt: '',
        width: '28',
        height: '28',
        loading: 'lazy',
        onerror: (event) => {
          event.currentTarget.hidden = true;
          fallback.hidden = false;
        },
      })
      : null;
    fallback.hidden = Boolean(logo);
    const name = exchange.url
      ? el('a', {
        class: 'exchange-name-link',
        href: exchange.url,
        target: '_blank',
        rel: 'noreferrer',
      }, exchange.name)
      : el('strong', {}, exchange.name);
    body.append(el('tr', {},
      el('td', {}, el('span', { class: 'exchange-cell' }, logo, fallback, name)),
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
  $('topShare').textContent = top ? `${(top.share * 100).toFixed(1)}% of mapped volume` : '—';
  $('mapCoverage').textContent = `${fmtNum(aggregate.exchangeCount)} exchanges · ${aggregate.rows.length} jurisdictions`;

  const list = $('rankList');
  list.replaceChildren();
  aggregate.rows.slice(0, 15).forEach((row, index) => {
    const item = el('li', { class: 'rank-item', tabindex: '0', role: 'button' },
      el('span', { class: 'rank-n' }, String(index + 1)),
      flagImage(row.name) || el('span', { class: 'rank-dot', style: { background: index === 0 ? 'var(--warn)' : seqColor(0.55) } }),
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
    el('th', {}, 'Jurisdiction'),
    el('th', {}, 'Region'),
    el('th', { class: 'r' }, '24h volume'),
    el('th', { class: 'r' }, 'Share'),
    el('th', { class: 'r' }, 'Exchanges'),
  )));
  const body = el('tbody');
  aggregate.rows.forEach((row, index) => {
    const tr = el('tr', { class: 'clickable', tabindex: '0' },
      el('td', { class: 'muted' }, String(index + 1)),
      el('td', {}, el('span', { class: 'country-cell' }, flagImage(row.name), el('strong', {}, row.name))),
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
  setStatus('Loading map and exchange volume…', 'busy');
  $('mapLoading').hidden = false;

  /* Geometri dan data pasar dimuat terpisah: kegagalan CoinGecko (mis. 429)
     tidak boleh mematikan peta — datasource sudah punya fallback cache basi,
     dan di sini kegagalan data hanya menjadi status, bukan layar error. */
  const topology = await fetchWorldTopo();
  map.setTopology(topology);
  $('mapLoading').hidden = true;
  map.render();

  let btc;
  let exchanges;
  try {
    [btc, exchanges] = await Promise.all([
      fetchBtcPrice({ force }),
      fetchExchanges({ pages: 2, force }),
    ]);
  } catch (err) {
    console.error(err);
    setStatus(`Volume data unavailable (${err.message})`, 'err');
    return;
  }
  renderMapData(exchanges, btc);
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
  load().catch((error) => {
    console.error(error);
    $('mapLoading').innerHTML = `<span class="error">Map could not load: ${error.message}</span>`;
    setStatus('Some map data could not load', 'err');
  });

  /* The browser checks the same-origin backend every ten seconds. The backend
     controls upstream cadence, and datasource retains a broader recent
     jurisdiction set when a serverless refresh returns partial fallback
     coverage. Map geometry is not fetched again. */
  startAutoRefresh([
    {
      every: 10 * 1000,
      run: async () => {
        const [btc, exchanges] = await Promise.all([
          fetchBtcPrice({ force: true }),
          fetchExchanges({ pages: 2, force: true }),
        ]);
        renderMapData(exchanges, btc);
      },
    },
  ]);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
