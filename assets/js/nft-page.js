/* NFT route index — the research set filtered by the 0.5 ETH floor rule. */

import { NFT_CASES, NFT_UPDATES, FLOOR_THRESHOLD_ETH, RESEARCH_CUTOFF } from './nft-config.js';
import { fetchNftFloors, fmtEth, fmtResearchDate } from './nft-data.js';
import { fmtUsd, fmtPct, fmtClock, el } from './utils.js';
import { startAutoRefresh } from './autorefresh.js';

const $ = (id) => document.getElementById(id);

function setStatus(text, kind = 'busy') {
  $('statusText').textContent = text;
  $('statusDot').className = `dot ${kind}`;
}

function liveFor(snapshot, item) {
  return snapshot?.collections?.[item.slug] || null;
}

function card(item, live) {
  const floor = live?.floorNative;
  /* Every researched collection qualified on documented history. The live
     value only reports where the floor sits today; when it is missing the
     badge states the documented position rather than guessing a breach. */
  const thresholdState = Number.isFinite(floor)
    ? (floor >= FLOOR_THRESHOLD_ETH ? 'above' : 'below')
    : 'documented';

  const logo = el('img', {
    class: 'nft-card-logo',
    src: item.logo,
    alt: `${item.name} mark`,
    width: 52,
    height: 52,
    loading: 'lazy',
    decoding: 'async',
  });
  if (live?.image) logo.src = live.image;

  return el('a', { class: 'nft-card', href: `/nft/${item.slug}/` },
    el('div', { class: 'nft-card-head' },
      logo,
      el('div', {},
        el('strong', {}, item.name),
        el('small', {}, `${item.chain} · launched ${fmtResearchDate(item.launch)}`),
      ),
    ),
    el('p', {}, item.narrative),
    el('div', { class: 'nft-card-stats' },
      el('div', {},
        el('span', {}, 'Live floor'),
        el('strong', { class: 'num' }, Number.isFinite(floor) ? fmtEth(floor) : 'Unavailable'),
      ),
      el('div', {},
        el('span', {}, 'Peak floor'),
        el('strong', { class: 'num' }, Number.isFinite(item.peakFloor?.eth)
          ? fmtEth(item.peakFloor.eth, 1)
          : 'Not sourced'),
      ),
      el('div', {},
        el('span', {}, '24h'),
        el('strong', {
          class: `num ${Number.isFinite(live?.floorChange24h) ? (live.floorChange24h >= 0 ? 'up' : 'down') : ''}`,
        }, Number.isFinite(live?.floorChange24h) ? fmtPct(live.floorChange24h, 1) : '—'),
      ),
    ),
    el('span', { class: `nft-flag${thresholdState === 'above' ? ' is-live' : ''}` },
      thresholdState === 'above' ? `Live floor above ${FLOOR_THRESHOLD_ETH} ETH`
        : thresholdState === 'below' ? `Below ${FLOOR_THRESHOLD_ETH} ETH today`
          : `Documented above ${FLOOR_THRESHOLD_ETH} ETH`),
  );
}

function renderGrid(snapshot) {
  const rows = NFT_CASES
    .map((item) => ({ item, live: liveFor(snapshot, item) }))
    .sort((a, b) => {
      const av = a.live?.floorNative ?? a.item.peakFloor?.eth ?? 0;
      const bv = b.live?.floorNative ?? b.item.peakFloor?.eth ?? 0;
      return bv - av;
    });
  $('nftGrid').replaceChildren(...rows.map(({ item, live }) => card(item, live)));

  const withLive = rows.filter(({ live }) => Number.isFinite(live?.floorNative));
  const above = withLive.filter(({ live }) => live.floorNative >= FLOOR_THRESHOLD_ETH);
  const totalMcap = withLive.reduce((sum, { live }) => sum + (live.marketCapUsd || 0), 0);

  $('kpiCollections').textContent = String(NFT_CASES.length);
  $('kpiAbove').textContent = withLive.length
    ? `${above.length} / ${withLive.length}`
    : '—';
  $('kpiAboveSub').textContent = withLive.length
    ? `live floors at or above ${FLOOR_THRESHOLD_ETH} ETH`
    : 'live floor data unavailable right now';
  $('kpiMcap').textContent = totalMcap > 0 ? fmtUsd(totalMcap) : '—';
}

function renderUpdates() {
  $('nftUpdates').replaceChildren(...NFT_UPDATES.map((update) => el('li', { class: 'doc-trigger' },
    el('time', { datetime: update.d }, fmtResearchDate(update.d)),
    el('p', {},
      `${update.t} `,
      el('a', { href: update.url, target: '_blank', rel: 'noreferrer' }, `${update.label} →`),
    ),
  )));
}

async function refresh({ force = false } = {}) {
  const snapshot = await fetchNftFloors({ force });
  renderGrid(snapshot);
  $('updatedAt').textContent = fmtClock(snapshot.fetchedAt);
  setStatus(
    snapshot.partial ? 'Live floors partially available · research remains sourced' : 'Live floors ready',
    snapshot.partial ? 'busy' : 'ok',
  );
}

function init() {
  $('researchCutoff').textContent = fmtResearchDate(RESEARCH_CUTOFF);
  $('thresholdValue').textContent = `${FLOOR_THRESHOLD_ETH} ETH`;
  renderUpdates();
  renderGrid(null);

  refresh().catch((error) => {
    console.warn('NFT floors:', error.message);
    setStatus('Live floor data unavailable · sourced research is still shown', 'err');
  });

  startAutoRefresh([{ every: 60_000, run: () => refresh({ force: true }) }]);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
