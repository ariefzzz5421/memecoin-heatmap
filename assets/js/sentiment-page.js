import { fetchPlatformPulse, clearPlatformPulseCache } from './sentiment-data.js';
import { fmtUsd, fmtPct, fmtClock, el } from './utils.js';
import { startAutoRefresh, mountPing } from './autorefresh.js';

const $ = (id) => document.getElementById(id);

function setStatus(text, kind = 'busy') {
  $('statusText').textContent = text;
  $('statusDot').className = `dot ${kind}`;
}

function metricValue(metric) {
  return Number.isFinite(metric?.total24h) ? fmtUsd(metric.total24h) : 'Belum tersedia';
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
  $('totalVolumeSub').textContent = `${volumeCoverage}/${data.platforms.length} platform terindeks`;
  $('totalRevenue').textContent = fmtUsd(totalRevenue);
  $('totalRevenueSub').textContent = `${revenueCoverage}/${data.platforms.length} platform terindeks`;
  $('hotChain').textContent = data.hottestChain?.name || '—';
  $('hotChainSub').textContent = data.hottestChain
    ? `${fmtUsd(data.hottestChain.volume24h)} volume terlacak`
    : 'Belum ada breakdown chain';
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
            ? el('img', { class: 'platform-logo', src: platform.logo, alt: `Logo ${platform.name}`, loading: 'lazy', width: '38', height: '38' })
            : null,
          el('div', {},
            el('span', { class: 'platform-kicker' }, platform.category || 'Platform'),
            el('h2', {}, platform.name),
          ),
        ),
        el('span', { class: `pulse-badge ${platform.momentum.key}` }, platform.momentum.label),
      ),
      el('div', { class: 'platform-metrics' },
        metricBlock('Volume 24j', metricValue(platform.volume), metricChange(platform.volume), platform.volumeNote),
        metricBlock('Revenue 24j', metricValue(platform.revenue), metricChange(platform.revenue), platform.revenueNote),
      ),
      el('div', { class: 'metric-bars', 'aria-label': `Perbandingan relatif ${platform.name}` },
        barRow('Volume', volumeWidth, platform.accent),
        barRow('Revenue', revenueWidth, '#f0b429'),
      ),
      el('p', { class: 'platform-chains' },
        chains.length ? `Chain: ${chains.join(' · ')}` : 'Breakdown chain belum tersedia',
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
    el('span', { class: `metric-change ${trendClass(changeValue)}` }, `${change} vs 24j sebelumnya`),
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
    el('th', { class: 'r' }, 'Volume 24j'),
    el('th', { class: 'r' }, 'Revenue 24j'),
    el('th', {}, 'Platform tercakup'),
  )));
  const body = el('tbody');
  data.chains.forEach((chain, index) => {
    body.append(el('tr', { class: index === 0 ? 'is-peak' : '' },
      el('td', { class: 'muted' }, String(index + 1)),
      el('td', {}, el('strong', {}, chain.name), index === 0 ? el('span', { class: 'pill chain-hot' }, '#1 volume') : ''),
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
    ? `Tidak diestimasi karena sumber belum mengindeks: ${unavailable.join('; ')}.`
    : 'Semua metrik yang diminta tersedia dari sumber.';
}

async function load({ force = false } = {}) {
  setStatus('Mengambil volume dan revenue platform…', 'busy');
  $('btnRefresh').disabled = true;
  try {
    const data = await fetchPlatformPulse({ force });
    renderSummary(data);
    renderPlatforms(data);
    renderChains(data);
    renderCoverage(data);
    $('updatedAt').textContent = fmtClock(data.fetchedAt);
    $('cacheState').textContent = data.cached ? 'cache lokal' : 'data baru';
    setStatus('Metrik platform siap', 'ok');
  } finally {
    $('btnRefresh').disabled = false;
  }
}

function init() {
  $('btnRefresh').addEventListener('click', () => {
    clearPlatformPulseCache();
    load({ force: true }).catch(showError);
  });
  load().catch(showError);

  /* Metrik DeFiLlama diperbarui harian di sumbernya; 60 detik sudah lebih
     dari cukup dan tidak membebani API. */
  startAutoRefresh([
    {
      every: 60 * 1000,
      run: async () => {
        const data = await fetchPlatformPulse({ force: true });
        renderSummary(data);
        renderPlatforms(data);
        renderChains(data);
        renderCoverage(data);
        $('updatedAt').textContent = fmtClock(data.fetchedAt);
        $('cacheState').textContent = 'data baru';
      },
    },
  ], mountPing());
}

function showError(error) {
  console.error(error);
  setStatus('Data platform gagal dimuat', 'err');
  $('platformGrid').innerHTML = `<p class="error">Sumber data tidak dapat dihubungi: ${error.message}</p>`;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
