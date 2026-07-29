/* ============================================================
   worldmap.js — peta dunia interaktif (canvas)
   Area negara diwarnai sequential (magnitude volume); bubble
   menandai tiap yurisdiksi, termasuk yang terlalu kecil untuk
   terlihat sebagai poligon (Seychelles, Cayman, Singapura, dst).
   ============================================================ */

import {
  decodeTopology, buildPaths, ViewTransform,
  project, WORLD_W, VIEW_TOP, VIEW_H,
} from './geo.js';
import {
  PALETTE, seqColor, perceptual, fmtUsd, fmtNum, setupCanvas, debounce, pad2,
} from './utils.js';

const BUBBLE_MIN = 4;
const BUBBLE_MAX = 34;

export class WorldMap {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} opts { tooltip, onSelect }
   */
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.tooltip = opts.tooltip;
    this.onSelect = opts.onSelect || (() => {});
    this.view = new ViewTransform();
    this.countries = [];
    this.data = null;
    this.bubbles = [];
    this.hover = null;
    this.selected = null;
    this.showLabels = true;
    this.ready = false;

    this._bind();
  }

  /* ---------------- setup ---------------- */

  setTopology(topo) {
    const features = decodeTopology(topo, 'countries');
    this.countries = buildPaths(features);
    this.byName = new Map(this.countries.map((c) => [c.name, c]));
    this.ready = true;
  }

  setData(agg) {
    this.data = agg;
    const max = agg.rows.length ? agg.rows[0].volUsd : 0;
    this.maxVol = max;
    const topMapped = agg.rows.find((r) => r.lat != null && r.lon != null);

    this.bubbles = agg.rows
      .filter((r) => r.lat != null && r.lon != null)
      .map((r) => {
        const [wx, wy] = project(r.lon, r.lat);
        const t = perceptual(r.volUsd, max);
        return {
          row: r,
          wx, wy,
          t,
          r: BUBBLE_MIN + (BUBBLE_MAX - BUBBLE_MIN) * Math.sqrt(r.volUsd / (max || 1)),
          color: seqColor(0.25 + 0.75 * t),
          isTop: r === topMapped,
        };
      })
      // gambar besar dulu, kecil di atas -> yang kecil tetap bisa diklik
      .sort((a, b) => b.r - a.r);

    this.fillByGeo = new Map();
    for (const r of agg.rows) {
      if (this.byName?.has(r.geoName)) this.fillByGeo.set(r.geoName, r);
    }
    this.resize();
    /* devicePixelRatio kadang baru final beberapa ratus milidetik setelah muat
       (tab latar, panel yang baru ditampilkan). render() memeriksa DPR dan
       menyesuaikan sendiri, jadi cukup dipanggil beberapa kali di awal —
       berbatas waktu, bukan polling. */
    for (const ms of [0, 250, 750, 1500]) setTimeout(() => this.render(), ms);
  }

  /* ---------------- interaksi ---------------- */

  _bind() {
    const c = this.canvas;

    c.addEventListener('mousemove', (e) => {
      const p = this._pos(e);
      if (this.drag) {
        this.view.panBy(p.x - this.drag.x, p.y - this.drag.y);
        this.view.clamp(this.w, this.h);
        this.drag = p;
        this.moved = true;
        this.render();
        return;
      }
      const hit = this._hitTest(p.x, p.y);
      if (hit !== this.hover) {
        this.hover = hit;
        this.render();
      }
      this._tooltip(hit, e);
      c.style.cursor = hit ? 'pointer' : this.view.k > this.view.minK ? 'grab' : 'default';
    });

    c.addEventListener('mouseleave', () => {
      this.hover = null;
      this.drag = null;
      this._tooltip(null);
      this.render();
    });

    c.addEventListener('mousedown', (e) => {
      this.drag = this._pos(e);
      this.moved = false;
      c.style.cursor = 'grabbing';
    });

    window.addEventListener('mouseup', () => {
      this.drag = null;
      if (this.canvas.style.cursor === 'grabbing') this.canvas.style.cursor = 'default';
    });

    c.addEventListener('click', (e) => {
      if (this.moved) return;
      const p = this._pos(e);
      const hit = this._hitTest(p.x, p.y);
      this.selected = hit && hit === this.selected ? null : hit;
      this.render();
      this.onSelect(this.selected?.row || null);
    });

    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const p = this._pos(e);
      this.view.zoomAt(p.x, p.y, e.deltaY < 0 ? 1.18 : 1 / 1.18);
      this.view.clamp(this.w, this.h);
      this.render();
    }, { passive: false });

    /* Sentuh: pan + pinch */
    let pinch = null;
    c.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) this.drag = this._pos(e.touches[0]);
      else if (e.touches.length === 2) pinch = this._pinchDist(e);
    }, { passive: true });

    c.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this.drag) {
        const p = this._pos(e.touches[0]);
        this.view.panBy(p.x - this.drag.x, p.y - this.drag.y);
        this.view.clamp(this.w, this.h);
        this.drag = p;
        this.render();
        e.preventDefault();
      } else if (e.touches.length === 2 && pinch) {
        const d = this._pinchDist(e);
        const mid = this._pinchMid(e);
        this.view.zoomAt(mid.x, mid.y, d / pinch);
        this.view.clamp(this.w, this.h);
        pinch = d;
        this.render();
        e.preventDefault();
      }
    }, { passive: false });

    c.addEventListener('touchend', () => { this.drag = null; pinch = null; });

    /* Dua pemicu, sengaja tumpang tindih:
       - ResizeObserver menangkap perubahan yang tak mengubah viewport (panel
         melipat, media query, layout yang baru selesai);
       - window.resize menangkap perubahan viewport, dan tetap jalan di
         lingkungan yang tidak mengirim callback ResizeObserver.
       render() sendiri memeriksa ulang ukuran & DPR, jadi pemicu ganda ini
       aman: yang kedua tidak menggambar apa pun bila tak ada yang berubah. */
    this._sync = debounce(() => this.resize(), 100);

    let lastW = 0;
    let lastH = 0;
    this._ro = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box || box.width < 2 || box.height < 2) return;
      const w = Math.round(box.width);
      const h = Math.round(box.height);
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
      this.resize();
    });
    this._ro.observe(c);

    window.addEventListener('resize', this._sync);
    document.addEventListener('visibilitychange', this._sync);
    this._watchDpr();
  }

  /** matchMedia pada dppx saat ini: berubah nilai begitu DPR bergeser. */
  _watchDpr() {
    this._dprMq?.removeEventListener('change', this._onDpr);
    this._dprMq = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    this._onDpr = () => {
      this.render();
      this._watchDpr();
    };
    this._dprMq.addEventListener('change', this._onDpr);
  }

  _pos(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  _pinchDist(e) {
    const [a, b] = [e.touches[0], e.touches[1]];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  _pinchMid(e) {
    const r = this.canvas.getBoundingClientRect();
    const [a, b] = [e.touches[0], e.touches[1]];
    return { x: (a.clientX + b.clientX) / 2 - r.left, y: (a.clientY + b.clientY) / 2 - r.top };
  }

  _hitTest(x, y) {
    // urutan terbalik: bubble kecil digambar terakhir, jadi diuji lebih dulu
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      const [sx, sy] = this.view.toScreen(b.wx, b.wy);
      const rr = Math.max(b.r, 9); // target sentuh lebih besar dari mark
      if ((x - sx) ** 2 + (y - sy) ** 2 <= rr * rr) return b;
    }
    return null;
  }

  zoom(factor) {
    this.view.zoomAt(this.w / 2, this.h / 2, factor);
    this.view.clamp(this.w, this.h);
    this.render();
  }

  reset() {
    this.view.reset();
    this.selected = null;
    this.render();
    this.onSelect(null);
  }

  /** Perbesar ke satu yurisdiksi berdasarkan nama. */
  focus(name) {
    const b = this.bubbles.find((x) => x.row.name === name);
    if (!b) return;
    this.selected = b;
    this.view.reset();
    this.view.zoomAt(this.w / 2, this.h / 2, 3.2);
    const [sx, sy] = this.view.toScreen(b.wx, b.wy);
    this.view.panBy(this.w / 2 - sx, this.h / 2 - sy);
    this.view.clamp(this.w, this.h);
    this.render();
    this.onSelect(b.row);
  }

  resize() {
    const { ctx, w, h, dpr } = setupCanvas(this.canvas);
    this.ctx = ctx;
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    const prev = this.view.base ? { k: this.view.k / this.view.minK, x: this.view.x, y: this.view.y } : null;
    this.view.fit(w, h);
    if (prev && prev.k > 1.001) this.view.zoomAt(w / 2, h / 2, prev.k);
    this.render();
  }

  /* ---------------- render ---------------- */

  render() {
    if (!this.ctx || !this.ready) return;

    /* Satu-satunya penjaga yang benar-benar bisa diandalkan: sebelum menggambar,
       pastikan buffer kanvas masih cocok dengan ukuran CSS dan devicePixelRatio
       saat ini. DPR bisa berubah (pindah monitor, penskalaan Windows, zoom
       browser) tanpa mengubah ukuran CSS, dan sebaliknya. */
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const stale = dpr !== this.dpr
      || Math.abs(this.canvas.clientWidth - this.w) > 1
      || Math.abs(this.canvas.clientHeight - this.h) > 1;
    if (!this._resizing && stale) {
      this._resizing = true;
      this.resize(); // resize() menggambar ulang di akhir
      this._resizing = false;
      return;
    }

    const { ctx, w, h } = this;
    const v = this.view;

    ctx.clearRect(0, 0, w, h);

    // latar laut
    ctx.fillStyle = PALETTE.plane;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.scale(v.k, v.k);

    this._drawGraticule(ctx, v);

    // negara
    const lw = 0.7 / v.k;
    for (const c of this.countries) {
      const row = this.fillByGeo?.get(c.name);
      if (row) {
        const t = perceptual(row.volUsd, this.maxVol);
        ctx.fillStyle = seqColor(0.12 + 0.6 * t);
      } else {
        ctx.fillStyle = PALETTE.map.land; // daratan tanpa data
      }
      ctx.fill(c.path);
      ctx.lineWidth = lw;
      ctx.strokeStyle = PALETTE.map.stroke;
      ctx.stroke(c.path);
    }

    ctx.restore();

    // bubble digambar di ruang layar agar ukurannya tetap saat zoom
    this._drawBubbles(ctx, v);
    if (this.showLabels) this._drawLabels(ctx, v);
  }

  _drawGraticule(ctx, v) {
    ctx.save();
    ctx.strokeStyle = PALETTE.map.grid;
    ctx.lineWidth = 0.6 / v.k;
    ctx.beginPath();
    for (let lon = -180; lon <= 180; lon += 30) {
      const [x] = project(lon, 0);
      ctx.moveTo(x, VIEW_TOP);
      ctx.lineTo(x, VIEW_TOP + VIEW_H);
    }
    for (let lat = -60; lat <= 80; lat += 30) {
      const [, y] = project(0, lat);
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD_W, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  _drawBubbles(ctx, v) {
    // urutan besar -> kecil supaya yang kecil tetap terlihat di atas
    for (const b of this.bubbles) {
      const [sx, sy] = this.view.toScreen(b.wx, b.wy);
      if (sx < -60 || sx > this.w + 60 || sy < -60 || sy > this.h + 60) continue;

      const active = b === this.hover || b === this.selected;
      const r = b.r * (active ? 1.12 : 1);

      // halo lembut untuk pusat volume besar
      if (b.t > 0.55) {
        const g = ctx.createRadialGradient(sx, sy, r * 0.4, sx, sy, r * 2.1);
        g.addColorStop(0, PALETTE.map.glow);
        g.addColorStop(1, PALETTE.map.glowClear);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(sx, sy, r * 2.1, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.globalAlpha = active ? 0.98 : 0.86;
      ctx.fill();
      ctx.globalAlpha = 1;

      // cincin 2px berwarna permukaan: memisahkan mark yang bertumpuk
      ctx.lineWidth = 2;
      ctx.strokeStyle = active ? PALETTE.ink : PALETTE.plane;
      ctx.stroke();

      // Penanda permanen untuk lokasi dengan volume terpetakan terbesar.
      if (b.isTop) {
        ctx.beginPath();
        ctx.arc(sx, sy, r + 6, 0, Math.PI * 2);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = PALETTE.status.warning;
        ctx.stroke();

        ctx.fillStyle = PALETTE.status.warning;
        ctx.font = `700 10px ${PALETTE.font}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('#1', sx, sy);
      }

      if (b === this.selected) {
        ctx.beginPath();
        ctx.arc(sx, sy, r + 5, 0, Math.PI * 2);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = PALETTE.map.strokeStrong;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  _drawLabels(ctx, v) {
    const zoomed = v.k / v.minK;
    const n = zoomed > 2.4 ? 18 : zoomed > 1.5 ? 10 : 6;
    const top = this.data?.rows.slice(0, n) || [];
    const placed = [];

    ctx.font = `600 11px ${PALETTE.font}`;
    ctx.textBaseline = 'middle';

    for (const row of top) {
      const b = this.bubbles.find((x) => x.row === row);
      if (!b) continue;
      const [sx, sy] = this.view.toScreen(b.wx, b.wy);
      if (sx < 0 || sx > this.w || sy < 0 || sy > this.h) continue;

      const text = `${row.name} · ${fmtUsd(row.volUsd, 1)}`;
      const tw = ctx.measureText(text).width;
      const lx = sx + b.r + 7;
      const ly = sy;

      // hindari label bertabrakan
      const box = [lx, ly - 8, lx + tw + 8, ly + 8];
      if (placed.some((p) => !(box[2] < p[0] || box[0] > p[2] || box[3] < p[1] || box[1] > p[3]))) continue;
      if (lx + tw + 10 > this.w) continue;
      placed.push(box);

      ctx.fillStyle = PALETTE.map.labelBg;
      ctx.fillRect(lx - 4, ly - 9, tw + 8, 18);
      ctx.fillStyle = PALETTE.ink;
      ctx.fillText(text, lx, ly + 0.5);
    }
  }

  /* ---------------- tooltip ---------------- */

  _tooltip(hit, e) {
    const tip = this.tooltip;
    if (!tip) return;
    if (!hit) {
      tip.hidden = true;
      return;
    }
    const r = hit.row;
    const localTime = r.tz != null ? this._localTime(r.tz) : null;

    tip.innerHTML = `
      <div class="tip-head">
        <span class="tip-dot" style="background:${hit.color}"></span>
        <strong>${escapeHtml(r.name)}</strong>
        <span class="tip-rank">#${this.data.rows.indexOf(r) + 1}</span>
      </div>
      <dl class="tip-grid">
        <dt>24h volume</dt><dd class="num">${fmtUsd(r.volUsd)}</dd>
        <dt>Mapped share</dt><dd class="num">${(r.share * 100).toFixed(2)}%</dd>
        <dt>Exchanges</dt><dd class="num">${fmtNum(r.count)}</dd>
        <dt>Average / exchange</dt><dd class="num">${fmtUsd(r.avgUsd)}</dd>
        <dt>Median / exchange</dt><dd class="num">${fmtUsd(r.medianUsd)}</dd>
        <dt>Largest exchange</dt><dd>${escapeHtml(r.top?.name || '—')}</dd>
        ${localTime ? `<dt>Local time</dt><dd class="num">${localTime}</dd>` : ''}
      </dl>
      <div class="tip-foot">Click to lock details</div>`;

    tip.hidden = false;
    const box = this.canvas.getBoundingClientRect();
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    let x = (e?.clientX ?? 0) - box.left + 16;
    let y = (e?.clientY ?? 0) - box.top + 16;
    if (x + tw > box.width - 8) x = (e.clientX - box.left) - tw - 16;
    if (y + th > box.height - 8) y = Math.max(8, (e.clientY - box.top) - th - 16);
    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
  }

  _localTime(tzOffset) {
    const now = new Date();
    const ms = now.getTime() + tzOffset * 3600 * 1000;
    const d = new Date(ms);
    const sign = tzOffset >= 0 ? '+' : '−';
    const abs = Math.abs(tzOffset);
    const oh = Math.floor(abs);
    const om = Math.round((abs - oh) * 60);
    return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())} (UTC${sign}${oh}${om ? ':' + pad2(om) : ''})`;
  }

  destroy() {
    this._ro?.disconnect();
    this._dprMq?.removeEventListener('change', this._onDpr);
    window.removeEventListener('resize', this._sync);
    document.removeEventListener('visibilitychange', this._sync);
  }
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
