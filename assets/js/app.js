/* ============================================================
   app.js — orkestrasi halaman
   ============================================================ */

import { MEME_BASKET, MAJOR_BASKET, TIMEFRAMES } from './config.js';
import {
  fetchExchanges, fetchBtcPrice, fetchMemecoins, fetchGlobal, fetchMemeMarket,
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
import { flagImage } from './country-flags.js';

const $ = (id) => document.getElementById(id);

const state = {
  agg: null,
  coins: [],
  global: null,
  memeMarket: null,
  overviewStamp: '',
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
    label: '24h volume',
    fmt: fmtUsdShort,
  });

  /* Peringkat */
  const list = $('rankList');
  list.innerHTML = '';
  agg.rows.slice(0, 12).forEach((r, i) => {
    const li = el('li', { class: 'rank-item', tabindex: '0', role: 'button' },
      el('span', { class: 'rank-n' }, String(i + 1)),
      flagImage(r.name) || el('span', { class: 'rank-dot', style: { background: seqColor(0.55) } }),
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
        `${fmtUsd(g.volUsd, 1)} · ${g.places} jurisdictions · ${fmtNum(g.count)} exchanges`),
    ));
  }

  /* Tabel lengkap */
  renderJurisdictionTable(agg);
}

function renderJurisdictionTable(agg) {
  const holder = $('jurTable');
  holder.innerHTML = '';
  const table = el('table', { class: 'data-table' });
  table.append(el('caption', {}, `${agg.rows.length} jurisdictions across ${fmtNum(agg.exchangeCount)} tracked exchanges`));
  table.append(el('thead', {}, el('tr', {},
    el('th', { scope: 'col' }, '#'),
    el('th', { scope: 'col' }, 'Jurisdiction'),
    el('th', { scope: 'col' }, 'Region'),
    el('th', { scope: 'col', class: 'r' }, '24h volume'),
    el('th', { scope: 'col', class: 'r' }, 'Share'),
    el('th', { scope: 'col', class: 'r' }, 'Exchanges'),
    el('th', { scope: 'col', class: 'r' }, 'Average'),
    el('th', { scope: 'col', class: 'r' }, 'Median'),
    el('th', { scope: 'col' }, 'Largest exchange'),
  )));
  const tb = el('tbody');
  agg.rows.forEach((r, i) => {
    const tr = el('tr', { class: 'clickable', tabindex: '0' },
      el('td', { class: 'muted' }, String(i + 1)),
      el('td', {}, el('span', { class: 'country-cell' }, flagImage(r.name), el('strong', {}, r.name))),
      el('td', { class: 'muted' }, r.region),
      el('td', { class: 'r num' }, fmtUsd(r.volUsd)),
      el('td', { class: 'r num' }, `${(r.share * 100).toFixed(2)}%`),
      el('td', { class: 'r num' }, fmtNum(r.count)),
      el('td', { class: 'r num' }, fmtUsd(r.avgUsd)),
      el('td', { class: 'r num' }, fmtUsd(r.medianUsd)),
      el('td', { class: 'muted' }, r.top?.name || '—'),
    );
    const go = () => { map.focus(r.name); document.getElementById('map').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    tr.addEventListener('click', go);
    tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    tb.append(tr);
  });
  table.append(tb);

  if (agg.unknownUsd > 0) {
    table.append(el('tfoot', {}, el('tr', {},
      el('td', {}, ''),
      el('td', { colspan: '2' }, 'Unregistered / unknown'),
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
      flagImage(row.name),
      el('h3', {}, row.name),
      el('span', { class: 'pill' }, `Rank #${rank}`),
      el('span', { class: 'pill ghost' }, row.region),
      el('button', { class: 'btn sm ghost', type: 'button', onclick: () => map.reset() }, 'Close'),
    ),
    el('div', { class: 'detail-stats' },
      stat('24h volume', fmtUsd(row.volUsd)),
      stat('Mapped share', `${(row.share * 100).toFixed(2)}%`),
      stat('Exchanges', fmtNum(row.count)),
      stat('Average / exchange', fmtUsd(row.avgUsd)),
      stat('Median / exchange', fmtUsd(row.medianUsd)),
      stat('Time zone', row.tz != null ? `UTC${row.tz >= 0 ? '+' : '−'}${Math.abs(row.tz)}` : '—'),
    ),
    el('h4', {}, `Exchanges registered in ${row.name}`),
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
    el('th', { scope: 'col' }, 'Exchange'),
    el('th', { scope: 'col', class: 'r' }, '24h volume'),
    el('th', { scope: 'col', class: 'r' }, 'Local share'),
    el('th', { scope: 'col', class: 'r' }, 'Trust'),
    el('th', { scope: 'col', class: 'r' }, 'Founded'),
  )));
  const tb = el('tbody');
  for (const ex of row.exchanges.slice(0, 15)) {
    const v = ex.volBtc * btc;
    const image = /^https?:\/\//i.test(ex.image || '') ? ex.image : '';
    const logoFallback = el(
      'span',
      { class: 'exchange-logo-fallback', 'aria-hidden': 'true' },
      (ex.name || '?').slice(0, 1).toUpperCase(),
    );
    const exchangeLogo = image
      ? el('img', {
        class: 'exchange-logo',
        src: image,
        alt: '',
        width: '28',
        height: '28',
        loading: 'lazy',
        onerror: (event) => {
          event.currentTarget.hidden = true;
          logoFallback.hidden = false;
        },
      })
      : null;
    logoFallback.hidden = Boolean(exchangeLogo);
    const exchangeName = ex.url
      ? el('a', {
        class: 'exchange-name-link',
        href: ex.url,
        target: '_blank',
        rel: 'noreferrer',
        title: `Open ${ex.name}`,
      }, ex.name)
      : el('strong', {}, ex.name);
    tb.append(el('tr', {},
      el('td', {}, el('span', { class: 'exchange-cell' },
        exchangeLogo,
        logoFallback,
        exchangeName,
      )),
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

  $('hourProfile').innerHTML = '<div class="chart-loading"><span class="spinner"></span> Loading 1-hour candles…</div>';
  status(`Loading ${tf.label.toLowerCase()} of candles…`, 'busy');

  try {
    const { provider, series, failed, cached } = await fetchCandleSet(basket, tf.hours, {
      force,
      onProgress: (done, total, label) => status(`${label} candles: ${done}/${total} coins…`, 'busy'),
    });

    state.candleProvider = provider;
    state.candleFailed = failed;
    state.hourly = mergeHourly(series);
    state.analysis = analyzeHours(state.hourly, tf.hours);

    renderHourSection();
    status('Data ready', 'ok',
      `candles: ${provider}${cached ? ' (cache)' : ''}${failed.length ? ` · ${failed.length} coins skipped` : ''}`);
    if (failed.length) {
      toast(`Skipped: ${failed.map((f) => f.key).join(', ')} — unavailable on ${provider}.`, 'warn');
    }
  } catch (err) {
    console.error(err);
    $('hourProfile').innerHTML = '';
    $('hourProfile').append(el('p', { class: 'error' },
      `Could not load candle data: ${err.message}. Binance, OKX, or Kraken may be blocked by the network or ISP.`));
    $('hourMatrix').innerHTML = '';
    $('hourInsights').innerHTML = '';
    status('Candle data could not load', 'err');
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
    min: 0, max: an.matrixMax, label: 'Average volume', fmt: fmtUsdShort,
  });

  /* Legenda sesi */
  const ls = $('hourLegendSessions');
  ls.innerHTML = '';
  ls.append(el('span', { class: 'legend-title' }, 'Market sessions'));
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
    ? `Requested ${tf.label.toLowerCase()}, but ${Math.round(gotDays)} days are available. `
      + `${state.candleProvider} limits 1-hour candle depth; all values below use the returned `
      + `${Math.round(gotDays)} days (${an.hours} hourly observations).`
    : `Analysis window: ${Math.round(gotDays)} days (${an.hours} 1-hour observations from ${state.candleProvider}), `
      + `ending ${fmtClock(an.to)}.`;

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
      tag: 'Peak hour',
      big: `${peakWibRange} WIB`,
      sub: `${peakUtcRange} UTC`,
      body: `Average ${fmtUsd(an.peak.avg)} per hour — ${fmtPct(an.peak.vsAvg * 100, 0)} versus the daily average.`,
      accent: true,
    },
    {
      tag: 'Highest 3-hour block',
      big: `${blockWib} WIB`,
      sub: `${blockUtc} UTC`,
      body: `Average ${fmtUsd(an.bestBlock.avg)} per hour across three consecutive hours.`,
    },
    {
      tag: 'Average volume',
      big: `${fmtUsd(an.avgPerHour)}`,
      sub: 'per hour',
      body: `${fmtUsd(an.totalVol)} total across ${Math.round(an.days)} days — equivalent to ${fmtUsd(an.avgPerHour * 24)} per day.`,
    },
    {
      tag: 'Lowest-volume hour',
      big: `${quietWib} WIB`,
      sub: `${hourRange(an.quiet.utc)} UTC`,
      body: `${fmtUsd(an.quiet.avg)} per hour. Peak-to-quiet ratio: ${an.peakRatio.toFixed(1)}×.`,
    },
    {
      tag: 'Highest-volume session',
      big: topSession.label.replace(' session', ''),
      sub: `${pad2(topSession.wibStart)}:00–${pad2(topSession.wibEnd)}:00 WIB`,
      body: `${(topSession.share * 100).toFixed(0)}% of daily volume, averaging ${fmtUsd(topSession.avg)} per hour.`,
    },
    {
      tag: 'Highest-volume day',
      big: DOW_ID[an.bestDay.dow],
      sub: `${fmtUsd(an.bestDay.avg)} / hour`,
      body: wkDelta >= 0
        ? `Weekdays average ${fmtPct(wkDelta, 0)} versus weekends.`
        : `Weekends average ${fmtPct(-wkDelta, 0)} versus weekdays.`,
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
    el('th', { scope: 'col' }, 'Session'),
    el('th', { scope: 'col' }, 'WIB'),
    el('th', { scope: 'col' }, 'UTC'),
    el('th', { scope: 'col', class: 'r' }, 'Average/hour'),
    el('th', { scope: 'col', class: 'r' }, 'Share'),
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
      'Session windows overlap (Europe 14:00–23:00 WIB, US 20:00–04:00 WIB), so their shares can sum above 100%.'));
}

function renderCoinHourTable(an) {
  const h = $('coinHourTable');
  h.innerHTML = '';
  const t = el('table', { class: 'data-table compact' });
  t.append(el('thead', {}, el('tr', {},
    el('th', { scope: 'col' }, 'Coin'),
    el('th', { scope: 'col' }, 'Peak hour · WIB'),
    el('th', { scope: 'col' }, 'UTC'),
    el('th', { scope: 'col', class: 'r' }, 'Average/hour'),
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
      `Unavailable on ${state.candleProvider}: ${state.candleFailed.map((f) => f.key).join(', ')}.`));
  }
}

function renderHourTable(an) {
  const h = $('hourTable');
  h.innerHTML = '';
  const t = el('table', { class: 'data-table compact' });
  t.append(el('caption', {}, 'Average volume by hour, ordered by WIB'));
  t.append(el('thead', {}, el('tr', {},
    el('th', { scope: 'col' }, 'WIB'),
    el('th', { scope: 'col' }, 'UTC'),
    el('th', { scope: 'col', class: 'r' }, 'Average'),
    el('th', { scope: 'col', class: 'r' }, 'Median'),
    el('th', { scope: 'col', class: 'r' }, 'High'),
    el('th', { scope: 'col', class: 'r' }, 'vs average'),
    el('th', { scope: 'col', class: 'r' }, 'Share'),
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
    `${hourRange(an.peak.utc)} UTC · ${fmtUsd(an.peak.avg)}/hour · ${fmtPct(an.peak.vsAvg * 100, 0)} vs average`;
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
      el('img', {
        class: 'row-logo',
        src: coin.image,
        alt: '',
        width: '24',
        height: '24',
        loading: 'lazy',
        decoding: 'async',
      }),
      el('span', { class: 'leader-name' },
        el('strong', {}, coin.sym),
        el('small', {}, coin.name),
      ),
      el('span', { class: 'leader-mcap' },
        el('small', {}, 'Market cap'),
        el('strong', { class: 'num' }, fmtUsd(coin.mcap)),
      ),
      el('strong', { class: `leader-change num ${coin.ch24h >= 0 ? 'up' : 'down'}` }, fmtPct(coin.ch24h, 1)),
    ));
  });
}

function renderMemeMarketShare() {
  const market = state.memeMarket;
  const holder = $('memeMarketShare');
  if (!holder || !market) return;
  const total = market.marketCapUsd;
  const ranked = [...state.coins]
    .filter((coin) => Number.isFinite(coin.mcap) && coin.mcap > 0)
    .sort((a, b) => b.mcap - a.mcap)
    .slice(0, 6);
  const covered = ranked.reduce((sum, coin) => sum + coin.mcap, 0);
  const rest = Number.isFinite(total) ? Math.max(total - covered, 0) : 0;
  const segments = [
    ...ranked.map((coin) => ({ label: coin.sym, value: coin.mcap })),
    ...(rest > 0 ? [{ label: 'Rest', value: rest }] : []),
  ];
  const denominator = Number.isFinite(total) && total > 0 ? total : covered;

  $('memeMarketCap').textContent = fmtUsd(total);
  $('memeMarketChange').textContent = Number.isFinite(market.change24h)
    ? `${fmtPct(market.change24h, 1)} · 24h`
    : market.coverage;
  $('memeMarketDominance').textContent = Number.isFinite(market.shareOfCrypto)
    ? `${market.shareOfCrypto.toFixed(2)}%`
    : 'Unavailable';
  $('memeMarketCoverage').textContent = market.isCategoryTotal
    ? 'Share of total crypto market cap'
    : `Partial · ${market.coverage}`;

  holder.replaceChildren(
    el('div', { class: 'market-share-bar', role: 'img', 'aria-label': 'Memecoin market-cap share by token' },
      ...segments.map((segment, index) => el('span', {
        class: `market-share-segment market-share-${Math.min(index + 1, 7)}`,
        style: `--share:${denominator > 0 ? (segment.value / denominator) * 100 : 0}%`,
        title: `${segment.label}: ${fmtUsd(segment.value)}`,
      })),
    ),
    el('div', { class: 'market-share-legend' },
      ...segments.map((segment, index) => el('span', {},
        el('i', { class: `market-share-key market-share-${Math.min(index + 1, 7)}` }),
        el('strong', {}, segment.label),
        el('small', { class: 'num' }, `${denominator > 0 ? ((segment.value / denominator) * 100).toFixed(1) : '0.0'}%`),
      )),
    ),
  );
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
    { tag: 'Memecoin volume · 24h', big: fmtUsd(totalVol), sub: `top ${top.length} coins`,
      body: `24h volume-to-market-cap ratio: ${(turnover * 100).toFixed(1)}% of ${fmtUsd(totalMcap)}.` },
    { tag: 'Largest volume', big: leader.sym, sub: fmtUsd(leader.vol),
      body: `${leader.name}: ${((leader.vol / totalVol) * 100).toFixed(1)}% of basket volume. Top three: ${(top3Share * 100).toFixed(0)}%.` },
    { tag: `Strongest gain · ${field.label}`, big: best ? best.sym : '—', sub: best ? fmtPct(best[field.key]) : '—',
      body: best ? `${best.name} at ${fmtPrice(best.price)}, volume ${fmtUsd(best.vol)}.` : 'Change data unavailable.' },
    { tag: `Deepest drop · ${field.label}`, big: worst ? worst.sym : '—', sub: worst ? fmtPct(worst[field.key]) : '—',
      body: worst ? `${worst.name} at ${fmtPrice(worst.price)}, volume ${fmtUsd(worst.vol)}.` : 'Change data unavailable.' },
    { tag: 'Coins up', big: `${gainers}/${withCh.length}`, sub: `over ${field.label}`,
      body: `${gainers} of ${withCh.length} coins recorded a positive ${field.label} change.` },
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
      `Market cap ${fmtUsd(g.mcapUsd)} (${fmtPct(g.mcapChange24h, 1)} · 24h) · BTC dominance ${g.btcDom.toFixed(1)}%`;
  }
  if (agg) {
    const t = agg.rows[0];
    $('kpiTopPlace').textContent = t.name;
    $('kpiTopSub').textContent =
      `${fmtUsd(t.volUsd)} · ${(t.share * 100).toFixed(1)}% of mapped volume · ${t.count} exchanges`;
    $('kpiAvgEx').textContent = fmtUsd(agg.avgPerExchange);
    $('kpiAvgExSub').textContent =
      `${fmtNum(agg.exchangeCount)} exchanges · ${agg.rows.length} jurisdictions · top ${agg.top80} = 80% of volume`;
  }
}

/* ============================================================
   Boot
   ============================================================ */

async function boot({ force = false } = {}) {
  status('Loading market data…', 'busy');

  /* Peta bisa digambar segera setelah geometri siap */
  const geoP = fetchWorldTopo()
    .then((topo) => { map.setTopology(topo); })
    .catch((e) => {
      $('mapLoading').innerHTML = `<span class="error">Map geometry could not load: ${escapeHtml(e.message)}</span>`;
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
    .catch((e) => { console.warn('memecoin request failed', e); state.coins = []; });

  const globalP = fetchGlobal({ force })
    .then((g) => { state.global = g; })
    .catch(() => { state.global = null; });
  const memeMarketP = fetchMemeMarket({ force })
    .then((market) => { state.memeMarket = market; })
    .catch(() => { state.memeMarket = null; });

  try {
    await Promise.all([geoP, marketP]);
    renderMapSection();
  } catch (e) {
    console.error(e);
    status(`Some market data could not load: ${e.message}`, 'err');
  }

  await Promise.allSettled([coinsP, globalP, memeMarketP]);
  updateTopKpi();
  if (state.coins.length) {
    renderMemeSection();
    renderMemeMarketShare();
  }
  else $('treemap').innerHTML = '<p class="error">Memecoin data is temporarily unavailable. The source may be rate limited.</p>';

  $('footUpdated').textContent = fmtClock(Date.now());
  status('Market data ready', 'ok', `BTC ${fmtPrice(state.btcPrice)}`);

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
    status(`Could not load: ${e.message}`, 'err');
  });

  /* Pembaruan senyap di latar. Jarak tiap sumber dipisah agar batas rate
     CoinGecko gratis tidak tertabrak; kline jauh lebih jarang karena
     analisa jam memakai jendela 30 hari yang praktis tidak berubah. */
  startAutoRefresh([
    {
      every: 10 * 1000,
      run: async () => {
        const [g, coins, market, btc, exchanges] = await Promise.all([
          fetchGlobal({ force: true }),
          fetchMemecoins({ limit: 100, force: true }),
          fetchMemeMarket({ force: true }),
          fetchBtcPrice({ force: true }),
          fetchExchanges({ pages: 2, force: true }),
        ]);
        const nextStamp = `${g?.mcapUsd || 0}:${coins[0]?.price || 0}:${market?.marketCapUsd || 0}:${exchanges[0]?.volBtc || 0}`;
        if (state.overviewStamp === nextStamp) return;
        state.overviewStamp = nextStamp;
        state.global = g;
        state.coins = coins;
        state.memeMarket = market;
        state.btcPrice = btc;
        state.agg = aggregateJurisdictions(exchanges, btc);
        updateTopKpi();
        renderMemeSection();
        renderMemeMarketShare();
        renderMapSection();
        $('footUpdated').textContent = fmtClock(Date.now());
      },
    },
    { every: 10 * 60 * 1000, run: () => loadHours({ force: true }) },
  ]);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
