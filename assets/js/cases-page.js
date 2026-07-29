import { CASES } from './cases-config.js';
import { fmtUsd, fmtPrice, fmtPct, fmtClock, el } from './utils.js';
import { startAutoRefresh } from './autorefresh.js';

const $ = (id) => document.getElementById(id);
const state = { overview: null, sentiment: null, sort: 'mcap' };

function setStatus(text, kind = 'busy') {
  $('statusText').textContent = text;
  $('statusDot').className = `dot ${kind}`;
}

async function market(resource) {
  const response = await fetch(`/api/market?resource=${resource}&t=${Math.floor(Date.now() / 10_000)}`);
  if (!response.ok) throw new Error(`Backend HTTP ${response.status}`);
  const payload = await response.json();
  if (!payload?.ok) throw new Error(payload?.error || 'Data is unavailable');
  return payload;
}

function detailHref(coin) {
  return `/cases/detail/?id=${encodeURIComponent(coin.id)}&symbol=${encodeURIComponent(coin.sym)}`;
}

function renderUniverse() {
  const coins = [...(state.overview?.over100m || [])];
  coins.sort(state.sort === 'change'
    ? (a, b) => (b.ch24h ?? -Infinity) - (a.ch24h ?? -Infinity)
    : (a, b) => (b.mcap || 0) - (a.mcap || 0));

  $('kpiCount').textContent = String(coins.length);
  $('kpiTotal').textContent = fmtUsd(coins.reduce((sum, coin) => sum + (coin.mcap || 0), 0));
  $('kpiUpdated').textContent =
    `${state.overview.source?.memecoins || 'Partial source'} · ${fmtClock(state.overview.fetchedAt)}`;

  const table = el('table', { class: 'data-table market-leader-table' });
  table.append(el('thead', {}, el('tr', {},
    el('th', {}, '#'),
    el('th', {}, 'Coin'),
    el('th', { class: 'r' }, 'Price'),
    el('th', { class: 'r' }, '24h'),
    el('th', { class: 'r' }, 'Market cap'),
    el('th', { class: 'r' }, '24h volume'),
    el('th', { class: 'r' }, ''),
  )));
  const body = el('tbody');
  coins.forEach((coin, index) => {
    const wrapped = /peg|wrapped/i.test(`${coin.id} ${coin.name}`);
    body.append(el('tr', { class: 'clickable', onclick: () => { location.href = detailHref(coin); } },
      el('td', { class: 'muted num' }, String(index + 1)),
      el('td', {},
        el('span', { class: 'coin-cell' },
          el('img', { class: 'row-logo', src: coin.image, alt: '', width: '24', height: '24' }),
          el('span', {},
            el('strong', {}, coin.sym),
            el('small', {}, coin.name),
          ),
          wrapped ? el('span', { class: 'pill ghost' }, 'wrapped') : null,
        ),
      ),
      el('td', { class: 'r num' }, fmtPrice(coin.price)),
      el('td', { class: `r num ${coin.ch24h >= 0 ? 'up' : 'down'}` }, fmtPct(coin.ch24h, 1)),
      el('td', { class: 'r num' }, fmtUsd(coin.mcap)),
      el('td', { class: 'r num' }, fmtUsd(coin.vol)),
      el('td', { class: 'r' }, el('a', { class: 'table-link', href: detailHref(coin) }, 'Detail →')),
    ));
  });
  table.append(body);
  $('over100Table').replaceChildren(table);
}

function renderCurated() {
  const byId = new Map((state.overview?.memecoins || []).map((coin) => [coin.id, coin]));
  const grid = $('caseGrid');
  grid.replaceChildren();
  CASES.forEach((item) => {
    const live = byId.get(item.id);
    grid.append(el('a', { class: 'case-card research-card', href: `/cases/${item.slug}/` },
      el('img', { class: 'case-card-logo', src: item.logo, alt: '', width: '52', height: '52' }),
      el('div', { class: 'case-card-body' },
        el('div', { class: 'case-card-head' },
          el('strong', {}, item.sym),
          el('span', { class: 'case-card-year num' }, item.launch.slice(0, 4)),
        ),
        el('span', { class: 'case-card-name' }, item.name),
        el('p', { class: 'research-summary' }, item.thesis),
        el('div', { class: 'research-meta' },
          el('span', {}, live ? fmtUsd(live.mcap) : 'Market cap —'),
          el('span', { class: live?.ch24h >= 0 ? 'up' : 'down' }, live ? fmtPct(live.ch24h, 1) : '—'),
        ),
      ),
    ));
  });
}

function renderLaunchpads() {
  const rows = [...(state.sentiment?.platforms || [])]
    .sort((a, b) => (b.revenue?.total24h ?? -1) - (a.revenue?.total24h ?? -1));
  const table = el('table', { class: 'data-table' });
  table.append(el('thead', {}, el('tr', {},
    el('th', {}, '#'),
    el('th', {}, 'Platform'),
    el('th', { class: 'r' }, '24h volume'),
    el('th', { class: 'r' }, '24h revenue'),
    el('th', { class: 'r' }, 'Momentum'),
  )));
  const body = el('tbody');
  rows.forEach((row, index) => body.append(el('tr', {},
    el('td', { class: 'muted num' }, String(index + 1)),
    el('td', {},
      el('span', { class: 'coin-cell' },
        el('img', { class: 'row-logo', src: row.logo, alt: '', width: '24', height: '24' }),
        el('strong', {}, row.name),
      ),
    ),
    el('td', { class: 'r num' }, Number.isFinite(row.volume?.total24h) ? fmtUsd(row.volume.total24h) : '—'),
    el('td', { class: 'r num' }, Number.isFinite(row.revenue?.total24h) ? fmtUsd(row.revenue.total24h) : '—'),
    el('td', { class: `r num ${row.momentum?.score >= 0 ? 'up' : 'down'}` }, row.momentum?.label || '—'),
  )));
  table.append(body);
  $('launchpadTable').replaceChildren(table);
}

async function refresh() {
  const [overviewResult, sentimentResult] = await Promise.allSettled([
    market('overview'),
    market('sentiment'),
  ]);
  if (overviewResult.status === 'fulfilled') {
    state.overview = overviewResult.value;
    renderUniverse();
    renderCurated();
    $('updatedAt').textContent = fmtClock(state.overview.fetchedAt);
  }
  if (sentimentResult.status === 'fulfilled') {
    state.sentiment = sentimentResult.value;
    renderLaunchpads();
  }
  if (!state.overview) throw overviewResult.reason;
  setStatus(sentimentResult.status === 'fulfilled' ? 'Market data ready' : 'Market data ready · launchpad metrics delayed', 'ok');
}

function init() {
  document.querySelectorAll('[data-sort]').forEach((button) => {
    button.addEventListener('click', () => {
      state.sort = button.dataset.sort;
      document.querySelectorAll('[data-sort]').forEach((item) => item.classList.toggle('is-on', item === button));
      renderUniverse();
    });
  });
  refresh().catch((error) => {
    console.error(error);
    setStatus(`Data unavailable: ${error.message}`, 'err');
  });
  startAutoRefresh([{ every: 10_000, run: refresh }]);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
