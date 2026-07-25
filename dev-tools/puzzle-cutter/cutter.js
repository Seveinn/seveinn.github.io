/** @typedef {{ id: number, row: number, col: number, x: number, y: number, width: number, height: number, fileName: string, dataUrl: string }} PuzzlePiece */
/** @typedef {{ x: number, y: number, width: number, height: number }} Region */
/** @typedef {{ id: string, name: string, region: Region, rows: number, cols: number, gap: boolean, pieces: PuzzlePiece[], exportData: object | null }} SavedConfig */

/** @type {HTMLInputElement} */
const fileInput = document.getElementById("fileInput");
/** @type {HTMLElement} */
const dropZone = document.getElementById("dropZone");
/** @type {HTMLElement} */
const fileNameEl = document.getElementById("fileName");
/** @type {HTMLInputElement} */
const configNameInput = document.getElementById("configNameInput");
/** @type {HTMLInputElement} */
const regionXInput = document.getElementById("regionX");
/** @type {HTMLInputElement} */
const regionYInput = document.getElementById("regionY");
/** @type {HTMLInputElement} */
const regionWInput = document.getElementById("regionW");
/** @type {HTMLInputElement} */
const regionHInput = document.getElementById("regionH");
/** @type {HTMLButtonElement} */
const resetRegionBtn = document.getElementById("resetRegionBtn");
/** @type {HTMLButtonElement} */
const createRegionBtn = document.getElementById("createRegionBtn");
/** @type {HTMLButtonElement} */
const editRegionBtn = document.getElementById("editRegionBtn");
/** @type {HTMLButtonElement} */
const applyRegionBtn = document.getElementById("applyRegionBtn");
/** @type {HTMLButtonElement} */
const cancelRegionBtn = document.getElementById("cancelRegionBtn");
/** @type {HTMLElement} */
const regionModeStatus = document.getElementById("regionModeStatus");
/** @type {HTMLElement} */
const sourcePreviewPanel = document.getElementById("sourcePreviewPanel");
/** @type {HTMLElement} */
const regionFloatBar = document.getElementById("regionFloatBar");
/** @type {HTMLButtonElement} */
const regionFloatDrag = document.getElementById("regionFloatDrag");
/** @type {HTMLElement} */
const canvasModeTip = document.getElementById("canvasModeTip");
/** @type {HTMLElement} */
const canvasStage = document.getElementById("canvasStage");
/** @type {HTMLButtonElement} */
const fullscreenPreviewBtn = document.getElementById("fullscreenPreviewBtn");
/** @type {HTMLElement} */
const piecesStage = document.getElementById("piecesStage");
/** @type {HTMLButtonElement} */
const fullscreenPiecesBtn = document.getElementById("fullscreenPiecesBtn");
/** @type {HTMLInputElement} */
const rowsInput = document.getElementById("rowsInput");
/** @type {HTMLInputElement} */
const colsInput = document.getElementById("colsInput");
/** @type {HTMLInputElement} */
const paddingInput = document.getElementById("paddingInput");
/** @type {HTMLInputElement} */
const numberOverlayInput = document.getElementById("numberOverlayInput");
/** @type {HTMLInputElement} */
const stripDataUrlInput = document.getElementById("stripDataUrlInput");
/** @type {HTMLButtonElement} */
const cutBtn = document.getElementById("cutBtn");
/** @type {HTMLButtonElement} */
const saveConfigBtn = document.getElementById("saveConfigBtn");
/** @type {HTMLButtonElement} */
const exportJsonBtn = document.getElementById("exportJsonBtn");
/** @type {HTMLButtonElement} */
const exportPngBtn = document.getElementById("exportPngBtn");
/** @type {HTMLButtonElement} */
const exportAllBtn = document.getElementById("exportAllBtn");
/** @type {HTMLCanvasElement} */
const sourceCanvas = document.getElementById("sourceCanvas");
/** @type {HTMLElement} */
const sourceMeta = document.getElementById("sourceMeta");
/** @type {HTMLElement} */
const piecesGrid = document.getElementById("piecesGrid");
/** @type {HTMLElement} */
const piecesMeta = document.getElementById("piecesMeta");
/** @type {HTMLElement} */
const configListEl = document.getElementById("configList");
/** @type {HTMLElement} */
const configSelectionHint = document.getElementById("configSelectionHint");
/** @type {HTMLButtonElement} */
const selectAllConfigsBtn = document.getElementById("selectAllConfigsBtn");
/** @type {HTMLButtonElement} */
const clearSelectionBtn = document.getElementById("clearSelectionBtn");
/** @type {HTMLButtonElement} */
const exportSelectedBundleBtn = document.getElementById("exportSelectedBundleBtn");
/** @type {HTMLElement} */
const jsonPreview = document.getElementById("jsonPreview");

const sourceCtx = sourceCanvas.getContext("2d");

/** @type {HTMLImageElement | null} */
let sourceImage = null;
/** @type {string} */
let sourceFileName = "";
/** @type {Region} */
let region = { x: 0, y: 0, width: 1, height: 1 };
/** @type {Region} */
let committedRegion = { x: 0, y: 0, width: 1, height: 1 };
/** @type {"idle" | "create" | "edit"} */
let regionMode = "idle";
/** @type {PuzzlePiece[]} */
let lastPieces = [];
/** @type {object | null} */
let lastExportData = null;
/** @type {SavedConfig[]} */
let savedConfigs = [];
/** @type {Set<string>} */
let selectedConfigIds = new Set();
/** @type {string | null} */
let activeConfigId = null;

/** @type {{ active: boolean, startX: number, startY: number, currentX: number, currentY: number } | null} */
let dragSelect = null;
/** @type {{ handle: string, startRegion: Region, startX: number, startY: number } | null} */
let editSession = null;
/** @type {{ x: number, y: number }} */
let floatBarPosition = { x: 10, y: 10 };
/** @type {{ startX: number, startY: number, originX: number, originY: number } | null} */
let floatBarDragSession = null;
/** @type {number} */
let lastGridRows = 0;
/** @type {number} */
let lastGridCols = 0;

const SAMPLE_JSON = {
  version: 2,
  configName: "rabbit",
  source: { path: "", width: 1200, height: 800 },
  region: { x: 40, y: 32, width: 240, height: 220 },
  grid: { rows: 3, cols: 3 },
  pieceCount: 9,
  pieces: [
    {
      id: 0,
      row: 0,
      col: 0,
      x: 40,
      y: 32,
      width: 80,
      height: 73,
      fileName: "rabbit_r0c0.png",
    },
  ],
};

const SAMPLE_BUNDLE_JSON = {
  version: 2,
  type: "bundle",
  source: { path: "", width: 1200, height: 800 },
  configCount: 2,
  configs: [
    {
      configName: "rabbit",
      region: { x: 40, y: 32, width: 240, height: 220 },
      grid: { rows: 3, cols: 3 },
      pieceCount: 9,
      pieces: [{ id: 0, row: 0, col: 0, x: 40, y: 32, width: 80, height: 73, fileName: "rabbit_r0c0.png" }],
    },
    {
      configName: "fox",
      region: { x: 300, y: 32, width: 240, height: 220 },
      grid: { rows: 3, cols: 3 },
      pieceCount: 9,
      pieces: [{ id: 0, row: 0, col: 0, x: 300, y: 32, width: 80, height: 73, fileName: "fox_r0c0.png" }],
    },
  ],
};

jsonPreview.textContent = JSON.stringify(SAMPLE_JSON, null, 2);

function clampGrid(value, fallback = 1) {
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, 20);
}

function slugify(name) {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "puzzle"
  );
}

function createConfigId() {
  return `cfg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeRegion(next, imgW, imgH) {
  const x = clamp(Math.round(next.x), 0, Math.max(0, imgW - 1));
  const y = clamp(Math.round(next.y), 0, Math.max(0, imgH - 1));
  const width = clamp(Math.round(next.width), 1, imgW - x);
  const height = clamp(Math.round(next.height), 1, imgH - y);
  return { x, y, width, height };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function fullImageRegion() {
  if (!sourceImage) return { x: 0, y: 0, width: 1, height: 1 };
  return {
    x: 0,
    y: 0,
    width: sourceImage.naturalWidth,
    height: sourceImage.naturalHeight,
  };
}

function isFullImageRegion(targetRegion) {
  if (!sourceImage) return true;
  const full = fullImageRegion();
  return (
    targetRegion.x === full.x &&
    targetRegion.y === full.y &&
    targetRegion.width === full.width &&
    targetRegion.height === full.height
  );
}

function syncRegionInputs() {
  regionXInput.value = String(region.x);
  regionYInput.value = String(region.y);
  regionWInput.value = String(region.width);
  regionHInput.value = String(region.height);
}

function readRegionFromInputs() {
  if (!sourceImage) return region;
  return normalizeRegion(
    {
      x: Number(regionXInput.value),
      y: Number(regionYInput.value),
      width: Number(regionWInput.value),
      height: Number(regionHInput.value),
    },
    sourceImage.naturalWidth,
    sourceImage.naturalHeight,
  );
}

function applyRegion(next, syncInputs = true) {
  if (!sourceImage) return;
  region = normalizeRegion(next, sourceImage.naturalWidth, sourceImage.naturalHeight);
  if (syncInputs) syncRegionInputs();
  drawSourcePreview();
}

function resetRegionToFull() {
  applyRegion(fullImageRegion());
  committedRegion = { ...region };
  if (regionMode !== "idle") setRegionMode("idle");
  clearCurrentCut();
}

function setRegionMode(mode) {
  regionMode = mode;
  dragSelect = null;
  editSession = null;

  if (mode !== "idle") {
    committedRegion = { ...region };
  }

  updateRegionModeUI();
  drawSourcePreview();
}

function applyFloatBarPosition() {
  regionFloatBar.style.left = `${floatBarPosition.x}px`;
  regionFloatBar.style.top = `${floatBarPosition.y}px`;
}

function clampFloatBarPosition(x, y) {
  const maxX = Math.max(0, sourcePreviewPanel.clientWidth - regionFloatBar.offsetWidth);
  const maxY = Math.max(0, sourcePreviewPanel.clientHeight - regionFloatBar.offsetHeight);
  return {
    x: clamp(Math.round(x), 0, maxX),
    y: clamp(Math.round(y), 0, maxY),
  };
}

function getFloatBarDefaultPosition() {
  const previewHead = sourcePreviewPanel.querySelector(".preview-head");
  const headHeight = previewHead ? previewHead.offsetHeight + 12 : 10;
  return { x: 10, y: headHeight + 10 };
}

function resetFloatBarPosition() {
  floatBarPosition = getFloatBarDefaultPosition();
  applyFloatBarPosition();
}

function updateRegionModeUI() {
  const hasImage = Boolean(sourceImage);
  const isEditing = regionMode !== "idle";
  const hasPartialSelection = hasImage && !isFullImageRegion(region);

  regionFloatBar.classList.toggle("is-disabled", !hasImage);
  regionFloatDrag.disabled = !hasImage;

  createRegionBtn.disabled = !hasImage || regionMode === "create";
  editRegionBtn.disabled = !hasImage || regionMode === "edit";
  applyRegionBtn.disabled = !hasImage || !isEditing;
  cancelRegionBtn.disabled = !hasImage || (!isEditing && !hasPartialSelection);

  createRegionBtn.classList.toggle("active", regionMode === "create");
  editRegionBtn.classList.toggle("active", regionMode === "edit");

  sourceCanvas.classList.remove("mode-idle", "mode-create", "mode-edit");
  sourceCanvas.classList.add(`mode-${regionMode}`);

  const modeLabels = {
    idle: "待机",
    create: "创建中",
    edit: "编辑中",
  };
  regionModeStatus.textContent = `选区模式：${modeLabels[regionMode]} · ${
    regionMode === "create"
      ? "拖拽绘制新选区，完成后点「应用」"
      : regionMode === "edit"
        ? "拖动选区移动，拖动手柄缩放"
        : hasPartialSelection
          ? "已框选区域 · 点「取消」可恢复整图"
          : "点「创建」或「编辑」开始框选"
  }`;

  canvasModeTip.textContent =
    regionMode === "create"
      ? "创建：拖拽绘制"
      : regionMode === "edit"
        ? "编辑：移动 / 缩放"
        : "悬浮栏操作选区";
}

function applyRegionDraft() {
  if (!sourceImage || regionMode === "idle") {
    applyRegion(readRegionFromInputs());
    committedRegion = { ...region };
    clearCurrentCut();
    return;
  }

  committedRegion = { ...region };
  syncRegionInputs();
  setRegionMode("idle");
  clearCurrentCut();
}

function cancelRegionDraft() {
  if (!sourceImage) return;

  dragSelect = null;
  editSession = null;
  region = fullImageRegion();
  committedRegion = { ...region };
  syncRegionInputs();

  if (regionMode !== "idle") {
    setRegionMode("idle");
  } else {
    updateRegionModeUI();
    drawSourcePreview();
  }

  clearCurrentCut();
}

function getHandleHitRadius() {
  if (!sourceImage) return 12;
  return Math.max(10, Math.round(Math.min(sourceImage.naturalWidth, sourceImage.naturalHeight) / 50));
}

/** @returns {string | null} */
function getEditHandleAt(point, targetRegion) {
  const r = getHandleHitRadius();
  const handles = getEditHandlePoints(targetRegion);

  for (const [name, pos] of handles) {
    if (Math.abs(point.x - pos.x) <= r && Math.abs(point.y - pos.y) <= r) return name;
  }

  if (
    point.x >= targetRegion.x &&
    point.x <= targetRegion.x + targetRegion.width &&
    point.y >= targetRegion.y &&
    point.y <= targetRegion.y + targetRegion.height
  ) {
    return "move";
  }

  return null;
}

/** @returns {[string, { x: number, y: number }][]} */
function getEditHandlePoints(targetRegion) {
  const { x, y, width, height } = targetRegion;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const right = x + width;
  const bottom = y + height;
  return [
    ["nw", { x, y }],
    ["n", { x: cx, y }],
    ["ne", { x: right, y }],
    ["e", { x: right, y: cy }],
    ["se", { x: right, y: bottom }],
    ["s", { x: cx, y: bottom }],
    ["sw", { x, y: bottom }],
    ["w", { x, y: cy }],
  ];
}

function cursorForHandle(handle) {
  const map = {
    nw: "nwse-resize",
    n: "ns-resize",
    ne: "nesw-resize",
    e: "ew-resize",
    se: "nwse-resize",
    s: "ns-resize",
    sw: "nesw-resize",
    w: "ew-resize",
    move: "move",
  };
  return map[handle] ?? "default";
}

function resizeRegionByHandle(handle, startRegion, dx, dy) {
  if (!sourceImage) return startRegion;
  const imgW = sourceImage.naturalWidth;
  const imgH = sourceImage.naturalHeight;
  const minSize = 8;

  if (handle === "move") {
    return normalizeRegion(
      {
        x: startRegion.x + dx,
        y: startRegion.y + dy,
        width: startRegion.width,
        height: startRegion.height,
      },
      imgW,
      imgH,
    );
  }

  let { x, y, width, height } = startRegion;

  if (handle.includes("e")) width = Math.max(minSize, width + dx);
  if (handle.includes("w")) {
    const nextWidth = Math.max(minSize, width - dx);
    x += width - nextWidth;
    width = nextWidth;
  }
  if (handle.includes("s")) height = Math.max(minSize, height + dy);
  if (handle.includes("n")) {
    const nextHeight = Math.max(minSize, height - dy);
    y += height - nextHeight;
    height = nextHeight;
  }

  return normalizeRegion({ x, y, width, height }, imgW, imgH);
}

function drawEditHandles(targetRegion) {
  const handleSize = getHandleHitRadius();
  sourceCtx.save();
  sourceCtx.fillStyle = "#fff8e9";
  sourceCtx.strokeStyle = "rgba(216, 182, 93, 0.95)";
  sourceCtx.lineWidth = Math.max(1, Math.round(handleSize / 4));

  for (const [, pos] of getEditHandlePoints(targetRegion)) {
    sourceCtx.fillRect(pos.x - handleSize / 2, pos.y - handleSize / 2, handleSize, handleSize);
    sourceCtx.strokeRect(pos.x - handleSize / 2, pos.y - handleSize / 2, handleSize, handleSize);
  }

  sourceCtx.restore();
}

function getCanvasPoint(event) {
  const rect = sourceCanvas.getBoundingClientRect();
  const scaleX = sourceCanvas.width / rect.width;
  const scaleY = sourceCanvas.height / rect.height;
  return {
    x: clamp(Math.round((event.clientX - rect.left) * scaleX), 0, sourceCanvas.width - 1),
    y: clamp(Math.round((event.clientY - rect.top) * scaleY), 0, sourceCanvas.height - 1),
  };
}

function updateSourceMetaScale(scale) {
  if (!sourceMeta.textContent.includes("显示 ")) return;
  sourceMeta.textContent = sourceMeta.textContent.replace(/显示 \d+%/, `显示 ${Math.round(scale * 100)}%`);
}

function layoutCanvasDisplay() {
  if (!sourceImage) {
    sourceCanvas.style.width = "";
    sourceCanvas.style.height = "";
    return 1;
  }

  const cw = Math.max(1, canvasStage.clientWidth);
  const ch = Math.max(1, canvasStage.clientHeight);
  const iw = sourceImage.naturalWidth;
  const ih = sourceImage.naturalHeight;
  const scale = Math.min(cw / iw, ch / ih);
  const displayW = Math.max(1, Math.floor(iw * scale));
  const displayH = Math.max(1, Math.floor(ih * scale));

  sourceCanvas.style.width = `${displayW}px`;
  sourceCanvas.style.height = `${displayH}px`;
  updateSourceMetaScale(scale);
  return scale;
}

function updateFullscreenButton() {
  const sourceFs = document.fullscreenElement === canvasStage;
  const piecesFs = document.fullscreenElement === piecesStage;

  fullscreenPreviewBtn.textContent = sourceFs ? "退出全屏" : "全屏预览";
  fullscreenPreviewBtn.setAttribute("aria-pressed", sourceFs ? "true" : "false");

  fullscreenPiecesBtn.textContent = piecesFs ? "退出全屏" : "全屏预览";
  fullscreenPiecesBtn.setAttribute("aria-pressed", piecesFs ? "true" : "false");

  if (sourceImage) layoutCanvasDisplay();
  if (lastPieces.length) layoutPiecesDisplay();
}

function layoutPiecesDisplay() {
  if (!lastPieces.length || piecesGrid.classList.contains("empty") || !lastGridRows || !lastGridCols) {
    piecesGrid.style.width = "";
    piecesGrid.style.height = "";
    piecesGrid.style.gridTemplateColumns = "";
    piecesGrid.style.gridTemplateRows = "";
    return;
  }

  const gap = 4;
  const padding = 16;
  const cols = lastGridCols;
  const rows = lastGridRows;
  const cw = Math.max(1, piecesStage.clientWidth);
  const ch = Math.max(1, piecesStage.clientHeight);
  const pieceAspect = lastPieces[0].width / Math.max(1, lastPieces[0].height);
  const gridAspect = (cols * pieceAspect) / rows;

  let gridW = cw - padding;
  let gridH = gridW / gridAspect;
  if (gridH > ch - padding) {
    gridH = ch - padding;
    gridW = gridH * gridAspect;
  }

  gridW = Math.max(1, Math.floor(gridW));
  gridH = Math.max(1, Math.floor(gridH));

  const cellW = Math.max(1, (gridW - (cols - 1) * gap) / cols);
  const cellH = Math.max(1, (gridH - (rows - 1) * gap) / rows);

  piecesGrid.style.width = `${Math.floor(cellW * cols + (cols - 1) * gap)}px`;
  piecesGrid.style.height = `${Math.floor(cellH * rows + (rows - 1) * gap)}px`;
  piecesGrid.style.gridTemplateColumns = `repeat(${cols}, ${cellW}px)`;
  piecesGrid.style.gridTemplateRows = `repeat(${rows}, ${cellH}px)`;
}

function regionFromDrag(startX, startY, endX, endY) {
  if (!sourceImage) return region;
  const x = Math.min(startX, endX);
  const y = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);
  if (width < 8 || height < 8) return region;
  return normalizeRegion({ x, y, width, height }, sourceImage.naturalWidth, sourceImage.naturalHeight);
}

function setButtonsEnabled(hasImage, hasPieces) {
  cutBtn.disabled = !hasImage;
  saveConfigBtn.disabled = !hasImage;
  fullscreenPreviewBtn.disabled = !hasImage;
  fullscreenPiecesBtn.disabled = !hasPieces;
  exportJsonBtn.disabled = !hasPieces;
  exportPngBtn.disabled = !hasPieces;
  exportAllBtn.disabled = savedConfigs.length === 0;
  updateRegionModeUI();
}

function clearCurrentCut() {
  lastPieces = [];
  lastExportData = null;
  activeConfigId = null;
  renderPiecesGrid([]);
  jsonPreview.textContent = JSON.stringify(SAMPLE_JSON, null, 2);
  setButtonsEnabled(Boolean(sourceImage), false);
}

function loadImageFromFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    alert("请选择有效的图片文件");
    return;
  }

  const url = URL.createObjectURL(file);
  const img = new Image();

  img.onload = () => {
    URL.revokeObjectURL(url);
    sourceImage = img;
    sourceFileName = file.name;
    fileNameEl.textContent = `${file.name}（${img.naturalWidth}×${img.naturalHeight}）`;
    savedConfigs = [];
    selectedConfigIds.clear();
    activeConfigId = null;
    region = fullImageRegion();
    committedRegion = { ...region };
    regionMode = "idle";
    syncRegionInputs();
    clearCurrentCut();
    renderConfigList();
    updateRegionModeUI();
    resetFloatBarPosition();
    drawSourcePreview();
    setButtonsEnabled(true, false);
  };

  img.onerror = () => {
    URL.revokeObjectURL(url);
    alert("图片加载失败");
  };

  img.src = url;
}

function drawSourcePreview() {
  if (!sourceImage) return;

  const { naturalWidth: w, naturalHeight: h } = sourceImage;
  sourceCanvas.width = w;
  sourceCanvas.height = h;
  sourceCtx.clearRect(0, 0, w, h);
  sourceCtx.drawImage(sourceImage, 0, 0);

  const previewRegion = dragSelect
    ? regionFromDrag(dragSelect.startX, dragSelect.startY, dragSelect.currentX, dragSelect.currentY)
    : region;

  const showSelectionOverlay = !isFullImageRegion(previewRegion);

  if (showSelectionOverlay) {
    sourceCtx.save();
    sourceCtx.fillStyle = "rgba(8, 10, 12, 0.52)";
    sourceCtx.fillRect(0, 0, w, previewRegion.y);
    sourceCtx.fillRect(0, previewRegion.y + previewRegion.height, w, h - previewRegion.y - previewRegion.height);
    sourceCtx.fillRect(0, previewRegion.y, previewRegion.x, previewRegion.height);
    sourceCtx.fillRect(
      previewRegion.x + previewRegion.width,
      previewRegion.y,
      w - previewRegion.x - previewRegion.width,
      previewRegion.height,
    );
    sourceCtx.restore();
  }

  if (showSelectionOverlay || regionMode !== "idle") {
    sourceCtx.save();
    sourceCtx.strokeStyle = "rgba(216, 182, 93, 0.95)";
    sourceCtx.lineWidth = Math.max(2, Math.round(Math.min(w, h) / 280));
    sourceCtx.setLineDash([]);
    sourceCtx.strokeRect(
      previewRegion.x + 0.5,
      previewRegion.y + 0.5,
      previewRegion.width - 1,
      previewRegion.height - 1,
    );
    sourceCtx.restore();
  }

  if (showSelectionOverlay || regionMode !== "idle") {
    const rows = clampGrid(rowsInput.value);
    const cols = clampGrid(colsInput.value);
    sourceCtx.save();
    sourceCtx.strokeStyle = "rgba(112, 167, 207, 0.85)";
    sourceCtx.lineWidth = Math.max(1, Math.round(Math.min(w, h) / 320));
    sourceCtx.setLineDash([6, 4]);

    for (let c = 1; c < cols; c += 1) {
      const x = previewRegion.x + Math.round((c * previewRegion.width) / cols);
      sourceCtx.beginPath();
      sourceCtx.moveTo(x, previewRegion.y);
      sourceCtx.lineTo(x, previewRegion.y + previewRegion.height);
      sourceCtx.stroke();
    }

    for (let r = 1; r < rows; r += 1) {
      const y = previewRegion.y + Math.round((r * previewRegion.height) / rows);
      sourceCtx.beginPath();
      sourceCtx.moveTo(previewRegion.x, y);
      sourceCtx.lineTo(previewRegion.x + previewRegion.width, y);
      sourceCtx.stroke();
    }

    sourceCtx.restore();
  }

  if (regionMode === "edit" && !dragSelect && showSelectionOverlay) {
    drawEditHandles(previewRegion);
  }

  const rows = clampGrid(rowsInput.value);
  const cols = clampGrid(colsInput.value);
  const displayScale = layoutCanvasDisplay();
  const configLabel = configNameInput.value.trim() || "未命名";
  const modeNote = regionMode === "idle" ? "" : ` · ${regionMode === "create" ? "创建" : "编辑"}未应用`;
  sourceMeta.textContent = `${w}×${h}px · 选区 ${previewRegion.width}×${previewRegion.height} @ (${previewRegion.x},${previewRegion.y}) · ${rows}×${cols} = ${rows * cols} 块 · 显示 ${Math.round(displayScale * 100)}% · 「${configLabel}」${modeNote}`;
}

function sliceBound(total, parts, index) {
  const start = Math.round((index * total) / parts);
  const end = Math.round(((index + 1) * total) / parts);
  return { start, size: end - start };
}

/**
 * @param {HTMLImageElement} img
 * @param {Region} cutRegion
 * @param {number} rows
 * @param {number} cols
 * @param {boolean} gap
 * @param {string} namePrefix
 * @returns {PuzzlePiece[]}
 */
function cutImage(img, cutRegion, rows, cols, gap, namePrefix) {
  const pieces = [];
  const gapPx = gap ? 2 : 0;
  let id = 0;
  const prefix = slugify(namePrefix);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const xInfo = sliceBound(cutRegion.width, cols, col);
      const yInfo = sliceBound(cutRegion.height, rows, row);
      const srcX = cutRegion.x + xInfo.start;
      const srcY = cutRegion.y + yInfo.start;

      const outW = Math.max(1, xInfo.size - (gap ? gapPx : 0));
      const outH = Math.max(1, yInfo.size - (gap ? gapPx : 0));

      const pieceCanvas = document.createElement("canvas");
      pieceCanvas.width = outW;
      pieceCanvas.height = outH;

      const pCtx = pieceCanvas.getContext("2d");
      pCtx.drawImage(img, srcX, srcY, xInfo.size, yInfo.size, 0, 0, outW, outH);

      const fileName = `${prefix}_r${row}c${col}.png`;
      pieces.push({
        id,
        row,
        col,
        x: srcX,
        y: srcY,
        width: outW,
        height: outH,
        fileName,
        dataUrl: pieceCanvas.toDataURL("image/png"),
      });
      id += 1;
    }
  }

  return pieces;
}

function buildExportSource() {
  return {
    path: "",
    width: sourceImage.naturalWidth,
    height: sourceImage.naturalHeight,
  };
}

function serializePieceForExport(piece) {
  const base = {
    id: piece.id,
    row: piece.row,
    col: piece.col,
    x: piece.x,
    y: piece.y,
    width: piece.width,
    height: piece.height,
    fileName: piece.fileName,
  };
  if (!stripDataUrlInput.checked && piece.dataUrl) {
    return { ...base, dataUrl: piece.dataUrl };
  }
  return base;
}

function serializeExportData(exportData) {
  if (!exportData) return null;
  return {
    version: exportData.version,
    configName: exportData.configName,
    source: buildExportSource(),
    region: exportData.region,
    grid: exportData.grid,
    pieceCount: exportData.pieceCount,
    pieces: exportData.pieces.map(serializePieceForExport),
  };
}

function buildExportData(pieces, rows, cols, cutRegion, configName) {
  return {
    version: 2,
    configName: configName || "puzzle",
    source: buildExportSource(),
    region: { ...cutRegion },
    grid: { rows, cols },
    pieceCount: pieces.length,
    pieces: pieces.map(({ id, row, col, x, y, width, height, fileName, dataUrl }) => ({
      id,
      row,
      col,
      x,
      y,
      width,
      height,
      fileName,
      dataUrl,
    })),
  };
}

function currentConfigName() {
  const name = configNameInput.value.trim();
  if (name) return name;
  return sourceFileName.replace(/\.[^.]+$/, "") || "puzzle";
}

function renderPiecesGrid(pieces, rows, cols) {
  const showNumbers = numberOverlayInput.checked;

  piecesGrid.innerHTML = "";
  piecesGrid.classList.toggle("empty", pieces.length === 0);
  lastGridRows = rows ?? 0;
  lastGridCols = cols ?? 0;

  if (pieces.length === 0) {
    piecesGrid.innerHTML = '<p class="placeholder">加载图片并点击「切割预览」</p>';
    piecesMeta.textContent = "";
    layoutPiecesDisplay();
    return;
  }

  for (const piece of pieces) {
    const cell = document.createElement("div");
    cell.className = "piece-cell";
    cell.title = `id=${piece.id} 正确位置 row=${piece.row} col=${piece.col}`;

    const img = document.createElement("img");
    img.src = piece.dataUrl;
    img.alt = `拼图块 ${piece.row}-${piece.col}`;
    cell.appendChild(img);

    if (showNumbers) {
      const label = document.createElement("span");
      label.className = "piece-label";
      label.textContent = `${piece.id} (${piece.row},${piece.col})`;
      cell.appendChild(label);
    }

    piecesGrid.appendChild(cell);
  }

  piecesMeta.textContent = `共 ${pieces.length} 块 · 每块约 ${pieces[0]?.width}×${pieces[0]?.height}px · ${rows}×${cols}`;
  layoutPiecesDisplay();
}

function runCut() {
  if (!sourceImage) return;
  if (regionMode !== "idle") applyRegionDraft();

  const rows = clampGrid(rowsInput.value);
  const cols = clampGrid(colsInput.value);
  rowsInput.value = String(rows);
  colsInput.value = String(cols);
  region = readRegionFromInputs();
  committedRegion = { ...region };

  const configName = currentConfigName();
  lastPieces = cutImage(sourceImage, region, rows, cols, paddingInput.checked, configName);
  lastExportData = buildExportData(lastPieces, rows, cols, region, configName);
  activeConfigId = null;

  renderPiecesGrid(lastPieces, rows, cols);
  jsonPreview.textContent = JSON.stringify(
    {
      ...lastExportData,
      pieces: lastExportData.pieces.map((piece) => ({ ...piece, dataUrl: "<base64 省略>" })),
    },
    null,
    2,
  );
  drawSourcePreview();
  setButtonsEnabled(true, true);
}

function saveCurrentConfig() {
  if (!sourceImage) return;

  if (!lastExportData) runCut();
  if (!lastExportData) return;

  const rows = clampGrid(rowsInput.value);
  const cols = clampGrid(colsInput.value);
  const name = currentConfigName();
  const existing = savedConfigs.find((item) => item.id === activeConfigId);

  const entry = {
    id: existing?.id ?? createConfigId(),
    name,
    region: { ...region },
    rows,
    cols,
    gap: paddingInput.checked,
    pieces: lastPieces,
    exportData: lastExportData,
  };

  if (existing) {
    Object.assign(existing, entry);
  } else {
    savedConfigs.push(entry);
    activeConfigId = entry.id;
  }

  selectedConfigIds.add(entry.id);
  renderConfigList();
  setButtonsEnabled(true, true);
}

function loadSavedConfig(config) {
  activeConfigId = config.id;
  configNameInput.value = config.name;
  rowsInput.value = String(config.rows);
  colsInput.value = String(config.cols);
  paddingInput.checked = config.gap;
  region = { ...config.region };
  committedRegion = { ...region };
  if (regionMode !== "idle") setRegionMode("idle");
  syncRegionInputs();

  lastPieces = config.pieces;
  lastExportData = config.exportData;

  renderPiecesGrid(config.pieces, config.rows, config.cols);
  if (config.exportData) {
    jsonPreview.textContent = JSON.stringify(
      {
        ...config.exportData,
        pieces: config.exportData.pieces.map((piece) => ({ ...piece, dataUrl: "<base64 省略>" })),
      },
      null,
      2,
    );
  }

  drawSourcePreview();
  setButtonsEnabled(true, Boolean(config.pieces.length));
  renderConfigList();
}

function deleteSavedConfig(configId) {
  savedConfigs = savedConfigs.filter((item) => item.id !== configId);
  selectedConfigIds.delete(configId);
  if (activeConfigId === configId) activeConfigId = null;
  renderConfigList();
  setButtonsEnabled(Boolean(sourceImage), Boolean(lastPieces.length));
}

function getSelectedConfigs() {
  return savedConfigs.filter((config) => selectedConfigIds.has(config.id));
}

function setConfigSelected(configId, selected) {
  if (selected) selectedConfigIds.add(configId);
  else selectedConfigIds.delete(configId);
  updateConfigSelectionUI();
}

function selectAllConfigs() {
  savedConfigs.forEach((config) => selectedConfigIds.add(config.id));
  renderConfigList();
}

function clearConfigSelection() {
  selectedConfigIds.clear();
  renderConfigList();
}

function updateConfigSelectionUI() {
  const total = savedConfigs.length;
  const count = selectedConfigIds.size;
  const hasConfigs = total > 0;

  selectAllConfigsBtn.disabled = !hasConfigs;
  clearSelectionBtn.disabled = count === 0;
  exportSelectedBundleBtn.disabled = count === 0;

  exportSelectedBundleBtn.textContent =
    count > 0 ? `导出选中合并 JSON (${count})` : "导出选中合并 JSON";

  if (!hasConfigs) {
    configSelectionHint.textContent = "保存多个配置后，可勾选并合并导出";
    return;
  }

  configSelectionHint.textContent =
    count > 0
      ? `已选 ${count}/${total} 项 · 将导出为一个 bundle JSON`
      : `共 ${total} 项 · 勾选需要合并导出的配置`;
}

function renderConfigList() {
  configListEl.innerHTML = "";
  configListEl.classList.toggle("empty", savedConfigs.length === 0);
  updateConfigSelectionUI();

  if (savedConfigs.length === 0) {
    configListEl.innerHTML = '<li class="config-empty">暂无配置。框选区域并切割后，点击「保存到配置列表」</li>';
    return;
  }

  for (const config of savedConfigs) {
    const item = document.createElement("li");
    const isSelected = selectedConfigIds.has(config.id);
    item.className = `config-item${config.id === activeConfigId ? " active" : ""}${isSelected ? " selected" : ""}`;

    const selectLabel = document.createElement("label");
    selectLabel.className = "config-select";
    selectLabel.title = "选中以合并导出";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = isSelected;
    checkbox.addEventListener("click", (event) => event.stopPropagation());
    checkbox.addEventListener("change", () => {
      setConfigSelected(config.id, checkbox.checked);
      item.classList.toggle("selected", checkbox.checked);
    });
    selectLabel.appendChild(checkbox);

    const meta = document.createElement("div");
    meta.className = "config-meta";
    meta.innerHTML = `
      <strong>${config.name}</strong>
      <span>${config.rows}×${config.cols} · 选区 ${config.region.width}×${config.region.height} @ (${config.region.x},${config.region.y}) · ${config.pieces.length} 块</span>
    `;

    const actions = document.createElement("div");
    actions.className = "config-actions";

    const loadBtn = document.createElement("button");
    loadBtn.type = "button";
    loadBtn.textContent = "加载";
    loadBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      loadSavedConfig(config);
    });

    const exportBtn = document.createElement("button");
    exportBtn.type = "button";
    exportBtn.textContent = "导出 JSON";
    exportBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      exportConfigJson(config);
    });

    const exportPngBtn = document.createElement("button");
    exportPngBtn.type = "button";
    exportPngBtn.textContent = "导出 PNG";
    exportPngBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      exportConfigPng(config);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "danger";
    deleteBtn.textContent = "删除";
    deleteBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteSavedConfig(config.id);
    });

    actions.append(loadBtn, exportBtn, exportPngBtn, deleteBtn);
    item.append(selectLabel, meta, actions);

    item.addEventListener("click", () => {
      checkbox.checked = !checkbox.checked;
      setConfigSelected(config.id, checkbox.checked);
      item.classList.toggle("selected", checkbox.checked);
    });

    configListEl.appendChild(item);
  }
}

function downloadBlob(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function buildBundleExportData(configs) {
  const valid = configs.filter((config) => config.exportData);
  if (!valid.length) return null;

  return {
    version: 2,
    type: "bundle",
    source: buildExportSource(),
    configCount: valid.length,
    configs: valid.map((config) => {
      const serialized = serializeExportData(config.exportData);
      return {
        configName: serialized.configName,
        region: serialized.region,
        grid: serialized.grid,
        pieceCount: serialized.pieceCount,
        pieces: serialized.pieces,
      };
    }),
  };
}

function exportConfigJson(config) {
  if (!config.exportData) return;
  const baseName = slugify(config.name);
  const payload = serializeExportData(config.exportData);
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), `${baseName}_puzzle.json`);
}

async function exportConfigPng(config) {
  for (const piece of config.pieces) {
    const res = await fetch(piece.dataUrl);
    const blob = await res.blob();
    downloadBlob(blob, piece.fileName);
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
}

function exportJson() {
  if (!lastExportData) return;
  exportConfigJson({
    name: currentConfigName(),
    exportData: lastExportData,
    pieces: lastPieces,
  });
}

async function exportPngPieces() {
  if (!lastPieces.length) return;
  await exportConfigPng({ pieces: lastPieces });
}

function exportAllConfigs() {
  for (const config of savedConfigs) {
    exportConfigJson(config);
  }
}

function exportSelectedBundle() {
  const configs = getSelectedConfigs();
  if (!configs.length) return;

  const bundle = buildBundleExportData(configs);
  if (!bundle) return;

  const baseName = slugify(sourceFileName.replace(/\.[^.]+$/, "") || "spritesheet");
  jsonPreview.textContent = JSON.stringify(bundle, null, 2);

  downloadBlob(
    new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" }),
    `${baseName}_puzzles_bundle.json`,
  );
}

dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fileInput.click();
  }
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) loadImageFromFile(file);
});

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  const file = e.dataTransfer?.files?.[0];
  if (file) loadImageFromFile(file);
});

sourceCanvas.addEventListener("pointerdown", (event) => {
  if (!sourceImage || event.button !== 0 || regionMode === "idle") return;

  const point = getCanvasPoint(event);

  if (regionMode === "create") {
    dragSelect = {
      active: true,
      startX: point.x,
      startY: point.y,
      currentX: point.x,
      currentY: point.y,
    };
    sourceCanvas.setPointerCapture(event.pointerId);
    return;
  }

  if (regionMode === "edit") {
    const handle = getEditHandleAt(point, region);
    if (!handle) return;
    editSession = {
      handle,
      startRegion: { ...region },
      startX: point.x,
      startY: point.y,
    };
    sourceCanvas.style.cursor = cursorForHandle(handle);
    sourceCanvas.setPointerCapture(event.pointerId);
  }
});

sourceCanvas.addEventListener("pointermove", (event) => {
  const point = getCanvasPoint(event);

  if (regionMode === "create" && dragSelect?.active) {
    dragSelect.currentX = point.x;
    dragSelect.currentY = point.y;
    drawSourcePreview();
    return;
  }

  if (regionMode === "edit" && editSession) {
    const dx = point.x - editSession.startX;
    const dy = point.y - editSession.startY;
    region = resizeRegionByHandle(editSession.handle, editSession.startRegion, dx, dy);
    syncRegionInputs();
    drawSourcePreview();
    return;
  }

  if (regionMode === "edit" && !editSession) {
    const handle = getEditHandleAt(point, region);
    sourceCanvas.style.cursor = handle ? cursorForHandle(handle) : "default";
  }
});

function finishPointerInteraction(event) {
  if (regionMode === "create" && dragSelect?.active) {
    const point = getCanvasPoint(event);
    dragSelect.currentX = point.x;
    dragSelect.currentY = point.y;
    region = regionFromDrag(dragSelect.startX, dragSelect.startY, dragSelect.currentX, dragSelect.currentY);
    dragSelect = null;
    syncRegionInputs();
    updateRegionModeUI();
    drawSourcePreview();
  }

  if (regionMode === "edit" && editSession) {
    editSession = null;
    sourceCanvas.style.cursor = "default";
    updateRegionModeUI();
  }

  if (sourceCanvas.hasPointerCapture(event.pointerId)) {
    sourceCanvas.releasePointerCapture(event.pointerId);
  }
}

sourceCanvas.addEventListener("pointerup", finishPointerInteraction);
sourceCanvas.addEventListener("pointercancel", finishPointerInteraction);

regionFloatDrag.addEventListener("pointerdown", (event) => {
  if (!sourceImage || regionFloatDrag.disabled) return;
  event.preventDefault();
  event.stopPropagation();
  floatBarDragSession = {
    startX: event.clientX,
    startY: event.clientY,
    originX: floatBarPosition.x,
    originY: floatBarPosition.y,
  };
  regionFloatBar.classList.add("is-dragging");
  regionFloatDrag.setPointerCapture(event.pointerId);
});

regionFloatDrag.addEventListener("pointermove", (event) => {
  if (!floatBarDragSession) return;
  event.stopPropagation();
  const dx = event.clientX - floatBarDragSession.startX;
  const dy = event.clientY - floatBarDragSession.startY;
  floatBarPosition = clampFloatBarPosition(floatBarDragSession.originX + dx, floatBarDragSession.originY + dy);
  applyFloatBarPosition();
});

function finishFloatBarDrag(event) {
  if (!floatBarDragSession) return;
  floatBarDragSession = null;
  regionFloatBar.classList.remove("is-dragging");
  if (regionFloatDrag.hasPointerCapture(event.pointerId)) {
    regionFloatDrag.releasePointerCapture(event.pointerId);
  }
}

regionFloatDrag.addEventListener("pointerup", finishFloatBarDrag);
regionFloatDrag.addEventListener("pointercancel", finishFloatBarDrag);

fullscreenPreviewBtn.addEventListener("click", async () => {
  if (!sourceImage) return;
  try {
    if (document.fullscreenElement === canvasStage) {
      await document.exitFullscreen();
    } else {
      await canvasStage.requestFullscreen();
    }
  } catch (error) {
    alert("当前浏览器不支持全屏预览");
  }
});

fullscreenPiecesBtn.addEventListener("click", async () => {
  if (!lastPieces.length) return;
  try {
    if (document.fullscreenElement === piecesStage) {
      await document.exitFullscreen();
    } else {
      await piecesStage.requestFullscreen();
    }
  } catch (error) {
    alert("当前浏览器不支持全屏预览");
  }
});

document.addEventListener("fullscreenchange", updateFullscreenButton);

new ResizeObserver(() => {
  if (sourceImage) layoutCanvasDisplay();
  floatBarPosition = clampFloatBarPosition(floatBarPosition.x, floatBarPosition.y);
  applyFloatBarPosition();
}).observe(sourcePreviewPanel);

new ResizeObserver(() => {
  if (!sourceImage) return;
  layoutCanvasDisplay();
}).observe(canvasStage);

new ResizeObserver(() => {
  if (!lastPieces.length) return;
  layoutPiecesDisplay();
}).observe(piecesStage);

createRegionBtn.addEventListener("click", () => setRegionMode("create"));
editRegionBtn.addEventListener("click", () => setRegionMode("edit"));
applyRegionBtn.addEventListener("click", applyRegionDraft);
cancelRegionBtn.addEventListener("click", cancelRegionDraft);

resetRegionBtn.addEventListener("click", resetRegionToFull);

[regionXInput, regionYInput, regionWInput, regionHInput].forEach((input) => {
  input.addEventListener("change", () => {
    if (!sourceImage) return;
    applyRegion(readRegionFromInputs());
    updateRegionModeUI();
    if (regionMode === "idle") clearCurrentCut();
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (document.fullscreenElement === canvasStage || document.fullscreenElement === piecesStage) return;
  if (regionMode !== "idle" || (sourceImage && !isFullImageRegion(region))) {
    cancelRegionDraft();
  }
});

document.querySelectorAll(".preset-btns button[data-rows]").forEach((btn) => {
  btn.addEventListener("click", () => {
    rowsInput.value = btn.dataset.rows ?? "3";
    colsInput.value = btn.dataset.cols ?? "3";
    if (sourceImage) {
      drawSourcePreview();
      if (lastPieces.length) runCut();
    }
  });
});

[rowsInput, colsInput].forEach((input) => {
  input.addEventListener("change", () => {
    if (sourceImage) drawSourcePreview();
  });
});

paddingInput.addEventListener("change", () => {
  if (lastPieces.length) runCut();
});

numberOverlayInput.addEventListener("change", () => {
  renderPiecesGrid(lastPieces, clampGrid(rowsInput.value), clampGrid(colsInput.value));
});

cutBtn.addEventListener("click", runCut);
saveConfigBtn.addEventListener("click", saveCurrentConfig);
exportJsonBtn.addEventListener("click", exportJson);
exportPngBtn.addEventListener("click", exportPngPieces);
exportAllBtn.addEventListener("click", exportAllConfigs);
selectAllConfigsBtn.addEventListener("click", selectAllConfigs);
clearSelectionBtn.addEventListener("click", clearConfigSelection);
exportSelectedBundleBtn.addEventListener("click", exportSelectedBundle);

setButtonsEnabled(false, false);
updateRegionModeUI();
resetFloatBarPosition();
updateConfigSelectionUI();
