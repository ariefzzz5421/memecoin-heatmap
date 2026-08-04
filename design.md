# Design — Memecoin Heatmap

A locked design system for this app. Every page reads this file before visual
changes. Extend this system instead of inventing route-specific themes.

## Genre

Modern-minimal market intelligence.

## Macrostructure family

- App dashboards: market workbench with one dominant data surface, a compact
  rail for controls or rankings, and dense tables only after the visual summary.
- Research index: leaderboard first, filter rail second, compact research cards
  third.
- Research article: research dossier with identity header, milestone strip,
  dominant chart, evidence notes, and sources.

## Theme

- `--color-paper`: oklch(14% 0.015 255)
- `--color-paper-2`: oklch(18% 0.018 255)
- `--color-paper-3`: oklch(22% 0.02 255)
- `--color-ink`: oklch(96% 0.01 255)
- `--color-ink-2`: oklch(76% 0.018 255)
- `--color-muted`: oklch(59% 0.018 255)
- `--color-rule`: oklch(30% 0.022 255)
- `--color-accent`: oklch(68% 0.17 252)
- `--color-accent-soft`: oklch(31% 0.08 252)
- `--color-focus`: oklch(78% 0.15 252)
- `--color-positive`: oklch(72% 0.14 214)
- `--color-negative`: oklch(69% 0.16 24)
- `--color-warning`: oklch(79% 0.15 82)

The accent occupies no more than five percent of a viewport. It marks active
navigation, selected data, and the strongest metric; it is not decoration.

## Typography

- Display: locally hosted Geist, weight 700, roman.
- Body: locally hosted Geist, weight 400–600.
- Mono: ui-monospace / SFMono-Regular, weight 500.
- Display tracking: `-0.035em`.
- Type anchor: `--text-display: clamp(2.35rem, 5.4vw, 5.8rem)`.

## Spacing

Use a four-point scale through named tokens only:

- `--space-3xs`: 0.25rem
- `--space-2xs`: 0.5rem
- `--space-xs`: 0.75rem
- `--space-sm`: 1rem
- `--space-md`: 1.5rem
- `--space-lg`: 2rem
- `--space-xl`: 3rem
- `--space-2xl`: 4.5rem
- `--space-3xl`: 7rem

## Motion

- Motion-cut by default.
- Hover and focus transitions use `--ease-out` for 180–220 ms.
- Data refreshes update in place without toast, flash, countdown, or layout jump.
- Reduced motion removes transforms and keeps opacity transitions under 150 ms.

## Microinteractions stance

- Silent automatic data refresh.
- Focus is immediate and visibly outlined.
- Hover communicates clickability through rule/accent changes, never scale-heavy
  effects.
- Loading preserves final layout height.

## CTA voice

- Primary: compact blue rectangular control with a 10px radius.
- Secondary: transparent control with one-pixel rule.
- Copy is literal and short: “Buka riset”, “Lihat sumber”, “Reset”.

## Per-page allowances

- Dashboard routes use no decorative imagery; the data surface is the visual.
- Research cards may use official token logos.
- Research articles may use data charts only.

## What pages MUST share

- Wordmark, accent placement, font stack, navigation rhythm, 4-point spacing,
  control radius, data state colors, source treatment, and footer restraint.
- Section headings use an eyebrow only when it provides real scope or timeframe.

## What pages MAY differ on

- Workbench rail position.
- Table density.
- Article chart height.
- Which live metric receives the accent.

## 2026 extension: themes, identity, and source imagery

- The graphite-blue system remains the default dark theme. The light theme is a paper-blue translation of the same tokens, spacing, hierarchy, and data colors.
- The user-supplied green/orange mascot and market-arrow mark is the product identity. Its transparent mascot crop appears in the header and favicon; the full lockup remains stored as the canonical source artwork.
- Official chain marks identify a network in dense tables. Country flags identify jurisdictions in rankings and tables. Neither is decorative background imagery.
- Source panels use the existing border, radius, and type tokens. External links name both the source and the field it supports.
- The 2026 index uses short event previews with crossing date, documented peak, and launch date. Creator attribution, contract, current snapshot, article, chart, and direct sources live on one routed dossier per token.
- Light/dark switching redraws canvas and SVG data visualizations with refreshed CSS-token values.

## Compact evidence-ledger extension

- The 2026 route is a two-column preview ledger on wide screens and a
  single-column ledger on narrow screens. Each preview leads with the token and
  network, then gives only launch, crossing, and documented peak.
- Each 2026 token has a routed research dossier with a static article-first
  render. Current data enriches in place and the historical chart loads after
  the article so a slow provider never blocks the research.
- Source links are icon-led and use locally stored official brand marks. Labels
  remain literal; icons never replace source names.
- Case dossiers use one dominant interactive history surface. Price and market
  cap share the same controls, range choices, log-scale plot, sourced arrow
  markers, and explicit unavailable states.
- Launch price and market cap are displayed only when a historical source
  returns them. The interface never interpolates or visually invents a missing
  launch value.

## DEX evidence and fast-path extension

- DexScreener frames are click-to-load. The page renders its article, internal
  chart, and cached market snapshot before any third-party iframe is created.
- The official DexScreener API supplies contract-matched pair identity,
  creation time, current price, liquidity, volume, FDV, and market cap. It is
  not treated as an OHLCV history source.
- “First 15m mcap proxy” means the first public 15-minute GeckoTerminal close
  multiplied by the current DexScreener-implied circulating supply. If only FDV
  is available, the label becomes “First 15m FDV estimate.” Neither is labeled
  as an exact historical market cap.
- Missing OHLCV, supply, or exact pair identity remains unavailable. Ticker-only
  pair matching is forbidden.
- The overview category total comes from CoinGecko’s `meme-token` category.
  When that category is unavailable, the interface says “tracked basket” and
  never presents the partial sum as the total category.
- Map provenance uses one short source label and an external-link arrow. It does
  not repeat field descriptions already explained by the data-boundary note.
- Background polling updates changed market sections only. Historical routes and
  first-launch evidence use longer server caches, and below-fold dossier
  sections use `content-visibility`.

## Route shell and resilience extension

- Every route uses the same fixed left rail on desktop: product identity, five
  numbered destinations, market status, WIB/UTC, and the theme control.
- Below 60rem the rail becomes a dismissible drawer with a 44px menu target.
  Escape, backdrop click, route selection, and the desktop breakpoint all close
  it without moving page content.
- Active navigation uses the existing blue signal and an inset rule. Inactive
  routes remain neutral; the rail is navigation, not a decorative accent block.
- Official source marks are stored locally and shown beside source names. A
  logo never replaces the readable company or project label.
- Below-fold hourly candles activate near the viewport. Failed background
  refreshes back off instead of producing a ten-second error loop.
- Detail routes require only the CoinGecko id. Symbols enrich chart labels and
  Yahoo mapping when present, but a missing symbol no longer breaks the page.

## Exports

The portable source of truth is `assets/css/tokens.css`.

### Tailwind v4

```css
@theme {
  --color-paper: oklch(13% 0.008 255);
  --color-paper-2: oklch(19% 0.008 255);
  --color-paper-3: oklch(23% 0.01 255);
  --color-ink: oklch(98% 0.004 255);
  --color-ink-2: oklch(79% 0.01 255);
  --color-muted: oklch(61% 0.012 255);
  --color-rule: oklch(100% 0 0 / 0.11);
  --color-accent: oklch(62% 0.17 253);
  --color-focus: oklch(78% 0.15 252);
  --font-display: "Geist", ui-sans-serif, system-ui, sans-serif;
  --font-body: "Geist", ui-sans-serif, system-ui, sans-serif;
  --font-outlier: ui-monospace, "SFMono-Regular", monospace;
  --spacing-3xs: 0.25rem;
  --spacing-2xs: 0.5rem;
  --spacing-xs: 0.75rem;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  --spacing-xl: 3rem;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
}
```

### DTCG

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "paper": { "$value": "oklch(13% 0.008 255)", "$type": "color" },
    "paper-2": { "$value": "oklch(19% 0.008 255)", "$type": "color" },
    "paper-3": { "$value": "oklch(23% 0.01 255)", "$type": "color" },
    "ink": { "$value": "oklch(98% 0.004 255)", "$type": "color" },
    "muted": { "$value": "oklch(61% 0.012 255)", "$type": "color" },
    "accent": { "$value": "oklch(62% 0.17 253)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "Geist, ui-sans-serif, system-ui, sans-serif", "$type": "fontFamily" },
    "body": { "$value": "Geist, ui-sans-serif, system-ui, sans-serif", "$type": "fontFamily" },
    "outlier": { "$value": "ui-monospace, SFMono-Regular, monospace", "$type": "fontFamily" }
  },
  "duration": {
    "micro": { "$value": "120ms", "$type": "duration" },
    "short": { "$value": "220ms", "$type": "duration" },
    "long": { "$value": "420ms", "$type": "duration" }
  }
}
```

### shadcn/ui

```css
:root {
  --background: 13% 0.008 255;
  --foreground: 98% 0.004 255;
  --card: 19% 0.008 255;
  --card-foreground: 98% 0.004 255;
  --popover: 19% 0.008 255;
  --popover-foreground: 98% 0.004 255;
  --primary: 62% 0.17 253;
  --primary-foreground: 100% 0.004 255;
  --secondary: 23% 0.01 255;
  --secondary-foreground: 79% 0.01 255;
  --muted: 23% 0.01 255;
  --muted-foreground: 61% 0.012 255;
  --accent: 62% 0.17 253;
  --accent-foreground: 100% 0.004 255;
  --border: 30% 0.022 255;
  --input: 30% 0.022 255;
  --ring: 78% 0.15 252;
  --radius: 0.5rem;
}
```
