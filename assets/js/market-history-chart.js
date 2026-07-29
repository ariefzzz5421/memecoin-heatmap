import { PALETTE, fmtPrice, fmtUsd, el } from './utils.js';

const NS = 'http://www.w3.org/2000/svg';
const DAY = 86400000;
let chartSequence = 0;

const svgNode = (tag, attrs = {}) => {
  const node = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value != null) node.setAttribute(key, String(value));
  });
  return node;
};

const fmtDate = (timestamp) => new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
}).format(new Date(timestamp));

const inRange = (row, start, end) => row && row.t >= start && row.t <= end;

function rangeBounds(key, launchT, lastT, athT) {
  if (key === 'launch30' && Number.isFinite(launchT)) {
    return [launchT, Math.min(launchT + 30 * DAY, lastT)];
  }
  if (key === 'toAth' && Number.isFinite(launchT) && Number.isFinite(athT)) {
    return [launchT, Math.max(launchT + DAY, athT)];
  }
  if (key === 'year') return [Math.max(lastT - 365 * DAY, launchT || 0), lastT];
  return [Number.isFinite(launchT) ? Math.min(launchT, lastT) : 0, lastT];
}

function markerRows(payload, mode) {
  const milestones = payload.milestones || {};
  const rows = [
    milestones.launch && { ...milestones.launch, label: 'Launch', kind: 'launch' },
    milestones.first && { ...milestones.first, label: 'First tracked', kind: 'first' },
    milestones.day7 && { ...milestones.day7, label: 'Day 7', kind: 'minor' },
    milestones.day30 && { ...milestones.day30, label: 'Day 30', kind: 'minor' },
  ];
  if (mode === 'price' && milestones.ath) {
    rows.push({ ...milestones.ath, label: 'ATH', kind: 'peak' });
  }
  if (mode === 'mcap' && payload.marketCapPeak365d) {
    rows.push({ ...payload.marketCapPeak365d, label: 'Market-cap peak', kind: 'peak' });
  }
  return rows.filter((row) =>
    row && (mode === 'price' || row.kind === 'launch' || Number.isFinite(row.mcap)));
}

function chartPath(rows, x, y, valueKey) {
  let prior = null;
  return rows.map((row) => {
    const command = prior && row.t - prior.t < 45 * DAY ? 'L' : 'M';
    prior = row;
    return `${command}${x(row.t).toFixed(2)},${y(row[valueKey]).toFixed(2)}`;
  }).join(' ');
}

function closestRow(rows, timestamp) {
  return rows.reduce((best, row) =>
    Math.abs(row.t - timestamp) < Math.abs(best.t - timestamp) ? row : best, rows[0]);
}

export function renderMarketHistoryChart(holder, payload, options = {}) {
  const launchT = Date.parse(options.launchAt || payload.launchAt || '');
  const priceRows = (payload.priceHistory || []).filter((row) => row.price > 0);
  const mcapRows = (payload.marketCapHistory365d || []).filter((row) => row.mcap > 0);
  const lastT = Math.max(
    priceRows.at(-1)?.t || 0,
    mcapRows.at(-1)?.t || 0,
    Date.now(),
  );
  const athT = payload.milestones?.ath?.t;
  const state = { mode: 'price', range: 'all', selected: null };
  const uid = `market-chart-${++chartSequence}`;

  const metricControls = el('div', { class: 'chart-toggle-group', role: 'tablist', 'aria-label': 'Chart metric' });
  const rangeControls = el('div', { class: 'chart-toggle-group range-toggle', 'aria-label': 'Chart range' });
  const stage = el('div', { class: 'interactive-chart-stage' });
  const live = el('div', { class: 'chart-selection', 'aria-live': 'polite' });
  const milestoneStrip = el('div', { class: 'chart-milestones', 'aria-label': 'Key historical milestones' });
  const coverage = el('p', { class: 'chart-coverage' });
  const controls = el('div', { class: 'interactive-chart-controls' }, metricControls, rangeControls);
  holder.replaceChildren(controls, stage, live, milestoneStrip, coverage);

  const metricOptions = [
    ['price', 'Price'],
    ['mcap', 'Market cap'],
  ];
  const rangeOptions = [
    ['all', 'All'],
    ['launch30', 'First 30d'],
    ['toAth', 'To ATH'],
    ['year', 'Last 1Y'],
  ];

  function draw() {
    const valueKey = state.mode;
    const rows = state.mode === 'price' ? priceRows : mcapRows;
    const formatter = state.mode === 'price' ? fmtPrice : fmtUsd;
    const [rangeStart, rangeEnd] = rangeBounds(state.range, launchT, lastT, athT);
    const visibleRows = rows.filter((row) => inRange(row, rangeStart, rangeEnd));
    const markers = markerRows(payload, state.mode).filter((marker) =>
      Number.isFinite(marker.t) && inRange(marker, rangeStart, rangeEnd));
    const markerValues = markers.map((marker) => marker[valueKey]).filter((value) => value > 0);
    const values = [...visibleRows.map((row) => row[valueKey]), ...markerValues].filter((value) => value > 0);

    stage.replaceChildren();
    const width = Math.max(stage.clientWidth || 720, 300);
    const height = width < 560 ? 330 : 390;
    const pad = { top: 94, right: 20, bottom: 42, left: width < 560 ? 62 : 82 };
    const plotWidth = width - pad.left - pad.right;
    const plotHeight = height - pad.top - pad.bottom;
    const domainStart = rangeStart;
    const domainEnd = Math.max(rangeEnd, domainStart + DAY);
    const minValue = values.length ? Math.min(...values) : 1;
    const maxValue = values.length ? Math.max(...values) : minValue * 10;
    const minLogRaw = Math.log10(minValue);
    const maxLogRaw = Math.log10(maxValue);
    const valuePad = Math.max((maxLogRaw - minLogRaw) * 0.08, 0.08);
    const minLog = minLogRaw - valuePad;
    const maxLog = maxLogRaw + valuePad;
    const x = (timestamp) => pad.left + ((timestamp - domainStart) / (domainEnd - domainStart)) * plotWidth;
    const y = (value) => pad.top + (1 - (Math.log10(Math.max(value, minValue)) - minLog) / (maxLog - minLog)) * plotHeight;

    const root = svgNode('svg', {
      viewBox: `0 0 ${width} ${height}`,
      role: 'img',
      tabindex: '0',
      'aria-label': `${options.symbol || payload.symbol || ''} interactive ${state.mode === 'price' ? 'price' : 'market-cap'} chart from ${fmtDate(domainStart)} to ${fmtDate(domainEnd)}. Use left and right arrow keys to inspect data.`,
    });
    const defs = svgNode('defs');
    const arrow = svgNode('marker', {
      id: `${uid}-arrow`,
      viewBox: '0 0 8 8',
      refX: '7',
      refY: '4',
      markerWidth: '7',
      markerHeight: '7',
      orient: 'auto-start-reverse',
    });
    arrow.append(svgNode('path', { d: 'M0 0 L8 4 L0 8 Z', fill: PALETTE.seq[10] }));
    defs.append(arrow);
    root.append(defs);

    if (values.length) {
      for (let index = 0; index <= 4; index++) {
        const ratio = index / 4;
        const gy = pad.top + ratio * plotHeight;
        const value = 10 ** (maxLog - ratio * (maxLog - minLog));
        root.append(svgNode('line', {
          x1: pad.left, y1: gy, x2: width - pad.right, y2: gy, class: 'chart-grid-line',
        }));
        const label = svgNode('text', {
          x: pad.left - 10, y: gy + 4, 'text-anchor': 'end', class: 'chart-axis-label',
        });
        label.textContent = formatter(value);
        root.append(label);
      }
    }
    [0, 0.5, 1].forEach((ratio) => {
      const timestamp = domainStart + ratio * (domainEnd - domainStart);
      const label = svgNode('text', {
        x: x(timestamp),
        y: height - 13,
        'text-anchor': ratio === 0 ? 'start' : ratio === 1 ? 'end' : 'middle',
        class: 'chart-axis-label',
      });
      label.textContent = fmtDate(timestamp);
      root.append(label);
    });

    if (visibleRows.length) {
      root.append(svgNode('path', {
        d: chartPath(visibleRows, x, y, valueKey),
        class: 'history-line',
      }));
    }

    const labelled = markers.filter((marker) => ['launch', 'first', 'peak'].includes(marker.kind));
    markers.forEach((marker) => {
      const value = marker[valueKey];
      const cx = Math.min(Math.max(x(marker.t), pad.left), width - pad.right);
      const hasValue = Number.isFinite(value) && value > 0;
      const cy = hasValue ? y(value) : pad.top + plotHeight;
      const point = svgNode(marker.kind === 'peak' ? 'rect' : 'circle', marker.kind === 'peak'
        ? { x: cx - 4, y: cy - 4, width: 8, height: 8, rx: 1, class: 'history-marker is-peak' }
        : { cx, cy, r: marker.kind === 'minor' ? 3 : 5, class: `history-marker is-${marker.kind}` });
      root.append(point);

      if (!labelled.includes(marker)) return;
      const index = labelled.indexOf(marker);
      const labelY = 18 + index * 24;
      const labelX = Math.min(Math.max(cx, pad.left + 42), width - pad.right - 74);
      root.append(svgNode('line', {
        x1: labelX,
        y1: labelY + 5,
        x2: cx,
        y2: Math.max(cy - 8, pad.top + 8),
        class: 'history-arrow',
        'marker-end': `url(#${uid}-arrow)`,
      }));
      const text = svgNode('text', {
        x: labelX,
        y: labelY,
        'text-anchor': 'middle',
        class: 'history-marker-label',
      });
      text.textContent = `${marker.label} · ${hasValue ? formatter(value) : 'unavailable'}`;
      root.append(text);
    });

    const crosshair = svgNode('line', {
      y1: pad.top,
      y2: pad.top + plotHeight,
      class: 'history-crosshair',
      visibility: 'hidden',
    });
    const hoverDot = svgNode('circle', {
      r: 5,
      class: 'history-hover-dot',
      visibility: 'hidden',
    });
    root.append(crosshair, hoverDot);

    const tip = el('div', { class: 'chart-hover-card', hidden: true });
    const showRow = (row, clientX = null, clientY = null) => {
      if (!row) return;
      state.selected = row;
      const cx = x(row.t);
      const cy = y(row[valueKey]);
      crosshair.setAttribute('x1', cx);
      crosshair.setAttribute('x2', cx);
      crosshair.setAttribute('visibility', 'visible');
      hoverDot.setAttribute('cx', cx);
      hoverDot.setAttribute('cy', cy);
      hoverDot.setAttribute('visibility', 'visible');
      const valueText = formatter(row[valueKey]);
      live.replaceChildren(
        el('strong', {}, fmtDate(row.t)),
        el('span', {}, `${state.mode === 'price' ? 'Price' : 'Market cap'} ${valueText}`),
      );
      tip.replaceChildren(
        el('strong', {}, fmtDate(row.t)),
        el('span', { class: 'num' }, valueText),
      );
      tip.hidden = clientX == null;
      if (clientX != null) {
        const box = stage.getBoundingClientRect();
        let left = clientX - box.left + 14;
        let top = clientY - box.top + 14;
        if (left + 170 > box.width) left = clientX - box.left - 174;
        if (top + 70 > box.height) top = clientY - box.top - 74;
        tip.style.left = `${Math.max(6, left)}px`;
        tip.style.top = `${Math.max(6, top)}px`;
      }
    };

    const overlay = svgNode('rect', {
      x: pad.left,
      y: pad.top,
      width: plotWidth,
      height: plotHeight,
      fill: 'transparent',
      class: 'history-overlay',
    });
    overlay.addEventListener('pointermove', (event) => {
      if (!visibleRows.length) return;
      const box = root.getBoundingClientRect();
      const pointerX = ((event.clientX - box.left) / box.width) * width;
      const timestamp = domainStart + ((pointerX - pad.left) / plotWidth) * (domainEnd - domainStart);
      showRow(closestRow(visibleRows, timestamp), event.clientX, event.clientY);
    });
    overlay.addEventListener('pointerleave', () => {
      tip.hidden = true;
      crosshair.setAttribute('visibility', 'hidden');
      hoverDot.setAttribute('visibility', 'hidden');
    });
    root.addEventListener('keydown', (event) => {
      if (!visibleRows.length || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let index = state.selected ? visibleRows.indexOf(state.selected) : visibleRows.length - 1;
      if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = visibleRows.length - 1;
      else index += event.key === 'ArrowLeft' ? -1 : 1;
      showRow(visibleRows[Math.min(Math.max(index, 0), visibleRows.length - 1)]);
    });
    root.append(overlay);
    stage.append(root, tip);

    if (!visibleRows.length) {
      stage.append(el('p', { class: 'chart-empty-window' },
        `No ${state.mode === 'price' ? 'price' : 'market-cap'} time-series points are available in this window. Launch is still marked without estimation.`));
      live.replaceChildren(el('span', {}, 'Choose another range or metric.'));
    } else {
      showRow(visibleRows.at(-1));
    }

    const milestoneDefinitions = [
      ['Launch', payload.milestones?.launch],
      ['Day 7', payload.milestones?.day7],
      ['Day 30', payload.milestones?.day30],
      [
        state.mode === 'price' ? 'ATH' : 'Market-cap peak',
        state.mode === 'price' ? payload.milestones?.ath : payload.marketCapPeak365d,
      ],
    ];
    milestoneStrip.replaceChildren(...milestoneDefinitions.map(([label, milestone]) => {
      const value = milestone?.[valueKey];
      return el('div', { class: 'chart-milestone' },
        el('span', {}, label),
        el('strong', { class: 'num' }, Number.isFinite(value) && value > 0 ? formatter(value) : 'Unavailable'),
        Number.isFinite(milestone?.t) ? el('small', {}, fmtDate(milestone.t)) : null,
      );
    }));

    coverage.textContent = [
      `Price: ${payload.source?.priceHistory || 'unavailable'}`,
      `Market cap: ${payload.source?.marketCapHistory || 'unavailable'}`,
      `Launch snapshots: ${payload.source?.launchMilestones || 'unavailable'}`,
      'No values are interpolated.',
    ].join(' · ');

    metricControls.querySelectorAll('button').forEach((button) => {
      const active = button.dataset.metric === state.mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    rangeControls.querySelectorAll('button').forEach((button) => {
      const active = button.dataset.range === state.range;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  metricOptions.forEach(([key, label]) => {
    metricControls.append(el('button', {
      type: 'button',
      class: 'chart-toggle',
      role: 'tab',
      'data-metric': key,
      onclick: () => {
        state.mode = key;
        state.selected = null;
        draw();
      },
    }, label));
  });
  rangeOptions.forEach(([key, label]) => {
    rangeControls.append(el('button', {
      type: 'button',
      class: 'chart-toggle',
      'data-range': key,
      onclick: () => {
        state.range = key;
        state.selected = null;
        draw();
      },
    }, label));
  });
  draw();
}
