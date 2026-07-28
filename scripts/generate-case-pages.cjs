/* ============================================================
   generate-case-pages.cjs — tulis ulang cases/{slug}/index.html
   dari cases-config.js. Jalankan setiap kali daftar token studi
   berubah:  node scripts/generate-case-pages.cjs
   ============================================================ */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.resolve(__dirname, '..');

const template = (c) => `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${c.name} (${c.sym}) — Studi Kasus Memecoin</title>
<meta name="description" content="Studi kasus ${c.name}: tanggal launch, waktu menuju ATH, chart mingguan real dari listing bursa, dan katalis terdokumentasi.">
<link rel="stylesheet" href="/assets/css/style.css">
<link rel="icon" href="${c.logo}">
</head>
<body data-case="${c.slug}">

<a class="skip" href="#artikel">Lompat ke artikel</a>

<header class="site-head">
  <div class="wrap head-inner">
    <a class="brand brand-link" href="/">
      <span class="brand-mark" aria-hidden="true"></span>
      <div>
        <h1>Crypto Heatmap Volume</h1>
        <p class="brand-sub">Studi kasus memecoin ≥ $100M mcap</p>
      </div>
    </a>
    <nav class="primary-nav" aria-label="Navigasi utama">
      <a href="/">Overview</a>
      <a href="/maps/">Maps</a>
      <a href="/sentiment/">Sentiment</a>
      <a class="is-active" href="/cases/" aria-current="page">Cases</a>
    </nav>
    <div class="head-actions">
      <a class="btn" href="/cases/">&larr; Semua kasus</a>
    </div>
  </div>
  <div class="status-bar wrap">
    <span class="dot busy" id="statusDot"></span>
    <span id="statusText">Memuat data…</span>
  </div>
</header>

<main class="wrap article-wrap" id="artikel">

  <header class="token-hero">
    <img class="token-logo" id="tokenLogo" src="${c.logo}" alt="Logo resmi ${c.name}" width="96" height="96">
    <div>
      <p class="eyebrow">Studi kasus &middot; launch <span id="tokenYear">${c.launch.slice(0, 4)}</span></p>
      <h2><span id="tokenName">${c.name}</span> <span class="token-sym" id="tokenSym">${c.sym}</span></h2>
      <p class="article-summary" id="articleSummary">Memuat ringkasan&hellip;</p>
    </div>
  </header>

  <section class="panel">
    <article class="article-body" id="articleBody"></article>
  </section>

  <section class="panel">
    <div class="panel-head">
      <div>
        <h2>Chart mingguan sejak listing</h2>
        <p class="panel-sub">Kline mingguan real dari bursa dengan listing paling awal yang tersedia, skala log, penanda ATH.</p>
      </div>
    </div>
    <div class="chart-holder case-chart-holder">
      <div id="caseChart"></div>
      <div class="tooltip" id="caseTip" hidden></div>
    </div>
    <div class="detail-stats case-facts" id="caseFacts"></div>
    <details class="disclosure">
      <summary>Tabel data mingguan</summary>
      <div class="table-scroll" id="caseWeeklyTable"></div>
    </details>
  </section>

  <section class="panel">
    <div class="split">
      <div class="side-block">
        <h3>Katalis terdokumentasi</h3>
        <ul class="catalyst-list" id="caseCatalysts"></ul>
      </div>
      <div class="side-block">
        <h3>Pola yang tercatat</h3>
        <p class="thesis" id="caseThesis"></p>
        <p class="note">Katalis adalah peristiwa publik dengan korelasi waktu terhadap pergerakan harga — bukan bukti sebab-akibat tunggal. Bukan nasihat keuangan.</p>
      </div>
    </div>
  </section>

</main>

<footer class="site-foot wrap">
  <p>Data: CoinGecko &middot; Binance / Kraken / OKX. Logo: berkas resmi proyek. Diperbarui <span id="updatedAt">—</span>.</p>
</footer>

<script type="module" src="/assets/js/cases-article.js"></script>
</body>
</html>
`;

(async () => {
  const mod = await import(pathToFileURL(path.join(root, 'assets/js/cases-config.js')).href);
  for (const c of mod.CASES) {
    const dir = path.join(root, 'cases', c.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), template(c));
    console.log(`cases/${c.slug}/index.html`);
  }
})();
