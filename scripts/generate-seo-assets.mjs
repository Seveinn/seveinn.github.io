#!/usr/bin/env node
/**
 * Generate robots.txt and sitemap.xml into public/ before Vite build.
 * Reads published blog index produced by build-blog-index.mjs.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_ORIGIN } from './site-config.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');
const publicDir = join(root, 'public');
const blogIndexPath = join(publicDir, 'data', 'blog', 'index.json');
const experimentsDir = join(publicDir, 'experiments');

function fail(msg) {
  console.error(`[generate-seo-assets] ${msg}`);
  process.exit(1);
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function listExperimentUrls() {
  if (!existsSync(experimentsDir)) return [];
  const urls = [];
  for (const name of readdirSync(experimentsDir)) {
    const dir = join(experimentsDir, name);
    if (!statSync(dir).isDirectory()) continue;
    const indexHtml = join(dir, 'index.html');
    const altHtml = join(dir, 'HealthAssitant.html');
    if (existsSync(indexHtml)) {
      urls.push(`${SITE_ORIGIN}/experiments/${name}/index.html`);
    } else if (existsSync(altHtml)) {
      urls.push(`${SITE_ORIGIN}/experiments/${name}/HealthAssitant.html`);
    }
  }
  return urls.sort();
}

function main() {
  if (!existsSync(blogIndexPath)) {
    fail(`missing ${blogIndexPath}; run build-blog-index first`);
  }

  const articles = JSON.parse(readFileSync(blogIndexPath, 'utf8')).filter(
    (a) => a.status === 'published'
  );

  const staticPages = [
    { loc: `${SITE_ORIGIN}/`, changefreq: 'weekly', priority: '1.0' },
    { loc: `${SITE_ORIGIN}/experiments`, changefreq: 'weekly', priority: '0.9' },
    { loc: `${SITE_ORIGIN}/translations`, changefreq: 'monthly', priority: '0.8' },
    { loc: `${SITE_ORIGIN}/blog`, changefreq: 'weekly', priority: '0.9' },
  ];

  const blogPages = articles.map((a) => ({
    loc: `${SITE_ORIGIN}/blog/${a.slug}`,
    lastmod: (a.updatedDate || a.publishDate || '').slice(0, 10) || undefined,
    changefreq: 'monthly',
    priority: '0.7',
  }));

  const experimentPages = listExperimentUrls().map((loc) => ({
    loc,
    changefreq: 'monthly',
    priority: '0.6',
  }));

  const all = [...staticPages, ...blogPages, ...experimentPages];

  const urlXml = all
    .map((entry) => {
      const parts = [`    <loc>${xmlEscape(entry.loc)}</loc>`];
      if (entry.lastmod) parts.push(`    <lastmod>${xmlEscape(entry.lastmod)}</lastmod>`);
      if (entry.changefreq) {
        parts.push(`    <changefreq>${xmlEscape(entry.changefreq)}</changefreq>`);
      }
      if (entry.priority) parts.push(`    <priority>${xmlEscape(entry.priority)}</priority>`);
      return `  <url>\n${parts.join('\n')}\n  </url>`;
    })
    .join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlXml}
</urlset>
`;

  const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_ORIGIN}/sitemap.xml
`;

  writeFileSync(join(publicDir, 'sitemap.xml'), sitemap, 'utf8');
  writeFileSync(join(publicDir, 'robots.txt'), robots, 'utf8');

  console.log(
    `[generate-seo-assets] wrote robots.txt + sitemap.xml (${all.length} URLs, ${articles.length} articles)`
  );
}

main();
