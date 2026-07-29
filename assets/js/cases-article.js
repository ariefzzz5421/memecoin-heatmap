/* ============================================================
   cases-article.js — halaman artikel per token.
   Token ditentukan oleh <body data-case="slug">.
   Susunan: logo + judul, ringkasan terhitung (launch, ATH,
   durasi), artikel, chart mingguan, fakta, katalis.
   ============================================================ */

import { CASE_BY_SLUG } from './cases-config.js';
import { fetchCaseMarkets, fetchHistory } from './cases-data.js';
import { fmtDate, fmtDuration, DAY } from './cases-chart.js';
import { renderMarketHistoryChart } from './market-history-chart.js';
import { fetchDexLaunch, renderDexScreenerChart } from './dexscreener.js';
import { brandedSourceLink } from './source-brands.js';
import { fmtUsd, fmtPrice, fmtPct, fmtClock, el } from './utils.js';
import { startAutoRefresh } from './autorefresh.js';

const $ = (id) => document.getElementById(id);

const slug = document.body.dataset.case;
const caseDef = CASE_BY_SLUG[slug];

const state = { m: null, history: null, dexLaunch: null };

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
  const dexPair = state.dexLaunch?.pair;
  const days = launchToAthDays(m);
  const historyAth = state.history?.milestones?.ath;
  const athPrice = Number.isFinite(m?.ath) ? m.ath : historyAth?.price;
  const athTimestamp = m?.athDate ? Date.parse(m.athDate) : historyAth?.t;
  const launch = state.dexLaunch?.launch || state.history?.milestones?.launch;
  const launchPrice = Number.isFinite(launch?.price) ? fmtPrice(launch.price) : 'Unavailable';
  const launchValuation = Number.isFinite(launch?.valuation) ? fmtUsd(launch.valuation) : 'Unavailable';

  $('caseFacts').replaceChildren(
    factRow('Launch date', fmtDate(Date.parse(caseDef.launch)), caseDef.launchNote, true),
    factRow('First 15m close', launchPrice, launch?.source || 'No public 15m candle returned'),
    factRow(
      launch?.metricKind === 'FDV estimate' ? 'First 15m FDV' : 'First 15m mcap proxy',
      launchValuation,
      launch?.methodology || 'No value is interpolated',
    ),
    factRow('ATH', Number.isFinite(athPrice) ? fmtPrice(athPrice) : 'Unavailable',
      Number.isFinite(athTimestamp) ? `${fmtDate(athTimestamp)} · ${fmtDuration(days)} after launch` : ''),
    factRow('Current price', Number.isFinite(m?.price) ? fmtPrice(m.price)
      : Number.isFinite(dexPair?.priceUsd) ? fmtPrice(dexPair.priceUsd) : 'Unavailable',
    Number.isFinite(m?.athPct) ? `${fmtPct(m.athPct, 1)} from ATH` : dexPair ? 'DEX Screener exact pair' : ''),
    factRow('Current market cap', Number.isFinite(m?.mcap) ? fmtUsd(m.mcap)
      : Number.isFinite(dexPair?.marketCap) ? fmtUsd(dexPair.marketCap) : 'Unavailable',
    !m && dexPair ? 'DEX Screener exact pair' : ''),
  );
}

function renderArticle() {
  const holder = $('articleBody');
  holder.replaceChildren(el('h2', {}, 'Launch and market path'));
  for (const para of caseDef.article) holder.append(el('p', {}, para));
  $('caseNarrative').textContent = caseDef.narrative;
  $('caseCrossingReason').textContent = caseDef.crossingReason;
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
    ...(caseDef.researchSources || []),
    ...(caseDef.dexScreener ? [{
      label: 'DEX Screener',
      url: caseDef.dexScreener.url,
      note: `${caseDef.dexScreener.base}/${caseDef.dexScreener.quote} live pair`,
    }] : []),
  ].filter((source, index, rows) =>
    source.url && rows.findIndex((item) => item.url === source.url) === index);
  $('caseSources').replaceChildren(...definitions.map((source) => brandedSourceLink(source)));
}

function renderChartSection() {
  if (state.history) {
    let history = Number.isFinite(state.m?.ath) && state.m?.athDate
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
    if (state.dexLaunch?.launch) {
      history = {
        ...history,
        milestones: {
          ...history.milestones,
          launch: {
            t: state.dexLaunch.launch.t,
            price: state.dexLaunch.launch.price,
            mcap: state.dexLaunch.launch.metricKind === 'market-cap proxy'
              ? state.dexLaunch.launch.valuation
              : null,
            source: state.dexLaunch.launch.source,
          },
        },
        source: { ...history.source, launchMilestones: state.dexLaunch.launch.source },
      };
    }
    renderMarketHistoryChart($('caseChart'), history, {
      launchAt: caseDef.launch,
      symbol: caseDef.sym,
    });
  }
  renderDexScreenerChart(
    $('dexScreenerChart'),
    state.dexLaunch?.pair || caseDef.dexScreener,
    caseDef.name,
    state.dexLaunch,
  );
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

  const historyResult = await Promise.resolve(fetchHistory(caseDef))
    .then((value) => ({ status: 'fulfilled', value }))
    .catch((reason) => ({ status: 'rejected', reason }));
  if (historyResult.status === 'fulfilled') {
    state.history = historyResult.value;
  } else {
    $('caseChart').replaceChildren(el('p', { class: 'error' },
      `Historical chart is unavailable: ${historyResult.reason.message}`));
  }
  await marketsP;
  renderChartSection();
  renderFacts();
  renderIdentityAndSources();
  setStatus('Case data ready', 'ok');

  fetchDexLaunch(caseDef.id)
    .then((value) => {
      state.dexLaunch = value;
      renderFacts();
      renderChartSection();
    })
    .catch((error) => console.warn('DEX launch:', error.message));
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
  ]);
  window.addEventListener('themechange', () => {
    if (!state.history) return;
    renderMarketHistoryChart($('caseChart'), state.history, {
      launchAt: caseDef.launch,
      symbol: caseDef.sym,
    });
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
