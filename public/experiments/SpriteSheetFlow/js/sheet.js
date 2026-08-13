/**
 * @param {HTMLCanvasElement} canvas
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ width: number, height: number, source: CanvasImageSource }[]} frames
 * @param {"horizontal" | "grid"} layout
 */
export function buildSpriteSheet(canvas, ctx, frames, layout) {
  if (!frames.length) {
    canvas.width = 1;
    canvas.height = 1;
    ctx.clearRect(0, 0, 1, 1);
    return;
  }

  const frameW = frames[0].width;
  const frameH = frames[0].height;
  const count = frames.length;
  let cols = count, rows = 1;
  if (layout === "grid") {
    cols = Math.ceil(Math.sqrt(count));
    rows = Math.ceil(count / cols);
  }

  canvas.width = cols * frameW;
  canvas.height = rows * frameH;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  frames.forEach((item, idx) => {
    const c = idx % cols;
    const r = Math.floor(idx / cols);
    ctx.drawImage(item.source, c * frameW, r * frameH);
  });
}
