/* Shared route shell.
   Navigation lives in a drawer opened by the three-line launcher pinned to the
   bottom-left corner. Every page keeps an empty <nav class="primary-nav">; the
   shell fills it from routes.js so a new route appears site-wide at once. */

import { ROUTE_COLUMNS, activeRoute } from './routes.js';

function buildLauncher(navId) {
  const button = document.createElement('button');
  button.className = 'nav-launcher';
  button.type = 'button';
  button.dataset.navToggle = '';
  button.setAttribute('aria-controls', navId);
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-label', 'Open navigation');
  button.innerHTML =
    '<span class="nav-launcher-bars" aria-hidden="true"><span></span><span></span><span></span></span>' +
    '<span class="nav-launcher-label">Menu</span>';
  return button;
}

function buildColumns(nav, current) {
  const head = document.createElement('div');
  head.className = 'nav-panel-head';
  head.innerHTML = '<p class="nav-panel-title">Routes</p><p class="nav-panel-sub">Pick a topic</p>';

  const columns = document.createElement('div');
  columns.className = 'nav-columns';

  for (const column of ROUTE_COLUMNS) {
    const section = document.createElement('section');
    section.className = 'nav-column';

    const heading = document.createElement('h2');
    heading.className = 'nav-column-title';
    heading.textContent = column.label;
    section.append(heading);

    for (const route of column.routes) {
      const link = document.createElement('a');
      link.href = route.href;
      if (current && route.href === current.href) {
        link.className = 'is-active';
        link.setAttribute('aria-current', 'page');
      }
      const label = document.createElement('strong');
      label.textContent = route.label;
      const note = document.createElement('small');
      note.textContent = route.note;
      link.append(label, note);
      section.append(link);
    }
    columns.append(section);
  }

  nav.replaceChildren(head, columns);
}

export function initAppShell() {
  const nav = document.querySelector('.primary-nav');
  if (!nav) return;

  nav.id ||= 'primaryNavigation';
  nav.setAttribute('aria-label', 'Primary navigation');
  buildColumns(nav, activeRoute());
  /* The drawer is fixed to the viewport, so it is moved out of the header to
     stay clear of any ancestor that would become its containing block. */
  if (nav.parentElement !== document.body) document.body.append(nav);

  document.querySelectorAll('.nav-toggle').forEach((old) => old.remove());
  const toggle = document.querySelector('.nav-launcher') || buildLauncher(nav.id);
  if (!toggle.isConnected) document.body.append(toggle);

  let backdrop = document.querySelector('.nav-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('button');
    backdrop.className = 'nav-backdrop';
    backdrop.type = 'button';
    backdrop.tabIndex = -1;
    backdrop.setAttribute('aria-label', 'Close navigation');
    document.body.append(backdrop);
  }
  backdrop.hidden = true;

  const setOpen = (open, { returnFocus = false } = {}) => {
    document.body.toggleAttribute('data-nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    backdrop.hidden = !open;
    if (open) {
      requestAnimationFrame(() => (nav.querySelector('[aria-current="page"]') || nav.querySelector('a'))?.focus());
    } else if (returnFocus) {
      toggle.focus({ preventScroll: true });
    }
  };

  toggle.addEventListener('click', () => setOpen(!document.body.hasAttribute('data-nav-open'), { returnFocus: true }));
  backdrop.addEventListener('click', () => setOpen(false, { returnFocus: true }));
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.hasAttribute('data-nav-open')) {
      setOpen(false, { returnFocus: true });
    }
  });
}
