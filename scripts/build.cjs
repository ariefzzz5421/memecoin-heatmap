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
for (const directory of ['assets', 'maps', 'sentiment']) {
  fs.cpSync(path.join(root, directory), path.join(client, directory), { recursive: true });
}

fs.writeFileSync(
  path.join(server, 'index.js'),
  `export default {
  async fetch(request, env) {
    const url = new URL(request.url);
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

console.log('Built static client and Cloudflare Worker entry.');
