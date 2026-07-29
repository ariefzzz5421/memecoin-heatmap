/* ============================================================
   utils.js — palet tervalidasi, skala warna, dan pemformat
   Palet mengikuti metode data-viz: satu hue untuk magnitude
   (sequential), dua hue + abu netral untuk polaritas (diverging).
   Semua langkah sudah diuji dengan validate_palette.js pada
   permukaan gelap #14161a.
   ============================================================ */

import { WIB_OFFSET } from './config.js';

/* ---------------- Palet ---------------- */

const cssVar = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export const PALETTE = {
  surface: cssVar('--surface'),
  plane: cssVar('--plane'),
  ink: cssVar('--ink'),
  ink2: cssVar('--ink-2'),
  muted: cssVar('--muted'),
  grid: cssVar('--grid'),
  axis: cssVar('--axis'),
  border: cssVar('--border'),
  font: cssVar('--font'),

  /* Sequential — magnitude volume. Satu hue (biru), gelap -> terang.
     Pada permukaan gelap ujung "nyaris nol" menyatu dengan latar. */
  seq: [
    '--seq-01', '--seq-02', '--seq-03', '--seq-04', '--seq-05',
    '--seq-06', '--seq-07', '--seq-08', '--seq-09', '--seq-10',
    '--seq-11', '--seq-12', '--seq-13',
  ].map(cssVar),

  /* Diverging — polaritas perubahan harga.
     Biru = naik, merah = turun, abu netral di tengah.
     Dipilih karena hijau/merah kolaps di buta warna deutan (ΔE 3.3),
     sedangkan pasangan ini terpisah ΔE 15–20. */
  divMid: cssVar('--axis'),
  divUp: ['--div-up-1', '--div-up-2', '--div-up-3', '--div-up-4'].map(cssVar),
  divDown: ['--div-down-1', '--div-down-2', '--div-down-3', '--div-down-4'].map(cssVar),

  status: {
    good: cssVar('--good'),
    warning: cssVar('--warn'),
    serious: cssVar('--serious'),
    critical: cssVar('--crit'),
  },
  map: {
    land: cssVar('--map-land'),
    stroke: cssVar('--map-stroke'),
    grid: cssVar('--map-grid-line'),
    glow: cssVar('--map-glow'),
    glowClear: cssVar('--map-glow-clear'),
    strokeStrong: cssVar('--map-stroke-strong'),
    labelBg: cssVar('--map-label-bg'),
  },
};

export function refreshPalette() {
  PALETTE.surface = cssVar('--surface');
  PALETTE.plane = cssVar('--plane');
  PALETTE.ink = cssVar('--ink');
  PALETTE.ink2 = cssVar('--ink-2');
  PALETTE.muted = cssVar('--muted');
  PALETTE.grid = cssVar('--grid');
  PALETTE.axis = cssVar('--axis');
  PALETTE.border = cssVar('--border');
  PALETTE.font = cssVar('--font');
  PALETTE.seq.splice(0, PALETTE.seq.length, ...[
    '--seq-01', '--seq-02', '--seq-03', '--seq-04', '--seq-05',
    '--seq-06', '--seq-07', '--seq-08', '--seq-09', '--seq-10',
    '--seq-11', '--seq-12', '--seq-13',
  ].map(cssVar));
  PALETTE.divMid = cssVar('--axis');
  PALETTE.divUp.splice(0, PALETTE.divUp.length, ...[
    '--div-up-1', '--div-up-2', '--div-up-3', '--div-up-4',
  ].map(cssVar));
  PALETTE.divDown.splice(0, PALETTE.divDown.length, ...[
    '--div-down-1', '--div-down-2', '--div-down-3', '--div-down-4',
  ].map(cssVar));
  PALETTE.status.good = cssVar('--good');
  PALETTE.status.warning = cssVar('--warn');
  PALETTE.status.serious = cssVar('--serious');
  PALETTE.status.critical = cssVar('--crit');
  PALETTE.map.land = cssVar('--map-land');
  PALETTE.map.stroke = cssVar('--map-stroke');
  PALETTE.map.grid = cssVar('--map-grid-line');
  PALETTE.map.glow = cssVar('--map-glow');
  PALETTE.map.glowClear = cssVar('--map-glow-clear');
  PALETTE.map.strokeStrong = cssVar('--map-stroke-strong');
  PALETTE.map.labelBg = cssVar('--map-label-bg');
  return PALETTE;
}

/* Skala sequential: t di [0,1] -> hex */
export function seqColor(t) {
  if (!Number.isFinite(t)) return PALETTE.seq[0];
  const c = Math.max(0, Math.min(1, t));
  const i = Math.min(PALETTE.seq.length - 1, Math.floor(c * PALETTE.seq.length));
  return PALETTE.seq[i];
}

/* Skala diverging: nilai persen -> hex. `cap` = batas jenuh. */
export function divColor(pct, cap = 20) {
  if (!Number.isFinite(pct)) return PALETTE.divMid;
  const a = Math.min(Math.abs(pct), cap) / cap;
  if (a < 0.04) return PALETTE.divMid;
  const arm = pct >= 0 ? PALETTE.divUp : PALETTE.divDown;
  const i = Math.min(arm.length - 1, Math.floor(a * arm.length));
  return arm[i];
}

/* Warna teks yang kontras di atas isian tertentu (untuk label langsung) */
export function inkOn(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.34 ? PALETTE.plane : PALETTE.ink;
}

/* Skala persepsi untuk peta: akar pangkat agar ekor panjang tetap terbaca */
export function perceptual(v, max, gamma = 0.42) {
  if (!(max > 0) || !(v > 0)) return 0;
  return Math.pow(v / max, gamma);
}

/* ---------------- Pemformat angka ---------------- */

/* Notasi B/M/K dipakai konsisten — standar di layar trading. */
export function fmtUsd(v, digits = 2) {
  if (!Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a >= 1e12) return `$${(v / 1e12).toFixed(digits)}T`;
  if (a >= 1e9) return `$${(v / 1e9).toFixed(digits)}B`;
  if (a >= 1e6) return `$${(v / 1e6).toFixed(digits)}M`;
  if (a >= 1e3) return `$${(v / 1e3).toFixed(digits)}K`;
  return `$${v.toFixed(a < 1 ? 6 : 2)}`;
}

/* Versi ringkas untuk label sumbu yang sempit */
export function fmtUsdShort(v) {
  if (!Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (a >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export function fmtPrice(v) {
  if (!Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a === 0) return '$0';
  if (a >= 1) return `$${v.toLocaleString('en-US', { maximumFractionDigits: 4 })}`;
  if (a >= 0.001) return `$${v.toFixed(6)}`;
  return `$${v.toExponential(3)}`;
}

export function fmtPct(v, digits = 2) {
  if (!Number.isFinite(v)) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(digits)}%`;
}

export function fmtNum(v) {
  if (!Number.isFinite(v)) return '—';
  return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/* ---------------- Waktu: WIB & UTC ---------------- */

export const pad2 = (n) => String(n).padStart(2, '0');

/** Jam UTC -> jam WIB (0-23) */
export const utcToWib = (h) => (((h + WIB_OFFSET) % 24) + 24) % 24;
/** Jam WIB -> jam UTC (0-23) */
export const wibToUtc = (h) => (((h - WIB_OFFSET) % 24) + 24) % 24;

export const hourLabel = (h) => `${pad2(h)}:00`;

/** Rentang jam, mis. 20:00–21:00 */
export const hourRange = (h) => `${pad2(h)}:00–${pad2((h + 1) % 24)}:00`;

/** Komponen tanggal/jam dalam WIB dari timestamp ms */
export function wibParts(ms) {
  const d = new Date(ms + WIB_OFFSET * 3600 * 1000);
  return {
    hour: d.getUTCHours(),
    dow: d.getUTCDay(), // 0 = Minggu
    date: d.getUTCDate(),
    month: d.getUTCMonth(),
    year: d.getUTCFullYear(),
    key: `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`,
  };
}

export const DOW_ID = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Urutan tampilan Senin..Minggu */
export const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** "27 Jul 2026, 18:42 WIB" */
export function fmtClock(ms) {
  const p = wibParts(ms);
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = new Date(ms + WIB_OFFSET * 3600 * 1000);
  return `${p.date} ${mon[p.month]} ${p.year}, ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())} WIB`;
}

export function fmtAgo(ms) {
  if (ms == null) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

/* ---------------- DOM kecil ---------------- */

export function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    n.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return n;
}

/** Siapkan kanvas untuk layar HiDPI. Mengembalikan {ctx, w, h}. */
export function setupCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h, dpr };
}

export function debounce(fn, ms = 150) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

export const sum = (arr, f = (x) => x) => arr.reduce((s, x) => s + (f(x) || 0), 0);
export const mean = (arr, f = (x) => x) => (arr.length ? sum(arr, f) / arr.length : 0);

export function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
