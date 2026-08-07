const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const client = path.join(dist, 'client');
const server = path.join(dist, 'server');

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(client, { recursive: true });
fs.mkdirSync(server, { recursive: true });

fs.copyFileSync(path.join(root, 'index.html'), path.join(client, 'index.html'));
for (const directory of ['assets', 'dashboard', 'maps', 'sentiment', 'cases', '2026-memecoins', 'nft']) {
  fs.cpSync(path.join(root, directory), path.join(client, directory), { recursive: true });
}
fs.copyFileSync(
  path.join(root, 'server', 'market-service.mjs'),
  path.join(server, 'market-service.mjs'),
);

fs.writeFileSync(
  path.join(server, 'index.js'),
  `import { getMarketPayload } from './market-service.mjs';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/market' || url.pathname === '/api/market/') {
      try {
        const payload = await getMarketPayload(url);
        const status = payload.status || (payload.ok === false ? 502 : 200);
        return Response.json(payload, {
          status,
          headers: {
            'Cache-Control': 'public, max-age=0, s-maxage=10, stale-while-revalidate=120',
          },
        });
      } catch (error) {
        return Response.json(
          { ok: false, error: error.message || 'Market data unavailable' },
          { status: 502 },
        );
      }
    }
    if (!url.pathname.includes('.') && !url.pathname.endsWith('/')) {
      return Response.redirect(url.origin + url.pathname + '/' + url.search, 308);
    }
    if (url.pathname.endsWith('/')) {
      url.pathname += 'index.html';
      return env.ASSETS.fetch(new Request(url, request));
    }
    return env.ASSETS.fetch(request);
  },
};
`,
);

const hostingFile = path.join(root, '.openai', 'hosting.json');
if (fs.existsSync(hostingFile)) {
  const distOpenAI = path.join(dist, '.openai');
  fs.mkdirSync(distOpenAI, { recursive: true });
  fs.copyFileSync(hostingFile, path.join(distOpenAI, 'hosting.json'));
}

console.log('Built client and shared market-data worker.');
