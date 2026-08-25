import { state, $, frameSource, cloneCanvas } from "./state.js";
import { advanceFrame, tickAnimation } from "./animation.js";

const stage = $("#stage");
const stageCtx = stage.getContext("2d");
const stageWrap = $("#stageWrap");
const stageContent = $("#stageContent");
const timeline = $("#timeline");
const hudInfo = $("#hudInfo");

/** 适配预览区时四周留白比例 */
const FIT_PAD = 0.9;
/** 画布相对内容的额外边距（CSS px） */
const STAGE_MARGIN = 24;

/** 立绘预览等：在图像四周额外留白（图像像素），便于画出超出原图的画幅框 */
/** @type {{ top: number, right: number, bottom: number, left: number }} */
let contentInsetsPx = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * @param {{ top?: number, right?: number, bottom?: number, left?: number } | null} insets 图像像素
 */
export function setStageContentInsetsPx(insets) {
  contentInsetsPx = {
    top: Math.max(0, insets?.top || 0),
    right: Math.max(0, insets?.right || 0),
    bottom: Math.max(0, insets?.bottom || 0),
    left: Math.max(0, insets?.left || 0),
  };
}

export function clearStageContentInsetsPx() {
  contentInsetsPx = { top: 0, right: 0, bottom: 0, left: 0 };
}

/** @type {(index: number) => void | Promise<void>} */
let onCompare = () => {};
/** @type {(() => void) | null} */
let afterRender = null;
/** @type {(() => void) | null} */
let onFrameChange = null;

export function setCompareHandler(fn) {
  onCompare = fn;
}

export function setAfterRender(fn) {
  afterRender = fn;
}

export function setFrameChangeHandler(fn) {
  onFrameChange = fn;
}

function viewportCssSize() {
  return {
    cssW: Math.max(1, stageWrap.clientWidth),
    cssH: Math.max(1, stageWrap.clientHeight),
    dpr: window.devicePixelRatio || 1,
  };
}

/**
 * 同步舞台缓冲与 CSS 尺寸。
 * @param {number} [needCssW]
 * @param {number} [needCssH]
 */
function syncStageBuffer(needCssW, needCssH) {
  const { cssW: viewCssW, cssH: viewCssH, dpr } = viewportCssSize();
  const cssW = Math.max(1, Math.round(needCssW ?? viewCssW));
  const cssH = Math.max(1, Math.round(needCssH ?? viewCssH));
  const w = Math.max(1, Math.round(cssW * dpr));
  const h = Math.max(1, Math.round(cssH * dpr));

  if (stage.width !== w || stage.height !== h) {
    stage.width = w;
    stage.height = h;
  }
  stage.style.width = cssW + "px";
  stage.style.height = cssH + "px";
  if (stageContent) {
    stageContent.style.width = cssW + "px";
    stageContent.style.height = cssH + "px";
  }

  const scrollable = cssW > viewCssW + 1 || cssH > viewCssH + 1;
  stageWrap.classList.toggle("scrollable", scrollable);

  return { w, h, dpr, cssW, cssH, viewCssW, viewCssH };
}

export function updateCanvasSize() {
  if (!state.items.length) {
    syncStageBuffer();
    return;
  }
  getFrameDrawRect();
}

/** 当前帧在舞台缓冲坐标系中的绘制矩形（含 dpr）。 */
export function getFrameDrawRect() {
  if (!state.items.length) return null;
  const { cssW: viewCssW, cssH: viewCssH, dpr } = viewportCssSize();
  const item = state.items[state.currentFrame];
  const src = frameSource(item);

  const fit = Math.min(viewCssW / src.width, viewCssH / src.height) * FIT_PAD;
  const user = Math.max(0.8, Math.min(3, state.previewScale || 1));
  const cssScale = fit * user;
  const dwCss = src.width * cssScale;
  const dhCss = src.height * cssScale;

  const iL = contentInsetsPx.left * cssScale;
  const iR = contentInsetsPx.right * cssScale;
  const iT = contentInsetsPx.top * cssScale;
  const iB = contentInsetsPx.bottom * cssScale;
  const margin = state.portraitMode ? Math.max(STAGE_MARGIN, 40) : STAGE_MARGIN;

  const contentCssW = dwCss + iL + iR;
  const contentCssH = dhCss + iT + iB;
  const needCssW = Math.max(viewCssW, Math.ceil(contentCssW + margin * 2));
  const needCssH = Math.max(viewCssH, Math.ceil(contentCssH + margin * 2));
  const { w: viewW, h: viewH, cssW, cssH } = syncStageBuffer(needCssW, needCssH);

  const scale = cssScale * dpr;
  const dw = src.width * scale;
  const dh = src.height * scale;
  // 在扩展画布内为 insets 留空，图像仍居中于「内容区」
  const oxCss = (cssW - contentCssW) / 2;
  const oyCss = (cssH - contentCssH) / 2;
  const dx = (oxCss + iL) * dpr;
  const dy = (oyCss + iT) * dpr;

  return {
    viewW,
    viewH,
    dpr,
    srcW: src.width,
    srcH: src.height,
    scale,
    cssScale,
    dw,
    dh,
    dx,
    dy,
    zoomPct: Math.round(user * 100),
    insetsPx: { ...contentInsetsPx },
  };
}

/** 将舞台点击映射到图像像素坐标；点在图外返回 null。 */
export function stageEventToImageXY(clientX, clientY) {
  const rect = getFrameDrawRect();
  if (!rect) return null;
  const wrap = stageWrap.getBoundingClientRect();
  const cssX = clientX - wrap.left + stageWrap.scrollLeft;
  const cssY = clientY - wrap.top + stageWrap.scrollTop;
  const vx = cssX * rect.dpr;
  const vy = cssY * rect.dpr;

  let lx = vx - rect.dx;
  let ly = vy - rect.dy;
  if (state.flipX) lx = rect.dw - lx;
  if (lx < 0 || ly < 0 || lx > rect.dw || ly > rect.dh) return null;

  const x = Math.floor(lx / rect.scale);
  const y = Math.floor(ly / rect.scale);
  if (x < 0 || y < 0 || x >= rect.srcW || y >= rect.srcH) return null;
  return { x, y };
}

export function setSpotEraseCursor(on) {
  stageWrap.classList.toggle("spot-erase", on);
  if (on) stageWrap.classList.remove("brush-erase");
}

export function setBrushEraseCursor(on) {
  stageWrap.classList.toggle("brush-erase", on);
  if (on) stageWrap.classList.remove("spot-erase");
}

function applyImageSmoothing(scale) {
  // 放大预览时关闭平滑，序列帧/像素风更清晰
  const smooth = scale < 1.25;
  stageCtx.imageSmoothingEnabled = smooth;
  if ("imageSmoothingQuality" in stageCtx) {
    stageCtx.imageSmoothingQuality = smooth ? "high" : "low";
  }
  stage.classList.toggle("crisp", !smooth);
}

export function renderFrame() {
  const rect = getFrameDrawRect();
  if (!state.items.length || !rect) {
    const { w: viewW, h: viewH } = syncStageBuffer();
    stageCtx.setTransform(1, 0, 0, 1, 0, 0);
    stageCtx.clearRect(0, 0, viewW, viewH);
    hudInfo.textContent = `FPS: ${state.fps} · 帧: 0/0 · 画布 ${Math.round((state.previewScale || 1) * 100)}%`;
    afterRender?.();
    return;
  }

  const item = state.items[state.currentFrame];
  const src = frameSource(item);
  const { viewW, viewH } = rect;

  stageCtx.setTransform(1, 0, 0, 1, 0, 0);
  stageCtx.clearRect(0, 0, viewW, viewH);
  applyImageSmoothing(rect.cssScale);

  stageCtx.save();
  stageCtx.translate(rect.dx + rect.dw / 2, rect.dy + rect.dh / 2);
  if (state.flipX) stageCtx.scale(-1, 1);
  stageCtx.drawImage(src, -rect.dw / 2, -rect.dh / 2, rect.dw, rect.dh);
  stageCtx.restore();

  const tag = item.processed ? "抠图" : "原图";
  const tool = state.portraitMode
    ? " · 立绘裁剪"
    : state.cropMode
      ? " · 裁剪"
      : (state.brushErase ? " · 橡皮擦" : (state.spotErase ? " · 点选扣除" : ""));
  hudInfo.textContent =
    `FPS: ${state.fps} · 速率: ${state.speed}x · 帧: ${state.currentFrame + 1}/${state.items.length}`
    + ` · ${rect.srcW}×${rect.srcH} · 画布 ${rect.zoomPct}% · ${tag}${tool}`;
  updateTimelineUI();
  afterRender?.();
}

/** @type {(() => void) | null} */
let onSelectionChange = null;

export function setSelectionChangeHandler(fn) {
  onSelectionChange = fn;
}

export function updateSelectionUI() {
  const bar = $("#timelineBar");
  const countEl = $("#timelineSelCount");
  const allCb = /** @type {HTMLInputElement | null} */ ($("#btnSelectAllFrames"));
  const n = state.items.length;
  if (bar) bar.hidden = n === 0;
  if (!n) return;

  const selected = state.items.filter((i) => i.selected).length;
  if (countEl) countEl.textContent = `已选 ${selected}/${n}`;
  if (allCb) {
    allCb.checked = selected === n;
    allCb.indeterminate = selected > 0 && selected < n;
  }
}

export function setAllFramesSelected(on) {
  for (const item of state.items) item.selected = on;
  updateSelectionUI();
  renderTimeline();
  onSelectionChange?.();
}

export function renderTimeline() {
  const bar = $("#timelineBar");
  if (!state.items.length) {
    timeline.innerHTML = `<div class="hint-empty">时间轴：导入图片后显示各帧缩略图</div>`;
    if (bar) bar.hidden = true;
    return;
  }
  if (bar) bar.hidden = false;
  timeline.innerHTML = "";
  state.items.forEach((item, idx) => {
    const thumb = document.createElement("div");
    thumb.className = "frame-thumb"
      + (idx === state.currentFrame ? " active" : "")
      + (item.processed ? " done" : "")
      + (item.selected ? "" : " unchecked");
    thumb.dataset.index = String(idx);

    const src = frameSource(item);
    const c = document.createElement("canvas");
    const max = 68;
    const scale = Math.min(1, max / Math.max(item.width, item.height));
    c.width = Math.max(1, Math.round(item.width * scale));
    c.height = Math.max(1, Math.round(item.height * scale));
    const tctx = c.getContext("2d");
    tctx.imageSmoothingEnabled = scale < 1;
    tctx.drawImage(src, 0, 0, c.width, c.height);

    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "frame-check";
    check.checked = item.selected !== false;
    check.title = "选中参与批量抠图 / 立绘裁剪";
    check.addEventListener("click", (e) => e.stopPropagation());
    check.addEventListener("change", () => {
      item.selected = check.checked;
      thumb.classList.toggle("unchecked", !item.selected);
      updateSelectionUI();
      onSelectionChange?.();
    });

    const num = document.createElement("div");
    num.className = "num";
    num.textContent = String(idx);

    const dot = document.createElement("div");
    dot.className = "dot";
    dot.title = "已抠图";

    thumb.appendChild(c);
    thumb.appendChild(check);
    thumb.appendChild(num);
    thumb.appendChild(dot);
    thumb.addEventListener("click", () => {
      state.currentFrame = idx;
      state.selectedId = item.id;
      state.isPlaying = false;
      $("#playBtn").textContent = "播放";
      renderFrame();
      onFrameChange?.();
    });
    thumb.addEventListener("dblclick", () => onCompare(idx));
    timeline.appendChild(thumb);
  });
  updateSelectionUI();
}

export function updateTimelineUI() {
  const thumbs = timeline.querySelectorAll(".frame-thumb");
  thumbs.forEach((t, i) => {
    t.classList.toggle("active", i === state.currentFrame);
    if (i === state.currentFrame) {
      t.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  });
}

export function applyPreviewBgClass() {
  stageWrap.classList.remove("checker", "dark", "light");
  stageWrap.classList.add(state.previewBg);
  document.querySelectorAll(".compare-pane .stage").forEach((el) => {
    el.classList.remove("checker", "dark", "light");
    el.classList.add(state.previewBg);
  });
}

/**
 * @param {number | null | undefined} index
 * @param {(item: import("./state.js").FrameItem) => Promise<unknown>} processItem
 * @param {() => void} updateButtons
 */
export async function openCompare(index, processItem, updateButtons) {
  if (index == null) index = state.currentFrame;
  const item = state.items[index];
  if (!item) return;
  state.currentFrame = index;
  state.selectedId = item.id;
  renderFrame();

  const before = $("#stageBefore");
  const after = $("#stageAfter");
  before.className = "stage " + state.previewBg;
  after.className = "stage " + state.previewBg;
  before.innerHTML = "";
  after.innerHTML = "";
  before.appendChild(cloneCanvas(item.sourceCanvas));
  if (!item.processed) await processItem(item);
  after.appendChild(cloneCanvas(item.resultCanvas));
  renderTimeline();
  updateButtons();
  $("#compareTitle").textContent = item.name;
  $("#compare").classList.add("open");
}

export function startAnimLoop() {
  const ro = new ResizeObserver(() => {
    if (state.items.length) renderFrame();
    else syncStageBuffer();
  });
  ro.observe(stageWrap);

  function loop(timestamp) {
    tickAnimation(timestamp, state, () => {
      const { stopped } = advanceFrame(state);
      if (stopped) $("#playBtn").textContent = "播放";
      renderFrame();
    });
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
