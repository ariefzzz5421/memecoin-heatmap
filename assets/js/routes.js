/* Single source of truth for the site routes.
   The shell renders these as separate topic columns inside the
   bottom-left navigation drawer. Labels are topics only — no numbering. */

export const ROUTE_COLUMNS = [
  {
    id: 'market',
    label: 'Live market',
    routes: [
      { href: '/', label: 'Home', note: 'Landing and route index' },
      { href: '/dashboard/', label: 'Dashboard', note: 'Volume map, trading hours, heatmap' },
      { href: '/maps/', label: 'Maps', note: 'Volume by legal jurisdiction' },
      { href: '/sentiment/', label: 'Sentiment', note: 'Launchpads, chains, protocol activity' },
    ],
  },
  {
    id: 'research',
    label: 'Research',
    routes: [
      { href: '/cases/', label: 'Memecoin cases', note: 'Sourced long-form case studies' },
      { href: '/2026-memecoins/', label: 'Breakouts', note: 'Verified $100M crossings' },
      { href: '/nft/', label: 'NFT', note: 'Collections whose floor broke 0.5 ETH' },
    ],
  },
];

export const ROUTES = ROUTE_COLUMNS.flatMap((column) => column.routes);

/* The deepest matching route wins so article endpoints highlight their parent
   topic (for example /cases/doge/ highlights Memecoin cases). */
export function activeRoute(pathname = window.location.pathname) {
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`;
  let best = null;
  for (const route of ROUTES) {
    if (route.href === '/' ? path === '/' : path.startsWith(route.href)) {
      if (!best || route.href.length > best.href.length) best = route;
    }
  }
  return best;
}
