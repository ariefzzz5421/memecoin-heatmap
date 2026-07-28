# Design — Crypto Heatmap Volume

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

- Display: system UI / Segoe UI, weight 720, roman.
- Body: system UI / Segoe UI, weight 400–600.
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
