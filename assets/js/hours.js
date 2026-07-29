/* ============================================================
   hours.js — visual "jam berapa mereka aktif"
   1) Profil jam: kolom rata-rata volume per jam (sumbu ganda WIB/UTC)
   2) Matriks hari x jam: heatmap sequential
   Keduanya memakai ramp sequential biru satu-hue.
   ============================================================ */

import {
  PALETTE, seqColor, perceptual, fmtUsd, fmtUsdShort, fmtPct,
  pad2, wibToUtc, DOW_SHORT, DOW_ID, el,
} from './utils.js';
import { escapeHtml } from './worldmap.js';

const NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) n.setAttribute(k, v);
  return n;
};

/* ============================================================
   1. Profil jam — kolom
   ============================================================ */

export function renderHourProfile(container, an, { tooltip, sessions = true } = {}) {
  container.innerHTML = '';
  if (!an) return;

  const W = Math.max(360, container.clientWidth || 720);
  const H = 300;
  const M = { top: 34, right: 14, bottom: 46, left: 60 };
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;

  const root = svg('svg', {
    viewBox: `0 0 ${W} ${H}`, width: '100%', height: H,
    role: 'img',
    'aria-label': 'Average hourly volume across a day, shown in WIB and UTC',
  });

  // profil diurutkan menurut jam WIB agar sumbu utama = waktu pengguna
  const bars = Array.from({ length: 24 }, (_, wib) => an.profile.find((p) => p.wib === wib));
  const max = Math.max(...bars.map((b) => b.avg)) || 1;

  const bw = iw / 24;
  const gap = 2; // celah 2px seukuran permukaan antar batang
  const x = (i) => M.left + i * bw + gap / 2;
  const y = (v) => M.top + ih - (v / max) * ih;

  /* --- pita sesi pasar (latar, sangat resesif) --- */
  if (sessions) {
    const g = svg('g', { opacity: '0.9' });
    for (const s of an.sessions) {
      const startWib = (s.utcStart + 7) % 24;
      const len = s.hours;
      for (let k = 0; k < len; k++) {
        const i = (startWib + k) % 24;
        const rect = svg('rect', {
          x: x(i) - gap / 2, y: M.top - 8, width: bw, height: 6,
          fill: s.color, opacity: '0.30',
        });
        g.append(rect);
      }
    }
    root.append(g);
  }

  /* --- gridline resesif --- */
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const v = (max / ticks) * i;
    const yy = y(v);
    root.append(svg('line', {
      x1: M.left, x2: M.left + iw, y1: yy, y2: yy,
      stroke: PALETTE.grid, 'stroke-width': 1,
    }));
    const t = svg('text', {
      x: M.left - 8, y: yy + 4, 'text-anchor': 'end',
      fill: PALETTE.muted, 'font-size': 10,
      style: 'font-variant-numeric: tabular-nums',
    });
    t.textContent = fmtUsdShort(v);
    root.append(t);
  }

  /* --- garis rata-rata --- */
  const avgY = y(an.avgPerHour);
  root.append(svg('line', {
    x1: M.left, x2: M.left + iw, y1: avgY, y2: avgY,
    stroke: PALETTE.ink2, 'stroke-width': 1, 'stroke-dasharray': '4 4', opacity: '0.6',
  }));
  const avgLbl = svg('text', {
    x: M.left + iw, y: avgY - 6, 'text-anchor': 'end',
    fill: PALETTE.ink2, 'font-size': 10,
  });
  avgLbl.textContent = `average ${fmtUsdShort(an.avgPerHour)}/hour`;
  root.append(avgLbl);

  /* --- batang --- */
  const barsG = svg('g');
  bars.forEach((p, i) => {
    const t = perceptual(p.avg, max, 0.55);
    const h = Math.max(2, M.top + ih - y(p.avg));
    const isPeak = p.utc === an.peak.utc;
    const rect = svg('rect', {
      x: x(i), y: y(p.avg), width: Math.max(1, bw - gap), height: h,
      rx: 4, ry: 4,
      fill: isPeak ? PALETTE.seq[12] : seqColor(0.2 + 0.7 * t),
      'data-i': i,
      tabindex: 0,
      role: 'listitem',
      'aria-label': `${pad2(p.wib)}:00 WIB, average ${fmtUsd(p.avg)}`,
    });
    rect.style.cursor = 'pointer';
    rect.style.transition = 'opacity .12s';

    const show = (evt) => {
      barsG.querySelectorAll('rect').forEach((r) => { r.style.opacity = r === rect ? '1' : '0.45'; });
      if (!tooltip) return;
      tooltip.innerHTML = `
        <div class="tip-head"><strong>${pad2(p.wib)}:00 WIB</strong>
          <span class="tip-rank">${pad2(p.utc)}:00 UTC</span></div>
        <dl class="tip-grid">
          <dt>Average volume</dt><dd class="num">${fmtUsd(p.avg)}</dd>
          <dt>Median</dt><dd class="num">${fmtUsd(p.med)}</dd>
          <dt>Puncak tertinggi</dt><dd class="num">${fmtUsd(p.max)}</dd>
          <dt>vs daily average</dt><dd class="num ${p.vsAvg >= 0 ? 'up' : 'down'}">${fmtPct(p.vsAvg * 100, 1)}</dd>
          <dt>Daily share</dt><dd class="num">${(p.share * 100).toFixed(1)}%</dd>
          <dt>Samples</dt><dd class="num">${p.n} hours</dd>
        </dl>`;
      tooltip.hidden = false;
      positionTip(tooltip, container, evt);
    };
    const hide = () => {
      barsG.querySelectorAll('rect').forEach((r) => { r.style.opacity = '1'; });
      if (tooltip) tooltip.hidden = true;
    };
    rect.addEventListener('mousemove', show);
    rect.addEventListener('focus', show);
    rect.addEventListener('mouseleave', hide);
    rect.addEventListener('blur', hide);
    barsG.append(rect);
  });
  root.append(barsG);

  /* --- label langsung hanya pada puncak (bukan tiap batang) --- */
  const peakIdx = bars.findIndex((p) => p.utc === an.peak.utc);
  if (peakIdx >= 0) {
    const p = bars[peakIdx];
    const lx = Math.min(M.left + iw - 46, Math.max(M.left + 4, x(peakIdx) + bw / 2));
    const t1 = svg('text', {
      x: lx, y: y(p.avg) - 8, 'text-anchor': 'middle',
      fill: PALETTE.ink, 'font-size': 11, 'font-weight': 600,
    });
    t1.textContent = `peak ${fmtUsdShort(p.avg)}`;
    root.append(t1);
  }

  /* --- sumbu bawah: WIB ; sumbu atas: UTC --- */
  root.append(svg('line', {
    x1: M.left, x2: M.left + iw, y1: M.top + ih, y2: M.top + ih,
    stroke: PALETTE.axis, 'stroke-width': 1,
  }));

  for (let i = 0; i < 24; i++) {
    if (i % 2) continue;
    const cx = x(i) + (bw - gap) / 2;
    const a = svg('text', {
      x: cx, y: M.top + ih + 15, 'text-anchor': 'middle',
      fill: PALETTE.ink2, 'font-size': 10,
      style: 'font-variant-numeric: tabular-nums',
    });
    a.textContent = pad2(i);
    root.append(a);

    const b = svg('text', {
      x: cx, y: M.top + ih + 33, 'text-anchor': 'middle',
      fill: PALETTE.muted, 'font-size': 9,
      style: 'font-variant-numeric: tabular-nums',
    });
    b.textContent = pad2(wibToUtc(i));
    root.append(b);
  }

  const lblWib = svg('text', { x: M.left - 8, y: M.top + ih + 15, 'text-anchor': 'end', fill: PALETTE.ink2, 'font-size': 10, 'font-weight': 600 });
  lblWib.textContent = 'WIB';
  root.append(lblWib);
  const lblUtc = svg('text', { x: M.left - 8, y: M.top + ih + 33, 'text-anchor': 'end', fill: PALETTE.muted, 'font-size': 9 });
  lblUtc.textContent = 'UTC';
  root.append(lblUtc);

  container.append(root);
}

/* ============================================================
   2. Matriks hari x jam
   ============================================================ */

export function renderHourMatrix(container, an, { tooltip } = {}) {
  container.innerHTML = '';
  if (!an) return;

  if (!an.hasMatrix) {
    container.append(el('p', { class: 'note' },
      'The day × hour matrix needs at least seven days of data. Select a seven-day or longer window.'));
    return;
  }

  const wrap = el('div', { class: 'matrix' });

  // baris kepala: jam WIB
  const head = el('div', { class: 'matrix-row matrix-head' }, el('div', { class: 'matrix-label' }, 'WIB'));
  for (let h = 0; h < 24; h++) {
    head.append(el('div', { class: 'matrix-h' }, h % 2 === 0 ? pad2(h) : ''));
  }
  wrap.append(head);

  const max = an.matrixMax || 1;

  for (const row of an.matrix) {
    const r = el('div', { class: 'matrix-row' });
    r.append(el('div', { class: 'matrix-label', title: DOW_ID[row.dow] }, DOW_SHORT[row.dow]));
    for (const cell of row.hours) {
      const has = cell.avg != null;
      const t = has ? perceptual(cell.avg, max, 0.55) : 0;
      const c = el('div', {
        class: `matrix-cell${has ? '' : ' empty'}`,
        style: { background: has ? seqColor(0.08 + 0.85 * t) : 'transparent' },
        tabindex: has ? '0' : null,
        'aria-label': has
          ? `${DOW_ID[row.dow]} ${pad2(cell.wib)}:00 WIB, ${fmtUsd(cell.avg)}`
          : null,
      });
      if (has) {
        const show = (evt) => {
          if (!tooltip) return;
          const vs = an.avgPerHour > 0 ? cell.avg / an.avgPerHour - 1 : 0;
          tooltip.innerHTML = `
            <div class="tip-head"><strong>${DOW_ID[row.dow]}, ${pad2(cell.wib)}:00 WIB</strong>
              <span class="tip-rank">${pad2(cell.utc)}:00 UTC</span></div>
            <dl class="tip-grid">
              <dt>Average volume</dt><dd class="num">${fmtUsd(cell.avg)}</dd>
              <dt>vs average</dt><dd class="num ${vs >= 0 ? 'up' : 'down'}">${fmtPct(vs * 100, 1)}</dd>
              <dt>Samples</dt><dd class="num">${cell.n} weeks</dd>
            </dl>`;
          tooltip.hidden = false;
          positionTip(tooltip, container, evt);
        };
        c.addEventListener('mousemove', show);
        c.addEventListener('focus', show);
        c.addEventListener('mouseleave', () => { if (tooltip) tooltip.hidden = true; });
        c.addEventListener('blur', () => { if (tooltip) tooltip.hidden = true; });
      }
      r.append(c);
    }
    wrap.append(r);
  }

  // baris kaki: jam UTC
  const foot = el('div', { class: 'matrix-row matrix-head' }, el('div', { class: 'matrix-label' }, 'UTC'));
  for (let h = 0; h < 24; h++) {
    foot.append(el('div', { class: 'matrix-h' }, h % 2 === 0 ? pad2(wibToUtc(h)) : ''));
  }
  wrap.append(foot);

  container.append(wrap);
}

/* ============================================================
   3. Legenda sequential (dipakai peta & matriks)
   ============================================================ */

export function renderSeqLegend(container, { min = 0, max = 1, label = 'Volume', fmt = fmtUsdShort } = {}) {
  container.innerHTML = '';
  const bar = el('div', { class: 'legend-bar' });
  for (let i = 0; i < PALETTE.seq.length; i++) {
    bar.append(el('span', { style: { background: PALETTE.seq[i] } }));
  }
  container.append(
    el('span', { class: 'legend-title' }, label),
    el('span', { class: 'legend-end' }, fmt(min)),
    bar,
    el('span', { class: 'legend-end' }, fmt(max)),
  );
}

/* ============================================================
   Tooltip helper
   ============================================================ */

export function positionTip(tip, container, evt) {
  if (!evt) return;
  // Koordinat harus relatif terhadap offsetParent tooltip, bukan wadah grafik —
  // keduanya sering berbeda (grafik bersarang di dalam panel).
  const host = tip.offsetParent || container;
  const box = host.getBoundingClientRect();
  const tw = tip.offsetWidth;
  const th = tip.offsetHeight;
  let x = evt.clientX - box.left + 16;
  let y = evt.clientY - box.top + 16;
  if (x + tw > box.width - 8) x = evt.clientX - box.left - tw - 16;
  if (y + th > box.height - 8) y = Math.max(4, evt.clientY - box.top - th - 16);
  tip.style.left = `${Math.max(4, x)}px`;
  tip.style.top = `${Math.max(4, y)}px`;
}

export { escapeHtml };
