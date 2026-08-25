/** 预览区当前帧批量裁剪（裁剪框叠在舞台上） */

import { state, $, frameSource } from "./state.js";
import { hexToRgb } from "./remove-bg.js";
import { getFrameDrawRect } from "./preview.js";

/**
 * @typedef {{ x: number, y: number, w: number, h: number }} CropBox
 */

/** @type {CropBox[]} */
let boxes = [];
/** @type {null | { index: number, startX: number, startY: number, ox: number, oy: number }} */
let drag = null;
/** @type {HTMLElement | null} */
let layer = null;
/** @type {ReturnType<typeof collectEls> | null} */
let els = null;
/** @type {{ onApply: (frames: { name: string, canvas: HTMLCanvasElement, asProcessed?: boolean }[]) => void, onStatus?: (msg: string) => void, onRender?: () => void } | null} */
let hooks = null;

function collectEls() {
  return {
    layer: /** @type {HTMLElement} */ ($("#cropLayer")),
    rows: /** @type {HTMLInputElement} */ ($("#cropRows")),
    cols: /** @type {HTMLInputElement} */ ($("#cropCols")),
    boxWidth: /** @type {HTMLInputElement} */ ($("#cropBoxW")),
    boxHeight: /** @type {HTMLInputElement} */ ($("#cropBoxH")),
    boxWidthOut: /** @type {HTMLOutputElement | null} */ ($("#cropBoxWOut")),
    boxHeightOut: /** @type {HTMLOutputElement | null} */ ($("#cropBoxHOut")),
    exportSource: /** @type {HTMLSelectElement | null} */ ($("#cropExportSource")),
    exportBg: /** @type {HTMLSelectElement | null} */ ($("#cropExportBg")),
    exportBgColor: /** @type {HTMLInputElement | null} */ ($("#cropExportBgColor")),
    exportBgColorWrap: /** @type {HTMLElement | null} */ ($("#cropExportBgColorWrap")),
    namePrefix: /** @type {HTMLInputElement | null} */ ($("#cropNamePrefix")),
    generateBtn: $("#cropGenerate"),
    exportZipBtn: $("#cropExportZip"),
    applyBtn: $("#cropApply"),
    clearBtn: $("#cropClear"),
  };
}

const SIZE_STEP = 5;

function snapSize(n, max) {
  const capped = Math.max(SIZE_STEP, Math.min(max, Math.round(n)));
  return Math.max(SIZE_STEP, Math.round(capped / SIZE_STEP) * SIZE_STEP);
}

function syncSizeOutputs() {
  if (!els) return;
  if (els.boxWidthOut) els.boxWidthOut.textContent = els.boxWidth.value;
  if (els.boxHeightOut) els.boxHeightOut.textContent = els.boxHeight.value;
}

function syncExportBgUI() {
  if (!els?.exportBgColorWrap || !els.exportBg) return;
  els.exportBgColorWrap.hidden = els.exportBg.value !== "solid";
}

/**
 * 裁切用画布：按「裁切源」设置取原图或抠图结果。
 * @returns {{ canvas: HTMLCanvasElement, fromResult: boolean } | null}
 */
function resolveCropSource() {
  const item = state.items[state.currentFrame];
  if (!item) return null;

  const mode = els?.exportSource?.value || "auto";
  if (mode === "original") {
    return { canvas: item.sourceCanvas, fromResult: false };
  }
  if (mode === "result") {
    if (item.processed && item.resultCanvas) {
      return { canvas: item.resultCanvas, fromResult: true };
    }
    return null;
  }
  // auto：与预览一致，优先抠图结果
  const canvas = frameSource(item);
  return {
    canvas,
    fromResult: Boolean(item.processed && item.resultCanvas && canvas === item.resultCanvas),
  };
}

function syncSizeSliderRange() {
  if (!els) return;
  const src = resolveCropSource()?.canvas || currentLayoutSource();
  const maxW = src ? Math.max(SIZE_STEP, src.width) : 512;
  const maxH = src ? Math.max(SIZE_STEP, src.height) : 512;
  els.boxWidth.min = String(SIZE_STEP);
  els.boxHeight.min = String(SIZE_STEP);
  els.boxWidth.max = String(maxW);
  els.boxHeight.max = String(maxH);
  els.boxWidth.step = String(SIZE_STEP);
  els.boxHeight.step = String(SIZE_STEP);
  els.boxWidth.value = String(snapSize(+els.boxWidth.value || SIZE_STEP, maxW));
  els.boxHeight.value = String(snapSize(+els.boxHeight.value || SIZE_STEP, maxH));
  syncSizeOutputs();
}

function setStatus(msg) {
  hooks?.onStatus?.(msg);
}

/** 布局尺寸参考（始终有图时可用） */
function currentLayoutSource() {
  const item = state.items[state.currentFrame];
  return item?.sourceCanvas || null;
}

function autoCalculateBoxSize() {
  if (!els) return;
  const src = resolveCropSource()?.canvas || currentLayoutSource();
  if (!src) return;
  syncSizeSliderRange();
  const r = Math.max(1, parseInt(els.rows.value, 10) || 1);
  const c = Math.max(1, parseInt(els.cols.value, 10) || 1);
  els.boxWidth.value = String(snapSize(Math.floor(src.width / c), src.width));
  els.boxHeight.value = String(snapSize(Math.floor(src.height / r), src.height));
  syncSizeOutputs();
}

export function createCropBoxes() {
  const resolved = resolveCropSource();
  const src = resolved?.canvas || null;
  if (!src || !els) {
    if ((els?.exportSource?.value || "auto") === "result") {
      setStatus("当前帧尚未抠图，无法使用「仅抠图结果」");
    } else {
      setStatus("请先导入图片，再对当前帧生成裁剪网格");
    }
    return;
  }

  const rCount = Math.max(1, parseInt(els.rows.value, 10) || 1);
  const cCount = Math.max(1, parseInt(els.cols.value, 10) || 1);
  syncSizeSliderRange();
  const boxW = snapSize(parseInt(els.boxWidth.value, 10) || 50, src.width);
  const boxH = snapSize(parseInt(els.boxHeight.value, 10) || 50, src.height);
  els.boxWidth.value = String(boxW);
  els.boxHeight.value = String(boxH);
  syncSizeOutputs();

  const stepX = cCount > 1 ? (src.width - boxW) / (cCount - 1) : 0;
  const stepY = rCount > 1 ? (src.height - boxH) / (rCount - 1) : 0;

  boxes = [];
  for (let r = 0; r < rCount; r++) {
    for (let c = 0; c < cCount; c++) {
      const x = cCount === 1 ? Math.round((src.width - boxW) / 2) : Math.round(c * stepX);
      const y = rCount === 1 ? Math.round((src.height - boxH) / 2) : Math.round(r * stepY);
      boxes.push({
        x: Math.max(0, Math.min(x, src.width - boxW)),
        y: Math.max(0, Math.min(y, src.height - boxH)),
        w: Math.min(boxW, src.width),
        h: Math.min(boxH, src.height),
      });
    }
  }

  if (!state.cropMode) setCropMode(true);
  syncCropOverlay();
  const tag = resolved.fromResult ? "抠图结果" : "原图";
  setStatus(`已生成 ${boxes.length} 个裁剪框 · ${tag} ${src.width}×${src.height}`);
}

export function clearCropBoxes() {
  boxes = [];
  drag = null;
  syncCropOverlay();
  setStatus("已清除裁剪框");
}

export function setCropMode(on) {
  state.cropMode = on;
  if (on) {
    state.portraitMode = false;
    $("#stageWrap")?.classList.remove("portrait-mode");
    const portraitLayer = $("#portraitLayer");
    if (portraitLayer) portraitLayer.hidden = true;
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
    if (!boxes.length && currentLayoutSource()) {
      autoCalculateBoxSize();
      createCropBoxes();
    }
  }
  $("#stageWrap")?.classList.toggle("crop-mode", on);
  if (layer) layer.hidden = !on;
  hooks?.onRender?.();
  syncCropOverlay();
}

/** 将图像像素框同步到预览层 DOM */
export function syncCropOverlay() {
  if (!layer || !els) return;
  layer.hidden = !state.cropMode;
  if (!state.cropMode || !boxes.length) {
    layer.innerHTML = "";
    return;
  }

  const rect = getFrameDrawRect();
  if (!rect) return;

  const cssScale = rect.cssScale;
  const ox = rect.dx / rect.dpr;
  const oy = rect.dy / rect.dpr;

  const existing = [...layer.querySelectorAll(".crop-box")];
  const canReuse = existing.length === boxes.length
    && existing.every((el, i) => el.dataset.index === String(i));

  if (!canReuse) {
    layer.innerHTML = "";
    boxes.forEach((box, index) => {
      layer.appendChild(buildCropBox(box, index, ox, oy, cssScale));
    });
    return;
  }

  existing.forEach((boxEl, index) => {
    layoutCropBox(/** @type {HTMLElement} */ (boxEl), boxes[index], ox, oy, cssScale);
  });
}

function sanitizePrefix(raw) {
  let prefix = (raw || "").trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_");
  prefix = prefix.replace(/[.\\/]+$/g, "").trim();
  return prefix || "frame";
}

function frameFileName(index) {
  const prefix = sanitizePrefix(els?.namePrefix?.value || "frame");
  return `${prefix}_${String(index + 1).padStart(2, "0")}.png`;
}

/**
 * @param {CropBox} box
 * @param {number} index
 * @param {number} ox
 * @param {number} oy
 * @param {number} cssScale
 */
function buildCropBox(box, index, ox, oy, cssScale) {
  const boxEl = document.createElement("div");
  boxEl.className = "crop-box";
  boxEl.dataset.index = String(index);

  const label = document.createElement("div");
  label.className = "box-label";
  label.textContent = String(index + 1);
  boxEl.appendChild(label);

  layoutCropBox(boxEl, box, ox, oy, cssScale);
  return boxEl;
}

/**
 * @param {HTMLElement} boxEl
 * @param {CropBox} box
 * @param {number} ox
 * @param {number} oy
 * @param {number} cssScale
 */
function layoutCropBox(boxEl, box, ox, oy, cssScale) {
  boxEl.style.left = `${ox + box.x * cssScale}px`;
  boxEl.style.top = `${oy + box.y * cssScale}px`;
  boxEl.style.width = `${Math.max(1, box.w * cssScale)}px`;
  boxEl.style.height = `${Math.max(1, box.h * cssScale)}px`;
}

/**
 * @returns {{ name: string, canvas: HTMLCanvasElement, asProcessed: boolean }[]}
 */
function getCroppedFrames() {
  const resolved = resolveCropSource();
  if (!resolved || !boxes.length) return [];
  const src = resolved.canvas;
  const bgMode = els?.exportBg?.value || "transparent";
  const solidRgb = hexToRgb(els?.exportBgColor?.value || "#e6e6e5");
  const asProcessed = resolved.fromResult && bgMode === "transparent";

  const out = [];
  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i];
    const cropX = Math.max(0, Math.min(box.x, src.width - 1));
    const cropY = Math.max(0, Math.min(box.y, src.height - 1));
    const cropW = Math.max(1, Math.min(box.w, src.width - cropX));
    const cropH = Math.max(1, Math.min(box.h, src.height - cropY));

    const canvas = document.createElement("canvas");
    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext("2d");
    if (bgMode === "solid") {
      ctx.fillStyle = `rgb(${solidRgb[0]},${solidRgb[1]},${solidRgb[2]})`;
      ctx.fillRect(0, 0, cropW, cropH);
    } else {
      ctx.clearRect(0, 0, cropW, cropH);
    }
    ctx.drawImage(src, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    out.push({
      name: frameFileName(i),
      canvas,
      asProcessed,
    });
  }
  return out;
}

async function exportZip() {
  const frames = getCroppedFrames();
  if (!frames.length) {
    if ((els?.exportSource?.value || "auto") === "result") {
      alert("当前帧尚未抠图，请先处理抠图，或改选其他裁切源");
    } else {
      alert("请先对当前帧生成裁剪框");
    }
    return;
  }
  if (!globalThis.JSZip) {
    alert("JSZip 未加载");
    return;
  }
  setStatus("打包裁切 ZIP…");
  const zip = new globalThis.JSZip();
  for (const frame of frames) {
    const blob = await new Promise((res) => frame.canvas.toBlob(res, "image/png"));
    zip.file(frame.name, blob);
  }
  const content = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(content);
  a.download = "cropped_frames.zip";
  a.click();
  URL.revokeObjectURL(a.href);
  const bgLabel = (els?.exportBg?.value || "transparent") === "solid" ? "纯色底" : "透明底";
  const srcLabel = frames[0]?.asProcessed ? "抠图" : "原图/预览";
  setStatus(`已导出 ${frames.length} 张 · ${srcLabel} · ${bgLabel}`);
}

function applyAsFrames() {
  const frames = getCroppedFrames();
  if (!frames.length) {
    if ((els?.exportSource?.value || "auto") === "result") {
      alert("当前帧尚未抠图，请先处理抠图，或改选其他裁切源");
    } else {
      alert("请先对当前帧生成裁剪框");
    }
    return;
  }
  boxes = [];
  setCropMode(false);
  hooks?.onApply(frames);
}

/**
 * @param {{
 *   onApply: (frames: { name: string, canvas: HTMLCanvasElement, asProcessed?: boolean }[]) => void,
 *   onStatus?: (msg: string) => void,
 *   onRender?: () => void,
 * }} h
 */
export function initBatchCut(h) {
  hooks = h;
  els = collectEls();
  layer = els.layer;

  els.generateBtn.addEventListener("click", () => createCropBoxes());
  els.clearBtn?.addEventListener("click", clearCropBoxes);
  els.exportZipBtn.addEventListener("click", () => { void exportZip(); });
  els.applyBtn.addEventListener("click", applyAsFrames);

  const onSizeInput = () => {
    syncSizeSliderRange();
    syncSizeOutputs();
    if (boxes.length && state.cropMode) createCropBoxes();
  };
  els.boxWidth.addEventListener("input", onSizeInput);
  els.boxHeight.addEventListener("input", onSizeInput);
  els.exportSource?.addEventListener("change", () => {
    syncSizeSliderRange();
    if (boxes.length && state.cropMode) createCropBoxes();
    else if ((els?.exportSource?.value || "auto") === "result" && !resolveCropSource()) {
      setStatus("当前帧尚未抠图，无法使用「仅抠图结果」");
    }
  });
  els.exportBg?.addEventListener("change", syncExportBgUI);
  syncSizeSliderRange();
  syncSizeOutputs();
  syncExportBgUI();

  layer.addEventListener("pointerdown", (e) => {
    if (!state.cropMode) return;
    const target = /** @type {HTMLElement} */ (e.target);
    const boxEl = target.closest?.(".crop-box");
    if (!boxEl || (e.button != null && e.button !== 0)) return;
    e.preventDefault();
    e.stopPropagation();
    const index = +boxEl.dataset.index;
    if (!Number.isFinite(index) || !boxes[index]) return;
    drag = {
      index,
      startX: e.clientX,
      startY: e.clientY,
      ox: boxes[index].x,
      oy: boxes[index].y,
    };
    /** @type {HTMLElement} */ (boxEl).style.zIndex = "20";
    layer.setPointerCapture(e.pointerId);
  });

  layer.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const rect = getFrameDrawRect();
    const src = resolveCropSource()?.canvas || currentLayoutSource();
    if (!rect || !src) return;
    const dx = (e.clientX - drag.startX) / rect.cssScale;
    const dy = (e.clientY - drag.startY) / rect.cssScale;
    const box = boxes[drag.index];
    const maxX = Math.max(0, src.width - box.w);
    const maxY = Math.max(0, src.height - box.h);
    box.x = Math.round(Math.max(0, Math.min(drag.ox + dx, maxX)));
    box.y = Math.round(Math.max(0, Math.min(drag.oy + dy, maxY)));

    const cssScale = rect.cssScale;
    const ox = rect.dx / rect.dpr;
    const oy = rect.dy / rect.dpr;
    const boxEl = /** @type {HTMLElement | null} */ (
      layer.querySelector(`.crop-box[data-index="${drag.index}"]`)
    );
    if (boxEl) {
      layoutCropBox(boxEl, box, ox, oy, cssScale);
      boxEl.style.zIndex = "20";
    }
  });

  const endDrag = (e) => {
    if (!drag) return;
    const boxEl = /** @type {HTMLElement | null} */ (
      layer.querySelector(`.crop-box[data-index="${drag.index}"]`)
    );
    if (boxEl) boxEl.style.zIndex = "1";
    drag = null;
    try { layer.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  };
  layer.addEventListener("pointerup", endDrag);
  layer.addEventListener("pointercancel", endDrag);

  return {
    setCropMode,
    createCropBoxes,
    clearCropBoxes,
    syncCropOverlay,
    autoCalculateBoxSize,
  };
}

/** 帧切换或导入后调用：尺寸变化则清空框 */
export function onFrameContextChanged() {
  syncSizeSliderRange();
  if (!boxes.length) {
    syncCropOverlay();
    return;
  }
  const src = resolveCropSource()?.canvas || currentLayoutSource();
  if (!src) {
    boxes = [];
    syncCropOverlay();
    return;
  }
  const invalid = boxes.some((b) => b.x + b.w > src.width || b.y + b.h > src.height);
  if (invalid) {
    boxes = [];
    if (state.cropMode) {
      autoCalculateBoxSize();
      createCropBoxes();
    } else {
      syncCropOverlay();
    }
  } else {
    syncCropOverlay();
  }
}
