import { state, $, frameSource, cloneCanvas } from "./state.js";
import {
  removeBackground,
  sampleBgFromImageData,
  applyEraseMask,
  spotEraseLocal,
} from "./remove-bg.js";
import { renderFrame, renderTimeline, updateCanvasSize } from "./preview.js";

const statusEl = $("#status");
const progressBar = $("#progressBar");
const stageEmpty = $("#stageEmpty");

const MAX_HISTORY = 40;
/** @type {{ label: string, currentFrame: number, frames: ReturnType<typeof snapshotFrame>[] }[]} */
let history = [];
let paramHistoryArmed = true;

export function setStatus(t) {
  statusEl.textContent = t;
}

function snapshotFrame(item) {
  return {
    id: item.id,
    processed: item.processed,
    bg: item.bg ? item.bg.slice() : null,
    eraseMask: item.eraseMask ? new Uint8Array(item.eraseMask) : null,
    resultCanvas: item.resultCanvas ? cloneCanvas(item.resultCanvas) : null,
  };
}

function restoreFrame(item, snap) {
  item.processed = snap.processed;
  item.bg = snap.bg ? snap.bg.slice() : null;
  item.eraseMask = snap.eraseMask ? new Uint8Array(snap.eraseMask) : null;
  item.resultCanvas = snap.resultCanvas ? cloneCanvas(snap.resultCanvas) : null;
}

/** @param {string} label @param {import("./state.js").FrameItem[] | null} [items] */
export function pushHistory(label, items = null) {
  const list = items || state.items;
  if (!list.length) return;
  history.push({
    label,
    currentFrame: state.currentFrame,
    frames: list.map(snapshotFrame),
  });
  if (history.length > MAX_HISTORY) history.shift();
  updateButtons();
}

export function clearHistory() {
  history = [];
  paramHistoryArmed = true;
  updateButtons();
}

export function canUndo() {
  return history.length > 0;
}

export function undoLast() {
  const entry = history.pop();
  if (!entry) {
    setStatus("没有可撤销的操作");
    updateButtons();
    return false;
  }

  const byId = new Map(state.items.map((item) => [item.id, item]));
  for (const snap of entry.frames) {
    const item = byId.get(snap.id);
    if (item) restoreFrame(item, snap);
  }

  if (entry.currentFrame >= 0 && entry.currentFrame < state.items.length) {
    state.currentFrame = entry.currentFrame;
    state.selectedId = state.items[state.currentFrame]?.id || null;
  }

  const bgItem = state.items[state.currentFrame];
  if (bgItem?.bg) setBgSwatch(bgItem.bg);

  renderTimeline();
  renderFrame();
  updateButtons();
  setStatus(`已撤销 · ${entry.label}`);
  return true;
}

export function params() {
  return {
    tol: +$("#tol").value,
    inset: +$("#inset").value,
    fringe: +$("#fringe").value,
    soft: +$("#soft").value,
  };
}

export function updateButtons() {
  const n = state.items.length;
  const done = state.items.filter((i) => i.processed).length;
  $("#btnProcess").disabled = n === 0;
  $("#btnDownload").disabled = done === 0;
  $("#exportBtn").disabled = n === 0;
  $("#btnClear").disabled = n === 0;
  $("#btnReprocessSel").disabled = n === 0;
  $("#btnCompare").disabled = n === 0;
  const undoBtn = $("#btnUndo");
  if (undoBtn) undoBtn.disabled = history.length === 0;
  const spotOff = n === 0;
  $("#btnSpotErase").disabled = spotOff;
  $("#btnSpotEraseBar").disabled = spotOff;
}

export function setBgSwatch(rgb) {
  const [r, g, b] = rgb.map((v) => Math.round(v));
  $("#bgSwatch").style.background = `rgb(${r},${g},${b})`;
  if (!state.useManualBg) {
    $("#bgColor").value = "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  }
}

function resolveBg(item) {
  if (state.useManualBg) return state.manualBg.slice();
  const ctx = item.sourceCanvas.getContext("2d", { willReadFrequently: true });
  const data = ctx.getImageData(0, 0, item.width, item.height).data;
  return sampleBgFromImageData(data, item.width, item.height);
}

export async function processItem(item) {
  const { canvas, bg: used } = removeBackground(item.sourceCanvas, params(), resolveBg(item));
  applyEraseMask(canvas, item.eraseMask);
  item.resultCanvas = canvas;
  item.processed = true;
  item.bg = used;
  setBgSwatch(used);
  return item;
}

export function spotParams() {
  const mode = /** @type {"boundary" | "range"} */ ($("#spotMode")?.value || "boundary");
  const tol = mode === "range"
    ? +($("#spotTolRange")?.value || 36)
    : +($("#spotTolBoundary")?.value || 200);
  return {
    mode,
    tol,
    radius: +($("#spotRadius")?.value || 36),
  };
}

/** 在当前帧结果上点选扣除；必要时先跑一遍抠图。 */
export async function applySpotEraseAt(imageX, imageY) {
  const item = state.items[state.currentFrame];
  if (!item) return { erased: 0 };

  const before = snapshotFrame(item);
  const opts = spotParams();

  if (!item.processed || !item.resultCanvas) {
    await processItem(item);
  }

  const { erased, eraseMask } = spotEraseLocal(
    item.resultCanvas,
    imageX,
    imageY,
    opts,
    item.eraseMask,
  );

  if (erased <= 0) {
    restoreFrame(item, before);
    renderTimeline();
    renderFrame();
    updateButtons();
    setStatus("此处无可扣像素（已透明或色差过大）");
    return { erased };
  }

  history.push({
    label: "点选扣除",
    currentFrame: state.currentFrame,
    frames: [before],
  });
  if (history.length > MAX_HISTORY) history.shift();

  item.eraseMask = eraseMask;
  item.processed = true;
  updateButtons();
  renderTimeline();
  renderFrame();
  const modeLabel = opts.mode === "range" ? "范围" : "边界";
  const extra = opts.mode === "range" ? ` · 半径 ${opts.radius}` : "";
  setStatus(`${modeLabel}同色扣除 ${erased} 像素 · 容差 ${opts.tol}${extra}`);
  return { erased };
}

export async function processAll() {
  if (!state.items.length) return;
  pushHistory("处理全部抠图");
  $("#btnProcess").disabled = true;
  const n = state.items.length;
  for (let i = 0; i < n; i++) {
    setStatus(`抠图 ${i + 1}/${n} · ${state.items[i].name}`);
    progressBar.style.width = ((i + 1) / n * 100) + "%";
    await processItem(state.items[i]);
    await new Promise((r) => setTimeout(r, 0));
    renderTimeline();
    if (i === state.currentFrame) renderFrame();
  }
  setStatus(`抠图完成 ${n} 张 · TOL=${params().tol} INSET=${params().inset}`);
  progressBar.style.width = "0%";
  updateButtons();
  renderFrame();
}

async function loadFile(file) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0);
  bitmap.close?.();
  return {
    id: crypto.randomUUID(),
    name: file.name.replace(/\.[^.]+$/, "") + ".png",
    width: canvas.width,
    height: canvas.height,
    sourceCanvas: canvas,
    resultCanvas: null,
    processed: false,
    bg: null,
    eraseMask: null,
  };
}

export async function addFiles(fileList) {
  const files = [...fileList]
    .filter((f) => f.type.startsWith("image/"))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
  if (!files.length) return;

  setStatus(`导入中… 0/${files.length}`);
  for (let i = 0; i < files.length; i++) {
    state.items.push(await loadFile(files[i]));
    setStatus(`导入中… ${i + 1}/${files.length}`);
    progressBar.style.width = ((i + 1) / files.length * 100) + "%";
  }

  if (state.autoSample && state.items.length) {
    const first = state.items[0];
    const ctx = first.sourceCanvas.getContext("2d", { willReadFrequently: true });
    const data = ctx.getImageData(0, 0, first.width, first.height).data;
    setBgSwatch(sampleBgFromImageData(data, first.width, first.height));
  }

  state.currentFrame = 0;
  state.direction = 1;
  state.selectedId = state.items[0]?.id || null;
  state.isPlaying = false;
  state.lastFrameTime = 0;
  $("#playBtn").textContent = "播放";
  clearHistory();
  updateCanvasSize();
  renderTimeline();
  renderFrame();
  updateButtons();
  stageEmpty.style.display = state.items.length ? "none" : "";
  setStatus(`已导入 ${state.items.length} 张 · 可播放预览或处理抠图`);
  progressBar.style.width = "0%";
}

export async function downloadZip() {
  const ready = state.items.filter((i) => i.processed && i.resultCanvas);
  if (!ready.length) return;
  setStatus("打包 ZIP…");
  const zip = new globalThis.JSZip();
  for (const item of ready) {
    const blob = await new Promise((res) => item.resultCanvas.toBlob(res, "image/png"));
    zip.file(item.name, blob);
  }
  const out = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(out);
  a.download = "sprites-transparent.zip";
  a.click();
  URL.revokeObjectURL(a.href);
  setStatus(`已下载 ${ready.length} 张 ZIP`);
}

export function clearFrames() {
  state.items = [];
  state.selectedId = null;
  state.currentFrame = 0;
  state.isPlaying = false;
  state.lastFrameTime = 0;
  $("#playBtn").textContent = "播放";
  clearHistory();
  stageEmpty.style.display = "";
  renderTimeline();
  renderFrame();
  setStatus("已清空");
  updateButtons();
}

let previewRaf = 0;
let previewGen = 0;
let othersTimer = null;

/** 参数拖动时：当前帧跟手重算；已处理的其他帧在停手后同步。 */
export function schedulePreviewSelected() {
  if (!state.items.length) return;
  if (previewRaf) cancelAnimationFrame(previewRaf);
  previewRaf = requestAnimationFrame(() => {
    previewRaf = 0;
    const gen = ++previewGen;
    const item = state.items[state.currentFrame];
    if (!item) return;

    if (paramHistoryArmed) {
      const touched = state.items.filter((it) => it.processed || it === item);
      pushHistory("参数调整", touched.length ? touched : [item]);
      paramHistoryArmed = false;
    }

    processItem(item);
    renderFrame();
    renderTimeline();
    updateButtons();
    const p = params();
    setStatus(`实时预览 · TOL=${p.tol} INSET=${p.inset} FRINGE=${p.fringe} SOFT=${p.soft}`);

    clearTimeout(othersTimer);
    othersTimer = setTimeout(() => {
      if (gen !== previewGen) return;
      void reprocessOtherFrames(gen).finally(() => {
        if (gen === previewGen) paramHistoryArmed = true;
      });
    }, 160);
  });
}

async function reprocessOtherFrames(gen) {
  const cur = state.currentFrame;
  let touched = 0;
  for (let i = 0; i < state.items.length; i++) {
    if (gen !== previewGen) return;
    if (i === cur) continue;
    const item = state.items[i];
    if (!item.processed) continue;
    processItem(item);
    touched++;
    await new Promise((r) => setTimeout(r, 0));
  }
  if (gen !== previewGen) return;
  if (touched > 0) {
    renderTimeline();
    renderFrame();
    updateButtons();
  }
  const p = params();
  setStatus(`参数已同步 · TOL=${p.tol} INSET=${p.inset}`);
}

export function sheetFrameSources(onlyProcessed) {
  return state.items
    .filter((i) => !onlyProcessed || i.processed)
    .map((item) => ({
      width: item.width,
      height: item.height,
      source: frameSource(item),
    }));
}
