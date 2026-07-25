(function () {
  'use strict';

  const STORAGE = {
    theme: 'visual-center:theme',
    last: 'visual-center:last-item',
    navCollapsed: 'visual-center:nav-collapsed'
  };

  const els = {
    navTree: document.getElementById('nav-tree'),
    tocNav: document.getElementById('toc-nav'),
    sidebarNav: document.getElementById('sidebar-nav'),
    sidebarToc: document.getElementById('sidebar-toc'),
    preview: document.getElementById('preview-stage'),
    toolbar: document.getElementById('content-toolbar'),
    title: document.getElementById('content-title'),
    path: document.getElementById('content-path'),
    actions: document.getElementById('content-actions'),
    openExternal: document.getElementById('open-external'),
    themeSelect: document.getElementById('theme-select'),
    searchInput: document.getElementById('global-search'),
    searchResults: document.getElementById('search-results'),
    navToggle: document.getElementById('nav-toggle'),
    tocToggle: document.getElementById('toc-toggle'),
    tocClose: document.getElementById('toc-toggle-close'),
    backdrop: document.getElementById('drawer-backdrop'),
    helpBtn: document.getElementById('help-btn'),
    helpDialog: document.getElementById('help-dialog'),
    hljsLight: document.getElementById('hljs-light'),
    hljsDark: document.getElementById('hljs-dark')
  };

  /** @type {{documents: any[], tools: any[]}} */
  let manifest = { documents: [], tools: [] };
  /** @type {Map<string, any>} */
  const itemMap = new Map();
  let currentItem = null;
  let currentIframe = null;
  let searchIndex = null;
  let tocObserver = null;
  let scrollSaveTimer = null;

  function resolveUrl(relativePath) {
    return new URL(relativePath, window.location.href).href;
  }

  function displayPath(relativePath) {
    return relativePath.replace(/^\.\.\//, '');
  }

  function applyTheme(theme) {
    const value = theme || 'system';
    document.documentElement.setAttribute('data-theme', value);
    localStorage.setItem(STORAGE.theme, value);
    els.themeSelect.value = value;
    syncHighlightTheme();
  }

  function syncHighlightTheme() {
    const theme = document.documentElement.getAttribute('data-theme') || 'system';
    let dark = theme === 'dark';
    if (theme === 'system') {
      dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    els.hljsLight.disabled = dark;
    els.hljsDark.disabled = !dark;
  }

  function setDrawer(which, open) {
    if (which === 'nav') {
      els.sidebarNav.classList.toggle('is-open', open);
      els.navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    if (which === 'toc') {
      els.sidebarToc.classList.toggle('is-open', open);
      els.tocToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    const anyOpen = els.sidebarNav.classList.contains('is-open') ||
      els.sidebarToc.classList.contains('is-open');
    els.backdrop.hidden = !anyOpen;
  }

  function closeDrawers() {
    setDrawer('nav', false);
    setDrawer('toc', false);
  }

  function showStatus(kind, title, message, pathText, extraButtons) {
    els.sidebarToc.hidden = true;
    els.tocToggle.hidden = true;
    els.toolbar.hidden = true;
    els.openExternal.hidden = true;
    const panel = document.createElement('div');
    panel.className = 'status-panel' + (kind === 'error' ? ' status-panel--error' : '');
    panel.innerHTML =
      '<h2></h2><p class="status-message"></p>' +
      (pathText ? '<p class="content-toolbar__path"></p>' : '') +
      '<div class="embed-actions"></div>';
    panel.querySelector('h2').textContent = title;
    panel.querySelector('.status-message').textContent = message;
    if (pathText) {
      panel.querySelector('.content-toolbar__path').textContent = pathText;
    }
    const actions = panel.querySelector('.embed-actions');
    (extraButtons || []).forEach((btn) => actions.appendChild(btn));
    els.preview.replaceChildren(panel);
  }

  function setServerBanner(visible, text) {
    let bar = document.getElementById('server-banner');
    if (!visible) {
      if (bar) bar.hidden = true;
      return;
    }
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'server-banner';
      bar.className = 'server-banner';
      bar.setAttribute('role', 'alert');
      document.body.prepend(bar);
    }
    bar.hidden = false;
    bar.textContent = text || '本地服务已断开。请重新双击「start-visual-center.bat」。';
  }

  async function checkServerHealth() {
    if (location.protocol === 'file:') return false;
    const ok = await window.VisualTool.probeUrl(new URL('/health', location.origin).href, 2500);
    setServerBanner(!ok);
    return ok;
  }

  function makeButton(label, onClick, primary) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'text-btn' + (primary ? ' text-btn--primary' : '');
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function updateNavActive(id) {
    els.navTree.querySelectorAll('.nav-item').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.id === id);
    });
  }

  function renderNav() {
    const frag = document.createDocumentFragment();

    function addSection(label, items, type) {
      if (!items.length) return;
      const groups = new Map();
      items.forEach((item) => {
        const cat = item.category || '未分类';
        if (!groups.has(cat)) groups.set(cat, []);
        groups.get(cat).push(item);
      });

      const section = document.createElement('div');
      section.className = 'nav-group';
      const h = document.createElement('div');
      h.className = 'nav-group__title';
      h.textContent = label;
      section.appendChild(h);

      groups.forEach((list, cat) => {
        if (groups.size > 1) {
          const sub = document.createElement('div');
          sub.className = 'nav-group__title';
          sub.style.marginLeft = '0.75rem';
          sub.textContent = cat;
          section.appendChild(sub);
        }
        list.forEach((item) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'nav-item';
          btn.dataset.id = item.id;
          btn.dataset.type = type;
          btn.setAttribute('aria-current', 'false');
          btn.innerHTML = '<span class="nav-item__title"></span><span class="nav-item__desc"></span>';
          btn.querySelector('.nav-item__title').textContent = item.title;
          btn.querySelector('.nav-item__desc').textContent = item.description || displayPath(item.path);
          btn.addEventListener('click', () => {
            openItem(item.id);
            closeDrawers();
          });
          section.appendChild(btn);
        });
      });

      frag.appendChild(section);
    }

    addSection('文档', manifest.documents, 'document');
    addSection('开发工具', manifest.tools, 'tool');
    els.navTree.replaceChildren(frag);
  }

  function renderToc(toc) {
    els.tocNav.replaceChildren();
    if (!toc || !toc.length) {
      els.sidebarToc.hidden = true;
      els.tocToggle.hidden = true;
      return;
    }
    els.sidebarToc.hidden = false;
    els.tocToggle.hidden = false;

    const frag = document.createDocumentFragment();
    toc.forEach((entry) => {
      const a = document.createElement('a');
      a.href = '#' + entry.id;
      a.textContent = entry.text;
      a.dataset.depth = String(entry.depth);
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById(entry.id);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.replaceState(null, '', '#' + entry.id);
        }
        if (window.matchMedia('(max-width: 1100px)').matches) {
          setDrawer('toc', false);
        }
      });
      frag.appendChild(a);
    });
    els.tocNav.appendChild(frag);
    setupTocObserver(toc);
  }

  function setupTocObserver(toc) {
    if (tocObserver) {
      tocObserver.disconnect();
      tocObserver = null;
    }
    const links = [...els.tocNav.querySelectorAll('a')];
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));

    tocObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (!visible.length) return;
      const id = visible[0].target.id;
      links.forEach((a) => a.classList.toggle('is-active', a === map.get(id)));
    }, {
      rootMargin: '-10% 0px -70% 0px',
      threshold: [0, 1]
    });

    toc.forEach((entry) => {
      const el = document.getElementById(entry.id);
      if (el) tocObserver.observe(el);
    });
  }

  function setToolbar(item, extraButtons) {
    els.toolbar.hidden = false;
    els.title.textContent = item.title;
    els.path.textContent = displayPath(item.path);
    els.actions.replaceChildren();
    (extraButtons || []).forEach((btn) => els.actions.appendChild(btn));

    els.openExternal.hidden = false;
    els.openExternal.onclick = () => {
      window.open(item.resolvedUrl, '_blank', 'noopener,noreferrer');
    };
  }

  function bindDocScrollPersist(docId) {
    if (window.__vcScrollHandler) {
      window.removeEventListener('scroll', window.__vcScrollHandler);
      window.__vcScrollHandler = null;
    }
    window.__vcScrollHandler = () => {
      clearTimeout(scrollSaveTimer);
      scrollSaveTimer = setTimeout(() => {
        window.VisualMarkdown.saveScroll(docId, document.documentElement);
      }, 200);
    };
    window.addEventListener('scroll', window.__vcScrollHandler, { passive: true });
  }

  async function openDocument(item) {
    showStatus('loading', '加载中…', '正在读取文档。', displayPath(item.path));
    setToolbar(item, [
      makeButton('查看原始文件', () => {
        window.open(item.resolvedUrl, '_blank', 'noopener,noreferrer');
      }),
      makeButton('复制路径', async () => {
        try {
          await navigator.clipboard.writeText(displayPath(item.path));
        } catch {
          // ignore
        }
      })
    ]);

    const res = await fetch(item.resolvedUrl);
    if (!res.ok) {
      throw new Error('HTTP ' + res.status + ' — 无法读取文件');
    }
    const text = await res.text();
    const { element, toc } = window.VisualMarkdown.renderMarkdown(text, item.resolvedUrl);
    els.preview.replaceChildren(element);
    renderToc(toc);
    window.VisualMarkdown.restoreScroll(item.id, document.documentElement);
    bindDocScrollPersist(item.id);
  }

  async function openTool(item, options) {
    const forceIframe = !!(options && options.forceIframe);
    const buttons = [
      makeButton('页内运行', () => openItem(item.id, { forceIframe: true }), true),
      makeButton('新标签页打开', () => window.VisualTool.openInNewTab(item.resolvedUrl)),
      makeButton('重新加载', () => {
        if (currentIframe) {
          window.VisualTool.reloadFrame(currentIframe);
        } else {
          openItem(item.id, { forceIframe: true });
        }
      })
    ];
    setToolbar(item, buttons);
    els.sidebarToc.hidden = true;
    els.tocToggle.hidden = true;
    els.tocNav.replaceChildren();

    if (item.openMode === 'new-tab' && !forceIframe) {
      showStatus(
        'info',
        '建议新标签页打开',
        '该工具配置为优先在新标签页运行。也可尝试页内嵌入。',
        displayPath(item.path),
        [makeButton('尝试页内运行', () => openItem(item.id, { forceIframe: true }), true)]
      );
      window.VisualTool.openInNewTab(item.resolvedUrl);
      return;
    }

    const healthy = await checkServerHealth();
    if (!healthy) {
      showStatus(
        'error',
        '本地服务已断开',
        '页内工具需要本地服务。请重新双击「start-visual-center.bat」。',
        displayPath(item.path),
        [
          makeButton('重新检测', () => openItem(item.id, { forceIframe: true }), true),
          makeButton('新标签页打开', () => window.VisualTool.openInNewTab(item.resolvedUrl))
        ]
      );
      return;
    }

    const { element, iframe } = await window.VisualTool.createToolCanvas(item, {
      onRetry: () => openItem(item.id, { forceIframe: true }),
      onEmbedError: () => {
        setServerBanner(true);
      }
    });
    currentIframe = iframe;
    els.preview.replaceChildren(element);
  }

  async function openItem(id, options) {
    const item = itemMap.get(id);
    if (!item) {
      showStatus('error', '未找到内容', '清单中不存在该项：' + id);
      return;
    }

    if (currentItem && currentItem.type === 'document') {
      window.VisualMarkdown.saveScroll(currentItem.id, document.documentElement);
    }

    currentItem = item;
    currentIframe = null;
    localStorage.setItem(STORAGE.last, id);
    updateNavActive(id);
    history.replaceState(null, '', '#' + id);

    try {
      if (item.type === 'document') {
        await openDocument(item);
      } else {
        await openTool(item, options);
      }
    } catch (err) {
      showStatus(
        'error',
        '加载失败',
        err && err.message ? err.message : String(err),
        displayPath(item.path)
      );
    }
  }

  function bindSearch() {
    let timer = null;

    async function ensureIndex() {
      if (searchIndex) return searchIndex;
      const cached = window.VisualSearch.loadCachedIndex(manifest.documents.map((d) => d.id));
      if (cached) {
        searchIndex = cached;
        return searchIndex;
      }
      searchIndex = await window.VisualSearch.buildIndex(manifest.documents);
      return searchIndex;
    }

    function renderResults(hits) {
      els.searchResults.hidden = false;
      els.searchInput.setAttribute('aria-expanded', 'true');
      if (!hits.length) {
        els.searchResults.innerHTML = '<div class="search-empty">无匹配结果</div>';
        return;
      }
      const frag = document.createDocumentFragment();
      hits.forEach((hit) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'search-hit';
        btn.setAttribute('role', 'option');
        btn.innerHTML =
          '<span class="search-hit__title"></span>' +
          '<span class="search-hit__meta"></span>' +
          '<span class="search-hit__snippet"></span>';
        btn.querySelector('.search-hit__title').textContent = hit.title;
        btn.querySelector('.search-hit__meta').textContent = hit.heading;
        btn.querySelector('.search-hit__snippet').textContent = hit.snippet;
        btn.addEventListener('click', () => {
          els.searchResults.hidden = true;
          els.searchInput.setAttribute('aria-expanded', 'false');
          openItem(hit.id);
        });
        frag.appendChild(btn);
      });
      els.searchResults.replaceChildren(frag);
    }

    els.searchInput.addEventListener('input', () => {
      clearTimeout(timer);
      const q = els.searchInput.value.trim();
      if (!q) {
        els.searchResults.hidden = true;
        els.searchInput.setAttribute('aria-expanded', 'false');
        return;
      }
      timer = setTimeout(async () => {
        const index = await ensureIndex();
        renderResults(window.VisualSearch.search(index, q));
      }, 180);
    });

    document.addEventListener('click', (e) => {
      if (!els.searchResults.contains(e.target) && e.target !== els.searchInput) {
        els.searchResults.hidden = true;
        els.searchInput.setAttribute('aria-expanded', 'false');
      }
    });
  }

  async function boot() {
    if (location.protocol === 'file:') {
      showStatus(
        'error',
        '请通过启动器打开',
        '直接双击 HTML 会使用 file:// 协议，浏览器无法读取同目录 Markdown。请双击「start-visual-center.bat」。'
      );
      return;
    }

    const savedTheme = localStorage.getItem(STORAGE.theme) || 'system';
    applyTheme(savedTheme);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncHighlightTheme);

    els.themeSelect.addEventListener('change', () => applyTheme(els.themeSelect.value));
    els.helpBtn.addEventListener('click', () => els.helpDialog.showModal());
    els.navToggle.addEventListener('click', () => {
      const open = !els.sidebarNav.classList.contains('is-open');
      setDrawer('toc', false);
      setDrawer('nav', open);
    });
    els.tocToggle.addEventListener('click', () => {
      const open = !els.sidebarToc.classList.contains('is-open');
      setDrawer('nav', false);
      setDrawer('toc', open);
    });
    els.tocClose.addEventListener('click', () => setDrawer('toc', false));
    els.backdrop.addEventListener('click', closeDrawers);

    try {
      const res = await fetch('content-manifest.json');
      if (!res.ok) throw new Error('无法加载 content-manifest.json');
      manifest = await res.json();
    } catch (err) {
      showStatus('error', '清单加载失败', err.message || String(err));
      return;
    }

    (manifest.documents || []).forEach((doc) => {
      doc.type = 'document';
      doc.resolvedUrl = resolveUrl(doc.path);
      itemMap.set(doc.id, doc);
    });
    (manifest.tools || []).forEach((tool) => {
      tool.type = 'tool';
      tool.resolvedUrl = resolveUrl(tool.path);
      tool.openMode = tool.openMode || 'iframe';
      itemMap.set(tool.id, tool);
    });

    renderNav();
    bindSearch();
    await checkServerHealth();
    setInterval(checkServerHealth, 8000);

    // 空闲后再拉取仓内字体，避免首屏大文件占满同步静态服务
    const loadProjectFont = () => {
      if (document.getElementById('lxgw-font-face')) return;
      const style = document.createElement('style');
      style.id = 'lxgw-font-face';
      style.textContent =
        '@font-face{font-family:"LXGW WenKai";src:url("../../fonts/LXGWWenKai-Regular.ttf") format("truetype");font-weight:400;font-style:normal;font-display:swap;}';
      document.head.appendChild(style);
    };
    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadProjectFont, { timeout: 4000 });
    } else {
      setTimeout(loadProjectFont, 1500);
    }

    // warm search index in background
    window.VisualSearch.buildIndex(manifest.documents).then((idx) => {
      searchIndex = idx;
    }).catch(() => {});

    const hashId = decodeURIComponent((location.hash || '').replace(/^#/, ''));
    const lastId = localStorage.getItem(STORAGE.last);
    const initial = itemMap.has(hashId) ? hashId : (itemMap.has(lastId) ? lastId : null);
    if (initial) {
      openItem(initial);
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
