/* ============================================================
   cases-article.js — halaman artikel per token.
   Token ditentukan oleh <body data-case="slug">.
   Susunan: logo + judul, ringkasan terhitung (launch, ATH,
   durasi), artikel, chart mingguan, fakta, katalis.
   ============================================================ */

import { CASE_BY_SLUG } from './cases-config.js';
import { fetchCaseMarkets, fetchHistory, fetchWeekly } from './cases-data.js';
import { renderWeeklyTable, fmtDate, fmtDuration, DAY } from './cases-chart.js';
import { renderMarketHistoryChart } from './market-history-chart.js';
import { brandedSourceLink } from './source-brands.js';
import { fmtUsd, fmtPrice, fmtPct, fmtClock, el } from './utils.js';
import { startAutoRefresh } from './autorefresh.js';

const $ = (id) => document.getElementById(id);

const slug = document.body.dataset.case;
const caseDef = CASE_BY_SLUG[slug];

const state = { m: null, weekly: null, history: null };

function setStatus(text, kind = 'busy') {
  $('statusText').textContent = text;
  $('statusDot').className = `dot ${kind}`;
}

function launchToAthDays(m) {
  const athTimestamp = m?.athDate
    ? Date.parse(m.athDate)
    : state.history?.milestones?.ath?.t;
  if (!Number.isFinite(athTimestamp)) return null;
  return (athTimestamp - Date.parse(caseDef.launch)) / DAY;
}

/* Ringkasan terhitung di bawah judul: launch, ATH, durasi. */
function renderSummary() {
  const m = state.m;
  const days = launchToAthDays(m);
  const historyAth = state.history?.milestones?.ath;
  const athPrice = Number.isFinite(m?.ath) ? m.ath : historyAth?.price;
  const athTimestamp = m?.athDate ? Date.parse(m.athDate) : historyAth?.t;
  const parts = [`Launch: ${fmtDate(Date.parse(caseDef.launch))} (${caseDef.launchNote}).`];
  if (Number.isFinite(athPrice) && Number.isFinite(athTimestamp)) {
    parts.push(`ATH: ${fmtPrice(athPrice)} on ${fmtDate(athTimestamp)}.`);
    parts.push(`Launch → ATH: ${fmtDuration(days)}.`);
  }
  $('articleSummary').textContent = parts.join(' ');
}

function factRow(label, value, note = '', emphasis = false) {
  return el('div', { class: `stat${emphasis ? ' is-emphasis' : ''}` },
    el('span', { class: 'stat-l' }, label),
    el('span', { class: 'stat-v num' }, value),
    note ? el('small', {}, note) : null,
  );
}

function renderFacts() {
  const m = state.m;
  const days = launchToAthDays(m);
  const historyAth = state.history?.milestones?.ath;
  const athPrice = Number.isFinite(m?.ath) ? m.ath : historyAth?.price;
  const athTimestamp = m?.athDate ? Date.parse(m.athDate) : historyAth?.t;
  const launch = state.history?.milestones?.launch;
  const launchPrice = Number.isFinite(launch?.price) ? fmtPrice(launch.price) : 'Unavailable';
  const launchMcap = Number.isFinite(launch?.mcap) ? fmtUsd(launch.mcap) : 'Unavailable';

  $('caseFacts').replaceChildren(
    factRow('Launch date', fmtDate(Date.parse(caseDef.launch)), caseDef.launchNote, true),
    factRow('Launch price', launchPrice, launch?.source || 'No public snapshot returned'),
    factRow('Launch market cap', launchMcap, launch?.source || 'No public snapshot returned'),
    factRow('ATH', Number.isFinite(athPrice) ? fmtPrice(athPrice) : 'Unavailable',
      Number.isFinite(athTimestamp) ? `${fmtDate(athTimestamp)} · ${fmtDuration(days)} after launch` : ''),
    factRow('Current price', m ? fmtPrice(m.price) : 'Unavailable',
      Number.isFinite(m?.athPct) ? `${fmtPct(m.athPct, 1)} from ATH` : ''),
    factRow('Current market cap', m ? fmtUsd(m.mcap) : 'Unavailable'),
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

  const definitions = [
    { label: 'Official X', url: caseDef.officialX, note: new URL(caseDef.officialX).pathname },
    {
      label: 'Official site',
      url: caseDef.officialSite,
      note: new URL(caseDef.officialSite).hostname,
      logo: caseDef.logo,
    },
    { label: 'CoinGecko', url: caseDef.coingecko, note: 'current market and ATH' },
    ...caseDef.contracts.map((contract) => ({
      label: `${contract.network} explorer`,
      url: contract.explorer,
      note: contract.address ? 'verified contract' : 'native chain',
    })),
    ...(state.history?.sources || []).map((source) => ({
      ...source,
      note: source.label.includes('Yahoo') ? 'daily price history' : 'historical market data',
    })),
  ].filter((source, index, rows) =>
    source.url && rows.findIndex((item) => item.url === source.url) === index);
  $('caseSources').replaceChildren(...definitions.map((source) => brandedSourceLink(source)));
}

function renderChartSection() {
  if (state.history) {
    const history = Number.isFinite(state.m?.ath) && state.m?.athDate
      ? {
          ...state.history,
          milestones: {
            ...state.history.milestones,
            ath: {
              t: Date.parse(state.m.athDate),
              price: state.m.ath,
              source: 'CoinGecko',
            },
          },
        }
      : state.history;
    renderMarketHistoryChart($('caseChart'), history, {
      launchAt: caseDef.launch,
      symbol: caseDef.sym,
    });
  }
  if (state.weekly) renderWeeklyTable($('caseWeeklyTable'), caseDef, state.weekly);
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
    el('span', { class: 'spinner' }), ` Loading ${caseDef.sym} history…`));

  const marketsP = refreshMarkets()
    .catch((e) => console.warn('market snapshot:', e.message));

  const [historyResult, weeklyResult] = await Promise.allSettled([
    fetchHistory(caseDef),
    fetchWeekly(caseDef),
  ]);
  if (historyResult.status === 'fulfilled') {
    state.history = historyResult.value;
  } else {
    $('caseChart').replaceChildren(el('p', { class: 'error' },
      `Historical chart is unavailable: ${historyResult.reason.message}`));
  }
  if (weeklyResult.status === 'fulfilled') {
    state.weekly = weeklyResult.value;
  } else {
    $('caseWeeklyTable').replaceChildren(el('p', { class: 'error' },
      `Weekly source is unavailable: ${weeklyResult.reason.message}`));
  }

  await marketsP;
  renderChartSection();
  renderFacts();
  renderIdentityAndSources();
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

  /* Current values refresh silently; historical series use their natural
     daily/weekly cadence instead of hammering public APIs. */
  startAutoRefresh([
    { every: 10 * 1000, run: () => refreshMarkets({ force: true }) },
    {
      every: 60 * 60 * 1000,
      run: async () => {
        state.history = await fetchHistory(caseDef, { force: true });
        renderChartSection();
        renderFacts();
        renderIdentityAndSources();
      },
    },
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
