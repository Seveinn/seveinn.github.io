(function (global) {
  'use strict';

  const STORAGE_SCROLL = 'visual-center:scroll:';

  function slugify(text) {
    return String(text)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u4e00-\u9fff-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'section';
  }

  function uniqueId(base, used) {
    let id = base || 'section';
    let n = 2;
    while (used.has(id)) {
      id = base + '-' + n;
      n += 1;
    }
    used.add(id);
    return id;
  }

  function dirname(path) {
    const normalized = path.replace(/\\/g, '/');
    const idx = normalized.lastIndexOf('/');
    return idx >= 0 ? normalized.slice(0, idx + 1) : './';
  }

  function resolveRelative(baseDir, href) {
    if (!href || /^(https?:|mailto:|tel:|data:|#)/i.test(href)) {
      return href;
    }
    try {
      return new URL(href, new URL(baseDir, location.href)).pathname +
        (href.includes('?') ? '?' + href.split('?')[1].split('#')[0] : '') +
        (href.includes('#') ? '#' + href.split('#').pop() : '');
    } catch {
      return href;
    }
  }

  function fixRelativeUrls(root, baseDir) {
    root.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href');
      if (!href) return;
      if (/^(https?:)?\/\//i.test(href)) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
        return;
      }
      if (href.startsWith('#')) return;
      a.setAttribute('href', resolveRelative(baseDir, href));
    });

    root.querySelectorAll('img[src]').forEach((img) => {
      const src = img.getAttribute('src');
      if (!src || /^(https?:|data:)/i.test(src)) return;
      img.setAttribute('src', resolveRelative(baseDir, src));
    });
  }

  function enhanceCodeBlocks(root) {
    root.querySelectorAll('pre code').forEach((code) => {
      if (global.hljs) {
        global.hljs.highlightElement(code);
      }
      const pre = code.parentElement;
      if (!pre || pre.querySelector('.code-copy')) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'code-copy text-btn';
      btn.textContent = '复制';
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(code.textContent || '');
          btn.textContent = '已复制';
          setTimeout(() => { btn.textContent = '复制'; }, 1500);
        } catch {
          btn.textContent = '失败';
          setTimeout(() => { btn.textContent = '复制'; }, 1500);
        }
      });
      pre.appendChild(btn);
    });
  }

  function collectToc(root) {
    const used = new Set();
    const headings = [...root.querySelectorAll('h1, h2, h3, h4')];
    return headings.map((el) => {
      const text = el.textContent.trim();
      const id = uniqueId(el.id || slugify(text), used);
      el.id = id;
      return {
        id,
        text,
        depth: Number(el.tagName.slice(1))
      };
    });
  }

  function renderMarkdown(markdownText, filePath) {
    if (!global.marked || !global.DOMPurify) {
      throw new Error('Markdown 依赖未加载（marked / DOMPurify）。');
    }

    global.marked.setOptions({
      gfm: true,
      breaks: false
    });

    const dirty = global.marked.parse(markdownText);
    const clean = global.DOMPurify.sanitize(dirty, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ['target']
    });

    const canvas = document.createElement('article');
    canvas.className = 'markdown-canvas';
    canvas.innerHTML = clean;

    const baseDir = dirname(filePath);
    fixRelativeUrls(canvas, baseDir);
    enhanceCodeBlocks(canvas);
    const toc = collectToc(canvas);

    return { element: canvas, toc };
  }

  function saveScroll(docId, container) {
    if (!docId || !container) return;
    localStorage.setItem(STORAGE_SCROLL + docId, String(container.scrollTop || window.scrollY));
  }

  function restoreScroll(docId, container) {
    if (!docId) return;
    const raw = localStorage.getItem(STORAGE_SCROLL + docId);
    if (raw == null) return;
    const y = Number(raw);
    if (Number.isNaN(y)) return;
    requestAnimationFrame(() => {
      if (container && container !== document.documentElement) {
        container.scrollTop = y;
      } else {
        window.scrollTo(0, y);
      }
    });
  }

  global.VisualMarkdown = {
    renderMarkdown,
    saveScroll,
    restoreScroll,
    collectToc
  };
})(window);
