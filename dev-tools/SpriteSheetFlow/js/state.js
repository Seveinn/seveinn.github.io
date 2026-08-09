/** @typedef {{
 *  id: string,
 *  name: string,
 *  width: number,
 *  height: number,
 *  sourceCanvas: HTMLCanvasElement,
 *  resultCanvas: HTMLCanvasElement | null,
 *  processed: boolean,
 *  bg: number[] | null,
 * }} FrameItem */

export const state = {
  /** @type {FrameItem[]} */
  items: [],
  selectedId: null,
  previewBg: "checker",
  useManualBg: false,
  manualBg: [230, 230, 229],
  autoSample: true,
  currentFrame: 0,
  isPlaying: true,
  fps: 12,
  speed: 1,
  extraDelay: 0,
  playMode: "loop",
  direction: 1,
  flipX: false,
  lastFrameTime: 0,
};

export const $ = (sel) => document.querySelector(sel);

export function frameSource(item) {
  return item.processed && item.resultCanvas ? item.resultCanvas : item.sourceCanvas;
}

export function cloneCanvas(src) {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  c.getContext("2d").drawImage(src, 0, 0);
  return c;
}
