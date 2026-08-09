export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function sampleBgFromImageData(data, w, h) {
  const at = (x, y) => {
    const i = (y * w + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const samples = [
    at(0, 0), at(w - 1, 0), at(0, h - 1),
    at(Math.min(10, w - 1), Math.min(10, h - 1)),
    at(Math.floor(w / 2), 0), at(0, Math.floor(h / 2)),
  ];
  const bg = [0, 0, 0];
  for (const s of samples) { bg[0] += s[0]; bg[1] += s[1]; bg[2] += s[2]; }
  return [bg[0] / samples.length, bg[1] / samples.length, bg[2] / samples.length];
}

function binaryDilate(mask, w, h, iterations) {
  let cur = mask;
  for (let it = 0; it < iterations; it++) {
    const next = new Uint8Array(cur);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (cur[i]) continue;
        if (
          (x > 0 && cur[i - 1]) || (x + 1 < w && cur[i + 1]) ||
          (y > 0 && cur[i - w]) || (y + 1 < h && cur[i + w])
        ) next[i] = 1;
      }
    }
    cur = next;
  }
  return cur;
}

/**
 * @param {HTMLCanvasElement} sourceCanvas
 * @param {{ tol: number, inset: number, fringe: number, soft: number }} opts
 * @param {number[] | null} [bgOverride]
 */
export function removeBackground(sourceCanvas, opts, bgOverride) {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const ctx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  const src = ctx.getImageData(0, 0, w, h).data;
  const bg = bgOverride || sampleBgFromImageData(src, w, h);
  const { tol, inset, fringe, soft } = opts;

  const dist = new Float32Array(w * h);
  const eligible = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < src.length; i += 4, p++) {
    const dr = src[i] - bg[0], dg = src[i + 1] - bg[1], db = src[i + 2] - bg[2];
    const d = Math.sqrt(dr * dr + dg * dg + db * db);
    dist[p] = d;
    eligible[p] = d <= tol ? 1 : 0;
  }

  let mask = new Uint8Array(w * h);
  const q = new Int32Array(w * h);
  let qh = 0, qt = 0;
  const tryPush = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (!eligible[i] || mask[i]) return;
    mask[i] = 1;
    q[qt++] = i;
  };
  for (let x = 0; x < w; x++) { tryPush(x, 0); tryPush(x, h - 1); }
  for (let y = 0; y < h; y++) { tryPush(0, y); tryPush(w - 1, y); }
  while (qh < qt) {
    const i = q[qh++];
    const x = i % w, y = (i / w) | 0;
    tryPush(x - 1, y); tryPush(x + 1, y); tryPush(x, y - 1); tryPush(x, y + 1);
  }

  if (inset > 0) mask = binaryDilate(mask, w, h, inset);

  const out = new ImageData(w, h);
  const dst = out.data;
  dst.set(src);
  for (let p = 0; p < mask.length; p++) if (mask[p]) dst[p * 4 + 3] = 0;

  if (fringe > 0) {
    const edge = binaryDilate(mask, w, h, 2);
    for (let p = 0; p < mask.length; p++) {
      if (edge[p] && !mask[p] && dist[p] <= fringe) {
        dst[p * 4 + 3] = 0;
        mask[p] = 1;
      }
    }
  }

  if (soft > 0) {
    const softZone = binaryDilate(mask, w, h, 1);
    for (let p = 0; p < mask.length; p++) {
      if (!softZone[p] || mask[p] || dist[p] >= tol + soft) continue;
      const t = Math.max(0, Math.min(1, (dist[p] - tol) / soft));
      dst[p * 4 + 3] = Math.min(dst[p * 4 + 3], (255 * t) | 0);
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").putImageData(out, 0, 0);
  return { canvas, bg };
}

/** 将 eraseMask 中标记为 1 的像素强制透明。 */
export function applyEraseMask(canvas, eraseMask) {
  if (!eraseMask) return;
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;
  for (let p = 0; p < eraseMask.length; p++) {
    if (eraseMask[p]) data[p * 4 + 3] = 0;
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {number} x
 * @param {number} y
 * @param {{ tol: number, mode?: "boundary" | "range", radius?: number }} opts
 * @param {Uint8Array | null} eraseMask
 * @returns {{ erased: number, eraseMask: Uint8Array }}
 */
export function spotEraseLocal(canvas, x, y, opts, eraseMask) {
  if (opts.mode === "range") {
    return spotEraseRange(canvas, x, y, opts, eraseMask);
  }
  return spotEraseBoundary(canvas, x, y, opts, eraseMask);
}

/**
 * 边界模式：4 邻域洪水填充，只扣与种子连通且容差内同色的区域。
 * 异色边框会拦住扩展，框外同色不受影响。
 */
function spotEraseBoundary(canvas, x, y, opts, eraseMask) {
  const w = canvas.width;
  const h = canvas.height;
  const sx = Math.max(0, Math.min(w - 1, x | 0));
  const sy = Math.max(0, Math.min(h - 1, y | 0));
  const tol2 = opts.tol * opts.tol;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;
  const seedI = (sy * w + sx) * 4;
  if (data[seedI + 3] < 8) {
    return { erased: 0, eraseMask: eraseMask || new Uint8Array(w * h) };
  }

  const sr = data[seedI];
  const sg = data[seedI + 1];
  const sb = data[seedI + 2];
  const mask = eraseMask && eraseMask.length === w * h
    ? eraseMask
    : new Uint8Array(w * h);

  const matches = (p) => {
    const di = p * 4;
    if (data[di + 3] < 8) return false;
    const dr = data[di] - sr;
    const dg = data[di + 1] - sg;
    const db = data[di + 2] - sb;
    return dr * dr + dg * dg + db * db <= tol2;
  };

  const visited = new Uint8Array(w * h);
  const q = new Int32Array(w * h);
  let qh = 0, qt = 0;
  const start = sy * w + sx;
  visited[start] = 1;
  q[qt++] = start;
  let erased = 0;

  while (qh < qt) {
    const i = q[qh++];
    if (!matches(i)) continue;

    data[i * 4 + 3] = 0;
    mask[i] = 1;
    erased++;

    const px = i % w;
    const py = (i / w) | 0;
    if (px > 0) {
      const n = i - 1;
      if (!visited[n]) { visited[n] = 1; q[qt++] = n; }
    }
    if (px + 1 < w) {
      const n = i + 1;
      if (!visited[n]) { visited[n] = 1; q[qt++] = n; }
    }
    if (py > 0) {
      const n = i - w;
      if (!visited[n]) { visited[n] = 1; q[qt++] = n; }
    }
    if (py + 1 < h) {
      const n = i + w;
      if (!visited[n]) { visited[n] = 1; q[qt++] = n; }
    }
  }

  ctx.putImageData(img, 0, 0);
  return { erased, eraseMask: mask };
}

/**
 * 范围模式：半径圆内仅扣除与种子色足够接近的像素（不要求连通）。
 * 使用独立的范围容差（opts.tol），不再与边界模式共用。
 */
function spotEraseRange(canvas, x, y, opts, eraseMask) {
  const w = canvas.width;
  const h = canvas.height;
  const sx = Math.max(0, Math.min(w - 1, x | 0));
  const sy = Math.max(0, Math.min(h - 1, y | 0));
  const colorTol = Math.max(0, Number(opts.tol) || 0);
  const tol2 = colorTol * colorTol;
  const radius = Math.max(1, opts.radius | 0);
  const r2 = radius * radius;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;
  const seedI = (sy * w + sx) * 4;
  if (data[seedI + 3] < 8) {
    return { erased: 0, eraseMask: eraseMask || new Uint8Array(w * h) };
  }

  const sr = data[seedI];
  const sg = data[seedI + 1];
  const sb = data[seedI + 2];
  const mask = eraseMask && eraseMask.length === w * h
    ? eraseMask
    : new Uint8Array(w * h);

  const x0 = Math.max(0, sx - radius);
  const x1 = Math.min(w - 1, sx + radius);
  const y0 = Math.max(0, sy - radius);
  const y1 = Math.min(h - 1, sy + radius);
  let erased = 0;

  for (let py = y0; py <= y1; py++) {
    const dy = py - sy;
    const dy2 = dy * dy;
    for (let px = x0; px <= x1; px++) {
      const dx = px - sx;
      if (dx * dx + dy2 > r2) continue;

      const p = py * w + px;
      const di = p * 4;
      const a = data[di + 3];
      if (a < 8) continue;

      const dr = data[di] - sr;
      const dg = data[di + 1] - sg;
      const db = data[di + 2] - sb;
      // 必须同色（容差内）；色差超阈值则保留
      if (dr * dr + dg * dg + db * db > tol2) continue;

      data[di + 3] = 0;
      mask[p] = 1;
      erased++;
    }
  }

  ctx.putImageData(img, 0, 0);
  return { erased, eraseMask: mask };
}
