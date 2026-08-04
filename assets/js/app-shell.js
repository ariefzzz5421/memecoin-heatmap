const DESKTOP_MEDIA = window.matchMedia('(min-width: 60rem)');

function createMenuButton(nav) {
  const button = document.createElement('button');
  button.className = 'nav-toggle';
  button.type = 'button';
  button.dataset.navToggle = '';
  button.setAttribute('aria-controls', nav.id);
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-label', 'Open navigation');
  button.innerHTML = '<span></span><span></span><span></span>';
  return button;
}

export function initAppShell() {
  const header = document.querySelector('.site-head');
  const nav = header?.querySelector('.primary-nav');
  const actions = header?.querySelector('.head-actions');
  if (!header || !nav || !actions) return;

  nav.id ||= 'primaryNavigation';
  const toggle = header.querySelector('[data-nav-toggle]') || createMenuButton(nav);
  if (!toggle.isConnected) actions.append(toggle);

  let backdrop = document.querySelector('.nav-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('button');
    backdrop.className = 'nav-backdrop';
    backdrop.type = 'button';
    backdrop.tabIndex = -1;
    backdrop.setAttribute('aria-label', 'Close navigation');
    document.body.append(backdrop);
  }

  const setOpen = (open, { returnFocus = false } = {}) => {
    const next = Boolean(open && !DESKTOP_MEDIA.matches);
    document.body.toggleAttribute('data-nav-open', next);
    toggle.setAttribute('aria-expanded', String(next));
    toggle.setAttribute('aria-label', next ? 'Close navigation' : 'Open navigation');
    backdrop.hidden = !next;
    if (next) {
      requestAnimationFrame(() => (nav.querySelector('[aria-current="page"]') || nav.querySelector('a'))?.focus());
    } else if (returnFocus) {
      toggle.focus({ preventScroll: true });
    }
  };

  backdrop.hidden = true;
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
  DESKTOP_MEDIA.addEventListener?.('change', () => setOpen(false));
}
