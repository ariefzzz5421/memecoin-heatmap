/* ============================================================
   cases-chart.js — chart mingguan skala log + tabel data,
   dipakai halaman artikel per token (dan siapa pun yang butuh).
   ============================================================ */

import { PALETTE, fmtUsd, fmtPrice, fmtNum, el } from './utils.js';

const NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  return n;
};

export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDate = (ms) => {
  const d = new Date(ms);
  return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

export const DAY = 86400000;

export function fmtDuration(days) {
  if (!Number.isFinite(days)) return '—';
  if (days < 1) return '< 1 day (launch day)';
  if (days < 60) return `${Math.round(days)} days`;
  if (days < 365) return `${Math.round(days)} days (${(days / 30.44).toFixed(1)} months)`;
  return `${fmtNum(Math.round(days))} days (${(days / 365.25).toFixed(1)} years)`;
}

/**
 * Gambar chart mingguan skala log ke `holder`.
 * @param holder  elemen target (dikosongkan dulu)
 * @param caseDef definisi kasus (launch, sym)
 * @param m       snapshot CoinGecko { ath, athDate } — boleh null
 * @param weekly  { provider, rows:[{t,o,h,l,c,q}] }
 * @param tip     elemen tooltip absolut
 */
export function renderCaseChart(holder, caseDef, m, weekly, tip) {
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
  const lo = Math.log10(Math.min(...lows));
  const hi = Math.log10(Math.max(...highs));
  const pad = (hi - lo) * 0.06 || 0.5;
  const y = (v) => M.top + ih - ((Math.log10(v) - (lo - pad)) / ((hi + pad) - (lo - pad))) * ih;

  const root = svg('svg', {
    viewBox: `0 0 ${W} ${H}`, width: '100%', height: H, role: 'img',
    'aria-label': `${caseDef.sym} weekly price on a log scale, ${fmtDate(t0)} to ${fmtDate(t1)}`,
  });

  /* grid Y: tiap dekade; subtick 2x/5x bila dekade sedikit */
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

  /* grid X: awal tahun; bila rentang < 1 tahun, tick kuartalan */
  const y0 = new Date(t0).getUTCFullYear();
  const y1 = new Date(t1).getUTCFullYear();
  for (let yr = y0; yr <= y1; yr++) {
    const t = Date.UTC(yr, 0, 1);
    if (t < t0 || t > t1) continue;
    const xx = x(t);
    root.append(svg('line', { x1: xx, x2: xx, y1: M.top, y2: M.top + ih, stroke: PALETTE.grid, 'stroke-width': 1 }));
    const lbl = svg('text', {
      x: xx + 4, y: M.top + ih + 16, fill: PALETTE.ink2, 'font-size': 10,
      style: 'font-variant-numeric: tabular-nums',
    });
    lbl.textContent = String(yr);
    root.append(lbl);
  }
  if (y1 - y0 === 0) {
    for (const r of rows) {
      const d = new Date(r.t);
      if (d.getUTCDate() <= 7 && d.getUTCMonth() % 3 === 0) {
        const lbl = svg('text', {
          x: x(r.t), y: M.top + ih + 16, 'text-anchor': 'middle', fill: PALETTE.ink2, 'font-size': 10,
        });
        lbl.textContent = `${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
        root.append(lbl);
      }
    }
  }

  /* garis close mingguan */
  const path = rows.map((r, i) => `${i ? 'L' : 'M'}${x(r.t).toFixed(1)},${y(r.c).toFixed(1)}`).join('');
  root.append(svg('path', { d: path, fill: 'none', stroke: PALETTE.divUp[2], 'stroke-width': 2, 'stroke-linejoin': 'round' }));

  /* penanda tertinggi */
  let athRow = rows[0];
  for (const r of rows) if (r.h > athRow.h) athRow = r;
  const athX = x(athRow.t);
  const athY = y(athRow.h);
  const cgAthInRange = m?.athDate
    && Date.parse(m.athDate) >= t0 - 7 * DAY && Date.parse(m.athDate) <= t1 + 7 * DAY;
  const athLabel = cgAthInRange
    ? `ATH ${fmtPrice(m.ath)} · ${fmtDate(Date.parse(m.athDate))}`
    : `Chart high ${fmtPrice(athRow.h)} · ${fmtDate(athRow.t)}`;

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

    if (!tip) return;
    tip.innerHTML = `
      <div class="tip-head"><strong>Week of ${fmtDate(best.t)}</strong></div>
      <dl class="tip-grid">
        <dt>Close</dt><dd class="num">${fmtPrice(best.c)}</dd>
        <dt>High</dt><dd class="num">${fmtPrice(best.h)}</dd>
        <dt>Low</dt><dd class="num">${fmtPrice(best.l)}</dd>
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
    if (tip) tip.hidden = true;
  });
  root.append(overlay);

  holder.append(root);

  /* catatan cakupan */
  const launchMs = Date.parse(caseDef.launch);
  const gapDays = (t0 - launchMs) / DAY;
  const notes = [`Source: ${weekly.provider}, weekly candles since ${fmtDate(t0)} (log scale).`];
  if (gapDays > 14) {
    notes.push(`Launch was ${fmtDate(launchMs)} — ${fmtDuration(gapDays)} before supported listing data; that early period is not shown.`);
  }
  if (m?.athDate && !cgAthInRange) {
    notes.push(`The CoinGecko ATH (${fmtPrice(m.ath)}, ${fmtDate(Date.parse(m.athDate))}) is outside this source's available range.`);
  }
  holder.append(el('p', { class: 'note' }, notes.join(' ')));
}

export function renderWeeklyTable(holder, caseDef, weekly) {
  const t = el('table', { class: 'data-table compact' });
  t.append(el('caption', {}, `${caseDef.sym} weekly data (${weekly.provider})`));
  t.append(el('thead', {}, el('tr', {},
    el('th', { scope: 'col' }, 'Week'),
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
