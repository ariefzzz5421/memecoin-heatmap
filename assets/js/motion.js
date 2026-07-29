const SELECTOR = [
  '.route-hero',
  '.breakout-section',
  '.breakout-preview-card',
  '.event-hero',
  '.event-key-facts',
  '.event-story-panel',
  '.event-history-panel',
  '.event-bottom-grid',
].join(',');

const seen = new WeakSet();
let sequence = 0;

function reveal(root = document) {
  const descendants = root.querySelectorAll ? [...root.querySelectorAll(SELECTOR)] : [];
  const nodes = [
    ...(root.matches?.(SELECTOR) ? [root] : []),
    ...descendants,
  ];
  nodes.forEach((node) => {
    if (seen.has(node)) return;
    seen.add(node);
    node.dataset.enter = '';
    node.style.setProperty('--enter-order', String(Math.min(sequence++, 6)));
    requestAnimationFrame(() => node.classList.add('is-entered'));
  });
}

export function initMotion() {
  document.documentElement.classList.add('motion-ready');
  reveal();
  const observer = new MutationObserver((records) => {
    records.forEach((record) => record.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) reveal(node);
    }));
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
