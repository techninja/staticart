/**
 * Placement builders — collect, radial, and pattern placement generators.
 * @module scripts/lib/texture-placements
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ASPECT, rotatePoint, transformPlacement } from './texture-math.js';

const ROOT = process.cwd();

/** @type {Function} Late-bound grid import to avoid circular dependency. */
let _gridPlacements;

/** Register the grid placement builder (called by texture-grid.js). */
export function registerGrid(fn) {
  _gridPlacements = fn;
}

/**
 *
 */
export function collectPlacements(patternPath) {
  const def = JSON.parse(readFileSync(resolve(ROOT, patternPath), 'utf-8'));
  const canvas = def.canvas || 1000;
  const cx = canvas / 2,
    cy = canvas / 2;
  const placements = [];
  for (const layer of def.layers) {
    if (layer.type === 'radial') placements.push(...radialPlacements(layer, cx, cy));
    else if (layer.type === 'grid') placements.push(..._gridPlacements(layer, canvas, canvas));
    else if (layer.type === 'pattern') placements.push(...patternPlacements(layer, cx, cy, canvas));
  }
  return { placements, canvas };
}

/**
 *
 */
export function radialPlacements(layer, cx, cy) {
  const w = layer.size,
    h = w * ASPECT;
  const step = 360 / layer.count;
  const selfRotate = layer.rotate || 0;
  const out = [];
  for (let i = 0; i < layer.count; i++) {
    const orbit = step * i + (layer.offset || 0);
    const ix = cx,
      iy = cy - layer.radius;
    const rotated = rotatePoint(ix, iy, cx, cy, orbit);
    const angle = layer.spoke ? orbit + selfRotate + 90 : selfRotate;
    out.push({ cx: rotated.x, cy: rotated.y, w, h, angle, opacity: layer.opacity });
  }
  return out;
}

/**
 *
 */
export function patternPlacements(layer, parentCx, parentCy, parentCanvas) {
  const sub = collectPlacements(layer.src);
  const w = layer.size || 100;
  const h = w * (layer.aspect || 1);
  const selfAngle = (layer.rotate || 0) + (layer.spoke ? 90 : 0);
  const spoke = !!layer.spoke;

  if (layer.count && layer.radius) {
    const step = 360 / layer.count;
    const out = [];
    for (let i = 0; i < layer.count; i++) {
      const orbit = step * i + (layer.offset || 0);
      const anchorX = parentCx,
        anchorY = parentCy - layer.radius;
      const anchor = rotatePoint(anchorX, anchorY, parentCx, parentCy, orbit);
      const group = [];
      for (const p of sub.placements) {
        const scale = w / sub.canvas;
        const icx = anchor.x + (p.cx - sub.canvas / 2) * scale;
        const icy = anchor.y + (p.cy - sub.canvas / 2) * scale;
        const iw = p.w * scale,
          ih = p.h * scale;
        let angle = p.angle + selfAngle;
        if (spoke) angle += orbit;
        group.push({
          cx: icx,
          cy: icy,
          w: iw,
          h: ih,
          angle,
          opacity: p.opacity * (layer.opacity || 1),
          flip: p.flip,
        });
      }
      out.push({ group });
    }
    return out;
  }

  const ax = layer.x ?? parentCx,
    ay = layer.y ?? parentCy;
  return sub.placements.map((p) => ({
    ...transformPlacement(p, ax, ay, sub.canvas, w, h, 0, ax, ay, selfAngle, false),
    opacity: p.opacity * (layer.opacity || 1),
  }));
}
