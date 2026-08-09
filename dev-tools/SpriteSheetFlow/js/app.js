import { state, $ } from "./state.js";
import { hexToRgb, sampleBgFromImageData } from "./remove-bg.js";
import { buildSpriteSheet } from "./sheet.js";
import {
  renderFrame,
  renderTimeline,
  applyPreviewBgClass,
  openCompare,
  setCompareHandler,
  startAnimLoop,
} from "./preview.js";
import {
  updateButtons,
  setBgSwatch,
  setStatus,
  processItem,
  processAll,
  addFiles,
  downloadZip,
  clearFrames,
  schedulePreviewSelected,
  sheetFrameSources,
} from "./frames.js";

const spriteCanvas = $("#spriteCanvas");
const spriteCtx = spriteCanvas.getContext("2d");

function bindParam(id, outId) {
  const el = $("#" + id);
  const out = $("#" + outId);
  const sync = () => { out.textContent = el.value; };
  el.addEventListener("input", () => {
    sync();
    schedulePreviewSelected();
  });
  sync();
}

bindParam("tol", "tolOut");
bindParam("inset", "insetOut");
bindParam("fringe", "fringeOut");
bindParam("soft", "softOut");

const sideTabs = $("#sideTabs");
sideTabs.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const name = tab.dataset.tab;
    sideTabs.querySelectorAll(".tab").forEach((t) => {
      const on = t === tab;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    sideTabs.querySelectorAll(".tab-panel").forEach((panel) => {
      const on = panel.id === `tab-${name}`;
      panel.classList.toggle("active", on);
      panel.hidden = !on;
    });
  });
});

setCompareHandler((idx) => openCompare(idx, processItem, updateButtons));

function refreshSheet() {
  const only = $("#sheetOnlyProcessed").checked;
  const layout = /** @type {"horizontal" | "grid"} */ ($("#sheetLayout").value);
  buildSpriteSheet(spriteCanvas, spriteCtx, sheetFrameSources(only), layout);
}

// —— events ——
const dropzone = $("#dropzone");
const fileInput = $("#fileInput");
dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("dragover"); });
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  addFiles(e.dataTransfer.files);
});
fileInput.addEventListener("change", () => {
  addFiles(fileInput.files);
  fileInput.value = "";
});

$("#btnAutoBg").addEventListener("click", () => {
  state.useManualBg = false;
  state.autoSample = true;
  const item = state.items[state.currentFrame] || state.items[0];
  if (!item) return;
  const ctx = item.sourceCanvas.getContext("2d", { willReadFrequently: true });
  const data = ctx.getImageData(0, 0, item.width, item.height).data;
  setBgSwatch(sampleBgFromImageData(data, item.width, item.height));
  schedulePreviewSelected();
  setStatus("已切换为自动采样背景色");
});

$("#bgColor").addEventListener("input", (e) => {
  state.useManualBg = true;
  state.autoSample = false;
  state.manualBg = hexToRgb(e.target.value);
  setBgSwatch(state.manualBg);
  schedulePreviewSelected();
});

document.querySelectorAll(".preview-bg button").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.previewBg = btn.dataset.bg;
    applyPreviewBgClass();
    renderFrame();
  });
});

$("#playBtn").addEventListener("click", () => {
  if (!state.items.length) return;
  state.isPlaying = !state.isPlaying;
  $("#playBtn").textContent = state.isPlaying ? "暂停" : "播放";
  state.lastFrameTime = 0;
});
$("#prevBtn").addEventListener("click", () => {
  if (!state.items.length) return;
  state.isPlaying = false;
  $("#playBtn").textContent = "播放";
  state.currentFrame = (state.currentFrame - 1 + state.items.length) % state.items.length;
  state.selectedId = state.items[state.currentFrame].id;
  renderFrame();
});
$("#nextBtn").addEventListener("click", () => {
  if (!state.items.length) return;
  state.isPlaying = false;
  $("#playBtn").textContent = "播放";
  state.currentFrame = (state.currentFrame + 1) % state.items.length;
  state.selectedId = state.items[state.currentFrame].id;
  renderFrame();
});

$("#fpsRange").addEventListener("input", (e) => {
  state.fps = +e.target.value;
  $("#fpsVal").textContent = state.fps;
  renderFrame();
});
$("#speedRange").addEventListener("input", (e) => {
  state.speed = +e.target.value;
  $("#speedVal").textContent = state.speed.toFixed(1) + "x";
});
$("#delayRange").addEventListener("input", (e) => {
  state.extraDelay = +e.target.value;
  $("#delayVal").textContent = state.extraDelay + " ms";
});
$("#playMode").addEventListener("change", (e) => {
  state.playMode = e.target.value;
  state.direction = 1;
});
$("#flipX").addEventListener("change", (e) => {
  state.flipX = e.target.value === "true";
  renderFrame();
});

$("#btnProcess").addEventListener("click", processAll);
$("#btnDownload").addEventListener("click", downloadZip);
$("#btnReprocessSel").addEventListener("click", async () => {
  const item = state.items[state.currentFrame];
  if (!item) return;
  setStatus("重算 " + item.name);
  await processItem(item);
  renderTimeline();
  renderFrame();
  setStatus("已重算 · " + item.name);
  updateButtons();
});
$("#btnCompare").addEventListener("click", () => openCompare(state.currentFrame, processItem, updateButtons));
$("#btnClear").addEventListener("click", clearFrames);

$("#exportBtn").addEventListener("click", () => {
  if (!state.items.length) return;
  refreshSheet();
  $("#exportModal").classList.add("open");
});
$("#sheetLayout").addEventListener("change", refreshSheet);
$("#sheetOnlyProcessed").addEventListener("change", refreshSheet);
$("#downloadSheetBtn").addEventListener("click", () => {
  const only = $("#sheetOnlyProcessed").checked;
  if (!sheetFrameSources(only).length) {
    alert("没有可导出的帧（可取消「仅已抠图」或先处理抠图）");
    return;
  }
  const a = document.createElement("a");
  a.download = "spritesheet.png";
  a.href = spriteCanvas.toDataURL("image/png");
  a.click();
});

const closeCompare = () => $("#compare").classList.remove("open");
const closeExport = () => $("#exportModal").classList.remove("open");
$("#btnCloseCompare").addEventListener("click", closeCompare);
$("#closeModalBtn").addEventListener("click", closeExport);
$("#closeModalBtn2").addEventListener("click", closeExport);
$("#compare").addEventListener("click", (e) => { if (e.target.id === "compare") closeCompare(); });
$("#exportModal").addEventListener("click", (e) => { if (e.target.id === "exportModal") closeExport(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeCompare(); closeExport(); }
});

startAnimLoop();
