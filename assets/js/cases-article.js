/* ============================================================
   cases-article.js — halaman artikel per token.
   Token ditentukan oleh <body data-case="slug">.
   Susunan: logo + judul, ringkasan terhitung (launch, ATH,
   durasi), artikel, chart mingguan, fakta, katalis.
   ============================================================ */

import { CASE_BY_SLUG } from './cases-config.js';
import { fetchCaseMarkets, fetchWeekly } from './cases-data.js';
import { renderCaseChart, renderWeeklyTable, fmtDate, fmtDuration, DAY } from './cases-chart.js';
import { fmtUsd, fmtPrice, fmtPct, fmtNum, fmtClock, el } from './utils.js';
import { startAutoRefresh, mountPing } from './autorefresh.js';

const $ = (id) => document.getElementById(id);

const slug = document.body.dataset.case;
const caseDef = CASE_BY_SLUG[slug];

const state = { m: null, weekly: null };

function setStatus(text, kind = 'busy') {
  $('statusText').textContent = text;
  $('statusDot').className = `dot ${kind}`;
}

function launchToAthDays(m) {
  if (!m?.athDate) return null;
  return (Date.parse(m.athDate) - Date.parse(caseDef.launch)) / DAY;
}

/* Ringkasan terhitung di bawah judul: launch, ATH, durasi. */
function renderSummary() {
  const m = state.m;
  const days = launchToAthDays(m);
  const parts = [`Launch: ${fmtDate(Date.parse(caseDef.launch))} (${caseDef.launchNote}).`];
  if (m) {
    parts.push(`ATH: ${fmtPrice(m.ath)} pada ${fmtDate(Date.parse(m.athDate))}.`);
    parts.push(`Waktu launch → ATH: ${fmtDuration(days)}.`);
  }
  $('articleSummary').textContent = parts.join(' ');
}

function factRow(label, value) {
  return el('div', { class: 'stat' },
    el('span', { class: 'stat-l' }, label),
    el('span', { class: 'stat-v num' }, value),
  );
}

function renderFacts() {
  const m = state.m;
  const weekly = state.weekly;
  const days = launchToAthDays(m);
  const first = weekly?.rows?.[0];
  const maxHigh = weekly ? Math.max(...weekly.rows.map((r) => r.h)) : null;
  const multiple = first && maxHigh ? maxHigh / first.c : null;

  $('caseFacts').replaceChildren(
    factRow('Launch', fmtDate(Date.parse(caseDef.launch))),
    factRow('ATH', m ? `${fmtPrice(m.ath)} · ${fmtDate(Date.parse(m.athDate))}` : '—'),
    factRow('Launch → ATH', fmtDuration(days)),
    factRow('Harga sekarang', m ? `${fmtPrice(m.price)} (${fmtPct(m.athPct, 1)} dari ATH)` : '—'),
    factRow('Kapitalisasi', m ? fmtUsd(m.mcap) : '—'),
    factRow('Volume 24 jam', m ? fmtUsd(m.vol) : '—'),
    factRow('Multiple pada chart', multiple ? `${fmtNum(Math.round(multiple))}× dari close minggu pertama` : '—'),
    factRow('Data chart', weekly ? `${weekly.provider}, sejak ${fmtDate(weekly.rows[0].t)}` : 'memuat…'),
  );
}

function renderArticle() {
  const holder = $('articleBody');
  holder.replaceChildren();
  for (const para of caseDef.article) holder.append(el('p', {}, para));
}

function renderCatalysts() {
  const list = $('caseCatalysts');
  list.replaceChildren();
  for (const cat of caseDef.catalysts) {
    list.append(el('li', { class: 'catalyst' },
      el('span', { class: 'catalyst-date num' }, cat.d),
      el('span', { class: 'catalyst-text' }, cat.t),
    ));
  }
  $('caseThesis').textContent = caseDef.thesis;
}

function renderChartSection() {
  if (!state.weekly) return;
  renderCaseChart($('caseChart'), caseDef, state.m, state.weekly, $('caseTip'));
  renderWeeklyTable($('caseWeeklyTable'), caseDef, state.weekly);
}

async function refreshMarkets({ force = false } = {}) {
  const byId = await fetchCaseMarkets({ force });
  state.m = byId[caseDef.id] || null;
  renderSummary();
  renderFacts();
  $('updatedAt').textContent = fmtClock(Date.now());
}

async function load() {
  renderArticle();
  renderCatalysts();
  renderSummary();
  renderFacts();

  $('caseChart').replaceChildren(el('div', { class: 'chart-loading' },
    el('span', { class: 'spinner' }), ` Mengambil kline mingguan ${caseDef.sym}…`));

  const marketsP = refreshMarkets()
    .catch((e) => console.warn('snapshot pasar:', e.message));

  try {
    state.weekly = await fetchWeekly(caseDef);
    renderChartSection();
  } catch (e) {
    $('caseChart').replaceChildren(el('p', { class: 'error' }, `Chart gagal dimuat: ${e.message}`));
  }

  await marketsP;
  renderFacts();
  setStatus('Data siap', 'ok');
}

function init() {
  if (!caseDef) {
    setStatus('Token tidak dikenal', 'err');
    return;
  }

  document.title = `${caseDef.name} (${caseDef.sym}) — Studi Kasus Memecoin`;
  $('tokenName').textContent = caseDef.name;
  $('tokenSym').textContent = caseDef.sym;
  $('tokenYear').textContent = caseDef.launch.slice(0, 4);
  const img = $('tokenLogo');
  img.src = caseDef.logo;
  img.alt = `Logo resmi ${caseDef.name}`;

  load().catch((e) => {
    console.error(e);
    setStatus(`Gagal memuat: ${e.message}`, 'err');
  });

  /* Refresh senyap: snapshot pasar tiap 60 detik; kline mingguan tiap 6 jam
     (data mingguan nyaris tidak berubah dalam hitungan menit). */
  startAutoRefresh([
    { every: 60 * 1000, run: () => refreshMarkets({ force: true }) },
    {
      every: 6 * 3600 * 1000,
      run: async () => {
        state.weekly = await fetchWeekly(caseDef, { force: true });
        renderChartSection();
      },
    },
  ], mountPing());
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
