/* ============================================================
   cases-page.js — halaman studi kasus memecoin ≥ $100M mcap.
   Chart mingguan skala log dari listing paling awal yang
   tersedia sampai sekarang, penanda ATH, fakta terhitung,
   katalis terdokumentasi, dan dasbor volume + launchpad.
   ============================================================ */

import { CASES, MCAP_THRESHOLD } from './cases-config.js';
import { fetchCaseMarkets, fetchWeekly, fetchLaunchpads, clearCasesCache } from './cases-data.js';
import { PALETTE, fmtUsd, fmtUsdShort, fmtPrice, fmtPct, fmtNum, fmtClock, el } from './utils.js';

const $ = (id) => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  return n;
};

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const fmtDate = (ms) => {
  const d = new Date(ms);
  return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

const DAY = 86400000;
function fmtDuration(days) {
  if (!Number.isFinite(days)) return '—';
  if (days < 1) return '< 1 hari (hari launch)';
  if (days < 60) return `${Math.round(days)} hari`;
  if (days < 365) return `${Math.round(days)} hari (${(days / 30.44).toFixed(1)} bulan)`;
  return `${fmtNum(Math.round(days))} hari (${(days / 365.25).toFixed(1)} tahun)`;
}

const state = {
  markets: null,     // byId dari CoinGecko
  selected: CASES[0].id,
  weekly: new Map(), // id -> {provider, rows}
};

function setStatus(text, kind = 'busy') {
  $('statusText').textContent = text;
  $('statusDot').className = `dot ${kind}`;
}

/* ---------------- durasi launch -> ATH ---------------- */

function launchToAthDays(caseDef) {
  const m = state.markets?.[caseDef.id];
  if (!m?.athDate) return null;
  return (Date.parse(m.athDate) - Date.parse(caseDef.launch)) / DAY;
}

/* ---------------- KPI ---------------- */

function renderKpis() {
  const rows = CASES.map((c) => ({ c, m: state.markets[c.id], days: launchToAthDays(c) }))
    .filter((r) => r.m);
  const above = rows.filter((r) => r.m.mcap >= MCAP_THRESHOLD);
  const totalMcap = rows.reduce((s, r) => s + (r.m.mcap || 0), 0);
  const byDays = rows.filter((r) => Number.isFinite(r.days)).sort((a, b) => a.days - b.days);
  const fastest = byDays[0];
  const slowest = byDays[byDays.length - 1];

  $('kpiCount').textContent = `${above.length}/${rows.length}`;
  $('kpiCountSub').textContent = `koin studi dengan mcap ≥ $100M saat ini · total ${fmtUsd(totalMcap)}`;
  $('kpiFast').textContent = fastest ? fastest.c.sym : '—';
  $('kpiFastSub').textContent = fastest
    ? `launch → ATH: ${fmtDuration(fastest.days)}` : '—';
  $('kpiSlow').textContent = slowest ? slowest.c.sym : '—';
  $('kpiSlowSub').textContent = slowest
    ? `launch → ATH: ${fmtDuration(slowest.days)}` : '—';

  const deepest = rows.sort((a, b) => a.m.athPct - b.m.athPct)[0];
  $('kpiDraw').textContent = deepest ? `${deepest.m.athPct.toFixed(0)}%` : '—';
  $('kpiDrawSub').textContent = deepest
    ? `${deepest.c.sym}: harga sekarang vs ATH — semua koin studi masih di bawah ATH` : '—';
}

/* ---------------- Selector ---------------- */

function renderSelector() {
  const holder = $('caseSelector');
  holder.replaceChildren();
  for (const c of CASES) {
    const b = el('button', {
      class: `seg-btn${c.id === state.selected ? ' is-on' : ''}`,
      type: 'button',
      onclick: () => {
        if (state.selected === c.id) return;
        state.selected = c.id;
        holder.querySelectorAll('.seg-btn').forEach((x) => x.classList.toggle('is-on', x.textContent === c.sym));
        renderCase().catch(showCaseError);
      },
    }, c.sym);
    holder.append(b);
  }
}

/* ---------------- Detail kasus ---------------- */

async function renderCase() {
  const caseDef = CASES.find((c) => c.id === state.selected);
  const m = state.markets?.[caseDef.id];

  $('caseTitle').textContent = `${caseDef.name} (${caseDef.sym})`;
  $('caseLaunch').textContent = `${fmtDate(Date.parse(caseDef.launch))} — ${caseDef.launchNote}`;

  renderFacts(caseDef, m, null);
  renderCatalysts(caseDef);

  const chartHolder = $('caseChart');
  chartHolder.replaceChildren(el('div', { class: 'chart-loading' },
    el('span', { class: 'spinner' }), ` Mengambil kline mingguan ${caseDef.sym}…`));

  let weekly = state.weekly.get(caseDef.id);
  if (!weekly) {
    weekly = await fetchWeekly(caseDef);
    state.weekly.set(caseDef.id, weekly);
  }
  // pengguna bisa berpindah koin selagi fetch berjalan
  if (state.selected !== caseDef.id) return;

  renderFacts(caseDef, m, weekly);
  renderChart(chartHolder, caseDef, m, weekly);
  renderWeeklyTable(caseDef, weekly);
}

function showCaseError(err) {
  console.error(err);
  $('caseChart').replaceChildren(el('p', { class: 'error' },
    `Chart gagal dimuat: ${err.message}`));
}

function factRow(label, value) {
  return el('div', { class: 'stat' },
    el('span', { class: 'stat-l' }, label),
    el('span', { class: 'stat-v num' }, value),
  );
}

function renderFacts(caseDef, m, weekly) {
  const days = launchToAthDays(caseDef);
  const first = weekly?.rows?.[0];
  const maxHigh = weekly ? Math.max(...weekly.rows.map((r) => r.h)) : null;
  const multiple = first && maxHigh ? maxHigh / first.c : null;

  $('caseFacts').replaceChildren(
    factRow('Launch', fmtDate(Date.parse(caseDef.launch))),
    factRow('ATH', m ? `${fmtPrice(m.ath)} · ${fmtDate(Date.parse(m.athDate))}` : '—'),
    factRow('Launch → ATH', fmtDuration(days)),
    factRow('Harga sekarang', m ? `${fmtPrice(m.price)} (${fmtPct(m.athPct, 1)} dari ATH)` : '—'),
    factRow('Kapitalisasi', m ? fmtUsd(m.mcap) : '—'),
    factRow('Volume 24 jam', m ? fmtUsd(m.vol) : '—'),
    factRow('Multiple pada chart', multiple ? `${fmtNum(Math.round(multiple))}× dari close minggu pertama` : '—'),
    factRow('Data chart', weekly ? `${weekly.provider}, sejak ${fmtDate(weekly.rows[0].t)}` : 'memuat…'),
  );
}

function renderCatalysts(caseDef) {
  const list = $('caseCatalysts');
  list.replaceChildren();
  for (const cat of caseDef.catalysts) {
    list.append(el('li', { class: 'catalyst' },
      el('span', { class: 'catalyst-date num' }, cat.d),
      el('span', { class: 'catalyst-text' }, cat.t),
    ));
  }
  $('caseThesis').textContent = caseDef.thesis;
}

/* ---------------- Chart mingguan skala log ---------------- */

function renderChart(holder, caseDef, m, weekly) {
  holder.replaceChildren();
  const rows = weekly.rows;

  const W = Math.max(360, holder.clientWidth || 900);
  const H = 340;
  const M = { top: 26, right: 16, bottom: 34, left: 64 };
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;

  const t0 = rows[0].t;
  const t1 = rows[rows.length - 1].t;
  const x = (t) => M.left + ((t - t0) / Math.max(1, t1 - t0)) * iw;

  const lows = rows.map((r) => r.l).filter((v) => v > 0);
  const highs = rows.map((r) => r.h);
  const yMin = Math.min(...lows);
  const yMax = Math.max(...highs);
  const lo = Math.log10(yMin);
  const hi = Math.log10(yMax);
  const pad = (hi - lo) * 0.06 || 0.5;
  const y = (v) => M.top + ih - ((Math.log10(v) - (lo - pad)) / ((hi + pad) - (lo - pad))) * ih;

  const root = svg('svg', {
    viewBox: `0 0 ${W} ${H}`, width: '100%', height: H, role: 'img',
    'aria-label': `Harga mingguan ${caseDef.sym} skala log, ${fmtDate(t0)} sampai ${fmtDate(t1)}`,
  });

  /* grid Y: tiap dekade (10^n); subtick 2x/5x bila dekade < 3 */
  const decades = [];
  for (let e = Math.floor(lo - pad); e <= Math.ceil(hi + pad); e++) decades.push(e);
  const subMult = decades.length <= 4 ? [1, 2, 5] : [1];
  for (const e of decades) {
    for (const mlt of subMult) {
      const v = mlt * 10 ** e;
      if (v < 10 ** (lo - pad) || v > 10 ** (hi + pad)) continue;
      const yy = y(v);
      if (yy < M.top - 2 || yy > M.top + ih + 2) continue;
      root.append(svg('line', {
        x1: M.left, x2: M.left + iw, y1: yy, y2: yy,
        stroke: PALETTE.grid, 'stroke-width': mlt === 1 ? 1 : 0.5,
        'stroke-dasharray': mlt === 1 ? null : '2 3',
      }));
      const t = svg('text', {
        x: M.left - 7, y: yy + 3.5, 'text-anchor': 'end',
        fill: PALETTE.muted, 'font-size': 10,
        style: 'font-variant-numeric: tabular-nums',
      });
      t.textContent = v >= 1 ? `$${v}` : `$${v.toPrecision(1).replace(/e-?\d+$/, (s) => `e${s.slice(1)}`)}`;
      root.append(t);
    }
  }

  /* grid X: awal tahun */
  const y0 = new Date(t0).getUTCFullYear();
  const y1 = new Date(t1).getUTCFullYear();
  const yearSpan = y1 - y0;
  for (let yr = y0; yr <= y1; yr++) {
    const t = Date.UTC(yr, 0, 1);
    if (t < t0 || t > t1) continue;
    const xx = x(t);
    root.append(svg('line', {
      x1: xx, x2: xx, y1: M.top, y2: M.top + ih,
      stroke: PALETTE.grid, 'stroke-width': 1,
    }));
    const lbl = svg('text', {
      x: xx + 4, y: M.top + ih + 16, fill: PALETTE.ink2, 'font-size': 10,
      style: 'font-variant-numeric: tabular-nums',
    });
    lbl.textContent = String(yr);
    root.append(lbl);
  }
  if (yearSpan === 0) {
    // rentang < 1 tahun: tick per kuartal
    for (const r of rows) {
      const d = new Date(r.t);
      if (d.getUTCDate() <= 7 && d.getUTCMonth() % 3 === 0) {
        const xx = x(r.t);
        const lbl = svg('text', {
          x: xx, y: M.top + ih + 16, 'text-anchor': 'middle', fill: PALETTE.ink2, 'font-size': 10,
        });
        lbl.textContent = `${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
        root.append(lbl);
      }
    }
  }

  /* garis harga (close mingguan) */
  const path = rows.map((r, i) => `${i ? 'L' : 'M'}${x(r.t).toFixed(1)},${y(r.c).toFixed(1)}`).join('');
  root.append(svg('path', { d: path, fill: 'none', stroke: PALETTE.divUp[2], 'stroke-width': 2, 'stroke-linejoin': 'round' }));

  /* penanda tertinggi pada chart */
  let athRow = rows[0];
  for (const r of rows) if (r.h > athRow.h) athRow = r;
  const athX = x(athRow.t);
  const athY = y(athRow.h);
  const cgAthInRange = m?.athDate
    && Date.parse(m.athDate) >= t0 - 7 * DAY && Date.parse(m.athDate) <= t1 + 7 * DAY;
  const athLabel = cgAthInRange
    ? `ATH ${fmtPrice(m.ath)} · ${fmtDate(Date.parse(m.athDate))}`
    : `Tertinggi di chart ${fmtPrice(athRow.h)} · ${fmtDate(athRow.t)}`;

  root.append(svg('circle', { cx: athX, cy: athY, r: 4.5, fill: PALETTE.seq[12], stroke: PALETTE.plane, 'stroke-width': 2 }));
  const anchorEnd = athX > M.left + iw * 0.6;
  const athText = svg('text', {
    x: anchorEnd ? athX - 9 : athX + 9,
    y: Math.max(M.top + 10, athY - 8),
    'text-anchor': anchorEnd ? 'end' : 'start',
    fill: PALETTE.ink, 'font-size': 11, 'font-weight': 600,
  });
  athText.textContent = athLabel;
  root.append(athText);

  /* crosshair + tooltip */
  const cross = svg('line', { y1: M.top, y2: M.top + ih, stroke: PALETTE.ink2, 'stroke-width': 1, 'stroke-dasharray': '3 3', visibility: 'hidden' });
  const dot = svg('circle', { r: 4, fill: PALETTE.divUp[2], stroke: PALETTE.plane, 'stroke-width': 2, visibility: 'hidden' });
  root.append(cross, dot);

  const tip = $('caseTip');
  const overlay = svg('rect', { x: M.left, y: M.top, width: iw, height: ih, fill: 'transparent' });
  overlay.addEventListener('mousemove', (evt) => {
    const box = root.getBoundingClientRect();
    const sx = ((evt.clientX - box.left) / box.width) * W;
    const t = t0 + ((sx - M.left) / iw) * (t1 - t0);
    let best = rows[0];
    for (const r of rows) if (Math.abs(r.t - t) < Math.abs(best.t - t)) best = r;
    const bx = x(best.t);
    cross.setAttribute('x1', bx);
    cross.setAttribute('x2', bx);
    cross.setAttribute('visibility', 'visible');
    dot.setAttribute('cx', bx);
    dot.setAttribute('cy', y(best.c));
    dot.setAttribute('visibility', 'visible');

    tip.innerHTML = `
      <div class="tip-head"><strong>Minggu ${fmtDate(best.t)}</strong></div>
      <dl class="tip-grid">
        <dt>Close</dt><dd class="num">${fmtPrice(best.c)}</dd>
        <dt>Tertinggi</dt><dd class="num">${fmtPrice(best.h)}</dd>
        <dt>Terendah</dt><dd class="num">${fmtPrice(best.l)}</dd>
        ${Number.isFinite(best.q) && best.q > 0 ? `<dt>Volume</dt><dd class="num">${fmtUsd(best.q)}</dd>` : ''}
      </dl>`;
    tip.hidden = false;
    const host = tip.offsetParent || holder;
    const hostBox = host.getBoundingClientRect();
    let tx = evt.clientX - hostBox.left + 16;
    let ty = evt.clientY - hostBox.top + 14;
    if (tx + tip.offsetWidth > hostBox.width - 8) tx = evt.clientX - hostBox.left - tip.offsetWidth - 16;
    tip.style.left = `${Math.max(4, tx)}px`;
    tip.style.top = `${Math.max(4, ty)}px`;
  });
  overlay.addEventListener('mouseleave', () => {
    cross.setAttribute('visibility', 'hidden');
    dot.setAttribute('visibility', 'hidden');
    tip.hidden = true;
  });
  root.append(overlay);

  holder.append(root);

  /* catatan cakupan chart */
  const launchMs = Date.parse(caseDef.launch);
  const gapDays = (t0 - launchMs) / DAY;
  const notes = [];
  notes.push(`Sumber: ${weekly.provider}, kline mingguan sejak ${fmtDate(t0)} (skala log).`);
  if (gapDays > 14) {
    notes.push(`Launch ${fmtDate(launchMs)} — ${fmtDuration(gapDays)} sebelum data listing tersedia; periode awal tidak tampil di chart.`);
  }
  if (m?.athDate && !cgAthInRange) {
    notes.push(`ATH CoinGecko (${fmtPrice(m.ath)}, ${fmtDate(Date.parse(m.athDate))}) berada di luar rentang data sumber ini.`);
  }
  holder.append(el('p', { class: 'note' }, notes.join(' ')));
}

function renderWeeklyTable(caseDef, weekly) {
  const holder = $('caseWeeklyTable');
  const t = el('table', { class: 'data-table compact' });
  t.append(el('caption', {}, `Data mingguan ${caseDef.sym} (${weekly.provider})`));
  t.append(el('thead', {}, el('tr', {},
    el('th', { scope: 'col' }, 'Minggu'),
    el('th', { scope: 'col', class: 'r' }, 'Open'),
    el('th', { scope: 'col', class: 'r' }, 'High'),
    el('th', { scope: 'col', class: 'r' }, 'Low'),
    el('th', { scope: 'col', class: 'r' }, 'Close'),
  )));
  const tb = el('tbody');
  for (const r of weekly.rows) {
    tb.append(el('tr', {},
      el('td', { class: 'num' }, fmtDate(r.t)),
      el('td', { class: 'r num' }, fmtPrice(r.o)),
      el('td', { class: 'r num' }, fmtPrice(r.h)),
      el('td', { class: 'r num' }, fmtPrice(r.l)),
      el('td', { class: 'r num' }, fmtPrice(r.c)),
    ));
  }
  t.append(tb);
  holder.replaceChildren(t);
}

/* ---------------- Dasbor koin studi ---------------- */

function renderCoinDashboard() {
  const rows = CASES
    .map((c) => ({ c, m: state.markets[c.id], days: launchToAthDays(c) }))
    .filter((r) => r.m)
    .sort((a, b) => b.m.vol - a.m.vol);

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
    const tr = el('tr', { class: 'clickable', tabindex: '0' },
      el('td', { class: 'muted' }, String(i + 1)),
      el('td', {}, el('strong', {}, r.c.sym), ' ', el('span', { class: 'muted' }, r.c.name)),
      el('td', { class: 'r num' }, fmtPrice(r.m.price)),
      el('td', { class: 'r num' }, fmtUsd(r.m.vol)),
      el('td', { class: `r num ${r.m.ch24h >= 0 ? 'up' : 'down'}` }, fmtPct(r.m.ch24h, 1)),
      el('td', { class: 'r num' }, fmtUsd(r.m.mcap)),
      el('td', { class: 'r num' }, fmtPrice(r.m.ath)),
      el('td', { class: 'r num down' }, fmtPct(r.m.athPct, 1)),
      el('td', { class: 'r num' }, fmtDuration(r.days)),
    );
    const go = () => {
      state.selected = r.c.id;
      renderSelector();
      renderCase().catch(showCaseError);
      $('kasus').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    tr.addEventListener('click', go);
    tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    tb.append(tr);
  });
  t.append(tb);
  $('coinDashboard').replaceChildren(t);
}

/* ---------------- Dasbor launchpad ---------------- */

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
      el('td', {}, el('strong', {}, lp.name), i === 0 ? el('span', { class: 'pill chain-hot' }, '#1 revenue') : ''),
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

/* ---------------- Boot ---------------- */

async function load({ force = false } = {}) {
  setStatus('Memuat snapshot pasar…', 'busy');

  /* Tiga sumber independen — kegagalan satu sumber tidak mematikan yang lain:
     chart & katalis (bursa), snapshot pasar (CoinGecko), launchpad (DeFiLlama). */
  renderSelector();

  const launchpadP = fetchLaunchpads({ force })
    .then(renderLaunchpads)
    .catch((e) => {
      $('launchpadTable').replaceChildren(el('p', { class: 'error' }, `Data launchpad gagal dimuat: ${e.message}`));
    });

  const marketsP = fetchCaseMarkets({ force })
    .then((byId) => {
      state.markets = byId;
      renderKpis();
      renderCoinDashboard();
    })
    .catch((e) => {
      state.markets = state.markets || {};
      $('coinDashboard').replaceChildren(el('p', { class: 'error' },
        `Snapshot CoinGecko gagal dimuat: ${e.message}. Chart dan katalis tetap tersedia; coba muat ulang beberapa menit lagi.`));
    });

  const caseP = renderCase().catch(showCaseError);

  await Promise.allSettled([marketsP, caseP, launchpadP]);
  // fakta bergantung sebagian pada snapshot — render ulang setelah keduanya selesai
  const caseDef = CASES.find((c) => c.id === state.selected);
  renderFacts(caseDef, state.markets?.[caseDef.id], state.weekly.get(caseDef.id) || null);

  $('updatedAt').textContent = fmtClock(Date.now());
  setStatus(Object.keys(state.markets || {}).length ? 'Data siap' : 'Data siap sebagian (CoinGecko tidak tersedia)', 'ok');
}

function init() {
  $('btnRefresh').addEventListener('click', async () => {
    clearCasesCache();
    state.weekly.clear();
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
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
