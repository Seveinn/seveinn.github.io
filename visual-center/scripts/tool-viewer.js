(function (global) {
  'use strict';

  async function probeUrl(url, timeoutMs) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs || 4000);
    try {
      const res = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        signal: ctrl.signal
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  async function createToolCanvas(tool, handlers) {
    const wrap = document.createElement('div');
    wrap.className = 'tool-canvas';

    const intro = document.createElement('div');
    intro.className = 'tool-canvas__intro';
    intro.textContent = tool.description || '页内运行开发工具。如遇兼容问题，请改用新标签页打开。';
    wrap.appendChild(intro);

    const alive = await probeUrl(tool.resolvedUrl, 4000);
    if (!alive) {
      const panel = document.createElement('div');
      panel.className = 'status-panel status-panel--error';
      panel.innerHTML =
        '<h2>无法连接本地服务</h2>' +
        '<p class="status-message"></p>' +
        '<p class="content-toolbar__path"></p>' +
        '<div class="embed-actions"></div>';
      panel.querySelector('.status-message').textContent =
        '浏览器无法打开工具页（常见原因：本地服务未启动或已停止）。请重新双击「start-visual-center.bat」。';
      panel.querySelector('.content-toolbar__path').textContent = tool.resolvedUrl;

      const actions = panel.querySelector('.embed-actions');
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'text-btn text-btn--primary';
      retry.textContent = '重试页内运行';
      retry.addEventListener('click', () => {
        if (handlers && typeof handlers.onRetry === 'function') handlers.onRetry();
      });
      const openTab = document.createElement('button');
      openTab.type = 'button';
      openTab.className = 'text-btn';
      openTab.textContent = '新标签页打开';
      openTab.addEventListener('click', () => openInNewTab(tool.resolvedUrl));
      actions.appendChild(retry);
      actions.appendChild(openTab);
      wrap.appendChild(panel);

      if (handlers && typeof handlers.onEmbedError === 'function') {
        handlers.onEmbedError();
      }
      return { element: wrap, iframe: null };
    }

    const iframe = document.createElement('iframe');
    iframe.className = 'tool-frame';
    iframe.title = tool.title || '开发工具';
    iframe.setAttribute('aria-label', (tool.title || '开发工具') + ' 运行区域');
    iframe.src = tool.resolvedUrl;

    iframe.addEventListener('error', () => {
      if (handlers && typeof handlers.onEmbedError === 'function') {
        handlers.onEmbedError();
      }
    });

    wrap.appendChild(iframe);
    return { element: wrap, iframe };
  }

  function openInNewTab(url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function reloadFrame(iframe) {
    if (!iframe) return;
    const src = iframe.src;
    iframe.src = 'about:blank';
    requestAnimationFrame(() => {
      iframe.src = src;
    });
  }

  global.VisualTool = {
    createToolCanvas,
    openInNewTab,
    reloadFrame,
    probeUrl
  };
})(window);
