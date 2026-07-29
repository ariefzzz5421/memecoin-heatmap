import { fmtClock, fmtPct, fmtPrice, fmtUsd, el } from './utils.js';
import { startAutoRefresh } from './autorefresh.js';

const $ = (id) => document.getElementById(id);

function setStatus(text, kind = 'busy') {
  $('statusText').textContent = text;
  $('statusDot').className = `dot ${kind}`;
}

async function fetchRecords() {
  const response = await fetch(`/api/market?resource=meme2026&t=${Math.floor(Date.now() / 10_000)}`, {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Backend HTTP ${response.status}`);
  const data = await response.json();
  if (!data?.ok) throw new Error(data?.error || 'Research records are unavailable');
  return data;
}

function metric(label, value) {
  return el('div', { class: 'breakout-metric' },
    el('span', {}, label),
    el('strong', { class: 'num' }, value),
  );
}

function sourceLink(label, url) {
  return el('a', {
    class: 'source-button',
    href: url,
    target: '_blank',
    rel: 'noreferrer',
  }, label);
}

function renderCard(event) {
  const current = event.current;
  const social = event.officialX
    ? sourceLink(event.socialLabel || 'Official X', event.officialX)
    : el('span', { class: 'source-button', title: event.socialNote || 'No verified account found' }, 'Official X unavailable');

  return el('article', { class: 'breakout-card' },
    el('div', { class: 'breakout-head' },
      el('img', {
        class: 'breakout-logo',
        src: current?.image || '/assets/img/brand/heatmap-volume-mark.png',
        alt: `${event.name} logo`,
        width: '52',
        height: '52',
        loading: 'lazy',
      }),
      el('div', { class: 'breakout-title' },
        el('p', { class: 'eyebrow' }, event.launchCohort),
        el('h3', {}, `${event.name} · ${event.symbol}`),
        el('p', {}, `${event.chain} · crossed ${event.crossedAt}`),
      ),
      el('span', { class: 'pill' }, 'Verified event'),
    ),
    el('div', { class: 'breakout-metrics' },
      metric('Documented peak', fmtUsd(event.documentedPeak, 0)),
      metric('Current market cap', current ? fmtUsd(current.mcap) : 'Unavailable'),
      metric('Current price', current ? `${fmtPrice(current.price)} · ${fmtPct(current.ch24h, 1)}` : 'Unavailable'),
    ),
    el('p', { class: 'breakout-note' }, event.note),
    el('div', { class: 'identity-grid' },
      el('div', { class: 'identity-item' }, el('span', {}, 'Contract creator / issuer'), el('strong', {}, event.creator)),
      el('div', { class: 'identity-item' }, el('span', {}, 'Launch date'), el('strong', {}, event.launchAt)),
    ),
    el('p', { class: 'contract-line' }, event.contract),
    el('div', { class: 'breakout-sources' },
      sourceLink('CoinGecko', event.coingecko),
      sourceLink('Contract explorer', event.explorer),
      social,
      ...event.evidence.map((item) => sourceLink(item.label, item.url)),
    ),
  );
}

function render(data) {
  $('verifiedCount').textContent = String(data.events.length);
  $('updatedAt').textContent = fmtClock(data.fetchedAt);
  $('researchState').textContent = data.warning
    ? `${data.warning}. Historical evidence remains available below.`
    : `Live snapshots checked. ${data.events.length} threshold events meet the stated public-source method.`;
  $('breakoutList').replaceChildren(...data.events.map(renderCard));
  setStatus(data.partial ? 'Verified records ready · live snapshots partial' : 'Verified records ready', data.partial ? 'busy' : 'ok');
}

async function load() {
  setStatus('Loading verified records…', 'busy');
  render(await fetchRecords());
}

function showError(error) {
  console.error(error);
  setStatus('Research records could not load', 'err');
  $('breakoutList').replaceChildren(el('p', { class: 'error' }, error.message));
}

function init() {
  load().catch(showError);
  startAutoRefresh([{ every: 10_000, run: async () => render(await fetchRecords()) }]);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
