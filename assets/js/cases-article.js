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
import { startAutoRefresh } from './autorefresh.js';

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
  if (m && Number.isFinite(m.ath) && m.athDate) {
    parts.push(`ATH: ${fmtPrice(m.ath)} on ${fmtDate(Date.parse(m.athDate))}.`);
    parts.push(`Launch → ATH: ${fmtDuration(days)}.`);
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
    factRow('ATH', Number.isFinite(m?.ath) && m?.athDate ? `${fmtPrice(m.ath)} · ${fmtDate(Date.parse(m.athDate))}` : 'Unavailable'),
    factRow('Launch → ATH', fmtDuration(days)),
    factRow('Current price', m
      ? `${fmtPrice(m.price)}${Number.isFinite(m.athPct) ? ` (${fmtPct(m.athPct, 1)} from ATH)` : ''}`
      : '—'),
    factRow('Market cap', m ? fmtUsd(m.mcap) : '—'),
    factRow('24h volume', m ? fmtUsd(m.vol) : '—'),
    factRow('Chart multiple', multiple ? `${fmtNum(Math.round(multiple))}× from first weekly close` : '—'),
    factRow('Chart data', weekly ? `${weekly.provider}, since ${fmtDate(weekly.rows[0].t)}` : 'loading…'),
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

function renderIdentityAndSources() {
  const identity = $('caseIdentity');
  identity.replaceChildren(
    el('div', { class: 'identity-item' },
      el('span', {}, 'Creator / issuer'),
      el('strong', {}, caseDef.creator),
    ),
    ...caseDef.contracts.map((contract) => el('div', { class: 'identity-item' },
      el('span', {}, `${contract.network} contract`),
      contract.address
        ? el('a', { href: contract.explorer, target: '_blank', rel: 'noreferrer' }, contract.address)
        : el('strong', {}, contract.note),
    )),
  );

  const sources = $('caseSources');
  sources.replaceChildren(
    el('a', { class: 'source-link', href: caseDef.officialX, target: '_blank', rel: 'noreferrer' },
      el('strong', {}, 'Official X'),
      el('span', {}, new URL(caseDef.officialX).pathname),
    ),
    el('a', { class: 'source-link', href: caseDef.officialSite, target: '_blank', rel: 'noreferrer' },
      el('strong', {}, 'Official site'),
      el('span', {}, new URL(caseDef.officialSite).hostname),
    ),
    el('a', { class: 'source-link', href: caseDef.coingecko, target: '_blank', rel: 'noreferrer' },
      el('strong', {}, 'CoinGecko'),
      el('span', {}, 'price, market cap, and ATH'),
    ),
    ...caseDef.contracts.map((contract) => el('a', {
      class: 'source-link',
      href: contract.explorer,
      target: '_blank',
      rel: 'noreferrer',
    }, el('strong', {}, `${contract.network} explorer`), el('span', {}, contract.address || 'native chain'))),
  );
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
  renderIdentityAndSources();
  renderSummary();
  renderFacts();

  $('caseChart').replaceChildren(el('div', { class: 'chart-loading' },
    el('span', { class: 'spinner' }), ` Loading weekly ${caseDef.sym} candles…`));

  const marketsP = refreshMarkets()
    .catch((e) => console.warn('market snapshot:', e.message));

  try {
    state.weekly = await fetchWeekly(caseDef);
    renderChartSection();
  } catch (e) {
    $('caseChart').replaceChildren(el('p', { class: 'error' }, `Chart could not load: ${e.message}`));
  }

  await marketsP;
  renderFacts();
  setStatus('Case data ready', 'ok');
}

function init() {
  if (!caseDef) {
    setStatus('Unknown token', 'err');
    return;
  }

  document.title = `${caseDef.name} (${caseDef.sym}) — Memecoin Case Study`;
  $('tokenName').textContent = caseDef.name;
  $('tokenSym').textContent = caseDef.sym;
  $('tokenYear').textContent = caseDef.launch.slice(0, 4);
  const img = $('tokenLogo');
  img.src = caseDef.logo;
  img.alt = `${caseDef.name} logo`;

  load().catch((e) => {
    console.error(e);
    setStatus(`Could not load: ${e.message}`, 'err');
  });

  /* Refresh senyap: snapshot pasar tiap 60 detik; kline mingguan tiap 6 jam
     (data mingguan nyaris tidak berubah dalam hitungan menit). */
  startAutoRefresh([
    { every: 10 * 1000, run: () => refreshMarkets({ force: true }) },
    {
      every: 6 * 3600 * 1000,
      run: async () => {
        state.weekly = await fetchWeekly(caseDef, { force: true });
        renderChartSection();
      },
    },
  ]);
  window.addEventListener('themechange', renderChartSection);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
