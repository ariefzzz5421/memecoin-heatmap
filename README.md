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
| `/` | Global overview, active-hour analysis, and live memecoin leaderboard |
| `/maps/` | Exchange legal-jurisdiction volume map with ranked markers and country flags |
| `/sentiment/` | Launchpad/protocol volume and revenue, with chain ranking |
| `/cases/` | Live `$100M+` memecoin leaderboard and sourced historical studies |
| `/cases/{slug}/` | Curated launch-to-ATH study with weekly chart, identity, contracts, and sources |
| `/cases/detail/?id=…&symbol=…` | Dynamic market dossier using CoinGecko/Yahoo data |
| `/2026-memecoins/` | Tokens publicly verified to have first crossed `$100M` market cap in 2026 |

## Data and provenance

| Dataset | Primary source | Fallback or supporting source |
|---|---|---|
| Exchange and memecoin markets | CoinGecko | CoinPaprika for exchange volume |
| Dynamic long-range price history | CoinGecko | Yahoo Finance |
| Hourly and case-study candles | Binance | Kraken, then OKX |
| Protocol volume and revenue | DeFiLlama | Explicit unavailable state |
| Map geometry | Natural Earth | Bundled local geometry |
| Country flags | FlagCDN | Bundled local images |
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

Case articles are generated from `assets/js/cases-config.js`. After changing the
curated study definitions, run:

```bash
node scripts/generate-case-pages.cjs
```

## Project structure

```text
index.html
maps/  sentiment/  cases/  2026-memecoins/
assets/css/style.css
assets/js/
server/market-service.mjs
scripts/dev-server.cjs
scripts/build.cjs
scripts/generate-case-pages.cjs
vercel.json
```

Research tool only. High volume can indicate liquidity; it does not predict price
direction and is not financial advice.
