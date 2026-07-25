(function (global) {
  'use strict';

  const CACHE_KEY = 'visual-center:search-index-v1';

  function excerpt(text, query, radius) {
    const lower = text.toLowerCase();
    const q = query.toLowerCase();
    const idx = lower.indexOf(q);
    if (idx < 0) {
      return text.slice(0, radius * 2).trim();
    }
    const start = Math.max(0, idx - radius);
    const end = Math.min(text.length, idx + q.length + radius);
    let snip = text.slice(start, end).replace(/\s+/g, ' ').trim();
    if (start > 0) snip = '…' + snip;
    if (end < text.length) snip = snip + '…';
    return snip;
  }

  function headingNear(lines, lineIndex) {
    for (let i = lineIndex; i >= 0; i -= 1) {
      const m = /^(#{1,6})\s+(.+)$/.exec(lines[i]);
      if (m) return m[2].trim();
    }
    return '';
  }

  async function buildIndex(documents) {
    const items = [];
    for (const doc of documents) {
      try {
        const res = await fetch(doc.resolvedUrl);
        if (!res.ok) continue;
        const text = await res.text();
        items.push({
          id: doc.id,
          title: doc.title,
          category: doc.category || '',
          path: doc.path,
          text
        });
      } catch {
        // skip failed docs
      }
    }
    const payload = { builtAt: Date.now(), items };
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch {
      // quota
    }
    return payload;
  }

  function loadCachedIndex(docIds) {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.items)) return null;
      const cachedIds = data.items.map((i) => i.id).sort().join(',');
      const currentIds = [...docIds].sort().join(',');
      if (cachedIds !== currentIds) return null;
      return data;
    } catch {
      return null;
    }
  }

  function search(index, query, limit) {
    const q = String(query || '').trim();
    if (!q || !index || !index.items) return [];
    const max = limit || 20;
    const results = [];

    for (const item of index.items) {
      const lines = item.text.split(/\r?\n/);
      let best = null;

      if (item.title.toLowerCase().includes(q.toLowerCase())) {
        best = {
          score: 100,
          heading: item.title,
          snippet: item.category || item.path
        };
      }

      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        if (!line.toLowerCase().includes(q.toLowerCase())) continue;
        const score = 50 - Math.min(40, i / 20);
        if (!best || score > best.score) {
          best = {
            score,
            heading: headingNear(lines, i) || item.title,
            snippet: excerpt(line, q, 48)
          };
        }
      }

      if (best) {
        results.push({
          id: item.id,
          title: item.title,
          heading: best.heading,
          snippet: best.snippet,
          score: best.score
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, max);
  }

  global.VisualSearch = {
    buildIndex,
    loadCachedIndex,
    search
  };
})(window);
