/* ============================================================
   treemap.js — heatmap volume memecoin
   Luas ubin  = pangsa volume 24 jam (magnitude)
   Warna ubin = perubahan harga (diverging biru=naik / merah=turun)
   Setiap ubin membawa label persen langsung, jadi identitas tidak
   pernah bergantung pada warna saja.
   ============================================================ */

import { squarify } from './analytics.js';
import {
  PALETTE, divColor, inkOn, fmtUsd, fmtPct, fmtPrice, el,
} from './utils.js';
import { positionTip } from './hours.js';
import { escapeHtml } from './worldmap.js';

export const CHANGE_FIELDS = {
  '1h': { key: 'ch1h', label: '1 jam', cap: 8 },
  '24h': { key: 'ch24h', label: '24 jam', cap: 20 },
  '7d': { key: 'ch7d', label: '7 hari', cap: 40 },
};

export function renderTreemap(container, coins, {
  tooltip, changeField = '24h', limit = 40, onSelect,
} = {}) {
  container.innerHTML = '';
  const field = CHANGE_FIELDS[changeField] || CHANGE_FIELDS['24h'];

  const w = Math.max(320, container.clientWidth || 800);
  const h = Math.max(320, container.clientHeight || 460);

  const items = coins
    .filter((c) => c.vol > 0)
    .slice(0, limit)
    .map((c) => ({ value: c.vol, coin: c }));

  if (!items.length) {
    container.append(el('p', { class: 'note' }, 'Tidak ada data volume memecoin.'));
    return;
  }

  const totalVol = items.reduce((s, i) => s + i.value, 0);
  const tiles = squarify(items, 0, 0, w, h);

  for (const t of tiles) {
    const c = t.coin;
    const pct = c[field.key];
    const bg = divColor(pct, field.cap);
    const fg = inkOn(bg);
    const share = c.vol / totalVol;

    const node = el('div', {
      class: 'tile',
      style: {
        left: `${t.x}px`, top: `${t.y}px`,
        width: `${Math.max(0, t.w - 2)}px`, height: `${Math.max(0, t.h - 2)}px`,
        background: bg, color: fg,
      },
      tabindex: '0',
      role: 'listitem',
      'aria-label': `${c.name}, volume ${fmtUsd(c.vol)}, perubahan ${field.label} ${fmtPct(pct)}`,
    });

    const big = t.w > 78 && t.h > 52;
    const mid = t.w > 52 && t.h > 34;

    if (big) {
      node.append(
        el('span', { class: 'tile-sym' }, c.sym),
        el('span', { class: 'tile-pct' }, fmtPct(pct, 1)),
        el('span', { class: 'tile-vol' }, fmtUsd(c.vol, 1)),
      );
    } else if (mid) {
      node.append(
        el('span', { class: 'tile-sym sm' }, c.sym),
        el('span', { class: 'tile-pct sm' }, fmtPct(pct, 0)),
      );
    } else if (t.w > 26 && t.h > 16) {
      node.append(el('span', { class: 'tile-sym xs' }, c.sym));
    }

    const show = (evt) => {
      if (!tooltip) return;
      tooltip.innerHTML = `
        <div class="tip-head">
          <span class="tip-dot" style="background:${bg}"></span>
          <strong>${escapeHtml(c.name)}</strong>
          <span class="tip-rank">${escapeHtml(c.sym)}</span>
        </div>
        <dl class="tip-grid">
          <dt>Harga</dt><dd class="num">${fmtPrice(c.price)}</dd>
          <dt>Volume 24 jam</dt><dd class="num">${fmtUsd(c.vol)}</dd>
          <dt>Pangsa keranjang</dt><dd class="num">${(share * 100).toFixed(2)}%</dd>
          <dt>Kapitalisasi</dt><dd class="num">${fmtUsd(c.mcap)}</dd>
          <dt>Vol / Kap</dt><dd class="num">${c.mcap ? (c.vol / c.mcap).toFixed(3) : '—'}</dd>
          <dt>Ubah 1 jam</dt><dd class="num ${sign(c.ch1h)}">${fmtPct(c.ch1h)}</dd>
          <dt>Ubah 24 jam</dt><dd class="num ${sign(c.ch24h)}">${fmtPct(c.ch24h)}</dd>
          <dt>Ubah 7 hari</dt><dd class="num ${sign(c.ch7d)}">${fmtPct(c.ch7d)}</dd>
        </dl>`;
      tooltip.hidden = false;
      positionTip(tooltip, container, evt);
    };

    node.addEventListener('mousemove', show);
    node.addEventListener('focus', show);
    node.addEventListener('mouseleave', () => { if (tooltip) tooltip.hidden = true; });
    node.addEventListener('blur', () => { if (tooltip) tooltip.hidden = true; });
    if (onSelect) node.addEventListener('click', () => onSelect(c));

    container.append(node);
  }
}

const sign = (v) => (!Number.isFinite(v) ? '' : v >= 0 ? 'up' : 'down');

/* ---------------- Legenda diverging ---------------- */

export function renderDivLegend(container, changeField = '24h') {
  const field = CHANGE_FIELDS[changeField] || CHANGE_FIELDS['24h'];
  container.innerHTML = '';
  const bar = el('div', { class: 'legend-bar' });
  for (const c of [...PALETTE.divDown].reverse()) bar.append(el('span', { style: { background: c } }));
  bar.append(el('span', { style: { background: PALETTE.divMid } }));
  for (const c of PALETTE.divUp) bar.append(el('span', { style: { background: c } }));

  container.append(
    el('span', { class: 'legend-title' }, `Perubahan ${field.label}`),
    el('span', { class: 'legend-end' }, `≤ −${field.cap}%`),
    bar,
    el('span', { class: 'legend-end' }, `≥ +${field.cap}%`),
    el('span', { class: 'legend-note' }, 'biru = naik · merah = turun'),
  );
}

/* ---------------- Tampilan tabel (kanal pemulihan a11y) ---------------- */

export function renderCoinTable(container, coins, limit = 40) {
  container.innerHTML = '';
  const rows = coins.slice(0, limit);
  const total = rows.reduce((s, c) => s + c.vol, 0);

  const table = el('table', { class: 'data-table' });
  table.append(el('caption', {}, `Volume ${rows.length} memecoin teratas (24 jam)`));
  const thead = el('thead', {}, el('tr', {},
    el('th', { scope: 'col' }, '#'),
    el('th', { scope: 'col' }, 'Koin'),
    el('th', { scope: 'col', class: 'r' }, 'Harga'),
    el('th', { scope: 'col', class: 'r' }, 'Volume 24j'),
    el('th', { scope: 'col', class: 'r' }, 'Pangsa'),
    el('th', { scope: 'col', class: 'r' }, 'Kapitalisasi'),
    el('th', { scope: 'col', class: 'r' }, '1j'),
    el('th', { scope: 'col', class: 'r' }, '24j'),
    el('th', { scope: 'col', class: 'r' }, '7h'),
  ));
  const tbody = el('tbody');
  rows.forEach((c, i) => {
    tbody.append(el('tr', {},
      el('td', { class: 'muted' }, String(i + 1)),
      el('td', {}, el('strong', {}, c.sym), ' ', el('span', { class: 'muted' }, c.name)),
      el('td', { class: 'r num' }, fmtPrice(c.price)),
      el('td', { class: 'r num' }, fmtUsd(c.vol)),
      el('td', { class: 'r num' }, `${((c.vol / total) * 100).toFixed(2)}%`),
      el('td', { class: 'r num' }, fmtUsd(c.mcap)),
      el('td', { class: `r num ${sign(c.ch1h)}` }, fmtPct(c.ch1h, 1)),
      el('td', { class: `r num ${sign(c.ch24h)}` }, fmtPct(c.ch24h, 1)),
      el('td', { class: `r num ${sign(c.ch7d)}` }, fmtPct(c.ch7d, 1)),
    ));
  });
  table.append(thead, tbody);
  container.append(table);
}
