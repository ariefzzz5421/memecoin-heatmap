/* Regenerate 2026-memecoins/{id}/index.html from sourced event research. */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const events = [
  {
    id: 'the-white-whale',
    name: 'The White Whale',
    symbol: 'WHITEWHALE',
    chain: 'Solana',
    cohort: 'Prior launch · crossed in 2026',
    launchAt: '2025-10-13',
    crossedAt: '2026-01-07',
    peak: '$200M',
    logo: '/assets/img/coins/the-white-whale.jpg',
    creator: 'Anonymous original deployer; later community takeover',
    contract: 'a3W4qutoEJA4232T2gwZUfgYJTetr96pU4SJMwppump',
    explorer: 'https://solscan.io/token/a3W4qutoEJA4232T2gwZUfgYJTetr96pU4SJMwppump',
    narrative: 'Community-takeover revival',
    thesis: 'The event shows that attention can reprice an older launch when a community gives it a new identity. It does not prove that community takeovers are repeatable or liquid.',
    reason: 'The sourced crossing followed a fast speculative repricing and renewed community attention. Crypto Briefing documented the $100M event and 50x gains; that timing is evidence of correlation, not a single proven cause.',
    article: [
      'The White Whale launched on Solana in October 2025. It belongs in this register because the documented $100M market-cap crossing happened on January 7, 2026—not because it was a new 2026 launch.',
      'Its market path was led by culture and community ownership rather than a product release. The original deployer remained anonymous and the project later operated as a community takeover, so issuer attribution stays qualified.',
      'The important research signal is the gap between launch and breakout. An older token can return to the market’s attention, but a quoted market cap does not reveal how much liquidity was available to buyers and sellers.',
    ],
    sources: [
      ['CoinGecko market record', 'https://www.coingecko.com/en/coins/the-white-whale'],
      ['Crypto Briefing · $100M event', 'https://cryptobriefing.com/whitewhale-memecoin-hits-100mn-with-50x-gains/'],
      ['Contract explorer', 'https://solscan.io/token/a3W4qutoEJA4232T2gwZUfgYJTetr96pU4SJMwppump'],
      ['Official X', 'https://x.com/WhiteWhaleMeme'],
    ],
  },
  {
    id: 'nietzschean-penguin',
    name: 'Nietzschean Penguin',
    symbol: 'PENGUIN',
    chain: 'Solana',
    cohort: '2026 launch',
    launchAt: '2026-01-17',
    crossedAt: '2026-01-24',
    peak: '$160M',
    logo: '/assets/img/coins/nietzschean-penguin.png',
    creator: 'Anonymous Pump.fun deployer; community-led token',
    contract: '8Jx8AAHj86wbQgUTjGuj6GTTL5Ps3cqxKRTvpaJApump',
    explorer: 'https://solscan.io/token/8Jx8AAHj86wbQgUTjGuj6GTTL5Ps3cqxKRTvpaJApump',
    narrative: 'Viral image meme meets anti-herd philosophy',
    thesis: 'PENGUIN converted a broadly understood visual meme into a liquid ticker during a concentrated attention window. The narrative was instantly legible, but the attention cycle was exceptionally fast.',
    reason: 'The crossing coincided with a viral social-media wave and a widely shared White House penguin post. Cointelegraph reported a market cap above $136M and $244M in 24-hour volume; the higher peak in this record comes from the linked market-history sources.',
    article: [
      'Nietzschean Penguin launched on Pump.fun in January 2026 around a viral clip of a lone penguin walking away from its colony. Online communities reframed the image as a symbol of individualism, which gave the token a clear story before most buyers ever saw its contract.',
      'Attention accelerated after a penguin image was shared through a White House social account. Public reporting recorded a sharp move in both market cap and trading volume, while exchange listings made the ticker easier to access.',
      'No single verified issuer account was found. The research therefore treats PENGUIN as a community-led market event and separates the public narrative from proof of who deployed or controlled the contract.',
    ],
    sources: [
      ['CoinGecko market record', 'https://www.coingecko.com/en/coins/nietzschean-penguin'],
      ['Cointelegraph · breakout report', 'https://cointelegraph.com/news/penguin-memecoin-surge-564-white-house'],
      ['CoinMarketCap Academy · breakout', 'https://coinmarketcap.com/academy/article/meme-coin-news-meme-coin-volumes-hit-2026-high-as-penguin-meme-sparks-breakout-and-more'],
      ['Contract explorer', 'https://solscan.io/token/8Jx8AAHj86wbQgUTjGuj6GTTL5Ps3cqxKRTvpaJApump'],
    ],
  },
  {
    id: 'the-black-bull',
    name: 'The Black Bull',
    symbol: 'ANSEM',
    chain: 'Solana',
    cohort: '2026 launch',
    launchAt: '2026-06-16',
    crossedAt: '2026-06-29',
    peak: '$185M',
    logo: '/assets/img/coins/the-black-bull.jpg',
    creator: 'Anonymous deployer; community tribute to Ansem',
    contract: '9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump',
    explorer: 'https://solscan.io/token/9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump',
    narrative: 'Influencer-adjacent community tribute',
    thesis: 'ANSEM shows how a public persona can become a market narrative without proving that the referenced person created the token. That distinction is central to the dossier.',
    reason: 'The crossing coincided with intense community attention around Ansem and rapid Pump.fun distribution. Crypto Times documented the surge and also raised concentration concerns, so momentum and ownership risk must be read together.',
    article: [
      'The Black Bull appeared on Solana in June 2026 as a community tribute to the trader known online as Ansem. The deployer was anonymous; linking Ansem’s public X account provides narrative context, not proof that he issued the token.',
      'The token moved from a niche launch into a widely discussed ticker in less than two weeks. That speed made the public identity around the meme more important than a conventional product roadmap.',
      'Public reporting also raised questions about concentrated ownership. A market-cap milestone can be real while the exit capacity available to holders remains much smaller, so the event should not be read as a quality score.',
    ],
    sources: [
      ['CoinGecko market record', 'https://www.coingecko.com/en/coins/the-black-bull'],
      ['Crypto Times · threshold event', 'https://www.cryptotimes.io/2026/06/29/inside-the-ansem-memecoin-surge-community-spirit-or-concentrated-control/'],
      ['MEXC contract listing', 'https://www.mexc.co/en-NG/announcements/article/first-in-market-17827791536536'],
      ['Contract explorer', 'https://solscan.io/token/9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump'],
    ],
  },
  {
    id: 'cash-cat',
    name: 'Cash Cat',
    symbol: 'CASHCAT',
    chain: 'Robinhood Chain',
    cohort: '2026 launch',
    launchAt: '2026-07-02',
    crossedAt: '2026-07-08',
    peak: '$156M',
    logo: '/assets/img/coins/cash-cat.jpg',
    creator: 'Anonymous deployer; not affiliated with Robinhood',
    contract: '0x020bfC650A365f8BB26819deAAbF3E21291018b4',
    explorer: 'https://robinhoodchain.blockscout.com/token/0x020bfC650A365f8BB26819deAAbF3E21291018b4',
    narrative: 'First breakout meme on a new chain',
    thesis: 'CASHCAT benefited from first-mover attention on Robinhood Chain and a memorable connection to Robinhood’s early mascot history. The project itself remained independent.',
    reason: 'The crossing arrived during the network’s first speculative activity wave. CoinDesk documented a market value above $100M, strong trading activity, and thin liquidity—evidence that visibility and exit capacity were very different numbers.',
    article: [
      'Cash Cat launched independently on Robinhood Chain shortly after the network opened. Its name referenced an early Robinhood mascot, but the token was not created or endorsed by Robinhood.',
      'The ticker became the chain’s first widely reported memecoin breakout. Novelty, a recognizable origin story, and new trading support helped concentrate attention while the network itself was still establishing its identity.',
      'CoinDesk reported a market value above $100M alongside roughly $6.6M in liquidity at the time. That gap is the central risk: a large quoted market cap does not mean every holder can exit near the displayed valuation.',
    ],
    sources: [
      ['CoinGecko market record', 'https://www.coingecko.com/en/coins/cash-cat'],
      ['CoinDesk · breakout and liquidity', 'https://www.coindesk.com/tech/2026/07/09/cashcat-trader-turns-usd800-into-over-usd1-million-on-robinhood-s-brand-new-blockchain'],
      ['Blockstream Media · $156M peak', 'https://blockstreammedia.com/2026/07/17/what-is-cashcat-robinhood-chains-memecoin/'],
      ['Contract explorer', 'https://robinhoodchain.blockscout.com/token/0x020bfC650A365f8BB26819deAAbF3E21291018b4'],
    ],
  },
];

function date(value) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function template(item) {
  const staticSources = item.sources.map(([label, url]) =>
    `<a class="source-button" href="${url}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`).join('');
  const article = item.article.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${item.name} (${item.symbol}) — 2026 Memecoin Research</title>
<meta name="description" content="${item.name} research dossier: launch, $100M crossing, narrative, contract attribution, sources, and public market history.">
<link rel="stylesheet" href="/assets/css/style.css">
<link rel="icon" type="image/png" href="/assets/img/brand/memecoin-heatmap-mark.png">
</head>
<body data-event="${item.id}">
<a class="skip" href="#article">Skip to research</a>
<header class="site-head">
  <div class="wrap head-inner">
    <a class="brand brand-link" href="/"><img class="brand-mark" src="/assets/img/brand/memecoin-heatmap-mark.png" alt="" width="44" height="44"><div><h1>Memecoin Heatmap</h1><p class="brand-sub">Sourced market intelligence</p></div></a>
    <nav class="primary-nav" aria-label="Primary navigation">
      <a href="/">Overview</a><a href="/maps/">Maps</a><a href="/sentiment/">Sentiment</a><a href="/cases/">Cases</a><a class="is-active" href="/2026-memecoins/" aria-current="page">2026</a>
    </nav>
    <div class="head-actions"><button class="theme-toggle" type="button" data-theme-toggle aria-label="Switch theme"><span class="theme-icon theme-icon-sun" aria-hidden="true">☀</span><span class="theme-icon theme-icon-moon" aria-hidden="true">☾</span></button></div>
  </div>
  <div class="status-bar wrap"><span class="dot busy" id="statusDot"></span><span id="statusText">Article ready · loading market history</span></div>
</header>

<main class="wrap event-article" id="article">
  <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/2026-memecoins/">2026 memecoins</a><span>/</span><span>${item.symbol}</span></nav>
  <header class="event-hero">
    <div class="event-identity">
      <img class="event-token-logo" id="eventLogo" src="${item.logo}" alt="${item.name} logo" width="88" height="88">
      <div><p class="eyebrow">${item.cohort}</p><h2>${item.name} <span>${item.symbol}</span></h2><p>${item.chain} · sourced threshold-event dossier</p></div>
    </div>
    <div class="event-live-snapshot" id="liveSnapshot" aria-live="polite"><span>Current snapshot</span><strong>Checking…</strong></div>
  </header>

  <section class="event-key-facts" aria-label="Key event facts">
    <div><span>Launch</span><strong>${date(item.launchAt)}</strong></div>
    <div class="is-emphasis"><span>$100M crossing</span><strong>${date(item.crossedAt)}</strong></div>
    <div><span>Documented peak</span><strong>${item.peak}</strong></div>
  </section>

  <section class="panel event-story-panel">
    <article class="article-body">
      <p class="eyebrow">Market path</p>
      <h2>Why this token entered the record</h2>
      ${article}
    </article>
    <aside class="event-analysis">
      <div><span>Narrative</span><strong>${escapeHtml(item.narrative)}</strong></div>
      <div><span>Thesis</span><p>${escapeHtml(item.thesis)}</p></div>
      <div><span>Why it crossed</span><p>${escapeHtml(item.reason)}</p></div>
    </aside>
  </section>

  <section class="panel event-history-panel">
    <div class="panel-head"><div><p class="eyebrow">Market history</p><h2>Launch-to-market chart</h2><p class="panel-sub">Public time-series data loads after the article. Missing data becomes a sourced event timeline; dates are never estimated.</p></div><span class="chart-load-state" id="chartLoadState">Loading chart…</span></div>
    <div class="market-history-chart" id="eventChart"><div class="chart-loading-shell"><span class="spinner"></span><p>Loading public market history…</p></div></div>
  </section>

  <section class="event-bottom-grid">
    <div class="panel event-contract-panel">
      <p class="eyebrow">Identity</p><h2>Creator and contract</h2>
      <div class="event-contract-row"><span>Creator / issuer</span><strong>${escapeHtml(item.creator)}</strong></div>
      <div class="event-contract-row"><span>Contract</span><a href="${item.explorer}" target="_blank" rel="noreferrer">${item.contract}</a></div>
    </div>
    <div class="panel source-panel">
      <div><p class="eyebrow">Provenance</p><h2>Sources</h2></div>
      <div class="breakout-sources" id="eventSources">${staticSources}</div>
    </div>
  </section>

  <p class="risk-line">⚠ A historical $100M market cap is not a liquidity guarantee or a repeatable trade setup. Avoid leverage and predefine a small position size.</p>
</main>
<footer class="site-foot wrap"><p>Research cutoff: 29 Jul 2026 · live snapshots: CoinGecko · <span id="updatedAt">—</span></p></footer>
<script type="module" src="/assets/js/theme.js"></script>
<script type="module" src="/assets/js/memecoin-2026-detail.js"></script>
</body>
</html>
`;
}

for (const event of events) {
  const directory = path.join(root, '2026-memecoins', event.id);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), template(event));
  console.log(`2026-memecoins/${event.id}/index.html`);
}

