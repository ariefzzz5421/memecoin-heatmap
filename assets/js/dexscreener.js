import { brandedSourceLink } from './source-brands.js';
import { el } from './utils.js';

function embedUrl(pair) {
  if (!pair?.chain || !pair?.pairAddress) return '';
  const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  const params = new URLSearchParams({
    embed: '1',
    theme,
    trades: '0',
    info: '0',
  });
  return `https://dexscreener.com/${encodeURIComponent(pair.chain)}/${encodeURIComponent(pair.pairAddress)}?${params}`;
}

export function renderDexScreenerChart(holder, pair, tokenName) {
  holder.replaceChildren();
  const shell = el('div', { class: 'dex-chart-shell' });
  const copy = el('div', { class: 'dex-chart-copy' },
    el('div', {},
      el('h3', {}, 'Live DEX market'),
      el('p', {}, pair
        ? `${pair.dexName} · ${pair.base}/${pair.quote}. Pair selected from DEX Screener’s contract-address response.`
        : `${tokenName} has no verified canonical DEX pair configured.`),
    ),
  );

  if (!pair) {
    shell.append(
      copy,
      el('p', { class: 'note' },
        'No chart is embedded because matching by ticker alone can surface unrelated or spoofed tokens.'),
    );
    holder.append(shell);
    return;
  }

  const url = pair.url || `https://dexscreener.com/${pair.chain}/${pair.pairAddress}`;
  copy.append(brandedSourceLink({
    label: 'Open DEX Screener',
    url,
    note: `${pair.base}/${pair.quote}`,
    className: 'source-link dex-source-link',
  }));
  shell.append(
    copy,
    el('div', { class: 'dex-frame-wrap' },
      el('iframe', {
        class: 'dex-frame',
        src: embedUrl(pair),
        title: `${tokenName} ${pair.base}/${pair.quote} live DEX chart`,
        loading: 'lazy',
        referrerpolicy: 'no-referrer',
        allowfullscreen: 'true',
      }),
    ),
    el('p', { class: 'chart-coverage' },
      'Live pair data is provided by DEX Screener. It may begin after the token’s original launch and does not replace the sourced launch-to-ATH chart above.'),
  );
  holder.append(shell);
}
