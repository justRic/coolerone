#!/usr/bin/env node
// Static server + /romfs/ proxy to https://mariokart8.online (no Python).
//   node serve.mjs
//   node serve.mjs 9000
import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const PORT = Number(process.argv[2]) || 8080;
const ORIGIN = 'https://mariokart8.online';
const CACHE = path.join(ROOT, 'romfs-cache');
fs.mkdirSync(CACHE, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.bin': 'application/octet-stream',
  '.szs': 'application/octet-stream',
  '.bars': 'application/octet-stream',
  '.byaml': 'application/octet-stream',
  '.bntx': 'application/octet-stream',
  '.bfres': 'application/octet-stream',
};

function send(res, code, data, type, extra = {}) {
  res.writeHead(code, {
    'Content-Type': type || 'application/octet-stream',
    'Content-Length': Buffer.byteLength(data),
    'Access-Control-Allow-Origin': '*',
    ...extra,
  });
  res.end(data);
}

function proxyRomfs(req, res, rel) {
  const cacheName = rel.replace(/[\/\\]/g, '__') || '__root__';
  const cachePath = path.join(CACHE, cacheName.slice(0, 200) || 'root');
  if (fs.existsSync(cachePath) && fs.statSync(cachePath).size > 0) {
    const data = fs.readFileSync(cachePath);
    let type = 'application/octet-stream';
    try { type = fs.readFileSync(cachePath + '.ctype', 'utf8').trim(); } catch {}
    send(res, 200, data, type, { 'Cache-Control': 'public, max-age=86400', 'X-Cache': 'HIT' });
    return;
  }
  const url = `${ORIGIN}/romfs/${rel}`;
  https.get(url, { headers: { 'User-Agent': 'mk8-serve/2' } }, (up) => {
    const chunks = [];
    up.on('data', (c) => chunks.push(c));
    up.on('end', () => {
      let data = Buffer.concat(chunks);
      let type = up.headers['content-type'] || 'application/octet-stream';
      if (up.statusCode !== 200) {
        send(res, up.statusCode || 502, data, type);
        return;
      }
      // fix relative hrefs in directory listings
      if (type.includes('text/html') && data.slice(0, 200).toString().includes('<ul>')) {
        const prefix = '/romfs/' + rel;
        let text = data.toString('utf8');
        text = text.replace(/href="([^"]+)"/g, (all, h) => {
          if (/^(https?:|\/|\?|#)/i.test(h)) return all;
          return `href="${prefix}${h}"`;
        });
        data = Buffer.from(text);
        type = 'text/html; charset=utf-8';
      }
      try {
        fs.writeFileSync(cachePath, data);
        fs.writeFileSync(cachePath + '.ctype', type);
      } catch {}
      send(res, 200, data, type, { 'Cache-Control': 'public, max-age=86400', 'X-Cache': 'MISS' });
    });
  }).on('error', (e) => {
    send(res, 502, String(e), 'text/plain');
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    });
    res.end();
    return;
  }
  const u = new URL(req.url || '/', `http://127.0.0.1`);
  let pathname = decodeURIComponent(u.pathname);

  if (pathname === '/romfs' || pathname.startsWith('/romfs/')) {
    const rel = pathname === '/romfs' ? '' : pathname.slice('/romfs/'.length);
    return proxyRomfs(req, res, rel);
  }

  if (pathname === '/') pathname = '/index.html';
  const file = path.normalize(path.join(ROOT, pathname));
  if (!file.startsWith(ROOT)) {
    send(res, 403, 'forbidden', 'text/plain');
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      send(res, err.code === 'ENOENT' ? 404 : 500, err.code === 'ENOENT' ? 'not found' : String(err), 'text/plain');
      return;
    }
    const ext = path.extname(file).toLowerCase();
    send(res, 200, data, MIME[ext] || 'application/octet-stream', {
      'Cache-Control': (ext === '.html' || ext === '.js') ? 'no-cache' : 'public, max-age=3600',
    });
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`MK8 Web → http://127.0.0.1:${PORT}/?sw=0&clear=1`);
  console.log(`/romfs/ proxied from ${ORIGIN} (cached in romfs-cache/)`);
});
