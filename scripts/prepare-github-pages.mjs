#!/usr/bin/env node
/**
 * Post-build helpers for GitHub Pages:
 * 1) Copy index.html -> 404.html for SPA deep-link fallback
 * 2) Emit static HTML redirects for legacy Jekyll /posts/... URLs
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  copyFileSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_ORIGIN } from './site-config.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');
const distDir = join(root, 'dist');
const blogIndexPath = join(distDir, 'data', 'blog', 'index.json');

function fail(msg) {
  console.error(`[prepare-github-pages] ${msg}`);
  process.exit(1);
}

function buildRedirectHtml(fromPath, toPath) {
  const absoluteTo = `${SITE_ORIGIN}${toPath}`;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>Redirecting…</title>
  <meta http-equiv="refresh" content="0; url=${toPath}" />
  <link rel="canonical" href="${absoluteTo}" />
  <script>location.replace(${JSON.stringify(toPath)});</script>
</head>
<body>
  <p>This page has moved to <a href="${toPath}">${absoluteTo}</a>.</p>
</body>
</html>
`;
}

function main() {
  if (!existsSync(distDir)) {
    fail(`dist/ not found; run vite build first`);
  }

  const indexHtml = join(distDir, 'index.html');
  if (!existsSync(indexHtml)) {
    fail('dist/index.html missing');
  }

  copyFileSync(indexHtml, join(distDir, '404.html'));
  console.log('[prepare-github-pages] wrote dist/404.html (SPA fallback)');

  if (!existsSync(blogIndexPath)) {
    fail(`missing ${blogIndexPath}`);
  }

  const articles = JSON.parse(readFileSync(blogIndexPath, 'utf8'));
  let count = 0;

  for (const article of articles) {
    if (!article.legacyUrl || article.status !== 'published') continue;
    if (!article.legacyUrl.startsWith('/posts/')) {
      fail(`unexpected legacyUrl: ${article.legacyUrl}`);
    }

    const outPath = join(distDir, article.legacyUrl.replace(/^\//, ''));
    mkdirSync(dirname(outPath), { recursive: true });
    const target = `/blog/${article.slug}`;
    writeFileSync(outPath, buildRedirectHtml(article.legacyUrl, target), 'utf8');
    count += 1;
  }

  // Ensure CNAME has no BOM/tab leftovers in dist
  const cnameSrc = join(root, 'public', 'CNAME');
  if (existsSync(cnameSrc)) {
    const cleaned = readFileSync(cnameSrc, 'utf8').trim() + '\n';
    writeFileSync(join(distDir, 'CNAME'), cleaned, 'utf8');
  }

  console.log(`[prepare-github-pages] wrote ${count} legacy redirect page(s)`);
}

main();
