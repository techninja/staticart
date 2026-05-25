/**
 * Grid placement builder for texture generation.
 * @module scripts/lib/texture-grid
 */

import { ASPECT, DEG, rotatePoint, transformPlacement } from './texture-math.js';
import { collectPlacements, registerGrid } from './texture-placements.js';

/**
 *
 */
export function gridPlacements(layer, outW, outH) {
  const hasSrc = !!layer.src;
  const sub = hasSrc ? collectPlacements(layer.src) : null;
  const aspect = hasSrc ? layer.aspect || 1 : ASPECT;
  const cols = layer.cols || 7,
    rows = layer.rows || 8;
  const gap = layer.gap || 0;
  const hex = layer.hex || false;
  const colStep = outW / cols;
  const rowStep = hex ? (colStep * Math.sqrt(3)) / 2 : outH / rows;
  const autoSize = Math.floor(colStep - gap);
  const tileW = layer.size || autoSize;
  const tileH = tileW * aspect;
  const dropRatio = layer.offset ?? 0.5;
  const halfOff = colStep * dropRatio;
  const rot = layer.rotate || 0;
  const zig = layer.zigzag || false;
  const rad = Math.abs(rot) * DEG;
  const cover = rot ? Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad)) : 1;
  const useCols = rot ? Math.ceil(cols * cover) + 4 : cols;
  const effectiveRows = hex ? Math.ceil(outH / rowStep) + 1 : rows;
  const useRows = rot ? Math.ceil(effectiveRows * cover) + 4 : effectiveRows;
  const padX = (colStep - tileW) / 2,
    padY = (rowStep - tileH) / 2;

  const raw = [];
  for (let row = 0; row < useRows; row++) {
    const flipped = row % 2 === 1;
    const count = flipped ? useCols + 1 : useCols;
    const xOff = flipped ? -halfOff : 0;
    for (let col = 0; col < count; col++) {
      const cx = xOff + col * colStep + padX + tileW / 2;
      const cy = row * rowStep + padY + tileH / 2;
      let angle = 0;
      if (zig) angle = (row + col) % 2 ? rot : -rot;
      if (hasSrc) {
        const cellGroup = [];
        for (const item of sub.placements) {
          const icons = item.group ? item.group : [item];
          for (const p of icons) {
            const t = transformPlacement(
              p,
              cx,
              cy,
              sub.canvas,
              tileW,
              tileH,
              0,
              cx,
              cy,
              angle,
              false,
            );
            cellGroup.push({ ...t, opacity: t.opacity * layer.opacity, flip: t.flip });
          }
        }
        raw.push({ group: cellGroup });
      } else {
        raw.push({ cx, cy, w: tileW, h: tileH, angle, opacity: layer.opacity, flip: flipped });
      }
    }
  }

  if (!rot) return raw;

  const ocx = outW / 2,
    ocy = outH / 2;
  const gw = useCols * colStep,
    gh = useRows * rowStep;
  const dx = (gw - outW) / 2,
    dy = (gh - outH) / 2;
  /**
   *
   */
  function rotateP(p) {
    const shifted = { ...p, cx: p.cx - dx, cy: p.cy - dy };
    const r = rotatePoint(shifted.cx, shifted.cy, ocx, ocy, rot);
    return { ...shifted, cx: r.x, cy: r.y, angle: shifted.angle + rot };
  }
  return raw.map((p) => (p.group ? { group: p.group.map(rotateP) } : rotateP(p)));
}

registerGrid(gridPlacements);
