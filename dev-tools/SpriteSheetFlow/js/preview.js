import { state, $, frameSource, cloneCanvas } from "./state.js";
import { advanceFrame, tickAnimation } from "./animation.js";

const stage = $("#stage");
const stageCtx = stage.getContext("2d");
const stageWrap = $("#stageWrap");
const timeline = $("#timeline");
const hudInfo = $("#hudInfo");

/** @type {(index: number) => void | Promise<void>} */
let onCompare = () => {};

export function setCompareHandler(fn) {
  onCompare = fn;
}

export function updateCanvasSize() {
  if (!state.items.length) return;
  const src = frameSource(state.items[0]);
  stage.width = src.width;
  stage.height = src.height;
}

export function renderFrame() {
  if (!state.items.length) {
    stageCtx.clearRect(0, 0, stage.width, stage.height);
    hudInfo.textContent = `FPS: ${state.fps} · 帧: 0/0`;
    return;
  }
  const item = state.items[state.currentFrame];
  const src = frameSource(item);
  if (stage.width !== src.width || stage.height !== src.height) {
    stage.width = src.width;
    stage.height = src.height;
  }
  stageCtx.clearRect(0, 0, stage.width, stage.height);
  stageCtx.save();
  if (state.flipX) {
    stageCtx.translate(stage.width, 0);
    stageCtx.scale(-1, 1);
  }
  stageCtx.drawImage(src, 0, 0);
  stageCtx.restore();

  const tag = item.processed ? "抠图" : "原图";
  hudInfo.textContent =
    `FPS: ${state.fps} · 速率: ${state.speed}x · 帧: ${state.currentFrame + 1}/${state.items.length} · ${tag}`;
  updateTimelineUI();
}

export function renderTimeline() {
  if (!state.items.length) {
    timeline.innerHTML = `<div class="hint-empty">时间轴：导入图片后显示各帧缩略图</div>`;
    return;
  }
  timeline.innerHTML = "";
  state.items.forEach((item, idx) => {
    const thumb = document.createElement("div");
    thumb.className = "frame-thumb"
      + (idx === state.currentFrame ? " active" : "")
      + (item.processed ? " done" : "");
    thumb.dataset.index = String(idx);

    const src = frameSource(item);
    const c = document.createElement("canvas");
    const max = 68;
    const scale = Math.min(1, max / Math.max(item.width, item.height));
    c.width = Math.max(1, Math.round(item.width * scale));
    c.height = Math.max(1, Math.round(item.height * scale));
    c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);

    const num = document.createElement("div");
    num.className = "num";
    num.textContent = String(idx);

    const dot = document.createElement("div");
    dot.className = "dot";
    dot.title = "已抠图";

    thumb.appendChild(c);
    thumb.appendChild(num);
    thumb.appendChild(dot);
    thumb.addEventListener("click", () => {
      state.currentFrame = idx;
      state.selectedId = item.id;
      state.isPlaying = false;
      $("#playBtn").textContent = "播放";
      renderFrame();
    });
    thumb.addEventListener("dblclick", () => onCompare(idx));
    timeline.appendChild(thumb);
  });
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
