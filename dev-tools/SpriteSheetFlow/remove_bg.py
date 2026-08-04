"""Remove solid background from walk frames -> transparent PNGs (edge flood-fill)."""
from pathlib import Path
from collections import deque
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = Path(r"E:\AIProjects\free-tex-packer-master\src\client\Sprites\walk")
DST = Path(r"E:\AIProjects\free-tex-packer-master\src\client\Sprites\walk-transparent")

# Max RGB distance from seed bg to treat as background during flood fill
TOL = 42.0
# Soft edge band for AA pixels adjacent to bg (0 = hard cut after inset)
SOFT = 0.0
# Extra pixels to cut inward from the silhouette (removes white fringe)
INSET = 5
# Also force-clear near-edge pixels still close to bg color (extra anti-halo)
FRINGE_CLEAR = 55.0


def sample_bg(arr: np.ndarray) -> np.ndarray:
    h, w = arr.shape[:2]
    samples = np.array(
        [
            arr[0, 0, :3],
            arr[0, w - 1, :3],
            arr[h - 1, 0, :3],
            arr[10, 10, :3],
            arr[0, w // 2, :3],
            arr[h // 2, 0, :3],
        ],
        dtype=np.float32,
    )
    return samples.mean(axis=0)


def flood_bg_mask(rgb: np.ndarray, bg: np.ndarray, tol: float):
    """BFS from image border; mark connected near-bg pixels."""
    h, w = rgb.shape[:2]
    dist = np.sqrt(((rgb - bg) ** 2).sum(axis=2))
    eligible = dist <= tol
    mask = np.zeros((h, w), dtype=bool)
    q = deque()

    def try_push(y, x):
        if 0 <= y < h and 0 <= x < w and eligible[y, x] and not mask[y, x]:
            mask[y, x] = True
            q.append((y, x))

    for x in range(w):
        try_push(0, x)
        try_push(h - 1, x)
    for y in range(h):
        try_push(y, 0)
        try_push(y, w - 1)

    while q:
        y, x = q.popleft()
        try_push(y - 1, x)
        try_push(y + 1, x)
        try_push(y, x - 1)
        try_push(y, x + 1)

    return mask, dist


def process(src: Path, dst: Path, bg: np.ndarray):
    img = Image.open(src).convert("RGBA")
    arr = np.array(img, dtype=np.float32)
    rgb = arr[:, :, :3]
    alpha = arr[:, :, 3].copy()

    bg_mask, dist = flood_bg_mask(rgb, bg, TOL)

    # Cut inward: expand bg mask so white fringe / AA halo is removed
    if INSET > 0:
        bg_mask = ndimage.binary_dilation(bg_mask, iterations=INSET)

    alpha[bg_mask] = 0

    # Kill leftover light halo along the new silhouette edge
    if FRINGE_CLEAR > 0:
        edge = ndimage.binary_dilation(bg_mask, iterations=2) & ~bg_mask
        halo = edge & (dist <= FRINGE_CLEAR)
        alpha[halo] = 0
        bg_mask = bg_mask | halo

    # Soft falloff on remaining fringe next to cut edge
    if SOFT > 0:
        soft_zone = ndimage.binary_dilation(bg_mask, iterations=1) & ~bg_mask
        close = soft_zone & (dist < TOL + SOFT + INSET * 8)
        t = np.clip((dist[close] - TOL) / max(SOFT, 1e-6), 0, 1)
        alpha[close] = np.minimum(alpha[close], 255.0 * t)

    out = arr.copy()
    out[:, :, 3] = alpha
    Image.fromarray(out.astype(np.uint8), "RGBA").save(dst, "PNG")


def main():
    DST.mkdir(parents=True, exist_ok=True)
    files = sorted(SRC.glob("walk-*.png"))
    if not files:
        raise SystemExit(f"No frames in {SRC}")

    first = np.array(Image.open(files[0]).convert("RGBA"), dtype=np.float32)
    bg = sample_bg(first)
    print(
        f"bg≈{tuple(round(float(c)) for c in bg)}  "
        f"TOL={TOL} SOFT={SOFT} INSET={INSET}px  → {DST}"
    )

    for f in files:
        process(f, DST / f.name, bg)
        print(f"  {f.name}")

    print(f"done: {len(files)} frames")


if __name__ == "__main__":
    main()
