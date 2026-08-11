#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');
const contentDir = join(root, 'content', 'blog');
const outDir = join(root, 'public', 'data', 'blog');
const articlesOutDir = join(outDir, 'articles');

const includeDrafts = process.argv.includes('--include-drafts');

const REQUIRED = ['title', 'slug', 'publishDate', 'author', 'categories', 'tags', 'excerpt', 'status'];

function fail(message) {
  console.error(`[build-blog-index] ${message}`);
  process.exit(1);
}

function ensureArray(value, field, file) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map(String);
  fail(`${file}: ${field} must be an array`);
}

function normalizeDate(value, field, file) {
  if (value === undefined || value === null || value === '') {
    fail(`${file}: missing required field "${field}"`);
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      fail(`${file}: ${field} is not a valid date`);
    }
    return value.toISOString();
  }
  const text = String(value);
  if (Number.isNaN(Date.parse(text))) {
    fail(`${file}: ${field} is not a valid date: ${text}`);
  }
  return text;
}

function validateArticle(data, file) {
  for (const key of REQUIRED) {
    if (data[key] === undefined || data[key] === null || data[key] === '') {
      fail(`${file}: missing required field "${key}"`);
    }
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) {
    fail(`${file}: slug must be URL-safe kebab-case, got "${data.slug}"`);
  }

  if (data.status !== 'published' && data.status !== 'draft') {
    fail(`${file}: status must be "published" or "draft"`);
  }

  if (!Array.isArray(data.categories)) {
    fail(`${file}: categories must be an array`);
  }
  if (!Array.isArray(data.tags)) {
    fail(`${file}: tags must be an array`);
  }
}

function main() {
  if (!existsSync(contentDir)) {
    fail(`content directory not found: ${contentDir}`);
  }

  mkdirSync(articlesOutDir, { recursive: true });

  // Clean previous generated article JSON files
  for (const name of readdirSync(articlesOutDir)) {
    if (name.endsWith('.json')) {
      rmSync(join(articlesOutDir, name));
    }
  }

  const files = readdirSync(contentDir).filter((name) =>
    ['.md', '.markdown'].includes(extname(name).toLowerCase())
  );

  if (files.length === 0) {
    fail('no markdown files found in content/blog');
  }

  const seenSlugs = new Set();
  const seenLegacyUrls = new Set();
  const articles = [];

  for (const file of files) {
    const fullPath = join(contentDir, file);
    const raw = readFileSync(fullPath, 'utf8');
    const parsed = matter(raw);
    const publishDate = normalizeDate(parsed.data.publishDate, 'publishDate', file);
    const updatedDate = normalizeDate(
      parsed.data.updatedDate ?? parsed.data.publishDate,
      'updatedDate',
      file
    );

    const data = {
      ...parsed.data,
      publishDate,
      updatedDate,
      categories: ensureArray(parsed.data.categories, 'categories', file),
      tags: ensureArray(parsed.data.tags, 'tags', file),
      author: parsed.data.author || 'Seveinn',
    };

    validateArticle(data, file);

    if (seenSlugs.has(data.slug)) {
      fail(`duplicate slug "${data.slug}" in ${file}`);
    }
    seenSlugs.add(data.slug);

    if (data.legacyUrl) {
      if (seenLegacyUrls.has(data.legacyUrl)) {
        fail(`duplicate legacyUrl "${data.legacyUrl}" in ${file}`);
      }
      seenLegacyUrls.add(data.legacyUrl);
    }

    const article = {
      title: String(data.title),
      slug: String(data.slug),
      publishDate: String(data.publishDate),
      updatedDate: String(data.updatedDate),
      author: String(data.author),
      categories: data.categories,
      tags: data.tags,
      excerpt: String(data.excerpt),
      status: data.status,
      ...(data.legacyUrl ? { legacyUrl: String(data.legacyUrl) } : {}),
      content: parsed.content.replace(/^\uFEFF/, '').trim(),
    };

    const shouldEmit =
      article.status === 'published' || (includeDrafts && article.status === 'draft');

    if (shouldEmit) {
      writeFileSync(
        join(articlesOutDir, `${article.slug}.json`),
        JSON.stringify(article, null, 2) + '\n',
        'utf8'
      );
      articles.push(article);
    }
  }

  const index = articles
    .map(({ content, ...meta }) => meta)
    .sort(
      (a, b) =>
        new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
    );

  writeFileSync(join(outDir, 'index.json'), JSON.stringify(index, null, 2) + '\n', 'utf8');

  // Remove legacy placeholder if present
  const legacyPath = join(outDir, 'articles.json');
  if (existsSync(legacyPath)) {
    rmSync(legacyPath);
  }

  console.log(
    `[build-blog-index] wrote ${index.length} article(s) to public/data/blog (includeDrafts=${includeDrafts})`
  );
}

main();
