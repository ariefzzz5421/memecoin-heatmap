/* ============================================================
   cases-page.js — hub studi kasus.
   Grid kartu token dengan filter tahun launch, dasbor volume
   koin studi, dan ranking launchpad. Detail tiap token ada di
   halaman sendiri (/cases/{slug}/).
   ============================================================ */

import { CASES, MCAP_THRESHOLD } from './cases-config.js';
import { fetchCaseMarkets, fetchLaunchpads, clearCasesCache } from './cases-data.js';
import { fmtDate, fmtDuration, DAY } from './cases-chart.js';
import { fmtUsd, fmtPrice, fmtPct, fmtClock, el } from './utils.js';
import { startAutoRefresh, mountPing } from './autorefresh.js';

const $ = (id) => document.getElementById(id);

const state = {
  markets: {},
  year: 'all',
};

function setStatus(text, kind = 'busy') {
  $('statusText').textContent = text;
  $('statusDot').className = `dot ${kind}`;
}

const launchYear = (c) => c.launch.slice(0, 4);

function launchToAthDays(c) {
  const m = state.markets[c.id];
  if (!m?.athDate) return null;
  return (Date.parse(m.athDate) - Date.parse(c.launch)) / DAY;
}

/* ---------------- KPI ---------------- */

function renderKpis() {
  const rows = CASES.map((c) => ({ c, m: state.markets[c.id], days: launchToAthDays(c) }))
    .filter((r) => r.m);
  if (!rows.length) return;

  const above = rows.filter((r) => r.m.mcap >= MCAP_THRESHOLD);
  const totalMcap = rows.reduce((s, r) => s + (r.m.mcap || 0), 0);
  const byDays = rows.filter((r) => Number.isFinite(r.days)).sort((a, b) => a.days - b.days);
  const fastest = byDays[0];
  const slowest = byDays[byDays.length - 1];

  $('kpiCount').textContent = `${above.length}/${rows.length}`;
  $('kpiCountSub').textContent = `mcap ≥ $100M saat ini · total ${fmtUsd(totalMcap)}`;
  $('kpiFast').textContent = fastest ? fastest.c.sym : '—';
  $('kpiFastSub').textContent = fastest ? `launch → ATH: ${fmtDuration(fastest.days)}` : '—';
  $('kpiSlow').textContent = slowest ? slowest.c.sym : '—';
  $('kpiSlowSub').textContent = slowest ? `launch → ATH: ${fmtDuration(slowest.days)}` : '—';

  const deepest = [...rows].sort((a, b) => a.m.athPct - b.m.athPct)[0];
  $('kpiDraw').textContent = deepest ? `${deepest.m.athPct.toFixed(0)}%` : '—';
  $('kpiDrawSub').textContent = deepest
    ? `${deepest.c.sym}: harga sekarang vs ATH — semua koin studi masih di bawah ATH` : '—';
}

/* ---------------- Filter tahun ---------------- */

function renderYearFilter() {
  const years = [...new Set(CASES.map(launchYear))].sort();
  const holder = $('yearFilter');
  holder.replaceChildren();

  const mk = (value, label, count) => {
    const b = el('button', {
      class: `seg-btn${state.year === value ? ' is-on' : ''}`,
      type: 'button',
      'data-year': value,
      onclick: () => {
        if (state.year === value) return;
        state.year = value;
        holder.querySelectorAll('.seg-btn').forEach((x) => x.classList.toggle('is-on', x.dataset.year === value));
        renderGrid();
      },
    }, `${label} (${count})`);
    return b;
  };

  holder.append(mk('all', 'Semua', CASES.length));
  for (const y of years) {
    holder.append(mk(y, y, CASES.filter((c) => launchYear(c) === y).length));
  }
}

/* ---------------- Grid kartu ---------------- */

function renderGrid() {
  const grid = $('caseGrid');
  grid.replaceChildren();

  const list = CASES
    .filter((c) => state.year === 'all' || launchYear(c) === state.year)
    .sort((a, b) => Date.parse(a.launch) - Date.parse(b.launch));

  for (const c of list) {
    const m = state.markets[c.id];
    const days = launchToAthDays(c);

    grid.append(el('a', { class: 'case-card', href: `/cases/${c.slug}/` },
      el('img', {
        class: 'case-card-logo', src: c.logo, alt: `Logo resmi ${c.name}`,
        loading: 'lazy', width: '52', height: '52',
      }),
      el('div', { class: 'case-card-body' },
        el('div', { class: 'case-card-head' },
          el('strong', {}, c.sym),
          el('span', { class: 'case-card-year num' }, launchYear(c)),
        ),
        el('span', { class: 'case-card-name' }, c.name),
        el('dl', { class: 'case-card-facts' },
          el('dt', {}, 'Launch'), el('dd', { class: 'num' }, fmtDate(Date.parse(c.launch))),
          el('dt', {}, 'Launch → ATH'), el('dd', { class: 'num' }, fmtDuration(days)),
          el('dt', {}, 'Mcap'), el('dd', { class: 'num' }, m ? fmtUsd(m.mcap) : '—'),
          el('dt', {}, 'Dari ATH'), el('dd', { class: 'num down' }, m ? fmtPct(m.athPct, 1) : '—'),
        ),
        el('span', { class: 'case-card-cta' }, 'Baca studi kasus →'),
      ),
    ));
  }

  if (!list.length) {
    grid.append(el('p', { class: 'note' }, 'Tidak ada token yang launch pada tahun itu.'));
  }
}

/* ---------------- Dasbor koin studi ---------------- */

function renderCoinDashboard() {
  const rows = CASES
    .map((c) => ({ c, m: state.markets[c.id], days: launchToAthDays(c) }))
    .filter((r) => r.m)
    .sort((a, b) => b.m.vol - a.m.vol);

  if (!rows.length) return;

  const t = el('table', { class: 'data-table' });
  t.append(el('thead', {}, el('tr', {},
    el('th', { scope: 'col' }, '#'),
    el('th', { scope: 'col' }, 'Koin'),
    el('th', { scope: 'col', class: 'r' }, 'Harga'),
    el('th', { scope: 'col', class: 'r' }, 'Volume 24j'),
    el('th', { scope: 'col', class: 'r' }, '24j'),
    el('th', { scope: 'col', class: 'r' }, 'Mcap'),
    el('th', { scope: 'col', class: 'r' }, 'ATH'),
    el('th', { scope: 'col', class: 'r' }, 'Dari ATH'),
    el('th', { scope: 'col', class: 'r' }, 'Launch → ATH'),
  )));
  const tb = el('tbody');
  rows.forEach((r, i) => {
    tb.append(el('tr', { class: 'clickable', tabindex: '0', onclick: () => { location.href = `/cases/${r.c.slug}/`; } },
      el('td', { class: 'muted' }, String(i + 1)),
      el('td', {},
        el('img', { class: 'row-logo', src: r.c.logo, alt: '', loading: 'lazy', width: '18', height: '18' }),
        el('strong', {}, r.c.sym), ' ', el('span', { class: 'muted' }, r.c.name)),
      el('td', { class: 'r num' }, fmtPrice(r.m.price)),
      el('td', { class: 'r num' }, fmtUsd(r.m.vol)),
      el('td', { class: `r num ${r.m.ch24h >= 0 ? 'up' : 'down'}` }, fmtPct(r.m.ch24h, 1)),
      el('td', { class: 'r num' }, fmtUsd(r.m.mcap)),
      el('td', { class: 'r num' }, fmtPrice(r.m.ath)),
      el('td', { class: 'r num down' }, fmtPct(r.m.athPct, 1)),
      el('td', { class: 'r num' }, fmtDuration(r.days)),
    ));
  });
  t.append(tb);
  $('coinDashboard').replaceChildren(t);
}

/* ---------------- Launchpad ---------------- */

function renderLaunchpads(rows) {
  const t = el('table', { class: 'data-table' });
  t.append(el('thead', {}, el('tr', {},
    el('th', { scope: 'col' }, '#'),
    el('th', { scope: 'col' }, 'Launchpad'),
    el('th', { scope: 'col' }, 'Chain'),
    el('th', { scope: 'col', class: 'r' }, 'Volume 24j'),
    el('th', { scope: 'col', class: 'r' }, 'Δ volume 1h'),
    el('th', { scope: 'col', class: 'r' }, 'Revenue 24j'),
    el('th', { scope: 'col', class: 'r' }, 'Δ revenue 1h'),
    el('th', { scope: 'col', class: 'r' }, 'Revenue 7h'),
  )));
  const tb = el('tbody');
  const val = (v, fmt) => (v == null ? '—' : fmt(v));
  rows.forEach((lp, i) => {
    tb.append(el('tr', { class: i === 0 ? 'is-peak' : null },
      el('td', { class: 'muted' }, String(i + 1)),
      el('td', {},
        lp.logo ? el('img', { class: 'row-logo', src: lp.logo, alt: '', loading: 'lazy', width: '18', height: '18' }) : null,
        el('strong', {}, lp.name),
        i === 0 ? el('span', { class: 'pill chain-hot' }, '#1 revenue') : ''),
      el('td', { class: 'muted' }, lp.chain),
      el('td', { class: 'r num' }, val(lp.vol24h, fmtUsd)),
      el('td', { class: `r num ${lp.volCh1d >= 0 ? 'up' : 'down'}` }, val(lp.volCh1d, (v) => fmtPct(v, 1))),
      el('td', { class: 'r num' }, val(lp.rev24h, fmtUsd)),
      el('td', { class: `r num ${lp.revCh1d >= 0 ? 'up' : 'down'}` }, val(lp.revCh1d, (v) => fmtPct(v, 1))),
      el('td', { class: 'r num' }, val(lp.rev7d, fmtUsd)),
    ));
  });
  t.append(tb);
  $('launchpadTable').replaceChildren(t);

  const top = rows[0];
  if (top?.rev24h != null) {
    $('launchpadNote').textContent =
      `Revenue 24 jam tertinggi: ${top.name} (${fmtUsd(top.rev24h)}). `
      + `Total revenue 24 jam ${rows.length} launchpad terpantau: ${fmtUsd(rows.reduce((s, r) => s + (r.rev24h || 0), 0))}.`;
  }
}

/* ---------------- Muat ---------------- */

async function refreshMarkets({ force = false } = {}) {
  state.markets = await fetchCaseMarkets({ force });
  renderKpis();
  renderGrid();
  renderCoinDashboard();
  $('updatedAt').textContent = fmtClock(Date.now());
}

async function load({ force = false } = {}) {
  setStatus('Memuat snapshot pasar…', 'busy');
  renderYearFilter();
  renderGrid();

  const launchpadP = fetchLaunchpads({ force })
    .then(renderLaunchpads)
    .catch((e) => {
      $('launchpadTable').replaceChildren(el('p', { class: 'error' }, `Data launchpad gagal dimuat: ${e.message}`));
    });

  const marketsP = refreshMarkets({ force }).catch((e) => {
    $('coinDashboard').replaceChildren(el('p', { class: 'error' },
      `Snapshot CoinGecko gagal dimuat: ${e.message}. Daftar kasus tetap bisa dibuka.`));
  });

  await Promise.allSettled([marketsP, launchpadP]);
  setStatus(Object.keys(state.markets).length ? 'Data siap' : 'Data siap sebagian (CoinGecko tidak tersedia)', 'ok');
}

function init() {
  $('btnRefresh').addEventListener('click', async () => {
    clearCasesCache();
    $('btnRefresh').disabled = true;
    try {
      await load({ force: true });
    } finally {
      $('btnRefresh').disabled = false;
    }
  });

  load().catch((e) => {
    console.error(e);
    setStatus(`Gagal memuat: ${e.message}`, 'err');
  });

  startAutoRefresh([
    { every: 60 * 1000, run: () => refreshMarkets({ force: true }) },
    { every: 60 * 1000, run: () => fetchLaunchpads({ force: true }).then(renderLaunchpads) },
  ], mountPing());
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
