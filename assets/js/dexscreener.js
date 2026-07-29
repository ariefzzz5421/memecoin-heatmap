import { brandedSourceLink } from './source-brands.js';
import { el, fmtPct, fmtPrice, fmtUsd } from './utils.js';

function embedUrl(pair) {
  if (!pair?.chain || !pair?.pairAddress) return '';
  const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  const params = new URLSearchParams({
    embed: '1',
    theme,
    trades: '0',
    info: '0',
  });
  return `https://dexscreener.com/${encodeURIComponent(pair.chain)}/${encodeURIComponent(pair.pairAddress)}?${params}`;
}

function pairUrl(pair) {
  return pair?.url || (pair?.chain && pair?.pairAddress
    ? `https://dexscreener.com/${pair.chain}/${pair.pairAddress}`
    : '');
}

export async function fetchDexLaunch(id) {
  const response = await fetch(`/api/market?resource=dexlaunch&id=${encodeURIComponent(id)}`, {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`DEX launch HTTP ${response.status}`);
  const payload = await response.json();
  if (!payload?.ok) throw new Error(payload?.error || 'DEX launch data unavailable');
  return payload;
}

function snapshotFacts(pair, launch) {
  const facts = [];
  if (Number.isFinite(pair?.priceUsd)) facts.push(['DEX price', fmtPrice(pair.priceUsd)]);
  if (Number.isFinite(pair?.marketCap)) facts.push(['Market cap', fmtUsd(pair.marketCap)]);
  else if (Number.isFinite(pair?.fdv)) facts.push(['FDV', fmtUsd(pair.fdv)]);
  if (Number.isFinite(pair?.liquidityUsd)) facts.push(['Liquidity', fmtUsd(pair.liquidityUsd)]);
  if (Number.isFinite(pair?.change24h)) facts.push(['24h', fmtPct(pair.change24h, 1)]);
  if (Number.isFinite(launch?.price)) facts.push(['First 15m close', fmtPrice(launch.price)]);
  if (Number.isFinite(launch?.valuation)) {
    facts.push([launch.metricKind === 'FDV estimate' ? 'First 15m FDV' : 'First 15m mcap proxy', fmtUsd(launch.valuation)]);
  }
  return facts;
}

export function renderDexScreenerChart(holder, pair, tokenName, launchPayload = null) {
  holder.replaceChildren();
  const resolvedPair = launchPayload?.pair || pair;
  const launch = launchPayload?.launch || null;
  const shell = el('div', { class: 'dex-chart-shell' });
  const copy = el('div', { class: 'dex-chart-copy' },
    el('div', {},
      el('p', { class: 'eyebrow' }, 'On-chain market'),
      el('h3', {}, 'DEX chart'),
      el('p', {}, resolvedPair
        ? `${resolvedPair.dexName || pair?.dexName || 'DEX'} · ${resolvedPair.base || pair?.base || tokenName}/${resolvedPair.quote || pair?.quote || 'quote'} · exact pair address.`
        : `${tokenName} has no exact contract-matched DEX pair configured.`),
    ),
  );

  if (!resolvedPair) {
    shell.append(
      copy,
      el('p', { class: 'dex-empty-note' },
        'Ticker-only matching is disabled because it can surface spoofed tokens.'),
    );
    holder.append(shell);
    return;
  }

  const url = pairUrl(resolvedPair);
  copy.append(brandedSourceLink({
    label: 'Open DEX Screener',
    url,
    className: 'source-link dex-source-link',
  }));

  const facts = snapshotFacts(resolvedPair, launch);
  const frameWrap = el('div', { class: 'dex-frame-wrap is-deferred' });
  const loadButton = el('button', { class: 'dex-load-button', type: 'button' },
    el('span', { 'aria-hidden': 'true' }, '↗'),
    el('span', {},
      el('strong', {}, 'Load interactive chart'),
      el('small', {}, 'DEX Screener loads only after this click'),
    ),
  );
  frameWrap.append(loadButton);

  const loadFrame = () => {
    if (frameWrap.querySelector('iframe')) return;
    frameWrap.classList.remove('is-deferred');
    frameWrap.replaceChildren(el('iframe', {
      class: 'dex-frame',
      src: embedUrl(resolvedPair),
      title: `${tokenName} live DEX chart`,
      loading: 'eager',
      referrerpolicy: 'no-referrer',
      allowfullscreen: 'true',
    }));
  };
  loadButton.addEventListener('click', loadFrame, { once: true });

  if (holder._dexThemeHandler) {
    window.removeEventListener('themechange', holder._dexThemeHandler);
  }
  holder._dexThemeHandler = () => {
    const iframe = frameWrap.querySelector('iframe');
    if (iframe) iframe.src = embedUrl(resolvedPair);
  };
  window.addEventListener('themechange', holder._dexThemeHandler);

  shell.append(
    copy,
    facts.length
      ? el('div', { class: 'dex-snapshot-grid' },
          ...facts.map(([label, value]) => el('div', {},
            el('span', {}, label),
            el('strong', { class: 'num' }, value),
          )))
      : null,
    frameWrap,
    el('p', { class: 'chart-coverage' },
      launch
        ? `${launch.methodology} This is a sourced proxy, not an exact historical supply snapshot.`
        : launchPayload?.warning || 'First 15-minute valuation is shown only when public OHLCV and an implied supply are both available.'),
  );
  holder.append(shell);
}
