import { el } from './utils.js';

const BRANDS = [
  { test: (host) => host === 'defillama.com' || host.endsWith('.defillama.com'), name: 'DeFiLlama', logo: '/assets/img/sources/defillama.ico' },
  { test: (host) => host === 'dexscreener.com' || host.endsWith('.dexscreener.com'), name: 'DEX Screener', logo: '/assets/img/sources/dexscreener.ico' },
  { test: (host) => host === 'x.com' || host.endsWith('.x.com'), name: 'X', logo: '/assets/img/sources/x.svg', lightAsset: true },
  { test: (host) => host.includes('coingecko.com'), name: 'CoinGecko', logo: '/assets/img/sources/coingecko.svg' },
  { test: (host) => host.includes('coinpaprika.com'), name: 'CoinPaprika', logo: '/assets/img/sources/coinpaprika.png' },
  { test: (host) => host.includes('naturalearthdata.com'), name: 'Natural Earth', logo: '/assets/img/sources/natural-earth.png' },
  { test: (host) => host.includes('flagpedia.net') || host.includes('flagcdn.com'), name: 'Flagpedia', logo: '/assets/img/sources/flagpedia.png' },
  { test: (host) => host.includes('finance.yahoo.com'), name: 'Yahoo Finance', logo: '/assets/img/sources/yahoo.ico' },
  { test: (host) => host.includes('coinmarketcap.com'), name: 'CoinMarketCap', logo: '/assets/img/sources/coinmarketcap.ico' },
  { test: (host) => host.includes('cointelegraph.com'), name: 'Cointelegraph', logo: '/assets/img/sources/cointelegraph.svg' },
  { test: (host) => host.includes('geckoterminal.com'), name: 'GeckoTerminal', logo: '/assets/img/sources/geckoterminal.png' },
  { test: (host) => host.includes('cryptobriefing.com'), name: 'Crypto Briefing', logo: '/assets/img/sources/crypto-briefing.png', wide: true, mono: true },
  { test: (host) => host.includes('cryptotimes.io'), name: 'Crypto Times', logo: '/assets/img/sources/crypto-times.svg', wide: true, mono: true },
  { test: (host) => host.includes('kcex.com'), name: 'KCEX', logo: '/assets/img/sources/kcex.png' },
  { test: (host) => host.includes('mexc.com'), name: 'MEXC', logo: '/assets/img/sources/mexc.png' },
  { test: (host) => host.includes('coindesk.com'), name: 'CoinDesk', logo: '/assets/img/sources/coindesk.svg' },
  { test: (host) => host.includes('blockstreammedia.com'), name: 'Blockstream Media', logo: '/assets/img/sources/blockstream-media.png' },
  { test: (host) => host.includes('etherscan.io'), name: 'Etherscan', logo: '/assets/img/sources/etherscan.ico' },
  { test: (host) => host.includes('bscscan.com'), name: 'BscScan', logo: '/assets/img/sources/bscscan.ico' },
  { test: (host) => host.includes('solscan.io'), name: 'Solscan', logo: '/assets/img/sources/solscan.ico' },
  { test: (host) => host.includes('blockchair.com'), name: 'Blockchair', logo: '/assets/img/sources/blockchair.ico' },
  { test: (host) => host.includes('robinhoodchain.blockscout.com'), name: 'Robinhood Chain explorer', logo: '/assets/img/chains/robinhood.png' },
];

export function sourceBrand(url, fallback = {}) {
  let host = '';
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return fallback;
  }
  return { ...(BRANDS.find((brand) => brand.test(host)) || {}), ...fallback };
}

export function sourceLogo(url, fallback = {}) {
  const brand = sourceBrand(url, fallback);
  if (!brand.logo) return null;
  return el('span', {
    class: `source-logo-wrap${brand.wide ? ' is-wide' : ''}${brand.mono ? ' is-mono' : ''}${brand.lightAsset ? ' is-light-asset' : ''}`,
    'aria-hidden': 'true',
  }, el('img', {
    class: 'source-logo',
    src: brand.logo,
    alt: '',
    width: brand.wide ? '36' : '24',
    height: '24',
    loading: 'lazy',
    onerror: (event) => {
      event.currentTarget.closest('.source-logo-wrap')?.setAttribute('hidden', '');
    },
  }));
}

export function brandedSourceLink({
  label,
  url,
  note = '',
  logo = '',
  className = 'source-link',
  disabled = false,
}) {
  const brand = sourceBrand(url, logo ? { logo } : {});
  const mark = sourceLogo(url, logo ? { logo } : {});
  /* Without a brand mark the link drops the logo column entirely, otherwise
     the copy would be laid into the 34px slot and truncate to nothing. */
  const linkClass = mark ? className : `${className} has-no-logo`;
  const content = [
    mark,
    el('span', { class: 'source-copy' },
      el('strong', {}, label || brand.name || 'Source'),
      note ? el('small', {}, note) : null,
    ),
    el('span', { class: 'source-arrow', 'aria-hidden': 'true' }, disabled ? '—' : '↗'),
  ];
  if (disabled || !url) {
    return el('span', {
      class: `${linkClass} is-disabled`,
      'aria-disabled': 'true',
      title: note || 'Source unavailable',
    }, ...content);
  }
  return el('a', {
    class: linkClass,
    href: url,
    target: '_blank',
    rel: 'noreferrer',
  }, ...content);
}

export function hydrateSourceLinks(root = document) {
  root.querySelectorAll('.source-link.source-only[href]').forEach((link) => {
    if (link.querySelector('.source-logo-wrap')) return;
    const logo = sourceLogo(link.href);
    if (!logo) return;
    link.classList.add('is-branded-source');
    link.prepend(logo);
  });
}
