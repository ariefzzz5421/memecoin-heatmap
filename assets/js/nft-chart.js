/* Floor-price milestone chart.

   Only sourced points are drawn — mint price, documented peaks, documented
   lows, and the live floor. Nothing is interpolated between them, so the marks
   are bars rather than a line that would imply a continuous series.
   The value axis is logarithmic because a single collection can span 0.03 ETH
   at mint and 152 ETH at peak. */

import { el } from './utils.js';
import { fmtEth, fmtMonth } from './nft-data.js';

const ROW = 34;
const PAD_TOP = 12;
const PAD_BOTTOM = 26;
const LABEL_W = 118;
const VALUE_W = 96;

const svgEl = (tag, attrs = {}) => {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null) continue;
    node.setAttribute(key, String(value));
  }
  return node;
};

export function renderFloorChart(holder, milestones, { liveFloor = null, currency = 'ETH' } = {}) {
  const points = milestones
    .map((point) => ({
      ...point,
      eth: point.live ? liveFloor : point.eth,
    }))
    .filter((point) => Number.isFinite(point.eth));

  holder.replaceChildren();
  if (!points.length) {
    holder.append(el('p', { class: 'doc-note' },
      'No sourced floor value is available for this collection yet.'));
    return;
  }

  const width = Math.max(holder.clientWidth || 0, 320);
  const plotW = Math.max(width - LABEL_W - VALUE_W, 80);
  const height = PAD_TOP + points.length * ROW + PAD_BOTTOM;
  const maxValue = Math.max(...points.map((point) => point.eth));
  const scale = (value) => {
    if (!(value > 0)) return 0;
    const ratio = Math.log10(1 + value) / Math.log10(1 + maxValue);
    return Math.max(ratio * plotW, 2);
  };

  const svg = svgEl('svg', {
    viewBox: `0 0 ${width} ${height}`,
    role: 'img',
    'aria-label': `Sourced floor-price milestones in ${currency}`,
    preserveAspectRatio: 'xMinYMin meet',
  });

  points.forEach((point, index) => {
    const y = PAD_TOP + index * ROW;
    const barY = y + 7;
    const isLive = Boolean(point.live);

    const label = svgEl('text', {
      x: 0, y: barY + 11, fill: 'var(--muted)', 'font-size': '11.5',
    });
    label.textContent = fmtMonth(point.d);
    svg.append(label);

    const sub = svgEl('text', {
      x: 0, y: barY + 24, fill: 'var(--muted)', 'font-size': '10', opacity: '.8',
    });
    sub.textContent = point.label;
    svg.append(sub);

    svg.append(svgEl('rect', {
      x: LABEL_W, y: barY, width: scale(point.eth), height: 15, rx: 3,
      fill: isLive ? 'var(--seq-11)' : 'var(--seq-07)',
      opacity: isLive ? '1' : '.92',
    }));

    const value = svgEl('text', {
      x: LABEL_W + scale(point.eth) + 8, y: barY + 12,
      fill: 'var(--ink)', 'font-size': '12',
    });
    value.textContent = fmtEth(point.eth, point.eth < 1 ? 3 : 1);
    svg.append(value);
  });

  const axis = svgEl('text', {
    x: LABEL_W, y: height - 8, fill: 'var(--muted)', 'font-size': '10.5',
  });
  axis.textContent = 'Logarithmic scale · sourced points only, no interpolation';
  svg.append(axis);

  const figure = el('figure', { class: 'floor-chart' });
  figure.append(svg);
  figure.append(el('figcaption', {},
    'Mint price, documented peaks and lows, and the live floor. Gaps between marks are deliberate: no value is estimated between sourced observations.'));
  holder.append(figure);
}
