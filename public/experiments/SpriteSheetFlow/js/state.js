/** @typedef {{
 *  id: string,
 *  name: string,
 *  width: number,
 *  height: number,
 *  sourceCanvas: HTMLCanvasElement,
 *  resultCanvas: HTMLCanvasElement | null,
 *  processed: boolean,
 *  selected: boolean,
 *  bg: number[] | null,
 *  eraseMask: Uint8Array | null,
 * }} FrameItem */

export const state = {
  /** @type {FrameItem[]} */
  items: [],
  selectedId: null,
  previewBg: "checker",
  /** 预览画布相对「适配」的缩放，1 = 100% */
  previewScale: 1,
  useManualBg: false,
  manualBg: [230, 230, 229],
  autoSample: true,
  currentFrame: 0,
  isPlaying: false,
  fps: 12,
  speed: 1,
  extraDelay: 0,
  playMode: "loop",
  direction: 1,
  flipX: false,
  lastFrameTime: 0,
  /** 点选局部扣除模式 */
  spotErase: false,
  /** 画笔橡皮擦模式 */
  brushErase: false,
  /** 预览区裁剪网格模式 */
  cropMode: false,
  /** 立绘裁剪线模式 */
  portraitMode: false,
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
