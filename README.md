# Memecoin Heatmap

A source-first crypto market dashboard for global exchange volume, active trading
hours, memecoin performance, protocol activity, and documented case studies.

The interface is English-first, supports dark and light themes, and refreshes
silently through the backend. Missing upstream metrics are shown as unavailable
instead of being estimated.

## Run locally

```bash
npm run dev
```

Open <http://127.0.0.1:5173>. Build the deployable client with:

```bash
npm run build
```

## Routes

| Route | Purpose |
|---|---|
| `/` | Landing page and route index |
| `/dashboard/` | Global overview, active-hour analysis, and live memecoin leaderboard |
| `/maps/` | Exchange legal-jurisdiction volume map with ranked markers and country flags |
| `/sentiment/` | Launchpad/protocol volume and revenue, with chain ranking |
| `/cases/` | Live `$100M+` memecoin leaderboard and sourced historical studies |
| `/cases/{slug}/` | Curated launch-to-ATH study with chart, identity, contracts, and sources |
| `/cases/detail/?id=…&symbol=…` | Dynamic market dossier using CoinGecko/Yahoo data |
| `/2026-memecoins/` | Tokens publicly verified to have first crossed `$100M` market cap in 2026 |
| `/nft/` | NFT collections with a documented floor above `0.5 ETH` |
| `/nft/{slug}/` | Collection case study: launch, mint, peak and live floor, factors, triggers |

Navigation is a drawer opened from the three-line launcher pinned to the
bottom-left corner. Routes are defined once in `assets/js/routes.js` and rendered
as topic columns by `assets/js/app-shell.js`, so every page picks up a new route
without editing its markup.

### Case article format

`/cases/{slug}/`, `/2026-memecoins/{id}/`, and `/nft/{slug}/` share one layout:
the official logo centred above the headline, then thesis, why it pumped, the
reasons and factors, the chart, and the dated triggers, followed by identity and
sources.

## Data and provenance

| Dataset | Primary source | Fallback or supporting source |
|---|---|---|
| Exchange and memecoin markets | CoinGecko | CoinPaprika for exchange volume |
| Dynamic long-range price history | CoinGecko | Yahoo Finance |
| Hourly and case-study candles | Binance | Kraken, then OKX |
| Protocol volume and revenue | DeFiLlama | Explicit unavailable state |
| Map geometry | Natural Earth | Bundled local geometry |
| Country flags | FlagCDN | Bundled local images |
| NFT floor prices | CoinGecko NFT collections API | Sourced peak/mint values shown as documented history |
| Project identity | Official websites and X accounts | CoinGecko and chain explorers |

The browser polls the same backend endpoint every 10 seconds. The backend applies
source-specific caches to protect public API quotas and keeps the last valid
response when a provider is temporarily unavailable. There is no manual refresh
button or visible countdown.

### Important data boundary

The map represents the legal jurisdiction of tracked exchanges, not the physical
location of traders. Public APIs do not provide reliable trader residence data.

The 2026 page uses a strict public-evidence method: a dated report of the first
`$100M` crossing, an identifiable contract, and a live market source. It is a
defensible public-source set at the displayed cutoff, not a claim of complete
on-chain omniscience.

## Assets

- `assets/img/brand/` — original app identity
- `assets/img/chains/` — supplied or official chain marks
- `assets/img/flags/` — local country flags
- `assets/img/coins/` — locally stored token imagery
- `assets/img/platforms/` — locally stored platform imagery

## Generated case pages

Case articles are generated from their configuration files. After changing the
curated definitions, run:

```bash
npm run generate
```

That runs `scripts/generate-case-pages.cjs` (from `assets/js/cases-config.js`),
`scripts/generate-2026-pages.cjs` (event data lives in the script), and
`scripts/generate-nft-pages.cjs` (from `assets/js/nft-config.js`).

NFT collection marks in `assets/img/nft/` are local placeholders. Each article
replaces them at runtime with the official collection image returned by the
CoinGecko NFT API, so a blocked or rate-limited upstream still renders a mark.

## Project structure

```text
index.html
dashboard/  maps/  sentiment/  cases/  2026-memecoins/  nft/
assets/css/style.css
assets/js/
server/market-service.mjs
scripts/dev-server.cjs
scripts/build.cjs
scripts/generate-case-pages.cjs
scripts/generate-2026-pages.cjs
scripts/generate-nft-pages.cjs
vercel.json
```

Research tool only. High volume can indicate liquidity; it does not predict price
direction and is not financial advice.
