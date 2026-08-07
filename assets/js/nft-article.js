/* NFT collection article.

   Layout matches every other case endpoint on the site: official logo centred
   above the headline, then thesis, why it moved, the factors behind it, the
   floor chart, and the dated triggers. */

import { NFT_BY_SLUG, FLOOR_THRESHOLD_ETH } from './nft-config.js';
import { fetchNftFloors, fmtEth, fmtResearchDate } from './nft-data.js';
import { renderFloorChart } from './nft-chart.js';
import { brandedSourceLink } from './source-brands.js';
import { fmtUsd, fmtPct, fmtNum, fmtClock, el } from './utils.js';
import { startAutoRefresh } from './autorefresh.js';

const $ = (id) => document.getElementById(id);
const item = NFT_BY_SLUG[document.body.dataset.nft];
let live = null;

function setStatus(text, kind = 'busy') {
  $('statusText').textContent = text;
  $('statusDot').className = `dot ${kind}`;
}

function metaCard(label, value, emphasis = false) {
  return el('div', { class: emphasis ? 'is-emphasis' : null },
    el('span', {}, label),
    el('strong', { class: 'num' }, value),
  );
}

function renderMeta() {
  const floor = live?.floorNative;
  $('docMeta').replaceChildren(
    metaCard('Launch', fmtResearchDate(item.launch)),
    metaCard('Mint price', item.mint),
    metaCard('Supply', fmtNum(item.supply)),
    metaCard('Peak floor', item.peakFloor?.label || 'Not sourced'),
    metaCard('Live floor', Number.isFinite(floor) ? fmtEth(floor) : 'Unavailable', true),
  );

  const snapshot = $('liveSnapshot');
  if (Number.isFinite(floor)) {
    snapshot.replaceChildren(
      el('span', { class: `nft-flag${floor >= FLOOR_THRESHOLD_ETH ? ' is-live' : ''}` },
        floor >= FLOOR_THRESHOLD_ETH
          ? `Above the ${FLOOR_THRESHOLD_ETH} ETH research threshold`
          : `Below the ${FLOOR_THRESHOLD_ETH} ETH research threshold today`),
      el('span', { class: 'nft-flag' },
        `${fmtEth(floor)}${Number.isFinite(live.floorUsd) ? ` · ${fmtUsd(live.floorUsd, 0)}` : ''}`),
      Number.isFinite(live.floorChange24h)
        ? el('span', { class: `nft-flag ${live.floorChange24h >= 0 ? 'up' : 'down'}` },
          `${fmtPct(live.floorChange24h, 1)} / 24h`)
        : null,
      Number.isFinite(live.marketCapUsd)
        ? el('span', { class: 'nft-flag' }, `${fmtUsd(live.marketCapUsd)} collection cap`)
        : null,
    );
  } else {
    snapshot.replaceChildren(
      el('span', { class: 'nft-flag' },
        `Documented above the ${FLOOR_THRESHOLD_ETH} ETH threshold · live floor unavailable right now`),
    );
  }
}

function renderArticle() {
  $('docKicker').textContent =
    `NFT case study · ${item.chain} · launched ${fmtResearchDate(item.launch)}`;
  $('docTitle').replaceChildren(item.name, el('span', { class: 'doc-sym' }, item.short));
  $('docStandfirst').textContent = item.standfirst;

  $('docThesis').textContent = item.thesis;
  $('docNarrative').textContent = item.narrative;
  $('docWhy').replaceChildren(el('p', {}, item.whyItPumped));

  $('docFactors').replaceChildren(...item.factors.map((factor) => el('li', { class: 'doc-factor' },
    el('strong', {}, factor.label),
    el('span', {}, factor.detail),
  )));

  $('docTriggers').replaceChildren(...item.triggers.map((trigger) => el('li', { class: 'doc-trigger' },
    el('time', { datetime: trigger.d }, fmtResearchDate(trigger.d)),
    el('p', {}, trigger.t),
  )));

  $('docIdentity').replaceChildren(
    el('div', { class: 'identity-item' },
      el('span', {}, 'Creator / issuer'),
      el('strong', {}, item.creator),
    ),
    el('div', { class: 'identity-item' },
      el('span', {}, 'Launch detail'),
      el('strong', {}, item.launchNote),
    ),
    el('div', { class: 'identity-item' },
      el('span', {}, `${item.chain} contract`),
      el('a', { href: item.explorer, target: '_blank', rel: 'noreferrer' }, item.contract),
    ),
    el('div', { class: 'identity-item' },
      el('span', {}, 'Peak floor note'),
      el('strong', {}, item.peakFloor?.note || 'Not sourced'),
    ),
  );

  $('docSources').replaceChildren(...[
    { label: 'Official site', url: item.official, note: new URL(item.official).hostname },
    { label: 'Marketplace', url: item.marketplace, note: 'live collection page' },
    { label: 'Contract explorer', url: item.explorer, note: 'verified contract' },
    ...item.sources.map(([label, url]) => ({ label, url, note: new URL(url).hostname })),
  ].filter((source, index, rows) => rows.findIndex((row) => row.url === source.url) === index)
    .map((source) => brandedSourceLink(source)));
}

function renderChart() {
  renderFloorChart($('floorChart'), item.floorMilestones, {
    liveFloor: live?.floorNative ?? null,
    currency: live?.currency || 'ETH',
  });
}

async function refresh({ force = false } = {}) {
  const snapshot = await fetchNftFloors({ force });
  live = snapshot.collections?.[item.slug] || null;
  if (live?.image) $('docLogo').src = live.image;
  renderMeta();
  renderChart();
  $('updatedAt').textContent = fmtClock(snapshot.fetchedAt);
  setStatus(live ? 'Live floor ready' : 'Live floor unavailable · sourced record shown', live ? 'ok' : 'busy');
}

function init() {
  if (!item) {
    setStatus('Unknown collection', 'err');
    return;
  }
  renderArticle();
  renderMeta();
  renderChart();

  refresh().catch((error) => {
    console.warn('NFT floors:', error.message);
    setStatus('Live floor unavailable · sourced record shown', 'err');
  });

  startAutoRefresh([{ every: 60_000, run: () => refresh({ force: true }) }]);
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderChart, 180);
  });
  window.addEventListener('themechange', renderChart);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
