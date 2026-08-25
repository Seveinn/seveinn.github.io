/** 立绘裁剪：例图双水平线标定头高，批量裁切后续透明帧下半身 */

import { state, $ } from "./state.js";
import {
  getFrameDrawRect,
  setStageContentInsetsPx,
  clearStageContentInsetsPx,
} from "./preview.js";

/** 立绘预览时画幅框外留白（图像像素） */
const STAGE_PAD_PX = 56;

const ALPHA_MIN = 8;

/** @type {{ headTop: number, chin: number, cutBottom: number } | null} */
let lines = null;
/** @type {null | { which: "headTop" | "chin" | "cutBottom", startY: number, origin: number }} */
let drag = null;
/** @type {HTMLElement | null} */
let layer = null;
/** @type {{ onStatus?: (msg: string) => void, onRender?: () => void, onApplied?: () => void, pushHistory?: (label: string, items?: import("./state.js").FrameItem[]) => void } | null} */
let hooks = null;

function setStatus(msg) {
  hooks?.onStatus?.(msg);
}

/**
 * @param {ImageData} imageData
 * @returns {{ left: number, right: number, top: number, bottom: number, bodyW: number } | null}
 */
export function scanOpaqueBounds(imageData) {
  const { data, width: w, height: h } = imageData;
  let left = w;
  let right = -1;
  let top = h;
  let bottom = -1;
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    for (let x = 0; x < w; x++) {
      if (data[row + x * 4 + 3] < ALPHA_MIN) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  if (right < left || bottom < top) return null;
  return {
    left,
    right,
    top,
    bottom,
    bodyW: right - left + 1,
  };
}

/**
 * 在垂直区间内取各行身宽的分位数，避免举手/武器把包围盒撑得过宽。
 * @param {ImageData} imageData
 * @param {number} y0
 * @param {number} y1
 * @param {number} [pct] 0~1，默认中位数
 * @returns {number | null}
 */
function scanTypicalBodyWidth(imageData, y0, y1, pct = 0.5) {
  const { data, width: w, height: h } = imageData;
  const top = Math.max(0, Math.min(h - 1, Math.floor(y0)));
  const bot = Math.max(top, Math.min(h - 1, Math.ceil(y1)));
  /** @type {number[]} */
  const widths = [];
  for (let y = top; y <= bot; y++) {
    const row = y * w * 4;
    let left = w;
    let right = -1;
    for (let x = 0; x < w; x++) {
      if (data[row + x * 4 + 3] < ALPHA_MIN) continue;
      if (x < left) left = x;
      if (x > right) right = x;
    }
    if (right >= left) widths.push(right - left + 1);
  }
  if (!widths.length) return null;
  widths.sort((a, b) => a - b);
  const t = Math.max(0, Math.min(1, pct));
  const idx = Math.min(widths.length - 1, Math.floor((widths.length - 1) * t));
  return widths[idx];
}

/**
 * 忽略头发丝/噪点：找到「不透明跨度达到阈值」的第一行作为头顶。
 * @param {ImageData} imageData
 * @param {{ left: number, right: number, top: number, bottom: number }} bounds
 * @returns {number}
 */
function findRobustHeadTop(imageData, bounds) {
  const { data, width: w, height: h } = imageData;
  const opaqueH = Math.max(1, bounds.bottom - bounds.top + 1);
  const aabbW = Math.max(1, bounds.right - bounds.left + 1);
  // 至少约头宽的一小段，或整身宽的 8%，避免 1~2px 噪点当头顶
  const minRun = Math.max(6, Math.round(Math.min(aabbW * 0.08, opaqueH * 0.04)));
  const limit = Math.min(bounds.bottom, bounds.top + Math.round(opaqueH * 0.35));

  for (let y = bounds.top; y <= limit; y++) {
    const row = y * w * 4;
    let left = w;
    let right = -1;
    for (let x = 0; x < w; x++) {
      if (data[row + x * 4 + 3] < ALPHA_MIN) continue;
      if (x < left) left = x;
      if (x > right) right = x;
    }
    if (right >= left && right - left + 1 >= minRun) return y;
  }
  return bounds.top;
}

/**
 * 以头顶/头高为锚，在肩胸带测身宽（例图与透明帧统一口径）。
 * @param {ImageData} imageData
 * @param {number} headTop
 * @param {number} headH
 */
function measureShoulderBodyW(imageData, headTop, headH) {
  const h = Math.max(8, headH);
  // 约下巴略下 → 上胸/肩：用偏高分位贴近肩宽视觉
  const y0 = headTop + h * 0.95;
  const y1 = headTop + h * 1.75;
  return scanTypicalBodyWidth(imageData, y0, y1, 0.72);
}

/**
 * 头宽：头顶→下巴带内偏上区域。
 * @param {ImageData} imageData
 * @param {number} headTop
 * @param {number} headH
 */
function measurePortraitHeadW(imageData, headTop, headH) {
  const h = Math.max(8, headH);
  const y0 = headTop + h * 0.15;
  const y1 = headTop + h * 0.75;
  return scanTypicalBodyWidth(imageData, y0, y1, 0.55);
}

/**
 * @param {HTMLCanvasElement} canvas
 */
function readImageData(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * @param {HTMLCanvasElement} canvas
 */
function readBounds(canvas) {
  return scanOpaqueBounds(readImageData(canvas));
}

function exampleItem() {
  return state.items[0] || null;
}

function exampleCanvas() {
  const item = exampleItem();
  if (!item) return null;
  if (item.processed && item.resultCanvas) return item.resultCanvas;
  return item.sourceCanvas;
}

function ensureDefaultLines() {
  const canvas = exampleCanvas();
  if (!canvas) {
    lines = null;
    return;
  }
  const h = canvas.height;
  if (!lines) {
    const bounds = readBounds(canvas);
    const top = bounds ? bounds.top : Math.round(h * 0.08);
    const span = Math.max(24, Math.round(h * 0.18));
    const headTop = Math.max(0, Math.min(h - 2, top));
    const chin = Math.max(1, Math.min(h - 1, top + span));
    const headH = Math.max(1, chin - headTop);
    const bodyW = bounds?.bodyW || Math.round(h * 0.2);
    const cutBottom = Math.max(
      chin + 1,
      Math.min(h, headTop + portraitKeepFromHead(headH, bodyW)),
    );
    lines = { headTop, chin, cutBottom };
  } else {
    lines.headTop = Math.max(0, Math.min(h - 2, lines.headTop));
    lines.chin = Math.max(lines.headTop + 1, Math.min(h - 1, lines.chin));
    if (lines.cutBottom == null) {
      const bounds = readBounds(canvas);
      const headH = Math.max(1, lines.chin - lines.headTop);
      const bodyW = bounds?.bodyW || Math.round(h * 0.2);
      lines.cutBottom = lines.headTop + portraitKeepFromHead(headH, bodyW);
    }
    lines.cutBottom = Math.max(
      lines.chin + 1,
      Math.min(h, lines.cutBottom),
    );
  }
}

/**
 * 例图立绘保留高度默认值（从头顶线向下）：头高 + 一个身宽。
 * @param {number} headH
 * @param {number} bodyW
 */
function portraitKeepFromHead(headH, bodyW) {
  return Math.max(headH + 1, Math.round(headH + bodyW));
}

/**
 * 例图头部宽度（头顶~下巴带内中位宽），用于把头高比例迁到其他帧。
 * @param {ImageData} imageData
 * @param {number} headTop
 * @param {number} chin
 */
function measureHeadWidth(imageData, headTop, chin) {
  const band = Math.max(4, Math.round((chin - headTop) * 0.35));
  const mid = Math.round((headTop + chin) / 2);
  return scanTypicalBodyWidth(imageData, mid - Math.floor(band / 2), mid + Math.ceil(band / 2));
}

/**
 * 从头顶向下找「头宽→肩膀突然变宽」的位置，估计头高。
 * @param {ImageData} imageData
 * @param {number} headTop
 * @param {number} bodyBottom
 * @param {number} [headWHint]
 * @returns {number | null}
 */
function estimateHeadHeightByProfile(imageData, headTop, bodyBottom, headWHint) {
  const { height: h } = imageData;
  const maxY = Math.min(bodyBottom, h - 1, headTop + Math.round((bodyBottom - headTop) * 0.55));
  const probe = 6;
  const headW = headWHint || scanTypicalBodyWidth(imageData, headTop, headTop + probe);
  if (!headW || headW < 4) return null;

  // 肩膀相对头宽明显展宽
  const widenAt = headW * 1.18;
  let lastNarrowY = headTop + probe;

  for (let y = headTop + probe; y <= maxY; y += 2) {
    const w = scanTypicalBodyWidth(imageData, y, Math.min(maxY, y + probe));
    if (w == null) continue;
    if (w >= widenAt) {
      // 肩膀开始处略回收，更接近下巴
      return Math.max(12, lastNarrowY - headTop);
    }
    if (w <= headW * 1.08) lastNarrowY = y + probe;
  }
  return null;
}

/**
 * @returns {{
 *   headH: number,
 *   headW: number,
 *   bodyW: number,
 *   ratio: number,
 *   cropH: number,
 *   headsKeep: number,
 *   headTop: number,
 *   chin: number,
 *   cutBottom: number,
 *   imgH: number,
 * } | null}
 */
export function computeExampleMetrics() {
  const canvas = exampleCanvas();
  if (!canvas || !lines) return null;
  const imageData = readImageData(canvas);
  const bounds = scanOpaqueBounds(imageData);
  if (!bounds) return null;

  const headTop = Math.min(lines.headTop, lines.chin);
  const chin = Math.max(lines.headTop, lines.chin);
  const headH = Math.max(1, chin - headTop);
  const cutBottom = Math.max(
    chin + 1,
    Math.min(canvas.height, lines.cutBottom ?? (headTop + portraitKeepFromHead(headH, bounds.bodyW))),
  );
  const headW = Math.max(
    1,
    measurePortraitHeadW(imageData, headTop, headH)
      || measureHeadWidth(imageData, headTop, chin)
      || Math.round(headH * 0.85),
  );
  // 与透明帧同一套肩胸带测身宽
  const torsoW = measureShoulderBodyW(imageData, headTop, headH);
  const bodyW = Math.max(1, torsoW || bounds.bodyW);
  const ratio = headH / bodyW;
  const cropH = Math.max(1, cutBottom - headTop);
  const headsKeep = cropH / headH;

  return {
    headH,
    headW,
    bodyW,
    ratio,
    cropH,
    headsKeep,
    headTop,
    chin,
    cutBottom,
    imgH: canvas.height,
    frameW: canvas.width,
    frameH: canvas.height,
    bodyToFrame: bodyW / canvas.width,
    headToFrame: headW / canvas.width,
  };
}

function syncMetricsUI() {
  const m = computeExampleMetrics();
  const headOut = $("#portraitHeadH");
  const bodyOut = $("#portraitBodyW");
  const ratioOut = $("#portraitRatio");
  const cropOut = $("#portraitCropH");
  if (!m) {
    if (headOut) headOut.textContent = "—";
    if (bodyOut) bodyOut.textContent = "—";
    if (ratioOut) ratioOut.textContent = "—";
    if (cropOut) cropOut.textContent = "—";
    return;
  }
  if (headOut) headOut.textContent = `${m.headH}px`;
  if (bodyOut) bodyOut.textContent = `${m.bodyW}px`;
  if (ratioOut) ratioOut.textContent = `${m.headsKeep.toFixed(2)}头`;
  if (cropOut) cropOut.textContent = `${m.cropH}px`;
}

export function resetPortraitLines() {
  lines = null;
  cropPreviews.clear();
  exampleFrameSize = null;
  clearStageContentInsetsPx();
  appliedInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  ensureDefaultLines();
  hooks?.onRender?.();
  syncPortraitOverlay();
  syncMetricsUI();
  setStatus("已重置立绘裁剪线");
}

export function setPortraitMode(on) {
  state.portraitMode = on;
  if (on) {
    state.cropMode = false;
    $("#stageWrap")?.classList.remove("crop-mode");
    const cropLayer = $("#cropLayer");
    if (cropLayer) cropLayer.hidden = true;
    state.isPlaying = false;
    state.spotErase = false;
    state.brushErase = false;
    $("#playBtn").textContent = "播放";
    $("#btnSpotErase")?.classList.remove("active");
    $("#btnSpotEraseBar")?.classList.remove("active");
    $("#btnEraser")?.classList.remove("active");
    $("#stageWrap")?.classList.remove("spot-erase", "brush-erase");
    if (state.flipX) {
      state.flipX = false;
      const flipSel = /** @type {HTMLSelectElement | null} */ ($("#flipX"));
      if (flipSel) flipSel.value = "false";
    }
    // 例图固定为第 1 帧
    if (state.items.length) {
      state.currentFrame = 0;
      state.selectedId = state.items[0].id;
    }
    ensureDefaultLines();
    const ex = exampleCanvas();
    if (ex) exampleFrameSize = { w: ex.width, h: ex.height };
  } else {
    clearStageContentInsetsPx();
    appliedInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  }
  $("#stageWrap")?.classList.toggle("portrait-mode", on);
  if (layer) layer.hidden = !on;
  hooks?.onRender?.();
  syncPortraitOverlay();
  syncMetricsUI();
  if (on) setStatus("立绘裁剪：蓝=头顶 · 橙=下巴 · 黄=裁切底（可拖）");
}

/** @type {{ w: number, h: number } | null} */
let exampleFrameSize = null;

/** 防止 insets 变更触发二次 render 时重入 */
let overlayResizing = false;

/** @type {{ top: number, right: number, bottom: number, left: number }} */
let appliedInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * @param {{ top: number, right: number, bottom: number, left: number }} a
 * @param {{ top: number, right: number, bottom: number, left: number }} b
 */
function insetsEqual(a, b) {
  return a.top === b.top && a.right === b.right && a.bottom === b.bottom && a.left === b.left;
}

/**
 * 按当前预览框溢出量扩展舞台，便于滚动查看完整画幅边框。
 * @returns {boolean} 是否改动了 insets（需重绘）
 */
function ensurePortraitStageInsets() {
  if (!state.portraitMode) {
    const empty = { top: 0, right: 0, bottom: 0, left: 0 };
    if (!insetsEqual(appliedInsets, empty)) {
      clearStageContentInsetsPx();
      appliedInsets = empty;
      return true;
    }
    return false;
  }

  const pad = STAGE_PAD_PX;
  const curItem = state.items[state.currentFrame];
  const preview = curItem ? cropPreviews.get(curItem.id) : null;
  /** @type {{ top: number, right: number, bottom: number, left: number }} */
  let next = { top: pad, right: pad, bottom: pad, left: pad };

  if (preview && preview.frameLeft != null && preview.frameTop != null) {
    const tw = preview.targetW || 0;
    const th = preview.targetH || 0;
    next = {
      left: Math.max(0, Math.ceil(-preview.frameLeft)) + pad,
      top: Math.max(0, Math.ceil(-preview.frameTop)) + pad,
      right: Math.max(0, Math.ceil(preview.frameLeft + tw - preview.imgW)) + pad,
      bottom: Math.max(0, Math.ceil(preview.frameTop + th - preview.imgH)) + pad,
    };
  } else if (exampleFrameSize && curItem) {
    const src = resolvePortraitSource(curItem);
    const imgW = src?.width || exampleFrameSize.w;
    const imgH = src?.height || exampleFrameSize.h;
    const exW = exampleFrameSize.w;
    const exH = exampleFrameSize.h;
    if (state.currentFrame === 0) {
      next = {
        left: pad,
        top: pad,
        right: Math.max(0, exW - imgW) + pad,
        bottom: Math.max(0, exH - imgH) + pad,
      };
    } else {
      const leftImg = (imgW - exW) / 2;
      next = {
        left: Math.max(0, Math.ceil(-leftImg)) + pad,
        top: pad,
        right: Math.max(0, Math.ceil(leftImg + exW - imgW)) + pad,
        bottom: Math.max(0, Math.ceil(exH - imgH)) + pad,
      };
    }
  }

  if (insetsEqual(appliedInsets, next)) return false;
  setStageContentInsetsPx(next);
  appliedInsets = { ...next };
  return true;
}

/**
 * 绘制画幅外边框（相对当前帧图像坐标系定位）
 * @param {number} imgLeft
 * @param {number} imgTop
 * @param {number} cssScale
 * @param {number} frameW 例图宽（图像像素）
 * @param {number} frameH 例图高（图像像素）
 * @param {number} leftImg 框左（图像像素）
 * @param {number} topImg 框顶（图像像素）
 * @param {string} [label]
 * @param {boolean} [asExample]
 */
function appendFrameBox(imgLeft, imgTop, cssScale, frameW, frameH, leftImg, topImg, label, asExample) {
  if (!layer) return;
  const box = document.createElement("div");
  box.className = asExample ? "portrait-frame-box example-ref" : "portrait-frame-box";
  box.style.left = `${imgLeft + leftImg * cssScale}px`;
  box.style.top = `${imgTop + topImg * cssScale}px`;
  box.style.width = `${Math.max(1, frameW * cssScale)}px`;
  box.style.height = `${Math.max(1, frameH * cssScale)}px`;
  const tag = document.createElement("span");
  tag.className = asExample ? "frame-box-label example-ref" : "frame-box-label align";
  tag.textContent = label || `${asExample ? "例图" : "预期"}画幅 ${frameW}×${frameH}`;
  box.appendChild(tag);
  layer.appendChild(box);
}

/** @deprecated 兼容旧调用名 */
function appendExampleFrameBox(imgLeft, imgTop, cssScale, frameW, frameH, leftImg, topImg, label) {
  appendFrameBox(imgLeft, imgTop, cssScale, frameW, frameH, leftImg, topImg, label, true);
}

export function syncPortraitOverlay() {
  if (!layer) return;
  layer.hidden = !state.portraitMode;
  if (!state.portraitMode) {
    layer.innerHTML = "";
    return;
  }

  if (!overlayResizing && ensurePortraitStageInsets()) {
    overlayResizing = true;
    try {
      hooks?.onRender?.();
    } finally {
      overlayResizing = false;
    }
    return;
  }

  ensureDefaultLines();
  const rect = getFrameDrawRect();
  if (!rect) {
    layer.innerHTML = "";
    return;
  }

  const cssScale = rect.cssScale;
  const ox = rect.dx / rect.dpr;
  const oy = rect.dy / rect.dpr;
  const imgLeft = ox;
  const imgTop = oy;
  const imgW = rect.srcW * cssScale;
  const imgH = rect.srcH * cssScale;

  layer.innerHTML = "";

  const ex = exampleCanvas();
  const exW = exampleFrameSize?.w || ex?.width || 0;
  const exH = exampleFrameSize?.h || ex?.height || 0;

  // 目标帧：预期画幅与例图画幅同尺寸、同位置（头顶边距 + 身宽比对齐）
  const cur = state.items[state.currentFrame];
  const preview = cur ? cropPreviews.get(cur.id) : null;
  if (preview && state.currentFrame > 0) {
    const targetW = preview.targetW || exW || preview.imgW;
    const targetH = preview.targetH || exH || preview.alignH || preview.keepH;
    const frameLeftImg = preview.frameLeft ?? (preview.imgW - targetW) / 2;
    const frameTopImg = preview.frameTop ?? (preview.cutY - targetH);
    const frameBottom = frameTopImg + targetH;
    const cutYCss = imgTop + frameBottom * cssScale;

    // 画幅外（图内）蓝影：主要标出底边以下将被裁掉的区域
    const dropTop = Math.min(Math.max(cutYCss, imgTop), imgTop + imgH);
    const drop = document.createElement("div");
    drop.className = "portrait-shade portrait-shade-preview";
    drop.style.left = `${imgLeft}px`;
    drop.style.width = `${imgW}px`;
    drop.style.top = `${dropTop}px`;
    drop.style.height = `${Math.max(0, imgTop + imgH - dropTop)}px`;
    layer.appendChild(drop);

    if (targetW > 0 && targetH > 0) {
      appendFrameBox(
        imgLeft, imgTop, cssScale,
        targetW, targetH,
        frameLeftImg, frameTopImg,
        `例图画幅 ${targetW}×${targetH}`,
        true,
      );
      appendFrameBox(
        imgLeft, imgTop, cssScale,
        targetW, targetH,
        frameLeftImg, frameTopImg,
        `预期画幅 ${targetW}×${targetH}`,
        false,
      );
    }

    const headYCss = imgTop + (preview.headTop ?? 0) * cssScale;
    layer.appendChild(buildLine("cutPreview", "头顶对齐", headYCss, imgLeft, imgW));
    layer.appendChild(buildLine("cutPreview", "画幅底", cutYCss, imgLeft, imgW));

    const headMargin = Math.round(preview.headMargin ?? (preview.headTop - frameTopImg));
    const bodyRatio = preview.bodyToFrame != null
      ? preview.bodyToFrame.toFixed(3)
      : (preview.bodyWAfter && targetW ? (preview.bodyWAfter / targetW).toFixed(3) : "—");
    const headRatio = preview.headToFrame != null
      ? preview.headToFrame.toFixed(3)
      : "—";
    const exBody = preview.exampleBodyToFrame != null ? preview.exampleBodyToFrame.toFixed(3) : "—";
    const exHead = preview.exampleHeadToFrame != null ? preview.exampleHeadToFrame.toFixed(3) : "—";
    const meta = document.createElement("div");
    meta.className = "portrait-frame-meta";
    meta.style.left = `${imgLeft + frameLeftImg * cssScale}px`;
    meta.style.top = `${cutYCss + 4}px`;
    meta.textContent =
      `头顶边距 ${headMargin}px · 头宽比 ${headRatio}(例${exHead}) · 身宽比 ${bodyRatio}(例${exBody})`;
    layer.appendChild(meta);

    syncMetricsUI();
    return;
  }

  // 例图：画幅外边框 + 头顶 / 下巴 / 裁切底标线
  if (state.currentFrame !== 0 || !lines) {
    // 预览已生成时，切到无 preview 的帧也尽量画出例图尺寸参考框
    if (exW > 0 && exH > 0 && state.currentFrame > 0) {
      const leftImg = (rect.srcW - exW) / 2;
      appendExampleFrameBox(imgLeft, imgTop, cssScale, exW, exH, leftImg, 0);
    }
    syncMetricsUI();
    return;
  }

  if (exW > 0 && exH > 0) {
    appendExampleFrameBox(imgLeft, imgTop, cssScale, exW, exH, 0, 0, `例图画幅 ${exW}×${exH}`);
  }

  const headY = imgTop + lines.headTop * cssScale;
  const chinY = imgTop + lines.chin * cssScale;
  const bandTop = Math.min(headY, chinY);
  const bandH = Math.abs(chinY - headY);

  const metrics = computeExampleMetrics();
  const cutYCss = metrics
    ? imgTop + metrics.cutBottom * cssScale
    : null;

  const shade = document.createElement("div");
  shade.className = "portrait-shade";
  shade.style.left = `${imgLeft}px`;
  shade.style.width = `${imgW}px`;
  shade.style.top = `${bandTop}px`;
  shade.style.height = `${Math.max(1, bandH)}px`;
  layer.appendChild(shade);

  if (cutYCss != null && Number.isFinite(cutYCss)) {
    const drop = document.createElement("div");
    drop.className = "portrait-shade portrait-shade-drop";
    drop.style.left = `${imgLeft}px`;
    drop.style.width = `${imgW}px`;
    drop.style.top = `${cutYCss}px`;
    drop.style.height = `${Math.max(0, imgTop + imgH - cutYCss)}px`;
    layer.appendChild(drop);

    layer.appendChild(buildLine("cutBottom", "裁切底", cutYCss, imgLeft, imgW));
  }

  layer.appendChild(buildLine("headTop", "头顶", headY, imgLeft, imgW));
  layer.appendChild(buildLine("chin", "下巴", chinY, imgLeft, imgW));
  syncMetricsUI();
}

/**
 * @param {"headTop" | "chin" | "cutBottom" | "cutPreview"} which
 * @param {string} label
 * @param {number} topCss
 * @param {number} leftCss
 * @param {number} widthCss
 */
function buildLine(which, label, topCss, leftCss, widthCss) {
  const el = document.createElement("div");
  el.className = "portrait-line"
    + (which === "chin" ? " chin" : "")
    + (which === "cutBottom" || which === "cutPreview" ? " cut" : "")
    + (which === "cutPreview" ? " preview" : "");
  el.dataset.which = which;
  el.style.left = `${leftCss}px`;
  el.style.width = `${widthCss}px`;
  el.style.top = `${topCss}px`;
  if (which === "cutPreview") {
    el.style.pointerEvents = "none";
  }
  const tag = document.createElement("span");
  tag.className = "line-label";
  tag.textContent = label;
  el.appendChild(tag);
  return el;
}

function dbg(...args) {
  console.log("[立绘裁剪]", ...args);
}

/**
 * 立绘裁剪用画布：优先抠图结果，否则用原图（已是透明 PNG 时也可裁）。
 * @param {import("./state.js").FrameItem} item
 */
function resolvePortraitSource(item) {
  if (item?.resultCanvas) return item.resultCanvas;
  return item?.sourceCanvas || null;
}

/**
 * @typedef {{
 *   cutY: number,
 *   keepH: number,
 *   headTop: number,
 *   scale: number,
 *   bodyWBefore: number,
 *   bodyWAfter: number,
 *   imgW: number,
 *   imgH: number,
 *   alignH?: number,
 *   targetW?: number,
 *   targetH?: number,
 *   frameLeft?: number,
 *   frameTop?: number,
 *   headMargin?: number,
 *   bodyCx?: number,
 *   headWAfter?: number,
 *   bodyToFrame?: number,
 *   headToFrame?: number,
 *   exampleBodyToFrame?: number,
 *   exampleHeadToFrame?: number,
 * }} CropPreview
 */

/** @type {Map<string, CropPreview>} */
const cropPreviews = new Map();

/**
 * 肩胸带水平中心（比整身 AABB 更稳）。
 * @param {ImageData} imageData
 * @param {number} headTop
 * @param {number} headH
 * @param {number} fallbackCx
 */
function measureShoulderCenterX(imageData, headTop, headH, fallbackCx) {
  const { data, width: w, height: h } = imageData;
  const hh = Math.max(8, headH);
  const top = Math.max(0, Math.min(h - 1, Math.floor(headTop + hh * 0.95)));
  const bot = Math.max(top, Math.min(h - 1, Math.ceil(headTop + hh * 1.75)));
  let sum = 0;
  let n = 0;
  for (let y = top; y <= bot; y++) {
    const row = y * w * 4;
    let left = w;
    let right = -1;
    for (let x = 0; x < w; x++) {
      if (data[row + x * 4 + 3] < ALPHA_MIN) continue;
      if (x < left) left = x;
      if (x > right) right = x;
    }
    if (right >= left) {
      sum += (left + right) / 2;
      n++;
    }
  }
  return n ? sum / n : fallbackCx;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ headH: number, headW: number, bodyW: number } | null} [hint] 例图指标，用于估计头高
 * @returns {{
 *   bounds: NonNullable<ReturnType<typeof scanOpaqueBounds>>,
 *   headTop: number,
 *   headH: number,
 *   headW: number,
 *   bodyW: number,
 *   bodyCx: number,
 * } | null}
 */
function measureFramePortrait(canvas, hint = null) {
  const imageData = readImageData(canvas);
  const bounds = scanOpaqueBounds(imageData);
  if (!bounds) return null;

  const headTop = findRobustHeadTop(imageData, bounds);
  const opaqueH = Math.max(1, bounds.bottom - headTop + 1);

  let headH = estimateHeadHeightByProfile(imageData, headTop, bounds.bottom, hint?.headW);
  if (!headH || headH < 8) {
    // 无轮廓时：按例图「头高/身宽」或立绘常见比例回退
    if (hint?.bodyW && hint?.headH) {
      const roughBody = scanTypicalBodyWidth(
        imageData,
        headTop + Math.round(opaqueH * 0.2),
        headTop + Math.round(opaqueH * 0.4),
        0.6,
      ) || bounds.bodyW;
      headH = Math.max(12, Math.round(roughBody * (hint.headH / hint.bodyW)));
    } else {
      headH = Math.max(12, Math.round(opaqueH * 0.14));
    }
  }
  headH = Math.min(headH, Math.round(opaqueH * 0.45));

  const headW = Math.max(
    1,
    measurePortraitHeadW(imageData, headTop, headH) || Math.round(headH * 0.85),
  );
  const bodyW = Math.max(
    1,
    measureShoulderBodyW(imageData, headTop, headH) || bounds.bodyW,
  );
  const aabbCx = (bounds.left + bounds.right + 1) / 2;
  const bodyCx = measureShoulderCenterX(imageData, headTop, headH, aabbCx);

  return { bounds, headTop, headH, headW, bodyW, bodyCx };
}

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {{ bounds: NonNullable<ReturnType<typeof scanOpaqueBounds>>, bodyW: number } | null}
 */
function measureFrameBodyW(canvas) {
  const m = measureFramePortrait(canvas);
  if (!m) return null;
  return { bounds: m.bounds, bodyW: m.bodyW };
}

/**
 * @param {HTMLCanvasElement} src
 * @param {number} scale
 */
function scaleCanvas(src, scale) {
  const w = Math.max(1, Math.round(src.width * scale));
  const h = Math.max(1, Math.round(src.height * scale));
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, w, h);
  return out;
}

/**
 * 将帧等比缩放：优先对齐例图头宽（立绘头大小一致），并校验肩宽。
 * @param {import("./state.js").FrameItem} item
 * @param {{ headH: number, headW: number, bodyW: number }} metrics
 */
function scaleItemToExamplePortrait(item, metrics) {
  const src = resolvePortraitSource(item);
  if (!src) return { ok: false, reason: "无可用画布" };
  const measured = measureFramePortrait(src, metrics);
  if (!measured) return { ok: false, reason: "无法测头/身宽" };

  // 头宽对齐为主；若肩宽相差过大则折中，避免头对了身子差太多
  const scaleHead = metrics.headW / Math.max(1, measured.headW);
  const scaleBody = metrics.bodyW / Math.max(1, measured.bodyW);
  let scale = scaleHead;
  const diverge = Math.abs(scaleHead - scaleBody) / Math.max(scaleHead, scaleBody);
  if (diverge > 0.18) {
    // 头:身 与例图差异大时，向身宽靠一点（几何均值偏头）
    scale = Math.pow(scaleHead, 0.65) * Math.pow(scaleBody, 0.35);
  }

  dbg("头/身宽对齐缩放", {
    name: item.name,
    headWBefore: measured.headW,
    bodyWBefore: measured.bodyW,
    targetHeadW: metrics.headW,
    targetBodyW: metrics.bodyW,
    scaleHead,
    scaleBody,
    scale,
    diverge: Number(diverge.toFixed(3)),
    before: `${src.width}x${src.height}`,
  });

  if (Math.abs(scale - 1) < 0.005) {
    return {
      ok: true,
      scale: 1,
      headWBefore: measured.headW,
      bodyWBefore: measured.bodyW,
      headWAfter: measured.headW,
      bodyWAfter: measured.bodyW,
      src,
      measured,
    };
  }

  const scaledResult = scaleCanvas(src, scale);
  const scaledSource = scaleCanvas(item.sourceCanvas, scale);
  item.resultCanvas = scaledResult;
  item.sourceCanvas = scaledSource;
  item.width = scaledResult.width;
  item.height = scaledResult.height;
  item.processed = true;
  item.eraseMask = null;

  const after = measureFramePortrait(scaledResult, metrics);
  return {
    ok: true,
    scale,
    headWBefore: measured.headW,
    bodyWBefore: measured.bodyW,
    headWAfter: after?.headW ?? metrics.headW,
    bodyWAfter: after?.bodyW ?? metrics.bodyW,
    src: scaledResult,
    measured: after || measured,
  };
}

/**
 * 计算预期画幅相对当前透明帧的位置（不写入像素）。
 * - 尺寸 = 例图 W×H
 * - 头顶→画幅顶边距 = 例图 headTop
 * - 缩放后头宽/肩宽尽量贴近例图
 * @param {HTMLCanvasElement} src
 * @param {{ cropH: number, headH: number, headW: number, headsKeep: number, bodyW: number, headTop: number }} metrics
 * @param {number} exampleW
 * @param {number} exampleH
 */
function computeCutPreview(src, metrics, exampleW, exampleH) {
  const measured = measureFramePortrait(src, metrics);
  if (!measured) return { ok: false, reason: "无非透明像素" };

  const { headTop, bodyW, headW, bodyCx } = measured;
  const headMargin = Math.max(0, metrics.headTop);

  const frameTop = headTop - headMargin;
  const frameLeft = Math.round(bodyCx - exampleW / 2);
  const frameBottom = frameTop + exampleH;
  const cutY = frameBottom;
  const keepH = Math.max(1, Math.min(src.height, Math.ceil(Math.max(frameBottom, headTop + 1))));

  return {
    ok: true,
    method: "headMarginMatch",
    headTop,
    headW,
    bodyW,
    bodyCx,
    headMargin,
    frameLeft,
    frameTop,
    frameBottom,
    keepH,
    cutY,
    targetW: exampleW,
    targetH: exampleH,
    willTrim: Math.max(0, src.height - keepH),
    bounds: measured.bounds,
    bodyToFrame: bodyW / exampleW,
    headToFrame: headW / exampleW,
  };
}

/**
 * 批量：身宽对齐例图 → 计算裁剪预览（蓝阴影），暂不真正裁切。
 */
export async function applyPortraitCrop() {
  dbg("—— 开始立绘裁剪预览（缩放+蓝阴影，不裁切）——");
  cropPreviews.clear();

  if (!state.items.length) {
    dbg("中止：无帧");
    setStatus("请先导入序列帧");
    return;
  }
  const example = exampleItem();
  const exampleSrc = example ? resolvePortraitSource(example) : null;
  if (!example || !exampleSrc) {
    dbg("中止：例图不可用");
    setStatus("请先导入例图（第 1 帧）");
    return;
  }
  ensureDefaultLines();
  const metrics = computeExampleMetrics();
  dbg("例图指标", metrics);
  if (!metrics) {
    setStatus("例图无法扫描身体宽度（需有非透明像素）");
    return;
  }

  const targets = state.items
    .map((item, index) => ({ item, index }))
    .filter(({ item, index }) => index > 0 && item.selected !== false && resolvePortraitSource(item));

  dbg("目标", targets.map((t) => ({ index: t.index, name: t.item.name })));

  if (!targets.length) {
    setStatus("没有可处理的后续帧（需勾选第 2 张及以后）");
    return;
  }

  hooks?.pushHistory?.("立绘预览缩放", targets.map((t) => t.item));

  let done = 0;
  let skipped = 0;
  /** @type {number | null} */
  let jumpTo = null;
  /** @type {{ index: number, trim: number } | null} */
  let bestTrim = null;

  const exampleW = exampleSrc.width;
  const exampleH = exampleSrc.height;
  exampleFrameSize = { w: exampleW, h: exampleH };

  for (const { item, index } of targets) {
    try {
      const scaled = scaleItemToExamplePortrait(item, metrics);
      if (!scaled.ok || !scaled.src) {
        skipped++;
        dbg(`跳过 #${index}`, scaled);
        continue;
      }

      const preview = computeCutPreview(scaled.src, metrics, exampleW, exampleH);
      dbg(`裁剪预览 #${index} ${item.name}`, {
        scale: scaled.scale,
        headWBefore: scaled.headWBefore,
        headWAfter: scaled.headWAfter,
        bodyWBefore: scaled.bodyWBefore,
        bodyWAfter: scaled.bodyWAfter,
        size: `${item.width}x${item.height}`,
        target: `${exampleW}x${exampleH}`,
        exampleHeadToFrame: metrics.headToFrame,
        exampleBodyToFrame: metrics.bodyToFrame,
        preview,
      });

      if (!preview.ok) {
        skipped++;
        continue;
      }

      cropPreviews.set(item.id, {
        cutY: preview.cutY,
        keepH: preview.keepH,
        headTop: preview.headTop,
        scale: scaled.scale,
        bodyWBefore: scaled.bodyWBefore,
        bodyWAfter: scaled.bodyWAfter ?? preview.bodyW,
        headWAfter: scaled.headWAfter ?? preview.headW,
        imgW: item.width,
        imgH: item.height,
        targetW: exampleW,
        targetH: exampleH,
        alignH: exampleH,
        frameLeft: preview.frameLeft,
        frameTop: preview.frameTop,
        headMargin: preview.headMargin,
        bodyCx: preview.bodyCx,
        bodyToFrame: preview.bodyToFrame,
        headToFrame: preview.headToFrame,
        exampleBodyToFrame: metrics.bodyToFrame,
        exampleHeadToFrame: metrics.headToFrame,
      });

      done++;
      if (jumpTo == null) jumpTo = index;
      const trim = preview.willTrim || 0;
      if (!bestTrim || trim > bestTrim.trim) bestTrim = { index, trim };
    } catch (err) {
      skipped++;
      console.error("[立绘裁剪] 帧异常", index, item.name, err);
    }
    await new Promise((r) => setTimeout(r, 0));
  }

  const go = bestTrim?.index ?? jumpTo;
  if (go != null) {
    state.currentFrame = go;
    state.selectedId = state.items[go]?.id || null;
  }

  hooks?.onApplied?.();
  syncPortraitOverlay();
  syncMetricsUI();

  const msg =
    `立绘预览 ${done} 张 · 画幅 ${exampleW}×${exampleH} · 头宽对齐例图`
    + (skipped ? ` · 跳过 ${skipped}` : "")
    + (go != null ? ` · 查看第 ${go + 1} 帧` : "");
  dbg("结束", { done, skipped, go, exampleW, exampleH, previews: [...cropPreviews.entries()], msg });
  setStatus(msg);
}

/**
 * 将透明帧放入例图尺寸画布：头顶边距与例图一致，身体水平居中。
 * @param {HTMLCanvasElement} src
 * @param {{ headTop: number, headH: number, headW: number, bodyW: number }} metrics
 * @param {number} targetW
 * @param {number} targetH
 */
function placeOnExampleCanvas(src, metrics, targetW, targetH) {
  const measured = measureFramePortrait(src, metrics);
  if (!measured) return null;

  const out = document.createElement("canvas");
  out.width = targetW;
  out.height = targetH;
  const ctx = out.getContext("2d");
  ctx.clearRect(0, 0, targetW, targetH);

  const dx = Math.round(targetW / 2 - measured.bodyCx);
  const dy = Math.round(metrics.headTop - measured.headTop);
  ctx.drawImage(src, dx, dy);
  return out;
}

/** @returns {number} 两侧各留白像素 */
function readSidePadPx() {
  const el = /** @type {HTMLInputElement | null} */ ($("#portraitSidePad"));
  const v = Math.round(Number(el?.value));
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(240, v));
}

function syncSidePadUI() {
  const out = $("#portraitSidePadOut");
  if (out) out.textContent = String(readSidePadPx());
}

/**
 * 以画幅底边中心为原点等比缩放（画布尺寸不变）。
 * @param {HTMLCanvasElement} src
 * @param {number} scale
 */
function scaleCanvasFromBottomCenter(src, scale) {
  const w = src.width;
  const h = src.height;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  if (!(scale > 0)) return out;
  ctx.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "high";
  ctx.translate(w / 2, h);
  ctx.scale(scale, scale);
  ctx.translate(-w / 2, -h);
  ctx.drawImage(src, 0, 0);
  return out;
}

/**
 * 按两侧留白缩小/放大立绘：目标身宽（不透明包围盒宽）= 画幅宽 − 2×留白。
 * 变换原点为画幅底边中心。
 * @param {HTMLCanvasElement} src
 * @param {number} sidePadPx
 * @returns {{ canvas: HTMLCanvasElement, scale: number, opaqueW: number, sidePad: number } | null}
 */
function applySidePadToCanvas(src, sidePadPx) {
  const pad = Math.max(0, Math.round(sidePadPx));
  const bounds = scanOpaqueBounds(readImageData(src));
  if (!bounds) return null;

  const opaqueW = Math.max(1, bounds.right - bounds.left + 1);
  const maxBodyW = src.width - pad * 2;
  if (maxBodyW < 8) {
    return { canvas: src, scale: 1, opaqueW, sidePad: pad };
  }

  const scale = maxBodyW / opaqueW;
  if (Math.abs(scale - 1) < 0.004) {
    return { canvas: src, scale: 1, opaqueW, sidePad: pad };
  }

  return {
    canvas: scaleCanvasFromBottomCenter(src, scale),
    scale,
    opaqueW,
    sidePad: pad,
  };
}

/**
 * 确认裁剪：输出为例图尺寸，头顶边距与身宽比与例图一致；再按两侧留白做底中心缩放。
 */
export async function confirmPortraitCrop() {
  if (!cropPreviews.size) {
    setStatus("请先点击「预览裁剪范围」");
    return;
  }

  const example = exampleItem();
  const exampleSrc = example ? resolvePortraitSource(example) : null;
  if (!exampleSrc) {
    setStatus("例图不可用");
    return;
  }
  ensureDefaultLines();
  const metrics = computeExampleMetrics();
  if (!metrics) {
    setStatus("例图指标无效");
    return;
  }
  const targetW = exampleSrc.width;
  const targetH = exampleSrc.height;
  const sidePad = readSidePadPx();

  const targets = state.items
    .map((item, index) => ({ item, index, preview: cropPreviews.get(item.id) }))
    .filter((t) => t.preview && t.index > 0);

  if (!targets.length) {
    setStatus("没有可确认的预览帧");
    return;
  }

  dbg("—— 确认裁剪 · 例图尺寸 + 两侧留白 ——", { targetW, targetH, sidePad, n: targets.length });

  hooks?.pushHistory?.("立绘确认裁剪", targets.map((t) => t.item));

  let done = 0;
  for (const { item, index } of targets) {
    try {
      const src = resolvePortraitSource(item);
      if (!src) continue;

      let out = placeOnExampleCanvas(src, metrics, targetW, targetH);
      if (!out) continue;
      let srcOut = placeOnExampleCanvas(item.sourceCanvas, metrics, targetW, targetH);
      if (!srcOut) continue;

      if (sidePad > 0) {
        const padded = applySidePadToCanvas(out, sidePad);
        const paddedSrc = applySidePadToCanvas(srcOut, sidePad);
        if (padded) out = padded.canvas;
        if (paddedSrc) srcOut = paddedSrc.canvas;
        dbg(`留白缩放 #${index}`, {
          sidePad,
          scale: padded?.scale,
          opaqueW: padded?.opaqueW,
        });
      }

      item.resultCanvas = out;
      item.sourceCanvas = srcOut;
      item.width = out.width;
      item.height = out.height;
      item.processed = true;
      item.eraseMask = null;
      done++;
      dbg(`已裁切 #${index}`, { size: `${out.width}x${out.height}`, sidePad });
    } catch (err) {
      console.error("[立绘裁剪] 确认失败", index, err);
    }
    await new Promise((r) => setTimeout(r, 0));
  }

  cropPreviews.clear();
  clearStageContentInsetsPx();
  appliedInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  if (targets[0]) {
    state.currentFrame = targets[0].index;
    state.selectedId = targets[0].item.id;
  }
  hooks?.onApplied?.();
  syncPortraitOverlay();
  setStatus(
    `已裁切 ${done} 张 · ${targetW}×${targetH}`
    + (sidePad > 0 ? ` · 两侧留白 ${sidePad}px（底中心缩放）` : " · 头顶边距对齐"),
  );
}

/**
 * 对已对齐例图尺寸的选中帧（不含例图）按当前留白参数再缩放。
 */
export async function applyPortraitSidePad() {
  const sidePad = readSidePadPx();
  const example = exampleItem();
  const exampleSrc = example ? resolvePortraitSource(example) : null;
  if (!exampleSrc) {
    setStatus("例图不可用");
    return;
  }
  const targetW = exampleSrc.width;
  const targetH = exampleSrc.height;

  const targets = state.items
    .map((item, index) => ({ item, index }))
    .filter(({ item, index }) => {
      if (index === 0) return false;
      if (item.selected === false) return false;
      const src = resolvePortraitSource(item);
      return Boolean(src && src.width === targetW && src.height === targetH);
    });

  if (!targets.length) {
    setStatus("没有可缩放的帧（需已确认裁剪为例图尺寸，且已勾选）");
    return;
  }

  hooks?.pushHistory?.("立绘两侧留白", targets.map((t) => t.item));

  let done = 0;
  for (const { item, index } of targets) {
    try {
      const src = resolvePortraitSource(item);
      if (!src) continue;
      const padded = applySidePadToCanvas(src, sidePad);
      if (!padded) continue;
      const paddedSource = applySidePadToCanvas(item.sourceCanvas, sidePad);
      if (!paddedSource) continue;

      item.resultCanvas = padded.canvas;
      item.sourceCanvas = paddedSource.canvas;
      item.width = padded.canvas.width;
      item.height = padded.canvas.height;
      item.processed = true;
      item.eraseMask = null;
      done++;
      dbg(`两侧留白 #${index}`, {
        sidePad,
        scale: padded.scale,
        opaqueW: padded.opaqueW,
      });
    } catch (err) {
      console.error("[立绘裁剪] 留白缩放失败", index, err);
    }
    await new Promise((r) => setTimeout(r, 0));
  }

  if (targets[0]) {
    state.currentFrame = targets[0].index;
    state.selectedId = targets[0].item.id;
  }
  hooks?.onApplied?.();
  syncPortraitOverlay();
  setStatus(
    sidePad > 0
      ? `已对 ${done} 张应用两侧留白 ${sidePad}px（底中心缩放）`
      : `留白为 0，已按原身宽对齐处理 ${done} 张`,
  );
}

/**
 * @param {{
 *   onStatus?: (msg: string) => void,
 *   onRender?: () => void,
 *   onApplied?: () => void,
 *   pushHistory?: (label: string, items?: import("./state.js").FrameItem[]) => void,
 * }} h
 */
export function initPortraitCrop(h) {
  hooks = h;
  layer = /** @type {HTMLElement} */ ($("#portraitLayer"));

  const applyBtn = /** @type {HTMLButtonElement | null} */ ($("#portraitApply"));
  dbg("init", {
    hasLayer: Boolean(layer),
    hasApplyBtn: Boolean(applyBtn),
    applyBtnId: applyBtn?.id,
  });

  $("#portraitResetLines")?.addEventListener("click", resetPortraitLines);
  $("#portraitGotoExample")?.addEventListener("click", () => {
    if (!state.items.length) return;
    state.currentFrame = 0;
    state.selectedId = state.items[0].id;
    state.isPlaying = false;
    $("#playBtn").textContent = "播放";
    hooks?.onRender?.();
    syncPortraitOverlay();
    setStatus("已切到例图（第 1 帧）");
  });

  if (applyBtn) {
    applyBtn.addEventListener("click", (e) => {
      dbg("按钮点击", { type: e.type, time: Date.now() });
      setStatus("立绘预览执行中（缩放对齐，不裁切）…");
      void applyPortraitCrop().catch((err) => {
        console.error("[立绘裁剪] 未捕获异常", err);
        dbg("未捕获异常", err);
        setStatus("立绘裁剪失败：看控制台 [立绘裁剪] 日志");
      });
    });
  } else {
    console.error("[立绘裁剪] 未找到 #portraitApply 按钮，事件未绑定");
  }

  const confirmBtn = /** @type {HTMLButtonElement | null} */ ($("#portraitConfirm"));
  if (confirmBtn) {
    confirmBtn.addEventListener("click", () => {
      dbg("确认裁剪点击");
      setStatus("确认裁剪中…");
      void confirmPortraitCrop().catch((err) => {
        console.error("[立绘裁剪] 确认异常", err);
        setStatus("确认裁剪失败：看控制台日志");
      });
    });
  }

  const sidePadRange = /** @type {HTMLInputElement | null} */ ($("#portraitSidePad"));
  sidePadRange?.addEventListener("input", syncSidePadUI);
  syncSidePadUI();

  $("#portraitSidePadApply")?.addEventListener("click", () => {
    setStatus("两侧留白缩放中…");
    void applyPortraitSidePad().catch((err) => {
      console.error("[立绘裁剪] 留白缩放异常", err);
      setStatus("留白缩放失败：看控制台日志");
    });
  });

  if (!layer) {
    dbg("警告：#portraitLayer 不存在，裁剪线不可用，但批量按钮仍应可用");
    return;
  }

  layer.addEventListener("pointerdown", (e) => {
    if (!state.portraitMode || !lines) return;
    const target = /** @type {HTMLElement} */ (e.target);
    const lineEl = target.closest?.(".portrait-line");
    if (!lineEl || (e.button != null && e.button !== 0)) return;
    e.preventDefault();
    e.stopPropagation();
    const which = /** @type {"headTop" | "chin" | "cutBottom"} */ (lineEl.dataset.which);
    if (which !== "headTop" && which !== "chin" && which !== "cutBottom") return;
    drag = {
      which,
      startY: e.clientY,
      origin: lines[which],
    };
    layer.setPointerCapture(e.pointerId);
  });

  layer.addEventListener("pointermove", (e) => {
    if (!drag || !lines) return;
    const rect = getFrameDrawRect();
    const canvas = exampleCanvas();
    if (!rect || !canvas) return;
    const dy = (e.clientY - drag.startY) / rect.cssScale;
    let y = Math.round(drag.origin + dy);
    y = Math.max(0, Math.min(canvas.height - 1, y));
    lines[drag.which] = y;
    // 保持头顶 < 下巴 < 裁切底
    if (lines.headTop > lines.chin) {
      if (drag.which === "headTop") lines.chin = lines.headTop;
      else if (drag.which === "chin") lines.headTop = lines.chin;
    }
    if (lines.cutBottom <= lines.chin) {
      if (drag.which === "cutBottom") lines.cutBottom = lines.chin + 1;
      else lines.cutBottom = Math.max(lines.cutBottom, lines.chin + 1);
    }
    syncPortraitOverlay();
  });

  const endDrag = (e) => {
    if (!drag) return;
    drag = null;
    try { layer.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    syncMetricsUI();
  };
  layer.addEventListener("pointerup", endDrag);
  layer.addEventListener("pointercancel", endDrag);
}

/** 帧列表变化时校正线位置 */
export function onPortraitContextChanged() {
  if (!state.portraitMode) {
    syncPortraitOverlay();
    return;
  }
  ensureDefaultLines();
  syncPortraitOverlay();
  syncMetricsUI();
}
