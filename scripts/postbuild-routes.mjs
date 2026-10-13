#!/usr/bin/env node
/**
 * POST-BUILD ROUTE SHELL & GITHUB PAGES 404 GENERATOR
 * (scripts/postbuild-routes.mjs)
 *
 * 1. Copies `dist/index.html` to `dist/dashboard/index.html` with route-specific
 *    `<title>`, `<meta name="description">`, Open Graph tags, and `<noscript>` copy
 *    so `/dashboard/` returns a real HTTP 200 on static hosts (GitHub Pages, Netlify, Vercel).
 * 2. Generates `dist/404.html` using the `spa-github-pages` redirect technique so
 *    any unknown deep link redirects cleanly back to the root shell and restores its URL.
 */

import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve(process.cwd(), 'dist');
const rootHtmlPath = path.join(distDir, 'index.html');

if (!fs.existsSync(rootHtmlPath)) {
  console.error('[postbuild-routes] dist/index.html not found. Run vite build first.');
  process.exit(1);
}

const rootHtml = fs.readFileSync(rootHtmlPath, 'utf8');
const rawBase = (process.env.VITE_BASE || '/').replace(/\/+$/, '');
const basePrefix = rawBase === '' ? '' : rawBase;
const pathSegmentsToKeep = rawBase === '' ? 0 : rawBase.split('/').filter(Boolean).length;

// 1. Emit dist/dashboard/index.html with route-specific meta & Open Graph tags
const dashboardTitle = 'DASHBOARD // EVA-01 TELEMETRY — JONATHAN ERICK CHRISTOVANDY';
const dashboardDesc =
  'Live Discord telemetry cockpit and hand-inked Eva-01 berserk silhouette for Jonathan Erick Christovandy.';
const dashboardOgImage = `${basePrefix}/og-dashboard.svg`;

const dashboardHtml = rootHtml
  .replace(/<title>[\s\S]*?<\/title>/, `<title>${dashboardTitle}</title>`)
  .replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
    `<meta name="description" content="${dashboardDesc}" />`,
  )
  .replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:title" content="${dashboardTitle}" />`,
  )
  .replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:description" content="${dashboardDesc}" />`,
  )
  .replace(
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:image" content="${dashboardOgImage}" />`,
  )
  .replace(
    /JONATHAN ERICK CHRISTOVANDY — PILOT FILE/,
    'JONATHAN ERICK CHRISTOVANDY — EVA-01 TELEMETRY DASHBOARD',
  );

const dashboardDir = path.join(distDir, 'dashboard');
fs.mkdirSync(dashboardDir, { recursive: true });
fs.writeFileSync(path.join(dashboardDir, 'index.html'), dashboardHtml, 'utf8');

// 2. Emit dist/404.html using the spa-github-pages redirect technique
const notFoundHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="theme-color" content="#FAFAF8" />
    <title>REDIRECTING // PILOT FILE</title>
    <script type="text/javascript">
      // Single Page Apps for GitHub Pages (https://github.com/rafgraph/spa-github-pages)
      var pathSegmentsToKeep = ${pathSegmentsToKeep};
      var l = window.location;
      l.replace(
        l.protocol +
          '//' +
          l.hostname +
          (l.port ? ':' + l.port : '') +
          l.pathname
            .split('/')
            .slice(0, 1 + pathSegmentsToKeep)
            .join('/') +
          '/?/' +
          l.pathname
            .slice(1)
            .split('/')
            .slice(pathSegmentsToKeep)
            .join('/')
            .replace(/&/g, '~and~') +
          (l.search ? '&' + l.search.slice(1).replace(/&/g, '~and~') : '') +
          l.hash
      );
    </script>
  </head>
  <body style="background:#FAFAF8;color:#0A0A0A;font-family:monospace;padding:2rem;">
    REDIRECTING TO PILOT FILE SHELL...
  </body>
</html>
`;

fs.writeFileSync(path.join(distDir, '404.html'), notFoundHtml, 'utf8');

console.log(
  `[postbuild-routes] Generated dist/dashboard/index.html and dist/404.html (pathSegmentsToKeep=${pathSegmentsToKeep})`,
);
