/**
 * Advance currentFrame according to playMode.
 * @param {{
 *   items: { id: string }[],
 *   currentFrame: number,
 *   playMode: string,
 *   direction: number,
 *   isPlaying: boolean,
 *   selectedId: string | null,
 * }} state
 * @returns {{ stopped: boolean }}
 */
export function advanceFrame(state) {
  const total = state.items.length;
  if (!total) return { stopped: false };

  if (state.playMode === "loop") {
    state.currentFrame = (state.currentFrame + 1) % total;
  } else if (state.playMode === "once") {
    if (state.currentFrame < total - 1) state.currentFrame++;
    else {
      state.isPlaying = false;
      state.selectedId = state.items[state.currentFrame]?.id ?? null;
      return { stopped: true };
    }
  } else if (state.playMode === "pingpong") {
    if (state.direction === 1) {
      if (state.currentFrame < total - 1) state.currentFrame++;
      else { state.direction = -1; state.currentFrame--; }
    } else {
      if (state.currentFrame > 0) state.currentFrame--;
      else { state.direction = 1; state.currentFrame++; }
    }
  }

  state.selectedId = state.items[state.currentFrame]?.id ?? null;
  return { stopped: false };
}

/**
 * @param {number} timestamp
 * @param {{
 *   items: unknown[],
 *   isPlaying: boolean,
 *   fps: number,
 *   speed: number,
 *   extraDelay: number,
 *   lastFrameTime: number,
 * }} state
 * @param {() => void} onTick
 */
export function tickAnimation(timestamp, state, onTick) {
  if (!state.lastFrameTime) state.lastFrameTime = timestamp;
  if (state.isPlaying && state.items.length > 0) {
    const interval = 1000 / (state.fps * state.speed) + state.extraDelay;
    if (timestamp - state.lastFrameTime >= interval) {
      onTick();
      state.lastFrameTime = timestamp;
    }
  }
}
