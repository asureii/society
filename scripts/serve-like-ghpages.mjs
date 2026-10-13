#!/usr/bin/env node
/**
 * LOCAL GITHUB PAGES STATIC SERVER SIMULATOR
 * (scripts/serve-like-ghpages.mjs)
 *
 * Mimics GitHub Pages behavior against `./dist`:
 * - Serves static files with proper MIME types.
 * - Directory path without trailing slash (e.g. `/dashboard`) -> HTTP 301 redirect to `/dashboard/`.
 * - Directory path with trailing slash (e.g. `/` or `/dashboard/`) -> HTTP 200 `index.html` inside that directory.
 * - Unknown paths -> HTTP 404 with the body of `dist/404.html` (which executes the spa-github-pages redirect in browsers).
 */

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const distDir = path.resolve(process.cwd(), 'dist');
const portArgIdx = process.argv.indexOf('--port');
const PORT =
  portArgIdx !== -1 && process.argv[portArgIdx + 1]
    ? Number(process.argv[portArgIdx + 1])
    : Number(process.env.PORT || 4174);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
};

export function createGhPagesServer(rootDir = distDir) {
  return http.createServer((req, res) => {
    const rawUrl = req.url || '/';
    const [rawPathname, queryStr] = rawUrl.split('?');
    const search = queryStr ? `?${queryStr}` : '';
    const safeRel = path.posix
      .normalize(decodeURIComponent(rawPathname))
      .replace(/^(\.\.(\/|\\|$))+/, '');

    const fsPath = path.join(rootDir, safeRel);

    if (fs.existsSync(fsPath)) {
      const stat = fs.statSync(fsPath);
      if (stat.isDirectory()) {
        if (!rawPathname.endsWith('/')) {
          res.writeHead(301, { Location: `${rawPathname}/${search}` });
          res.end();
          return;
        }
        const indexHtml = path.join(fsPath, 'index.html');
        if (fs.existsSync(indexHtml)) {
          const body = fs.readFileSync(indexHtml);
          res.writeHead(200, { 'Content-Type': MIME_TYPES['.html'] });
          res.end(body);
          return;
        }
      } else if (stat.isFile()) {
        const ext = path.extname(fsPath).toLowerCase();
        const mime = MIME_TYPES[ext] || 'application/octet-stream';
        const body = fs.readFileSync(fsPath);
        res.writeHead(200, { 'Content-Type': mime });
        res.end(body);
        return;
      }
    }

    // Fallback: serve dist/404.html with status 404 (matching GitHub Pages)
    const fallback404 = path.join(rootDir, '404.html');
    if (fs.existsSync(fallback404)) {
      const body = fs.readFileSync(fallback404);
      res.writeHead(404, { 'Content-Type': MIME_TYPES['.html'] });
      res.end(body);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = createGhPagesServer(distDir);
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[serve-like-ghpages] Serving ./dist at http://127.0.0.1:${PORT}`);
  });
}
