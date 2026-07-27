/* ============================================================
   analytics.js — semua perhitungan turunan dari data mentah
   ============================================================ */

import { JURISDICTIONS, GEO_NAME_ALIAS, UNKNOWN_LABELS, REGIONS, SESSIONS } from './config.js';
import { utcToWib, wibParts, sum, mean, median, DOW_ORDER } from './utils.js';

/* ============================================================
   A. Volume bursa per yurisdiksi
   ============================================================ */

export function aggregateJurisdictions(exchanges, btcPrice) {
  const byCountry = new Map();
  let unknownVolBtc = 0;
  let unknownCount = 0;

  for (const ex of exchanges) {
    const raw = ex.country;
    const name = UNKNOWN_LABELS.has(raw) ? null : raw;
    if (!name) {
      unknownVolBtc += ex.volBtc;
      unknownCount++;
      continue;
    }
    if (!byCountry.has(name)) byCountry.set(name, { name, volBtc: 0, exchanges: [] });
    const rec = byCountry.get(name);
    rec.volBtc += ex.volBtc;
    rec.exchanges.push(ex);
  }

  const rows = [];
  for (const rec of byCountry.values()) {
    const meta = JURISDICTIONS[rec.name];
    rec.exchanges.sort((a, b) => b.volBtc - a.volBtc);
    rows.push({
      name: rec.name,
      geoName: GEO_NAME_ALIAS[rec.name] || rec.name,
      volBtc: rec.volBtc,
      volUsd: rec.volBtc * btcPrice,
      count: rec.exchanges.length,
      avgUsd: (rec.volBtc * btcPrice) / rec.exchanges.length,
      medianUsd: median(rec.exchanges.map((e) => e.volBtc * btcPrice)),
      exchanges: rec.exchanges,
      top: rec.exchanges[0],
      region: meta?.region || 'Lainnya',
      lat: meta?.lat ?? null,
      lon: meta?.lon ?? null,
      tz: meta?.tz ?? null,
      iso: meta?.iso ?? null,
      mapped: !!meta,
    });
  }

  rows.sort((a, b) => b.volUsd - a.volUsd);

  const knownTotal = sum(rows, (r) => r.volUsd);
  const unknownUsd = unknownVolBtc * btcPrice;
  const grandTotal = knownTotal + unknownUsd;

  for (const r of rows) {
    r.share = knownTotal > 0 ? r.volUsd / knownTotal : 0;
    r.shareAll = grandTotal > 0 ? r.volUsd / grandTotal : 0;
  }

  // Ringkasan per region
  const regionMap = new Map();
  for (const r of rows) {
    if (!regionMap.has(r.region)) regionMap.set(r.region, { region: r.region, volUsd: 0, count: 0, places: 0 });
    const g = regionMap.get(r.region);
    g.volUsd += r.volUsd;
    g.count += r.count;
    g.places++;
  }
  const regions = [...regionMap.values()].sort((a, b) => b.volUsd - a.volUsd);
  for (const g of regions) g.share = knownTotal > 0 ? g.volUsd / knownTotal : 0;

  // Konsentrasi: berapa yurisdiksi untuk menutup 80% volume
  let acc = 0;
  let hhi = 0;
  let top80 = 0;
  for (const r of rows) {
    hhi += r.share * r.share;
    if (acc < 0.8) {
      acc += r.share;
      top80++;
    }
  }

  const unmapped = rows.filter((r) => !r.mapped).map((r) => r.name);

  return {
    rows,
    regions,
    knownTotal,
    unknownUsd,
    unknownCount,
    grandTotal,
    exchangeCount: exchanges.length,
    avgPerJurisdiction: rows.length ? knownTotal / rows.length : 0,
    avgPerExchange: exchanges.length ? grandTotal / exchanges.length : 0,
    medianJurisdiction: median(rows.map((r) => r.volUsd)),
    top80,
    hhi,
    unmapped,
    REGIONS,
  };
}

/* ============================================================
   B. Deret volume per jam (gabungan lintas koin)
   ============================================================ */

/** Gabungkan Map<coinKey, rows[]> menjadi deret per jam: [{t, q, byCoin}] */
export function mergeHourly(series) {
  const acc = new Map();
  for (const [key, rows] of series) {
    for (const r of rows) {
      const t = Math.floor(r.t / 3600000) * 3600000;
      if (!acc.has(t)) acc.set(t, { t, q: 0, byCoin: {} });
      const rec = acc.get(t);
      rec.q += r.q;
      rec.byCoin[key] = (rec.byCoin[key] || 0) + r.q;
    }
  }
  return [...acc.values()].sort((a, b) => a.t - b.t);
}

/**
 * Analisa jam aktif.
 * @param {Array} hourly deret gabungan dari mergeHourly
 * @param {number} windowHours panjang jendela waktu
 */
export function analyzeHours(hourly, windowHours) {
  const rows = hourly.slice(-windowHours);
  if (!rows.length) return null;

  const from = rows[0].t;
  const to = rows[rows.length - 1].t + 3600000;
  const totalVol = sum(rows, (r) => r.q);
  const avgPerHour = totalVol / rows.length;

  /* --- Profil per jam UTC --- */
  const buckets = Array.from({ length: 24 }, () => []);
  for (const r of rows) {
    const utcH = new Date(r.t).getUTCHours();
    buckets[utcH].push(r.q);
  }

  const profile = buckets.map((vals, utc) => {
    const avg = vals.length ? mean(vals) : 0;
    return {
      utc,
      wib: utcToWib(utc),
      avg,
      total: sum(vals),
      n: vals.length,
      med: median(vals),
      max: vals.length ? Math.max(...vals) : 0,
      min: vals.length ? Math.min(...vals) : 0,
    };
  });

  const profileTotal = sum(profile, (p) => p.avg);
  for (const p of profile) {
    p.share = profileTotal > 0 ? p.avg / profileTotal : 0;
    p.vsAvg = avgPerHour > 0 ? p.avg / avgPerHour - 1 : 0; // deviasi vs rata-rata
  }

  const byAvg = [...profile].sort((a, b) => b.avg - a.avg);
  const peak = byAvg[0];
  const quiet = byAvg[byAvg.length - 1];
  const topHours = byAvg.slice(0, 5);
  const quietHours = byAvg.slice(-3).reverse();

  /* --- Blok 3 jam terbaik (jendela geser) --- */
  const blocks = [];
  for (let s = 0; s < 24; s++) {
    let v = 0;
    for (let k = 0; k < 3; k++) v += profile[(s + k) % 24].avg;
    blocks.push({ startUtc: s, startWib: utcToWib(s), avg: v / 3, total: v });
  }
  blocks.sort((a, b) => b.avg - a.avg);
  const bestBlock = blocks[0];
  const worstBlock = blocks[blocks.length - 1];

  /* --- Matriks hari (WIB) x jam (WIB) --- */
  const cells = new Map(); // `${dow}:${wibHour}` -> []
  const dayTotals = new Map(); // dowKey -> {vol, hours}
  for (const r of rows) {
    const p = wibParts(r.t);
    const k = `${p.dow}:${p.hour}`;
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k).push(r.q);
    if (!dayTotals.has(p.dow)) dayTotals.set(p.dow, { vol: 0, hours: 0 });
    const d = dayTotals.get(p.dow);
    d.vol += r.q;
    d.hours++;
  }

  const matrix = DOW_ORDER.map((dow) => ({
    dow,
    hours: Array.from({ length: 24 }, (_, h) => {
      const vals = cells.get(`${dow}:${h}`) || [];
      return { dow, wib: h, utc: (h - 7 + 24) % 24, avg: vals.length ? mean(vals) : null, n: vals.length };
    }),
  }));

  const matrixMax = Math.max(
    0,
    ...matrix.flatMap((r) => r.hours.map((c) => c.avg || 0)),
  );
  const hasMatrix = rows.length >= 24 * 7;

  /* --- Ringkasan per hari --- */
  const dayProfile = DOW_ORDER.map((dow) => {
    const d = dayTotals.get(dow) || { vol: 0, hours: 0 };
    return { dow, avg: d.hours ? d.vol / d.hours : 0, hours: d.hours, total: d.vol };
  });
  const dayMax = Math.max(0, ...dayProfile.map((d) => d.avg));
  const bestDay = [...dayProfile].sort((a, b) => b.avg - a.avg)[0];

  const weekdayVals = rows.filter((r) => { const d = wibParts(r.t).dow; return d >= 1 && d <= 5; });
  const weekendVals = rows.filter((r) => { const d = wibParts(r.t).dow; return d === 0 || d === 6; });
  const weekdayAvg = weekdayVals.length ? mean(weekdayVals, (r) => r.q) : 0;
  const weekendAvg = weekendVals.length ? mean(weekendVals, (r) => r.q) : 0;

  /* --- Kontribusi per sesi pasar --- */
  const sessions = SESSIONS.map((s) => {
    const hrs = [];
    for (let h = s.utcStart; h !== s.utcEnd; h = (h + 1) % 24) hrs.push(h);
    const v = sum(hrs, (h) => profile[h].avg);
    return {
      ...s,
      hours: hrs.length,
      avg: hrs.length ? v / hrs.length : 0,
      share: profileTotal > 0 ? v / profileTotal : 0,
      wibStart: utcToWib(s.utcStart),
      wibEnd: utcToWib(s.utcEnd),
    };
  }).sort((a, b) => b.avg - a.avg);

  /* --- Profil per koin: jam puncak masing-masing --- */
  const coinKeys = [...new Set(rows.flatMap((r) => Object.keys(r.byCoin)))];
  const perCoin = coinKeys.map((key) => {
    const b = Array.from({ length: 24 }, () => []);
    let tot = 0;
    for (const r of rows) {
      const v = r.byCoin[key];
      if (v == null) continue;
      b[new Date(r.t).getUTCHours()].push(v);
      tot += v;
    }
    const avgs = b.map((vals) => (vals.length ? mean(vals) : 0));
    let pk = 0;
    for (let i = 1; i < 24; i++) if (avgs[i] > avgs[pk]) pk = i;
    return {
      key,
      total: tot,
      avgPerHour: tot / rows.length,
      peakUtc: pk,
      peakWib: utcToWib(pk),
      peakAvg: avgs[pk],
      profile: avgs,
    };
  }).sort((a, b) => b.total - a.total);

  return {
    from, to, hours: rows.length,
    days: rows.length / 24,
    totalVol, avgPerHour,
    profile, peak, quiet, topHours, quietHours,
    bestBlock, worstBlock,
    matrix, matrixMax, hasMatrix,
    dayProfile, dayMax, bestDay,
    weekdayAvg, weekendAvg,
    sessions, perCoin,
    peakRatio: quiet.avg > 0 ? peak.avg / quiet.avg : 0,
    series: rows,
  };
}

/* ============================================================
   C. Treemap memecoin — algoritma squarified
   ============================================================ */

export function squarify(items, x, y, w, h) {
  const total = sum(items, (i) => i.value);
  if (!(total > 0) || w <= 0 || h <= 0) return [];
  const scale = (w * h) / total;
  const nodes = items.map((i) => ({ ...i, area: i.value * scale }));
  const out = [];

  const worst = (row, len) => {
    if (!row.length || len <= 0) return Infinity;
    const s = sum(row, (r) => r.area);
    const max = Math.max(...row.map((r) => r.area));
    const min = Math.min(...row.map((r) => r.area));
    const l2 = len * len;
    const s2 = s * s;
    return Math.max((l2 * max) / s2, s2 / (l2 * min));
  };

  const layoutRow = (row, len, rect) => {
    const s = sum(row, (r) => r.area);
    const thick = s / len;
    const horizontal = rect.w >= rect.h;
    let off = 0;
    for (const r of row) {
      const side = r.area / thick;
      out.push(horizontal
        ? { ...r, x: rect.x, y: rect.y + off, w: thick, h: side }
        : { ...r, x: rect.x + off, y: rect.y, w: side, h: thick });
      off += side;
    }
    return horizontal
      ? { x: rect.x + thick, y: rect.y, w: rect.w - thick, h: rect.h }
      : { x: rect.x, y: rect.y + thick, w: rect.w, h: rect.h - thick };
  };

  let rect = { x, y, w, h };
  let row = [];
  const queue = [...nodes].sort((a, b) => b.area - a.area);

  while (queue.length) {
    const len = Math.min(rect.w, rect.h);
    const next = queue[0];
    if (!row.length || worst([...row, next], len) <= worst(row, len)) {
      row.push(queue.shift());
    } else {
      rect = layoutRow(row, len, rect);
      row = [];
    }
    if (!queue.length && row.length) {
      layoutRow(row, Math.min(rect.w, rect.h), rect);
      row = [];
    }
  }
  return out;
}
