import { refreshPalette } from './utils.js';
import { initMotion } from './motion.js';
import { initAppShell } from './app-shell.js';
import { hydrateSourceLinks } from './source-brands.js';

const STORAGE_KEY = 'heatmap-volume-theme';
const root = document.documentElement;
const media = window.matchMedia('(prefers-color-scheme: light)');

function savedTheme() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function applyTheme(theme, persist = false) {
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  if (persist) {
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* storage can be disabled */ }
  }

  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    const next = theme === 'dark' ? 'light' : 'dark';
    button.setAttribute('aria-label', `Switch to ${next} theme`);
    button.setAttribute('title', `Switch to ${next} theme`);
  });

  requestAnimationFrame(() => {
    refreshPalette();
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
    window.dispatchEvent(new Event('resize'));
  });
}

applyTheme(savedTheme() || (media.matches ? 'light' : 'dark'));

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-theme-toggle]');
  if (!button) return;
  applyTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', true);
});

media.addEventListener?.('change', (event) => {
  if (!savedTheme()) applyTheme(event.matches ? 'light' : 'dark');
});

function initSharedUi() {
  initAppShell();
  hydrateSourceLinks();
  initMotion();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSharedUi);
else initSharedUi();
