import { fetchPlatformPulse } from './sentiment-data.js';
import { fmtUsd, fmtPct, fmtClock, el } from './utils.js';
import { startAutoRefresh } from './autorefresh.js';
import { brandedSourceLink } from './source-brands.js';

const $ = (id) => document.getElementById(id);

function setStatus(text, kind = 'busy') {
  $('statusText').textContent = text;
  $('statusDot').className = `dot ${kind}`;
}

function metricValue(metric) {
  return Number.isFinite(metric?.total24h) ? fmtUsd(metric.total24h) : 'Unavailable';
}

function metricChange(metric) {
  return Number.isFinite(metric?.change1d) ? fmtPct(metric.change1d, 1) : '—';
}

function trendClass(value) {
  if (!Number.isFinite(value)) return 'muted';
  if (value > 0.05) return 'up';
  if (value < -0.05) return 'down';
  return 'muted';
}

function renderSummary(data) {
  const totalVolume = data.platforms.reduce((sum, platform) => sum + (platform.volume?.total24h || 0), 0);
  const totalRevenue = data.platforms.reduce((sum, platform) => sum + (platform.revenue?.total24h || 0), 0);
  const volumeCoverage = data.platforms.filter((platform) => Number.isFinite(platform.volume?.total24h)).length;
  const revenueCoverage = data.platforms.filter((platform) => Number.isFinite(platform.revenue?.total24h)).length;

  $('totalVolume').textContent = fmtUsd(totalVolume);
  $('totalVolumeSub').textContent = `${volumeCoverage}/${data.platforms.length} platforms indexed`;
  $('totalRevenue').textContent = fmtUsd(totalRevenue);
  $('totalRevenueSub').textContent = `${revenueCoverage}/${data.platforms.length} platforms indexed`;
  $('hotChain').textContent = data.hottestChain?.name || '—';
  $('hotChainSub').textContent = data.hottestChain
    ? `${fmtUsd(data.hottestChain.volume24h)} tracked volume`
    : 'Chain breakdown unavailable';
  $('coverage').textContent = `${volumeCoverage} volume · ${revenueCoverage} revenue`;
}

function renderPlatforms(data) {
  const grid = $('platformGrid');
  grid.replaceChildren();
  const maxVolume = Math.max(...data.platforms.map((platform) => platform.volume?.total24h || 0), 1);
  const maxRevenue = Math.max(...data.platforms.map((platform) => platform.revenue?.total24h || 0), 1);

  for (const platform of data.platforms) {
    const volumeWidth = ((platform.volume?.total24h || 0) / maxVolume) * 100;
    const revenueWidth = ((platform.revenue?.total24h || 0) / maxRevenue) * 100;
    const chains = [...new Set([
      ...(platform.volume?.chains || []),
      ...(platform.revenue?.chains || []),
    ])];

    const card = el('article', { class: 'platform-card' },
      el('div', { class: 'platform-card-head' },
        el('div', { class: 'platform-ident' },
          platform.logo
            ? el('img', { class: 'platform-logo', src: platform.logo, alt: `${platform.name} logo`, loading: 'lazy', width: '38', height: '38' })
            : null,
          el('div', {},
            el('span', { class: 'platform-kicker' }, platform.category || 'Platform'),
            el('h2', {}, platform.name),
          ),
        ),
        el('span', { class: `pulse-badge ${platform.momentum.key}` }, platform.momentum.label),
      ),
      el('div', { class: 'platform-metrics' },
        metricBlock('Volume · 24h', metricValue(platform.volume), metricChange(platform.volume), platform.volumeNote),
        metricBlock('Revenue · 24h', metricValue(platform.revenue), metricChange(platform.revenue), platform.revenueNote),
      ),
      el('div', { class: 'metric-bars', 'aria-label': `${platform.name} relative comparison` },
        barRow('Volume', volumeWidth, platform.accent),
        barRow('Revenue', revenueWidth, 'var(--warn)'),
      ),
      el('p', { class: 'platform-chains' },
        chains.length ? `Chains: ${chains.join(' · ')}` : 'Chain breakdown unavailable',
      ),
    );
    grid.append(card);
  }
}

function metricBlock(label, value, change, note) {
  const changeValue = Number.parseFloat(change);
  return el('div', { class: 'platform-metric', title: note },
    el('span', { class: 'metric-label' }, label),
    el('strong', { class: 'metric-value num' }, value),
    el('span', { class: `metric-change ${trendClass(changeValue)}` }, `${change} vs previous 24h`),
  );
}

function barRow(label, width, color) {
  return el('div', { class: 'metric-bar-row' },
    el('span', {}, label),
    el('div', { class: 'metric-bar-track' },
      el('span', { style: { width: `${Math.max(width, width > 0 ? 2 : 0)}%`, background: color } }),
    ),
  );
}

function renderChains(data) {
  const table = el('table', { class: 'data-table' });
  table.append(el('thead', {}, el('tr', {},
    el('th', {}, '#'),
    el('th', {}, 'Chain'),
    el('th', { class: 'r' }, '24h volume'),
    el('th', { class: 'r' }, '24h revenue'),
    el('th', {}, 'Covered platforms'),
  )));
  const body = el('tbody');
  data.chains.forEach((chain, index) => {
    body.append(el('tr', { class: index === 0 ? 'is-peak' : '' },
      el('td', { class: 'muted' }, String(index + 1)),
      el('td', {},
        el('span', { class: 'chain-cell' },
          chain.logo
            ? el('img', { class: 'chain-logo', src: chain.logo, alt: '', width: '24', height: '24', loading: 'lazy' })
            : null,
          chain.sourceUrl
            ? el('a', { class: 'table-link', href: chain.sourceUrl, target: '_blank', rel: 'noreferrer' }, chain.name)
            : el('strong', {}, chain.name),
          index === 0 ? el('span', { class: 'pill chain-hot' }, '#1 volume') : null,
        ),
      ),
      el('td', { class: 'r num' }, fmtUsd(chain.volume24h)),
      el('td', { class: 'r num' }, fmtUsd(chain.revenue24h)),
      el('td', { class: 'muted chain-platforms' }, chain.platforms.join(', ')),
    ));
  });
  table.append(body);
  $('chainTable').replaceChildren(table);
}

function renderCoverage(data) {
  const unavailable = data.platforms.flatMap((platform) => {
    const items = [];
    if (!platform.volume) items.push(`${platform.name}: volume protocol`);
    if (!platform.revenue) items.push(`${platform.name}: revenue`);
    return items;
  });
  $('coverageNote').textContent = unavailable.length
    ? `Not estimated because the source has not indexed: ${unavailable.join('; ')}.`
    : 'All requested metrics are available from the source.';
}

function renderSources() {
  const definitions = [
    {
      label: 'DeFiLlama',
      url: 'https://defillama.com/',
      note: 'protocol volume and revenue',
    },
    {
      label: 'BNB Chain',
      url: 'https://www.bnbchain.org/en/brand-guidelines',
      note: 'official brand source',
      logo: '/assets/img/chains/bnb.svg',
    },
    {
      label: 'Monad',
      url: 'https://www.monad.xyz/',
      note: 'official brand source',
      logo: '/assets/img/chains/monad.svg',
    },
    {
      label: 'MegaETH',
      url: 'https://www.megaeth.com/brand-kit',
      note: 'official brand kit',
      logo: '/assets/img/chains/megaeth.svg',
    },
  ];
  $('sentimentSources').replaceChildren(...definitions.map((source) => brandedSourceLink(source)));
}

async function load({ force = false } = {}) {
  setStatus('Loading platform volume and revenue…', 'busy');
  const data = await fetchPlatformPulse({ force });
  renderSummary(data);
  renderPlatforms(data);
  renderChains(data);
  renderCoverage(data);
  $('updatedAt').textContent = fmtClock(data.fetchedAt);
  $('cacheState').textContent = data.cached ? 'backend cache' : 'fresh response';
  setStatus('Platform metrics ready', 'ok');
}

function init() {
  renderSources();
  load().catch(showError);

  /* Metrik DeFiLlama diperbarui harian di sumbernya; 60 detik sudah lebih
     dari cukup dan tidak membebani API. */
  startAutoRefresh([
    {
      every: 10 * 1000,
      run: async () => {
        const data = await fetchPlatformPulse({ force: true });
        renderSummary(data);
        renderPlatforms(data);
        renderChains(data);
        renderCoverage(data);
        $('updatedAt').textContent = fmtClock(data.fetchedAt);
        $('cacheState').textContent = 'fresh response';
      },
    },
  ]);
}

function showError(error) {
  console.error(error);
  setStatus('Platform data could not load', 'err');
  $('platformGrid').innerHTML = `<p class="error">The data source could not be reached: ${error.message}</p>`;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
