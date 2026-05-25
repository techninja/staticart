/**
 * Placement math — coordinate transforms for texture generation.
 * @module scripts/lib/texture-math
 */

export const ASPECT = 50 / 80;
export const DEG = Math.PI / 180;

/** Rotate point (px,py) around (ox,oy) by deg degrees. */
export function rotatePoint(px, py, ox, oy, deg) {
  const r = deg * DEG;
  const dx = px - ox,
    dy = py - oy;
  return {
    x: ox + dx * Math.cos(r) - dy * Math.sin(r),
    y: oy + dx * Math.sin(r) + dy * Math.cos(r),
  };
}

/** Scale and translate a placement from sub-pattern space into parent space. */
export function transformPlacement(
  p,
  parentCx,
  parentCy,
  subCanvas,
  targetW,
  targetH,
  orbitAngle,
  orbitCx,
  orbitCy,
  selfAngle,
  spoke,
) {
  const scale = targetW / subCanvas;
  let cx = parentCx + (p.cx - subCanvas / 2) * scale;
  let cy = parentCy + (p.cy - subCanvas / 2) * scale;
  const w = p.w * scale;
  const h = p.h * scale;
  let angle = p.angle + selfAngle;
  if (orbitAngle) {
    const rotated = rotatePoint(cx, cy, orbitCx, orbitCy, orbitAngle);
    cx = rotated.x;
    cy = rotated.y;
    if (spoke) angle += orbitAngle;
  }
  return { cx, cy, w, h, angle, opacity: p.opacity, flip: p.flip || false };
}
