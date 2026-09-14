type Size = { w: number; h: number };
type Rect = Size & { x: number; y: number };

/** Pack fixed-size images into a strip, retaining holes for later images to fill. */
export function packImages(sizes: Size[], width: number, gap = 12) {
  const indices = sizes.map((_, i) => i);
  // The caller already shuffled the images. Try different starting points in
  // that order, rather than sorting by size and undoing the visible shuffle.
  // These candidates stay stable during resize without drawing more randomness.
  const orders = [0, Math.floor(indices.length / 3), Math.floor(2 * indices.length / 3)]
    .map((start) => [...indices.slice(start), ...indices.slice(0, start)]);
  let best: { positions: Rect[]; height: number } | undefined;

  // Try several arrangements: no one ordering packs every mix of aspect ratios well.
  for (const order of orders) {
    for (const bottomFirst of [false, true]) {
      let free: Rect[] = [{ x: 0, y: 0, w: width + gap,
        h: sizes.reduce((sum, size) => sum + size.h + gap, 0) }];
      const positions: Rect[] = new Array(sizes.length);
      let height = 0;
      for (const index of order) {
        const { w, h } = sizes[index];
        const paddedW = w + gap;
        const paddedH = h + gap;
        let selected: Rect | undefined;
        let bestTop = Infinity;
        let bestFit = Infinity;
        for (const rect of free) {
          if (paddedW > rect.w + 1e-7 || paddedH > rect.h + 1e-7) continue;
          const top = bottomFirst ? Math.max(height, rect.y + h) : rect.y;
          const fit = Math.min(rect.w - paddedW, rect.h - paddedH);
          if (top < bestTop || (top === bestTop && fit < bestFit)) {
            selected = rect;
            bestTop = top;
            bestFit = fit;
          }
        }
        // The initial strip is tall enough to stack every image vertically.
        if (!selected) throw new Error('Unable to fit image into gallery strip');
        const used = { x: selected.x, y: selected.y, w: paddedW, h: paddedH };
        positions[index] = { x: used.x, y: used.y, w, h };
        height = Math.max(height, used.y + h);

        // Split every intersecting empty rectangle, keeping all usable holes.
        const next: Rect[] = [];
        for (const rect of free) {
          const right = rect.x + rect.w;
          const bottom = rect.y + rect.h;
          const usedRight = used.x + used.w;
          const usedBottom = used.y + used.h;
          if (used.x >= right || usedRight <= rect.x || used.y >= bottom || usedBottom <= rect.y) {
            next.push(rect);
            continue;
          }
          if (used.x > rect.x) next.push({ ...rect, w: used.x - rect.x });
          if (usedRight < right) next.push({ ...rect, x: usedRight, w: right - usedRight });
          if (used.y > rect.y) next.push({ ...rect, h: used.y - rect.y });
          if (usedBottom < bottom) next.push({ ...rect, y: usedBottom, h: bottom - usedBottom });
        }
        // Maximal rectangles can overlap; discard duplicates and contained ones.
        free = next.filter((rect, i) => !next.some((other, j) => i !== j &&
          other.x <= rect.x && other.y <= rect.y &&
          other.x + other.w >= rect.x + rect.w && other.y + other.h >= rect.y + rect.h &&
          (other.x < rect.x || other.y < rect.y || other.w > rect.w || other.h > rect.h || j < i)));
      }
      if (!best || height < best.height) best = { positions, height };
    }
  }
  return best!;
}
