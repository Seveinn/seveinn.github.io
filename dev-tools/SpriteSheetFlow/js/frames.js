import { state, $, frameSource } from "./state.js";
import { removeBackground, sampleBgFromImageData } from "./remove-bg.js";
import { renderFrame, renderTimeline, updateCanvasSize } from "./preview.js";

const statusEl = $("#status");
const progressBar = $("#progressBar");
const stageEmpty = $("#stageEmpty");

export function setStatus(t) {
  statusEl.textContent = t;
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
  item.resultCanvas = canvas;
  item.processed = true;
  item.bg = used;
  setBgSwatch(used);
  return item;
}

export async function processAll() {
  if (!state.items.length) return;
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
  stageEmpty.style.display = "";
  renderTimeline();
  renderFrame();
  setStatus("已清空");
  updateButtons();
}

let previewTimer = null;
export function schedulePreviewSelected() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(async () => {
    const item = state.items[state.currentFrame];
    if (!item) return;
    await processItem(item);
    renderTimeline();
    renderFrame();
  }, 180);
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
