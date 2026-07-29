import { fmtClock, fmtUsd, el } from './utils.js';
import { startAutoRefresh } from './autorefresh.js';

const $ = (id) => document.getElementById(id);
const CHAIN_LOGOS = {
  Solana: '/assets/img/chains/solana.png',
  'Robinhood Chain': '/assets/img/chains/robinhood.png',
  Base: '/assets/img/chains/base.png',
  Ethereum: '/assets/img/chains/ethereum.png',
  'BNB Chain': '/assets/img/chains/bnb.svg',
};
const TOKEN_LOGOS = {
  'the-white-whale': '/assets/img/coins/the-white-whale.jpg',
  'nietzschean-penguin': '/assets/img/coins/nietzschean-penguin.png',
  'the-black-bull': '/assets/img/coins/the-black-bull.jpg',
  'cash-cat': '/assets/img/coins/cash-cat.jpg',
};

const fmtDate = (value) => new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
}).format(new Date(`${value}T00:00:00Z`));

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

function renderCard(event) {
  const chainLogo = CHAIN_LOGOS[event.chain];

  return el('a', {
    class: 'breakout-preview-card',
    href: `/2026-memecoins/${event.id}/`,
    'aria-label': `Open ${event.name} research`,
  },
    el('div', { class: 'breakout-preview-main' },
      el('img', {
        class: 'breakout-preview-logo',
        src: event.current?.image || TOKEN_LOGOS[event.id] || '/assets/img/brand/memecoin-heatmap-mark.png',
        alt: `${event.name} logo`,
        width: '56',
        height: '56',
        loading: 'lazy',
      }),
      el('div', { class: 'breakout-preview-title' },
        el('p', { class: 'eyebrow' }, event.launchCohort),
        el('h3', {}, event.name),
        el('p', { class: 'chain-label' },
          chainLogo ? el('img', { src: chainLogo, alt: '', width: '18', height: '18' }) : null,
          `${event.symbol} · ${event.chain}`,
        ),
      ),
    ),
    el('div', { class: 'breakout-preview-facts', 'aria-label': 'Key facts' },
      el('div', {},
        el('span', {}, '$100M crossing'),
        el('strong', {}, fmtDate(event.crossedAt)),
      ),
      el('div', {},
        el('span', {}, 'Documented peak'),
        el('strong', { class: 'num' }, fmtUsd(event.documentedPeak, 0)),
      ),
      el('div', {},
        el('span', {}, 'Launch'),
        el('strong', {}, fmtDate(event.launchAt)),
      ),
    ),
    el('span', { class: 'breakout-preview-cta', 'aria-hidden': 'true' }, 'Read research →'),
  );
}

function render(data) {
  $('verifiedCount').textContent = String(data.events.length);
  $('updatedAt').textContent = fmtClock(data.fetchedAt);
  $('researchState').textContent = data.warning
    ? `${data.warning}. Historical evidence remains available in each dossier.`
    : `${data.events.length} threshold events meet the stated public-source method.`;
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
  startAutoRefresh([{
    every: 10_000,
    run: async () => {
      const data = await fetchRecords();
      $('updatedAt').textContent = fmtClock(data.fetchedAt);
    },
  }]);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
