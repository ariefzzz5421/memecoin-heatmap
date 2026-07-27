/* ============================================================
   geo.js — dekoder TopoJSON minimal + proyeksi equirectangular
   Tanpa dependensi eksternal.
   ============================================================ */

/* Ruang "dunia": 1000 x 500 px untuk 360deg x 180deg */
export const WORLD_W = 1000;
export const WORLD_H = 500;

/* Batas lintang yang ditampilkan (buang Antartika & kutub kosong) */
export const LAT_TOP = 84;
export const LAT_BOTTOM = -58;

export function project(lon, lat) {
  return [
    ((lon + 180) / 360) * WORLD_W,
    ((90 - lat) / 180) * WORLD_H,
  ];
}

export function unproject(x, y) {
  return [
    (x / WORLD_W) * 360 - 180,
    90 - (y / WORLD_H) * 180,
  ];
}

export const VIEW_TOP = project(0, LAT_TOP)[1];
export const VIEW_BOTTOM = project(0, LAT_BOTTOM)[1];
export const VIEW_H = VIEW_BOTTOM - VIEW_TOP;

/* ------------------------------------------------------------
   Dekode TopoJSON: delta-decode arcs, susun ring poligon.
   ------------------------------------------------------------ */
export function decodeTopology(topo, objectName = 'countries') {
  const obj = topo.objects?.[objectName];
  if (!obj) throw new Error(`objek TopoJSON "${objectName}" tidak ditemukan`);

  const tf = topo.transform;
  const [sx, sy] = tf ? tf.scale : [1, 1];
  const [tx, ty] = tf ? tf.translate : [0, 0];

  // delta decode setiap arc -> daftar [lon, lat]
  const arcs = topo.arcs.map((arc) => {
    let x = 0;
    let y = 0;
    return arc.map((p) => {
      if (tf) {
        x += p[0];
        y += p[1];
        return [x * sx + tx, y * sy + ty];
      }
      return [p[0], p[1]];
    });
  });

  const arcPoints = (i) => (i < 0 ? arcs[~i].slice().reverse() : arcs[i]);

  const buildRing = (ringArcs) => {
    const pts = [];
    ringArcs.forEach((ai, k) => {
      const a = arcPoints(ai);
      for (let j = k === 0 ? 0 : 1; j < a.length; j++) pts.push(a[j]);
    });
    return pts;
  };

  const geometries = obj.type === 'GeometryCollection' ? obj.geometries : [obj];
  const features = [];

  for (const g of geometries) {
    const name = g.properties?.name || g.id || 'Unknown';
    let polygons = [];
    if (g.type === 'Polygon') polygons = [g.arcs];
    else if (g.type === 'MultiPolygon') polygons = g.arcs;
    else continue;

    const rings = [];
    for (const poly of polygons) {
      for (const ringArcs of poly) {
        const r = buildRing(ringArcs);
        if (r.length > 2) rings.push(r);
      }
    }
    if (rings.length) features.push({ name, id: g.id, rings });
  }

  return features;
}

/* ------------------------------------------------------------
   Bangun Path2D di ruang dunia + bounding box (untuk zoom-to)
   ------------------------------------------------------------ */
export function buildPaths(features, { skip = new Set(['Antarctica']) } = {}) {
  const out = [];
  for (const f of features) {
    if (skip.has(f.name)) continue;
    const path = new Path2D();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let areaProxy = 0;

    for (const ring of f.rings) {
      let started = false;
      let prevX = 0;
      for (let i = 0; i < ring.length; i++) {
        const [lon, lat] = ring[i];
        const [x, y] = project(lon, lat);
        // hindari garis melintasi peta pada anti-meridian
        if (started && Math.abs(x - prevX) > WORLD_W * 0.6) {
          started = false;
        }
        if (!started) {
          path.moveTo(x, y);
          started = true;
        } else {
          path.lineTo(x, y);
        }
        prevX = x;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      path.closePath();
      areaProxy += ring.length;
    }

    out.push({
      name: f.name,
      path,
      bbox: [minX, minY, maxX, maxY],
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      size: areaProxy,
    });
  }
  return out;
}

/* ------------------------------------------------------------
   Transform layar <-> dunia (zoom & pan)
   ------------------------------------------------------------ */
export class ViewTransform {
  constructor() {
    this.k = 1;
    this.x = 0;
    this.y = 0;
    this.minK = 1;
    this.maxK = 14;
  }

  /** Setel skala dasar agar seluruh peta pas di kanvas. */
  fit(cw, ch, pad = 8) {
    const k = Math.min((cw - pad * 2) / WORLD_W, (ch - pad * 2) / VIEW_H);
    this.minK = k;
    this.k = k;
    this.x = (cw - WORLD_W * k) / 2;
    this.y = (ch - VIEW_H * k) / 2 - VIEW_TOP * k;
    this.base = { k, x: this.x, y: this.y };
    return this;
  }

  reset() {
    if (this.base) Object.assign(this, { k: this.base.k, x: this.base.x, y: this.base.y });
  }

  toScreen(wx, wy) {
    return [wx * this.k + this.x, wy * this.k + this.y];
  }

  toWorld(sx, sy) {
    return [(sx - this.x) / this.k, (sy - this.y) / this.k];
  }

  /** Zoom di sekitar titik layar tertentu. */
  zoomAt(sx, sy, factor) {
    const nk = Math.max(this.minK, Math.min(this.maxK * this.minK, this.k * factor));
    const f = nk / this.k;
    this.x = sx - (sx - this.x) * f;
    this.y = sy - (sy - this.y) * f;
    this.k = nk;
  }

  panBy(dx, dy) {
    this.x += dx;
    this.y += dy;
  }

  /** Jaga peta tetap dalam pandangan. */
  clamp(cw, ch) {
    const w = WORLD_W * this.k;
    const h = VIEW_H * this.k;
    const top = VIEW_TOP * this.k;
    if (w <= cw) this.x = (cw - w) / 2;
    else this.x = Math.min(0, Math.max(cw - w, this.x));
    if (h <= ch) this.y = (ch - h) / 2 - top;
    else this.y = Math.min(-top, Math.max(ch - h - top, this.y));
  }
}
