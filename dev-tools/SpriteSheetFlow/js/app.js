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
  stageEventToImageXY,
  setSpotEraseCursor,
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
  applySpotEraseAt,
  pushHistory,
  undoLast,
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

function bindOutput(id, outId, suffix = "") {
  const el = $("#" + id);
  const out = $("#" + outId);
  const sync = () => { out.textContent = el.value + suffix; };
  el.addEventListener("input", sync);
  sync();
}
bindOutput("spotTolBoundary", "spotTolBoundaryOut");
bindOutput("spotTolRange", "spotTolRangeOut");
bindOutput("spotRadius", "spotRadiusOut");

function syncSpotModeUI() {
  const mode = $("#spotMode")?.value || "boundary";
  const boundaryWrap = $("#spotTolBoundaryWrap");
  const rangeWrap = $("#spotTolRangeWrap");
  const hint = $("#spotModeHint");
  if (boundaryWrap) boundaryWrap.hidden = mode !== "boundary";
  if (rangeWrap) rangeWrap.hidden = mode !== "range";
  if (hint) {
    hint.textContent = mode === "range"
      ? "范围模式：仅扣除半径内与点击色相近的像素；容差与半径独立调节"
      : "边界模式：沿同色连通区域扣除，异色边框会拦住扩展；使用独立的边界容差";
  }
  const title = mode === "range"
    ? "点选扣除（范围模式）"
    : "点选扣除（边界模式）";
  $("#btnSpotErase")?.setAttribute("title", title);
  $("#btnSpotEraseBar")?.setAttribute("title", title);
}

function setSpotEraseMode(on) {
  state.spotErase = on;
  $("#btnSpotErase").classList.toggle("active", on);
  $("#btnSpotEraseBar").classList.toggle("active", on);
  setSpotEraseCursor(on);
  if (on) {
    state.isPlaying = false;
    $("#playBtn").textContent = "播放";
    const mode = $("#spotMode")?.value || "boundary";
    setStatus(mode === "range"
      ? "点选扣除已开启 · 范围模式：清除半径内同色像素"
      : "点选扣除已开启 · 边界模式：清除连通同色区域");
  } else {
    setStatus("点选扣除已关闭");
  }
  renderFrame();
}
$("#btnSpotErase").addEventListener("click", () => setSpotEraseMode(!state.spotErase));
$("#btnSpotEraseBar").addEventListener("click", () => setSpotEraseMode(!state.spotErase));
$("#spotMode").addEventListener("change", () => {
  syncSpotModeUI();
  if (state.spotErase) setSpotEraseMode(true);
});
syncSpotModeUI();

function initStageToolsDrag() {
  const tools = $("#stageTools");
  const handle = $("#stageToolsHandle");
  const panel = tools?.closest(".stage-panel");
  if (!tools || !handle || !panel) return;

  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  const clampPos = (left, top) => {
    const maxL = Math.max(0, panel.clientWidth - tools.offsetWidth);
    const maxT = Math.max(0, panel.clientHeight - tools.offsetHeight);
    return {
      left: Math.max(0, Math.min(maxL, left)),
      top: Math.max(0, Math.min(maxT, top)),
    };
  };

  const applyPos = (left, top) => {
    const pos = clampPos(left, top);
    tools.style.left = pos.left + "px";
    tools.style.top = pos.top + "px";
    tools.style.right = "auto";
    tools.style.transform = "none";
  };

  handle.addEventListener("pointerdown", (e) => {
    if (e.button != null && e.button !== 0) return;
    dragging = true;
    tools.classList.add("dragging");
    const rect = tools.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    handle.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  handle.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const pref = panel.getBoundingClientRect();
    applyPos(e.clientX - pref.left - offsetX, e.clientY - pref.top - offsetY);
  });

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    tools.classList.remove("dragging");
    try { handle.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  };
  handle.addEventListener("pointerup", endDrag);
  handle.addEventListener("pointercancel", endDrag);

  new ResizeObserver(() => {
    if (!tools.style.left && !tools.style.top) return;
    applyPos(parseFloat(tools.style.left) || 0, parseFloat(tools.style.top) || 0);
  }).observe(panel);
}
initStageToolsDrag();

$("#stage").addEventListener("click", async (e) => {
  if (!state.spotErase || !state.items.length) return;
  const pt = stageEventToImageXY(e.clientX, e.clientY);
  if (!pt) {
    setStatus("请点在图片帧范围内");
    return;
  }
  await applySpotEraseAt(pt.x, pt.y);
});

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

function syncCanvasSizeUI(pct) {
  const clamped = Math.max(60, Math.min(200, Math.round(pct)));
  state.previewScale = clamped / 100;
  $("#canvasSize").value = String(clamped);
  $("#canvasSizeOut").textContent = clamped + "%";
  renderFrame();
}
$("#canvasSize").addEventListener("input", (e) => {
  syncCanvasSizeUI(+e.target.value);
});
$("#btnCanvasFit").addEventListener("click", () => syncCanvasSizeUI(100));
$("#btnUndo").addEventListener("click", () => undoLast());

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
  pushHistory("重算当前帧", [item]);
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
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
    const tag = (e.target && /** @type {HTMLElement} */ (e.target).tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    e.preventDefault();
    undoLast();
  }
});

startAnimLoop();
