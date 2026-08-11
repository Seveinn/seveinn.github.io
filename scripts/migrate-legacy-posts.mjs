import {
  readdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  mkdirSync,
  existsSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');
const postsDir = join(root, '_posts');
const contentDir = join(root, 'content', 'blog');
const assetsRoot = join(root, 'public', 'blog-assets');
const reportPath = join(root, 'migration-posts-report.md');

/** @type {Record<string, string>} */
const SLUG_BY_SOURCE = {
  '2021-03-26-front-structure.markdown': 'front-end-engineering-code-style',
  '2021-03-26-read-note.markdown': 'front-end-reading-notes',
  '2021-03-31-react-other.markdown': 'react-redux-react-router',
  'vue笔记.markdown': 'vue-interview-notes',
  'vue高级特性.markdown': 'vue-advanced-features',
  'vue基础.markdown': 'vue-basics',
  'vue原理.markdown': 'vue-principle',
  'vue面试.markdown': 'vue-interview-questions',
  'vue3面试.markdown': 'vue3-interview-questions',
  'react高级特性.markdown': 'react-advanced-features',
  'react基础.markdown': 'react-basics',
  'react面试.markdown': 'react-interview-questions',
};

/** @type {Record<string, string>} */
const LEGACY_URL_BY_SOURCE = {
  '2021-03-26-front-structure.markdown': '/posts/2021/03/26/front-structure.html',
  '2021-03-26-read-note.markdown': '/posts/2021/03/26/read-note.html',
  '2021-03-31-react-other.markdown': '/posts/2021/03/31/react-other.html',
  'vue笔记.markdown': '/posts/2021/03/23/vue-note.html',
  'vue高级特性.markdown': '/posts/2021/03/24/vue-advance.html',
  'vue基础.markdown': '/posts/2021/03/24/vue-basic.html',
  'vue原理.markdown': '/posts/2021/03/24/vue-principle.html',
  'vue面试.markdown': '/posts/2021/03/26/vue-exam.html',
  'vue3面试.markdown': '/posts/2021/03/27/vue3-exam.html',
  'react高级特性.markdown': '/posts/2021/03/31/react-advanced.html',
  'react基础.markdown': '/posts/2021/03/31/react-basic.html',
  'react面试.markdown': '/posts/2021/03/31/react-exam.html',
};

const SKIP_FILES = new Set([
  'todo.md',
  '面试问题汇总.md',
  '2022-05-13-动画师生存手册.markdown',
]);

function failCollect(errors, msg) {
  errors.push(msg);
}

function toIsoFromJekyllDate(dateValue, file, errors) {
  if (dateValue instanceof Date) {
    if (Number.isNaN(dateValue.getTime())) {
      failCollect(errors, `${file}: invalid date object`);
      return null;
    }
    const y = dateValue.getFullYear();
    const m = String(dateValue.getMonth() + 1).padStart(2, '0');
    const d = String(dateValue.getDate()).padStart(2, '0');
    const hh = String(dateValue.getHours()).padStart(2, '0');
    const mm = String(dateValue.getMinutes()).padStart(2, '0');
    const ss = String(dateValue.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}+08:00`;
  }

  const text = String(dateValue).trim();
  const m = text.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?\s*([+-]\d{4}|[+-]\d{2}:\d{2})?$/
  );
  if (!m) {
    if (/^\d{4}-\d{2}-\d{2}T/.test(text) && !Number.isNaN(Date.parse(text))) {
      return text;
    }
    failCollect(errors, `${file}: cannot parse date "${text}"`);
    return null;
  }

  const [, y, mo, d, hh = '00', mi = '00', ss = '00', tzRaw] = m;
  let tz = '+08:00';
  if (tzRaw) {
    tz = /^[+-]\d{4}$/.test(tzRaw)
      ? `${tzRaw.slice(0, 3)}:${tzRaw.slice(3)}`
      : tzRaw;
  }
  return `${y}-${mo}-${d}T${hh}:${mi}:${ss}${tz}`;
}

function normalizeCategories(cats) {
  if (!cats) return [];
  if (Array.isArray(cats)) {
    return cats.map(String).map((c) => c.trim()).filter(Boolean);
  }
  if (typeof cats === 'string') return [cats.trim()].filter(Boolean);
  return [];
}

function excerptFromContent(content) {
  const text = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_>~|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return '（暂无摘要）';
  if (text.length <= 160) return text;
  return `${text.slice(0, 160).trimEnd()}…`;
}

function resolveImageCandidates(src, publishDateIso) {
  const cleaned = src.replace(/^\.\//, '').trim();
  const candidates = [];

  if (cleaned.startsWith('/')) {
    candidates.push(join(root, cleaned.slice(1)));
  }

  const dateMatch = publishDateIso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    const [, yy, mm, dd] = dateMatch;
    candidates.push(join(root, 'posts', yy, mm, dd, basename(cleaned)));
    candidates.push(join(root, 'posts', yy, mm, dd, cleaned));
  }

  candidates.push(join(postsDir, cleaned));
  candidates.push(join(postsDir, basename(cleaned)));
  candidates.push(join(root, 'posts', '2021', '03', '26', basename(cleaned)));
  candidates.push(join(root, 'posts', '2021', '03', '31', basename(cleaned)));

  return [...new Set(candidates)];
}

function migrateImages(content, slug, publishDateIso, errors, file) {
  const mdImgs = [...content.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
  const htmlImgs = [...content.matchAll(/<img([^>]*?)src=["']([^"']+)["']([^>]*)>/gi)];

  let next = content;
  let imageCount = 0;
  const refs = [];
  const missing = [];
  const assetDir = join(assetsRoot, slug);
  mkdirSync(assetDir, { recursive: true });

  function relocate(src) {
    if (/^https?:\/\//i.test(src) || src.startsWith('data:')) {
      return src;
    }

    const found = resolveImageCandidates(src, publishDateIso).find((p) =>
      existsSync(p)
    );
    if (!found) {
      missing.push(src);
      return src;
    }

    const fileName = basename(found).toLowerCase();
    const dest = join(assetDir, fileName);
    copyFileSync(found, dest);
    imageCount += 1;
    const newSrc = `/blog-assets/${slug}/${fileName}`;
    refs.push({ from: src, to: newSrc });
    return newSrc;
  }

  for (const match of mdImgs) {
    const [full, alt, src] = match;
    const newSrc = relocate(src.trim());
    if (newSrc !== src.trim()) {
      next = next.replace(full, `![${alt}](${newSrc})`);
    }
  }

  for (const match of htmlImgs) {
    const [full, pre, src, post] = match;
    const newSrc = relocate(src.trim());
    if (newSrc !== src.trim()) {
      next = next.replace(full, `<img${pre}src="${newSrc}"${post}>`);
    }
  }

  if (missing.length) {
    failCollect(errors, `${file}: missing images: ${missing.join(', ')}`);
  }

  return { content: next, imageCount, refs };
}

function buildFrontMatter(meta) {
  const lines = ['---'];
  lines.push(`title: ${JSON.stringify(meta.title)}`);
  lines.push(`slug: ${meta.slug}`);
  lines.push(`publishDate: ${JSON.stringify(meta.publishDate)}`);
  lines.push(`updatedDate: ${JSON.stringify(meta.updatedDate)}`);
  lines.push('author: Seveinn');
  lines.push('categories:');
  if (meta.categories.length === 0) lines.push('  []');
  else for (const c of meta.categories) lines.push(`  - ${c}`);
  lines.push('tags:');
  if (meta.tags.length === 0) lines.push('  []');
  else for (const t of meta.tags) lines.push(`  - ${t}`);
  lines.push(`excerpt: ${JSON.stringify(meta.excerpt)}`);
  lines.push(`status: ${meta.status}`);
  if (meta.legacyUrl) lines.push(`legacyUrl: ${meta.legacyUrl}`);
  lines.push('---');
  lines.push('');
  return lines.join('\n');
}

function main() {
  mkdirSync(contentDir, { recursive: true });
  mkdirSync(assetsRoot, { recursive: true });

  const allFiles = readdirSync(postsDir).filter((f) =>
    /\.(md|markdown)$/i.test(f)
  );
  const skipped = [];
  const rows = [];
  const errors = [];
  const seenSlugs = new Set();
  const seenLegacy = new Set();
  /** @type {Map<string, string>} */
  const slugToOutName = new Map();

  for (const file of allFiles) {
    if (SKIP_FILES.has(file)) {
      const size = statSync(join(postsDir, file)).size;
      skipped.push({
        file,
        size,
        reason:
          size === 0
            ? 'empty placeholder'
            : 'not a formal blog post for this migration batch',
      });
      continue;
    }

    const fullPath = join(postsDir, file);
    const raw = readFileSync(fullPath, 'utf8');
    if (!raw.startsWith('---')) {
      failCollect(errors, `${file}: missing YAML front matter`);
      continue;
    }

    let parsed;
    try {
      parsed = matter(raw);
    } catch (e) {
      failCollect(errors, `${file}: front matter parse failed: ${e.message}`);
      continue;
    }

    const data = parsed.data || {};
    if (!data.title) {
      failCollect(errors, `${file}: missing title`);
      continue;
    }
    if (!data.date) {
      failCollect(errors, `${file}: missing date`);
      continue;
    }

    const slug = SLUG_BY_SOURCE[file];
    if (!slug) {
      failCollect(errors, `${file}: no slug mapping configured`);
      continue;
    }
    if (seenSlugs.has(slug)) {
      failCollect(errors, `${file}: duplicate slug ${slug}`);
      continue;
    }
    seenSlugs.add(slug);

    const publishDate = toIsoFromJekyllDate(data.date, file, errors);
    if (!publishDate) continue;

    const categories = normalizeCategories(data.categories);
    const tags = normalizeCategories(data.tags);
    const legacyUrl = LEGACY_URL_BY_SOURCE[file];
    if (!legacyUrl) {
      failCollect(errors, `${file}: no legacyUrl mapping configured`);
      continue;
    }
    if (seenLegacy.has(legacyUrl)) {
      failCollect(errors, `${file}: duplicate legacyUrl ${legacyUrl}`);
      continue;
    }
    seenLegacy.add(legacyUrl);

    let body = parsed.content.replace(/^\uFEFF/, '').replace(/^\r?\n/, '');
    body = body.replace(/^\s*\[toc\]\s*$/gim, '').replace(/^\r?\n+/, '');

    const imgResult = migrateImages(body, slug, publishDate, errors, file);
    if (errors.some((e) => e.startsWith(`${file}:`))) continue;
    body = imgResult.content;

    const excerpt = excerptFromContent(body);
    const outName = `${publishDate.slice(0, 10)}-${slug}.md`;
    const outPath = join(contentDir, outName);
    slugToOutName.set(slug, outName);

    const meta = {
      title: String(data.title).trim(),
      slug,
      publishDate,
      updatedDate: publishDate,
      author: 'Seveinn',
      categories,
      tags,
      excerpt,
      status: 'published',
      legacyUrl,
    };

    const output = `${buildFrontMatter(meta)}${body.replace(/\s+$/, '')}\n`;
    writeFileSync(outPath, output, 'utf8');

    rows.push({
      oldFile: `_posts/${file}`,
      legacyUrl,
      newFile: `content/blog/${outName}`,
      newUrl: `/blog/${slug}`,
      images: imgResult.imageCount,
      status: 'ok',
      note: imgResult.refs.map((r) => `${r.from} → ${r.to}`).join('; '),
    });
  }

  // Remove superseded content files for the same slug
  for (const existing of readdirSync(contentDir)) {
    if (!/\.md$/i.test(existing)) continue;
    const text = readFileSync(join(contentDir, existing), 'utf8');
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) continue;
    const slugLine = m[1].split(/\r?\n/).find((l) => l.startsWith('slug:'));
    const slug = slugLine ? slugLine.replace(/^slug:\s*/, '').trim() : '';
    const expected = slugToOutName.get(slug);
    if (slug && expected && existing !== expected) {
      unlinkSync(join(contentDir, existing));
      rows.push({
        oldFile: '(cleanup)',
        legacyUrl: '-',
        newFile: `content/blog/${existing}`,
        newUrl: `/blog/${slug}`,
        images: 0,
        status: 'removed-duplicate',
        note: `removed superseded file; kept ${expected}`,
      });
    }
  }

  const lines = [];
  lines.push('# 旧文章迁移对照表');
  lines.push('');
  lines.push(`生成时间: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## 正式文章');
  lines.push('');
  lines.push('| 旧文件 | 旧 URL | 新文件 | 新 URL | 图片数 | 状态 | 备注 |');
  lines.push('|---|---|---|---|---:|---|---|');
  for (const r of rows.filter((x) => x.status === 'ok')) {
    lines.push(
      `| \`${r.oldFile}\` | \`${r.legacyUrl}\` | \`${r.newFile}\` | \`${r.newUrl}\` | ${r.images} | ${r.status} | ${r.note || ''} |`
    );
  }

  lines.push('');
  lines.push('## 跳过 / 异常');
  lines.push('');
  for (const s of skipped) {
    lines.push(`- \`${s.file}\` (size=${s.size}): ${s.reason}`);
  }
  for (const e of errors) {
    lines.push(`- ERROR: ${e}`);
  }
  for (const r of rows.filter((x) => x.status !== 'ok')) {
    lines.push(`- ${r.status}: \`${r.newFile}\` — ${r.note}`);
  }
  lines.push('');
  lines.push(`正式迁移成功: ${rows.filter((r) => r.status === 'ok').length}`);
  lines.push(`跳过: ${skipped.length}`);
  lines.push(`错误: ${errors.length}`);

  writeFileSync(reportPath, lines.join('\n'), 'utf8');
  console.log(lines.join('\n'));

  if (errors.length) {
    console.error(`\n[migrate-legacy-posts] failed with ${errors.length} error(s)`);
    process.exit(1);
  }

  console.log('\n[migrate-legacy-posts] completed successfully');
}

main();
