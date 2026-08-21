#!/usr/bin/env node
/**
 * Post-build helpers for GitHub Pages:
 * 1) Copy index.html -> 404.html for SPA deep-link fallback
 * 2) Normalize the custom domain file
 */
import {
  readFileSync,
  writeFileSync,
  existsSync,
  copyFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');
const distDir = join(root, 'dist');

function fail(msg) {
  console.error(`[prepare-github-pages] ${msg}`);
  process.exit(1);
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

  // Ensure CNAME has no BOM/tab leftovers in dist
  const cnameSrc = join(root, 'public', 'CNAME');
  if (existsSync(cnameSrc)) {
    const cleaned = readFileSync(cnameSrc, 'utf8').trim() + '\n';
    writeFileSync(join(distDir, 'CNAME'), cleaned, 'utf8');
  }

}

main();
