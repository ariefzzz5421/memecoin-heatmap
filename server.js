/* ============================================================
   server.js — server statis tanpa dependensi.
   Situs harus dilayani lewat http://localhost (bukan file://)
   karena beberapa API (OKX) memantulkan header Origin dan
   menolak origin "null".

   Jalankan:  node server.js
   ============================================================ */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 5173;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end('Bad request');
    return;
  }
  if (urlPath === '/') urlPath = '/index.html';
  else if (!path.extname(urlPath)) urlPath = `${urlPath.replace(/\/$/, '')}/index.html`;

  const filePath = path.resolve(ROOT, `.${urlPath}`);
  const relative = path.relative(ROOT, filePath);
  // Cegah traversal keluar dari direktori proyek, termasuk path dengan prefix mirip.
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 — tidak ditemukan: ' + urlPath);
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
});

server.listen(PORT, () => {
  console.log(`\n  Crypto Heatmap Volume berjalan di:\n  http://localhost:${PORT}\n`);
  console.log('  Tekan Ctrl+C untuk berhenti.\n');
});
