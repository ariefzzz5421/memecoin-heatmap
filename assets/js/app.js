/* ============================================================
   app.js — orkestrasi halaman
   ============================================================ */

import { MEME_BASKET, MAJOR_BASKET, TIMEFRAMES } from './config.js';
import {
  fetchExchanges, fetchBtcPrice, fetchMemecoins, fetchGlobal,
  fetchCandleSet, fetchWorldTopo,
} from './datasource.js';
import { aggregateJurisdictions, mergeHourly, analyzeHours } from './analytics.js';
import { WorldMap, escapeHtml } from './worldmap.js';
import { renderHourProfile, renderHourMatrix, renderSeqLegend } from './hours.js';
import { renderTreemap, renderDivLegend, renderCoinTable, CHANGE_FIELDS } from './treemap.js';
import {
  fmtUsd, fmtUsdShort, fmtPct, fmtNum, fmtPrice, fmtClock,
  pad2, hourRange, DOW_ID, el, debounce, seqColor, perceptual,
} from './utils.js';
import { startAutoRefresh } from './autorefresh.js';

const $ = (id) => document.getElementById(id);

const state = {
  agg: null,
  coins: [],
  global: null,
  basket: 'meme',
  timeframe: '30d',
  changeField: '24h',
  memeView: 'map',
  hourly: null,
  analysis: null,
  candleProvider: null,
  candleFailed: [],
  loadingHours: false,
};

let map = null;

/* ============================================================
   Status & toast
   ============================================================ */

function status(text, kind = 'busy', source = '') {
  $('statusText').textContent = text;
  $('statusSource').textContent = source;
  const dot = $('statusDot');
  dot.className = `dot ${kind}`;
}

let toastTimer;
function toast(msg, kind = 'info') {
  const t = $('toast');
  t.textContent = msg;
  t.className = `toast ${kind}`;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 6000);
}

/* ============================================================
   Jam berjalan
   ============================================================ */

function tickClock() {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 3600 * 1000);
  $('clockWib').textContent = `${pad2(wib.getUTCHours())}:${pad2(wib.getUTCMinutes())}:${pad2(wib.getUTCSeconds())} WIB`;
  $('clockUtc').textContent = `${pad2(now.getUTCHours())}:${pad2(now.getUTCMinutes())} UTC`;
}

/* ============================================================
   Bagian 1 — Peta
   ============================================================ */

function renderMapSection() {
  const agg = state.agg;
  if (!agg) return;

  map.setData(agg);
  $('mapLoading').hidden = true;

  renderSeqLegend($('mapLegend'), {
    min: 0,
    max: agg.rows[0]?.volUsd || 0,
    label: 'Volume 24 jam',
    fmt: fmtUsdShort,
  });

  /* Peringkat */
  const list = $('rankList');
  list.innerHTML = '';
  agg.rows.slice(0, 12).forEach((r, i) => {
    const t = perceptual(r.volUsd, agg.rows[0].volUsd);
    const li = el('li', { class: 'rank-item', tabindex: '0', role: 'button' },
      el('span', { class: 'rank-n' }, String(i + 1)),
      el('span', { class: 'rank-dot', style: { background: seqColor(0.25 + 0.75 * t) } }),
      el('span', { class: 'rank-name' }, r.name),
      el('span', { class: 'rank-val num' }, fmtUsd(r.volUsd, 1)),
      el('span', { class: 'rank-share num' }, `${(r.share * 100).toFixed(1)}%`),
    );
    const go = () => map.focus(r.name);
    li.addEventListener('click', go);
    li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    list.append(li);
  });

  /* Kawasan */
  const rl = $('regionList');
  rl.innerHTML = '';
  const rmax = agg.regions[0]?.volUsd || 1;
  for (const g of agg.regions) {
    rl.append(el('div', { class: 'region-row' },
      el('div', { class: 'region-top' },
        el('span', {}, g.region),
        el('span', { class: 'num' }, `${(g.share * 100).toFixed(1)}%`),
      ),
      el('div', { class: 'region-bar' },
        el('span', { style: { width: `${(g.volUsd / rmax) * 100}%`, background: seqColor(0.25 + 0.6 * perceptual(g.volUsd, rmax)) } }),
      ),
      el('div', { class: 'region-meta muted' },
        `${fmtUsd(g.volUsd, 1)} · ${g.places} yurisdiksi · ${fmtNum(g.count)} bursa`),
    ));
  }

  /* Tabel lengkap */
  renderJurisdictionTable(agg);
}

function renderJurisdictionTable(agg) {
  const holder = $('jurTable');
  holder.innerHTML = '';
  const table = el('table', { class: 'data-table' });
  table.append(el('caption', {}, `${agg.rows.length} yurisdiksi dari ${fmtNum(agg.exchangeCount)} bursa teratas`));
  table.append(el('thead', {}, el('tr', {},
    el('th', { scope: 'col' }, '#'),
    el('th', { scope: 'col' }, 'Yurisdiksi'),
    el('th', { scope: 'col' }, 'Kawasan'),
    el('th', { scope: 'col', class: 'r' }, 'Volume 24j'),
    el('th', { scope: 'col', class: 'r' }, 'Pangsa'),
    el('th', { scope: 'col', class: 'r' }, 'Bursa'),
    el('th', { scope: 'col', class: 'r' }, 'Rata-rata'),
    el('th', { scope: 'col', class: 'r' }, 'Median'),
    el('th', { scope: 'col' }, 'Bursa terbesar'),
  )));
  const tb = el('tbody');
  agg.rows.forEach((r, i) => {
    const tr = el('tr', { class: 'clickable', tabindex: '0' },
      el('td', { class: 'muted' }, String(i + 1)),
      el('td', {}, el('strong', {}, r.name)),
      el('td', { class: 'muted' }, r.region),
      el('td', { class: 'r num' }, fmtUsd(r.volUsd)),
      el('td', { class: 'r num' }, `${(r.share * 100).toFixed(2)}%`),
      el('td', { class: 'r num' }, fmtNum(r.count)),
      el('td', { class: 'r num' }, fmtUsd(r.avgUsd)),
      el('td', { class: 'r num' }, fmtUsd(r.medianUsd)),
      el('td', { class: 'muted' }, r.top?.name || '—'),
    );
    const go = () => { map.focus(r.name); document.getElementById('peta').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    tr.addEventListener('click', go);
    tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    tb.append(tr);
  });
  table.append(tb);

  if (agg.unknownUsd > 0) {
    table.append(el('tfoot', {}, el('tr', {},
      el('td', {}, ''),
      el('td', { colspan: '2' }, 'Tidak terdaftar / tidak diketahui'),
      el('td', { class: 'r num' }, fmtUsd(agg.unknownUsd)),
      el('td', { class: 'r num' }, `${((agg.unknownUsd / agg.grandTotal) * 100).toFixed(2)}%`),
      el('td', { class: 'r num' }, fmtNum(agg.unknownCount)),
      el('td', { colspan: '3' }, ''),
    )));
  }
  holder.append(table);
}

function renderDetail(row) {
  const card = $('detailCard');
  if (!row) { card.hidden = true; card.innerHTML = ''; return; }
  const agg = state.agg;
  const rank = agg.rows.indexOf(row) + 1;

  card.innerHTML = '';
  card.append(
    el('div', { class: 'detail-head' },
      el('h3', {}, row.name),
      el('span', { class: 'pill' }, `Peringkat #${rank}`),
      el('span', { class: 'pill ghost' }, row.region),
      el('button', { class: 'btn sm ghost', type: 'button', onclick: () => map.reset() }, 'Tutup'),
    ),
    el('div', { class: 'detail-stats' },
      stat('Volume 24 jam', fmtUsd(row.volUsd)),
      stat('Pangsa global', `${(row.share * 100).toFixed(2)}%`),
      stat('Jumlah bursa', fmtNum(row.count)),
      stat('Rata-rata / bursa', fmtUsd(row.avgUsd)),
      stat('Median / bursa', fmtUsd(row.medianUsd)),
      stat('Zona waktu', row.tz != null ? `UTC${row.tz >= 0 ? '+' : '−'}${Math.abs(row.tz)}` : '—'),
    ),
    el('h4', {}, `Bursa terdaftar di ${row.name}`),
    exchangeTable(row),
  );
  card.hidden = false;
}

function stat(label, value) {
  return el('div', { class: 'stat' },
    el('span', { class: 'stat-l' }, label),
    el('span', { class: 'stat-v num' }, value),
  );
}

function exchangeTable(row) {
  const btc = state.btcPrice || 0;
  const table = el('table', { class: 'data-table compact' });
  table.append(el('thead', {}, el('tr', {},
    el('th', { scope: 'col' }, 'Bursa'),
    el('th', { scope: 'col', class: 'r' }, 'Volume 24j'),
    el('th', { scope: 'col', class: 'r' }, 'Pangsa lokal'),
    el('th', { scope: 'col', class: 'r' }, 'Trust'),
    el('th', { scope: 'col', class: 'r' }, 'Berdiri'),
  )));
  const tb = el('tbody');
  for (const ex of row.exchanges.slice(0, 15)) {
    const v = ex.volBtc * btc;
    tb.append(el('tr', {},
      el('td', {}, ex.name),
      el('td', { class: 'r num' }, fmtUsd(v)),
      el('td', { class: 'r num' }, `${((v / row.volUsd) * 100).toFixed(1)}%`),
      el('td', { class: 'r num' }, ex.trust != null ? String(ex.trust) : '—'),
      el('td', { class: 'r num muted' }, ex.year || '—'),
    ));
  }
  table.append(tb);
  return table;
}

/* ============================================================
   Bagian 2 — Jam aktif
   ============================================================ */

function buildTimeframeButtons() {
  const g = $('tfGroup');
  g.innerHTML = '';
  for (const tf of TIMEFRAMES) {
    const b = el('button', {
      class: `seg-btn${tf.key === state.timeframe ? ' is-on' : ''}`,
      type: 'button', 'data-tf': tf.key,
    }, tf.label);
    b.addEventListener('click', () => {
      if (state.timeframe === tf.key) return;
      state.timeframe = tf.key;
      g.querySelectorAll('.seg-btn').forEach((x) => x.classList.toggle('is-on', x.dataset.tf === tf.key));
      loadHours();
    });
    g.append(b);
  }
}

async function loadHours({ force = false } = {}) {
  if (state.loadingHours) return;
  state.loadingHours = true;

  const basket = state.basket === 'meme' ? MEME_BASKET : MAJOR_BASKET;
  const tf = TIMEFRAMES.find((t) => t.key === state.timeframe) || TIMEFRAMES[2];

  $('hourProfile').innerHTML = '<div class="chart-loading"><span class="spinner"></span> Mengambil candle 1 jam…</div>';
  status(`Mengambil candle ${tf.label.toLowerCase()}…`, 'busy');

  try {
    const { provider, series, failed, cached } = await fetchCandleSet(basket, tf.hours, {
      force,
      onProgress: (done, total, label) => status(`Candle dari ${label}: ${done}/${total} koin…`, 'busy'),
    });

    state.candleProvider = provider;
    state.candleFailed = failed;
    state.hourly = mergeHourly(series);
    state.analysis = analyzeHours(state.hourly, tf.hours);

    renderHourSection();
    status('Data siap', 'ok',
      `candle: ${provider}${cached ? ' (cache)' : ''}${failed.length ? ` · ${failed.length} koin dilewati` : ''}`);
    if (failed.length) {
      toast(`Dilewati: ${failed.map((f) => f.key).join(', ')} — tidak tersedia di ${provider}.`, 'warn');
    }
  } catch (err) {
    console.error(err);
    $('hourProfile').innerHTML = '';
    $('hourProfile').append(el('p', { class: 'error' },
      `Gagal mengambil data candle: ${err.message}. Binance/OKX/Kraken mungkin diblokir jaringan atau ISP. Coba lagi, atau gunakan VPN.`));
    $('hourMatrix').innerHTML = '';
    $('hourInsights').innerHTML = '';
    status('Data candle gagal dimuat', 'err');
  } finally {
    state.loadingHours = false;
  }
}

function renderHourSection() {
  const an = state.analysis;
  if (!an) return;

  renderHourProfile($('hourProfile'), an, { tooltip: $('hourTip') });
  renderHourMatrix($('hourMatrix'), an, { tooltip: $('hourTip') });
  renderCoverageNote(an);

  renderSeqLegend($('matrixLegend'), {
    min: 0, max: an.matrixMax, label: 'Rata-rata volume', fmt: fmtUsdShort,
  });

  /* Legenda sesi */
  const ls = $('hourLegendSessions');
  ls.innerHTML = '';
  ls.append(el('span', { class: 'legend-title' }, 'Sesi pasar'));
  for (const s of an.sessions) {
    ls.append(el('span', { class: 'legend-item' },
      el('span', { class: 'legend-swatch', style: { background: s.color } }),
      `${s.label} (${pad2(s.wibStart)}–${pad2(s.wibEnd)} WIB)`,
    ));
  }

  renderHourInsights(an);
  renderSessionTable(an);
  renderCoinHourTable(an);
  renderHourTable(an);
  updateHourKpi(an);
}

/* Sumber candle punya batas histori berbeda (OKX berhenti di 1.440 lilin 1 jam
   ≈ 60 hari). Kalau jendela yang benar-benar terambil lebih pendek dari yang
   diminta, katakan apa adanya — jangan biarkan label tombol berbohong. */
function renderCoverageNote(an) {
  const tf = TIMEFRAMES.find((t) => t.key === state.timeframe) || TIMEFRAMES[2];
  const holder = $('hourProfile');
  holder.querySelector('.coverage-note')?.remove();

  const gotDays = an.days;
  const wantDays = tf.hours / 24;
  const short = gotDays < wantDays * 0.95;

  const text = short
    ? `Diminta ${tf.label.toLowerCase()}, tersedia ${Math.round(gotDays)} hari. `
      + `${state.candleProvider} membatasi kedalaman histori candle 1 jam — seluruh angka di bawah `
      + `dihitung dari ${Math.round(gotDays)} hari (${an.hours} jam) yang benar-benar terambil.`
    : `Jendela analisa: ${Math.round(gotDays)} hari (${an.hours} jam candle 1 jam dari ${state.candleProvider}), `
      + `berakhir ${fmtClock(an.to)}.`;

  holder.append(el('p', { class: `note coverage-note${short ? ' warn' : ''}` }, text));
}

function renderHourInsights(an) {
  const g = $('hourInsights');
  g.innerHTML = '';

  const peakWibRange = hourRange(an.peak.wib);
  const peakUtcRange = hourRange(an.peak.utc);
  const blockWib = `${pad2(an.bestBlock.startWib)}:00–${pad2((an.bestBlock.startWib + 3) % 24)}:00`;
  const blockUtc = `${pad2(an.bestBlock.startUtc)}:00–${pad2((an.bestBlock.startUtc + 3) % 24)}:00`;
  const quietWib = hourRange(an.quiet.wib);
  const topSession = an.sessions[0];
  const wkDelta = an.weekendAvg > 0 ? (an.weekdayAvg / an.weekendAvg - 1) * 100 : 0;

  const cards = [
    {
      tag: 'Jam puncak',
      big: `${peakWibRange} WIB`,
      sub: `${peakUtcRange} UTC`,
      body: `Rata-rata ${fmtUsd(an.peak.avg)} per jam — ${fmtPct(an.peak.vsAvg * 100, 0)} di atas rata-rata harian.`,
      accent: true,
    },
    {
      tag: 'Blok 3 jam tertinggi',
      big: `${blockWib} WIB`,
      sub: `${blockUtc} UTC`,
      body: `Rata-rata ${fmtUsd(an.bestBlock.avg)} per jam selama 3 jam berturut-turut.`,
    },
    {
      tag: 'Rata-rata volume',
      big: `${fmtUsd(an.avgPerHour)}`,
      sub: 'per jam',
      body: `Total ${fmtUsd(an.totalVol)} dalam ${Math.round(an.days)} hari — setara ${fmtUsd(an.avgPerHour * 24)} per hari.`,
    },
    {
      tag: 'Jam volume terendah',
      big: `${quietWib} WIB`,
      sub: `${hourRange(an.quiet.utc)} UTC`,
      body: `${fmtUsd(an.quiet.avg)} per jam. Rasio jam tertinggi : terendah = ${an.peakRatio.toFixed(1)}×.`,
    },
    {
      tag: 'Sesi volume tertinggi',
      big: topSession.label.replace('Sesi ', ''),
      sub: `${pad2(topSession.wibStart)}:00–${pad2(topSession.wibEnd)}:00 WIB`,
      body: `${(topSession.share * 100).toFixed(0)}% volume harian, rata-rata ${fmtUsd(topSession.avg)} per jam.`,
    },
    {
      tag: 'Hari volume tertinggi',
      big: DOW_ID[an.bestDay.dow],
      sub: `${fmtUsd(an.bestDay.avg)} / jam`,
      body: wkDelta >= 0
        ? `Rata-rata hari kerja ${fmtPct(wkDelta, 0)} vs akhir pekan.`
        : `Rata-rata akhir pekan ${fmtPct(-wkDelta, 0)} vs hari kerja.`,
    },
  ];

  for (const c of cards) {
    g.append(el('article', { class: `insight${c.accent ? ' accent' : ''}` },
      el('span', { class: 'insight-tag' }, c.tag),
      el('p', { class: 'insight-big' }, c.big),
      el('p', { class: 'insight-sub' }, c.sub),
      el('p', { class: 'insight-body' }, c.body),
    ));
  }
}

function renderSessionTable(an) {
  const h = $('sessionTable');
  h.innerHTML = '';
  const t = el('table', { class: 'data-table compact' });
  t.append(el('thead', {}, el('tr', {},
    el('th', { scope: 'col' }, 'Sesi'),
    el('th', { scope: 'col' }, 'WIB'),
    el('th', { scope: 'col' }, 'UTC'),
    el('th', { scope: 'col', class: 'r' }, 'Rata-rata/jam'),
    el('th', { scope: 'col', class: 'r' }, 'Pangsa'),
  )));
  const tb = el('tbody');
  for (const s of an.sessions) {
    tb.append(el('tr', {},
      el('td', {},
        el('span', { class: 'legend-swatch', style: { background: s.color } }),
        ' ', s.label),
      el('td', { class: 'num' }, `${pad2(s.wibStart)}:00–${pad2(s.wibEnd)}:00`),
      el('td', { class: 'num muted' }, `${pad2(s.utcStart)}:00–${pad2(s.utcEnd)}:00`),
      el('td', { class: 'r num' }, fmtUsd(s.avg)),
      el('td', { class: 'r num' }, `${(s.share * 100).toFixed(1)}%`),
    ));
  }
  t.append(tb);
  h.append(t,
    el('p', { class: 'note' },
      'Rentang sesi saling beririsan (Eropa 14:00–23:00 WIB, AS 20:00–04:00 WIB), '
      + 'sehingga total pangsa melebihi 100%.'));
}

function renderCoinHourTable(an) {
  const h = $('coinHourTable');
  h.innerHTML = '';
  const t = el('table', { class: 'data-table compact' });
  t.append(el('thead', {}, el('tr', {},
    el('th', { scope: 'col' }, 'Koin'),
    el('th', { scope: 'col' }, 'Jam puncak WIB'),
    el('th', { scope: 'col' }, 'UTC'),
    el('th', { scope: 'col', class: 'r' }, 'Rata-rata/jam'),
    el('th', { scope: 'col', class: 'r' }, 'Total'),
  )));
  const tb = el('tbody');
  for (const c of an.perCoin) {
    tb.append(el('tr', {},
      el('td', {}, el('strong', {}, c.key)),
      el('td', { class: 'num' }, hourRange(c.peakWib)),
      el('td', { class: 'num muted' }, hourRange(c.peakUtc)),
      el('td', { class: 'r num' }, fmtUsd(c.avgPerHour)),
      el('td', { class: 'r num' }, fmtUsd(c.total)),
    ));
  }
  t.append(tb);
  h.append(t);

  if (state.candleFailed.length) {
    h.append(el('p', { class: 'note' },
      `Tidak tersedia di ${state.candleProvider}: ${state.candleFailed.map((f) => f.key).join(', ')}.`));
  }
}

function renderHourTable(an) {
  const h = $('hourTable');
  h.innerHTML = '';
  const t = el('table', { class: 'data-table compact' });
  t.append(el('caption', {}, 'Rata-rata volume per jam, diurutkan menurut jam WIB'));
  t.append(el('thead', {}, el('tr', {},
    el('th', { scope: 'col' }, 'WIB'),
    el('th', { scope: 'col' }, 'UTC'),
    el('th', { scope: 'col', class: 'r' }, 'Rata-rata'),
    el('th', { scope: 'col', class: 'r' }, 'Median'),
    el('th', { scope: 'col', class: 'r' }, 'Tertinggi'),
    el('th', { scope: 'col', class: 'r' }, 'vs rata-rata'),
    el('th', { scope: 'col', class: 'r' }, 'Pangsa'),
  )));
  const tb = el('tbody');
  for (let wib = 0; wib < 24; wib++) {
    const p = an.profile.find((x) => x.wib === wib);
    const isPeak = p.utc === an.peak.utc;
    tb.append(el('tr', { class: isPeak ? 'is-peak' : null },
      el('td', { class: 'num' }, hourRange(wib)),
      el('td', { class: 'num muted' }, hourRange(p.utc)),
      el('td', { class: 'r num' }, fmtUsd(p.avg)),
      el('td', { class: 'r num' }, fmtUsd(p.med)),
      el('td', { class: 'r num' }, fmtUsd(p.max)),
      el('td', { class: `r num ${p.vsAvg >= 0 ? 'up' : 'down'}` }, fmtPct(p.vsAvg * 100, 0)),
      el('td', { class: 'r num' }, `${(p.share * 100).toFixed(1)}%`),
    ));
  }
  t.append(tb);
  h.append(t);
}

function updateHourKpi(an) {
  $('kpiPeakHour').textContent = `${hourRange(an.peak.wib)} WIB`;
  $('kpiPeakSub').textContent =
    `${hourRange(an.peak.utc)} UTC · ${fmtUsd(an.peak.avg)}/jam · ${fmtPct(an.peak.vsAvg * 100, 0)} vs rata-rata`;
}

/* ============================================================
   Bagian 3 — Memecoin
   ============================================================ */

function renderMemeSection() {
  const coins = state.coins;
  if (!coins.length) return;

  renderDivLegend($('memeLegend'), state.changeField);

  if (state.memeView === 'map') {
    $('treemap').hidden = false;
    $('memeTable').hidden = true;
    renderTreemap($('treemap'), coins, {
      tooltip: $('memeTip'),
      changeField: state.changeField,
      limit: 40,
    });
  } else {
    $('treemap').hidden = true;
    $('memeTable').hidden = false;
    renderCoinTable($('memeTable'), coins, 60);
  }

  renderMemeInsights(coins);
  renderPerformanceLeaderboard(coins);
}

function renderPerformanceLeaderboard(coins) {
  const holder = $('memeLeaders');
  if (!holder) return;
  const rows = coins
    .filter((coin) => Number.isFinite(coin.ch24h))
    .sort((a, b) => b.ch24h - a.ch24h)
    .slice(0, 10);
  holder.replaceChildren();
  rows.forEach((coin, index) => {
    holder.append(el('a', {
      class: 'leader-row',
      href: `/cases/detail/?id=${encodeURIComponent(coin.id)}&symbol=${encodeURIComponent(coin.sym)}`,
    },
      el('span', { class: 'leader-rank num' }, String(index + 1).padStart(2, '0')),
      el('img', { class: 'row-logo', src: coin.image, alt: '', width: '24', height: '24' }),
      el('span', { class: 'leader-name' },
        el('strong', {}, coin.sym),
        el('small', {}, coin.name),
      ),
      el('span', { class: 'leader-mcap num' }, fmtUsd(coin.mcap)),
      el('strong', { class: `leader-change num ${coin.ch24h >= 0 ? 'up' : 'down'}` }, fmtPct(coin.ch24h, 1)),
    ));
  });
}

function renderMemeInsights(coins) {
  const g = $('memeInsights');
  g.innerHTML = '';
  const field = CHANGE_FIELDS[state.changeField];
  const top = coins.slice(0, 40);
  const totalVol = top.reduce((s, c) => s + c.vol, 0);
  const totalMcap = top.reduce((s, c) => s + (c.mcap || 0), 0);
  const leader = top[0];
  const withCh = top.filter((c) => Number.isFinite(c[field.key]));
  const gainers = withCh.filter((c) => c[field.key] > 0).length;
  const best = [...withCh].sort((a, b) => b[field.key] - a[field.key])[0];
  const worst = [...withCh].sort((a, b) => a[field.key] - b[field.key])[0];
  const turnover = totalMcap > 0 ? totalVol / totalMcap : 0;
  const top3Share = totalVol > 0 ? top.slice(0, 3).reduce((s, c) => s + c.vol, 0) / totalVol : 0;

  const cards = [
    { tag: 'Volume memecoin 24 jam', big: fmtUsd(totalVol), sub: `${top.length} koin teratas`,
      body: `Rasio volume/kapitalisasi 24 jam: ${(turnover * 100).toFixed(1)}% dari ${fmtUsd(totalMcap)}.` },
    { tag: 'Volume terbesar', big: leader.sym, sub: fmtUsd(leader.vol),
      body: `${leader.name}: ${((leader.vol / totalVol) * 100).toFixed(1)}% volume keranjang. Tiga teratas: ${(top3Share * 100).toFixed(0)}%.` },
    { tag: `Naik terkuat ${field.label}`, big: best ? best.sym : '—', sub: best ? fmtPct(best[field.key]) : '—',
      body: best ? `${best.name} di ${fmtPrice(best.price)}, volume ${fmtUsd(best.vol)}.` : 'Data perubahan tidak tersedia.' },
    { tag: `Turun terdalam ${field.label}`, big: worst ? worst.sym : '—', sub: worst ? fmtPct(worst[field.key]) : '—',
      body: worst ? `${worst.name} di ${fmtPrice(worst.price)}, volume ${fmtUsd(worst.vol)}.` : 'Data perubahan tidak tersedia.' },
    { tag: 'Koin naik', big: `${gainers}/${withCh.length}`, sub: `dalam ${field.label}`,
      body: `${gainers} dari ${withCh.length} koin mencatat perubahan positif ${field.label}.` },
  ];

  for (const c of cards) {
    g.append(el('article', { class: 'insight' },
      el('span', { class: 'insight-tag' }, c.tag),
      el('p', { class: 'insight-big' }, c.big),
      el('p', { class: 'insight-sub' }, c.sub),
      el('p', { class: 'insight-body' }, c.body),
    ));
  }
}

/* ============================================================
   KPI atas
   ============================================================ */

function updateTopKpi() {
  const { agg, global: g } = state;
  if (g) {
    $('kpiGlobalVol').textContent = fmtUsd(g.volUsd);
    $('kpiGlobalSub').textContent =
      `Kapitalisasi ${fmtUsd(g.mcapUsd)} (${fmtPct(g.mcapChange24h, 1)} 24j) · dominasi BTC ${g.btcDom.toFixed(1)}%`;
  }
  if (agg) {
    const t = agg.rows[0];
    $('kpiTopPlace').textContent = t.name;
    $('kpiTopSub').textContent =
      `${fmtUsd(t.volUsd)} · ${(t.share * 100).toFixed(1)}% volume terpetakan · ${t.count} bursa`;
    $('kpiAvgEx').textContent = fmtUsd(agg.avgPerExchange);
    $('kpiAvgExSub').textContent =
      `${fmtNum(agg.exchangeCount)} bursa · ${agg.rows.length} yurisdiksi · ${agg.top80} teratas = 80% volume`;
  }
}

/* ============================================================
   Boot
   ============================================================ */

async function boot({ force = false } = {}) {
  status('Memuat data pasar…', 'busy');

  /* Peta bisa digambar segera setelah geometri siap */
  const geoP = fetchWorldTopo()
    .then((topo) => { map.setTopology(topo); })
    .catch((e) => {
      $('mapLoading').innerHTML = `<span class="error">Gagal memuat geometri peta: ${escapeHtml(e.message)}</span>`;
      throw e;
    });

  const marketP = (async () => {
    const [btc, exchanges] = await Promise.all([
      fetchBtcPrice({ force }),
      fetchExchanges({ pages: 2, force }),
    ]);
    state.btcPrice = btc;
    state.agg = aggregateJurisdictions(exchanges, btc);
  })();

  const coinsP = fetchMemecoins({ limit: 100, force })
    .then((c) => { state.coins = c; })
    .catch((e) => { console.warn('memecoin gagal', e); state.coins = []; });

  const globalP = fetchGlobal({ force })
    .then((g) => { state.global = g; })
    .catch(() => { state.global = null; });

  try {
    await Promise.all([geoP, marketP]);
    renderMapSection();
  } catch (e) {
    console.error(e);
    status(`Sebagian data gagal dimuat: ${e.message}`, 'err');
  }

  await Promise.allSettled([coinsP, globalP]);
  updateTopKpi();
  if (state.coins.length) renderMemeSection();
  else $('treemap').innerHTML = '<p class="error">Data memecoin tidak tersedia (batas rate CoinGecko?). Coba muat ulang beberapa saat lagi.</p>';

  $('footUpdated').textContent = fmtClock(Date.now());
  status('Data pasar siap', 'ok', `BTC ${fmtPrice(state.btcPrice)}`);

  await loadHours({ force });
}

/* ============================================================
   Kontrol
   ============================================================ */

function wireControls() {
  $('btnZoomIn').addEventListener('click', () => map.zoom(1.4));
  $('btnZoomOut').addEventListener('click', () => map.zoom(1 / 1.4));
  $('btnMapReset').addEventListener('click', () => map.reset());
  $('chkLabels').addEventListener('change', (e) => {
    map.showLabels = e.target.checked;
    map.render();
  });

  document.querySelectorAll('[data-basket]').forEach((b) => {
    b.addEventListener('click', () => {
      if (state.basket === b.dataset.basket) return;
      state.basket = b.dataset.basket;
      document.querySelectorAll('[data-basket]').forEach((x) => x.classList.toggle('is-on', x === b));
      loadHours();
    });
  });

  document.querySelectorAll('[data-change]').forEach((b) => {
    b.addEventListener('click', () => {
      state.changeField = b.dataset.change;
      document.querySelectorAll('[data-change]').forEach((x) => x.classList.toggle('is-on', x === b));
      renderMemeSection();
    });
  });

  document.querySelectorAll('[data-view]').forEach((b) => {
    b.addEventListener('click', () => {
      state.memeView = b.dataset.view;
      document.querySelectorAll('[data-view]').forEach((x) => x.classList.toggle('is-on', x === b));
      renderMemeSection();
    });
  });

  /* Grafik digambar ulang saat wadahnya berubah lebar. ResizeObserver dipakai
     karena perubahan bisa datang dari media query atau layout yang baru
     selesai — bukan hanya dari resize window. */
  observeWidth($('hourProfile'), () => {
    if (!state.analysis) return;
    renderHourProfile($('hourProfile'), state.analysis, { tooltip: $('hourTip') });
    renderCoverageNote(state.analysis); // render ulang grafik menghapus catatan
  });

  observeWidth($('treemap'), () => {
    if (state.coins.length && state.memeView === 'map') {
      renderTreemap($('treemap'), state.coins, {
        tooltip: $('memeTip'), changeField: state.changeField, limit: 40,
      });
    }
  });
}

/**
 * Panggil `fn` saat lebar elemen berubah nyata (>2px).
 * Dipasang lewat ResizeObserver *dan* window.resize: yang pertama menangkap
 * perubahan yang tidak mengubah viewport, yang kedua tetap bekerja di
 * lingkungan yang tidak mengirim callback ResizeObserver. Penjaga lebar
 * membuat pemicu ganda ini tidak menggambar dua kali.
 */
function observeWidth(node, fn) {
  if (!node) return;
  let lastW = node.clientWidth;
  const run = debounce(() => {
    const w = node.clientWidth;
    if (w < 2 || Math.abs(w - lastW) < 2) return;
    lastW = w;
    fn();
  }, 120);

  new ResizeObserver(run).observe(node);
  window.addEventListener('resize', run);
}

/* ============================================================
   Mulai
   ============================================================ */

function init() {
  map = new WorldMap($('mapCanvas'), {
    tooltip: $('mapTip'),
    onSelect: renderDetail,
  });
  buildTimeframeButtons();
  wireControls();
  tickClock();
  setInterval(tickClock, 1000);
  boot().catch((e) => {
    console.error(e);
    status(`Gagal memuat: ${e.message}`, 'err');
  });

  /* Pembaruan senyap di latar. Jarak tiap sumber dipisah agar batas rate
     CoinGecko gratis tidak tertabrak; kline jauh lebih jarang karena
     analisa jam memakai jendela 30 hari yang praktis tidak berubah. */
  startAutoRefresh([
    {
      every: 10 * 1000,
      run: async () => {
        const [g, coins] = await Promise.all([
          fetchGlobal({ force: true }),
          fetchMemecoins({ limit: 100, force: true }),
        ]);
        state.global = g;
        state.coins = coins;
        updateTopKpi();
        renderMemeSection();
        $('footUpdated').textContent = fmtClock(Date.now());
      },
    },
    {
      every: 10 * 1000,
      run: async () => {
        const [btc, exchanges] = await Promise.all([
          fetchBtcPrice({ force: true }),
          fetchExchanges({ pages: 2, force: true }),
        ]);
        state.btcPrice = btc;
        state.agg = aggregateJurisdictions(exchanges, btc);
        renderMapSection();
        updateTopKpi();
      },
    },
    { every: 10 * 60 * 1000, run: () => loadHours({ force: true }) },
  ]);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
