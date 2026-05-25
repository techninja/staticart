/**
 * SVG generation and rendering for texture patterns.
 * @module scripts/lib/texture-svg
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { execSync } from 'node:child_process';
import { loadIcon } from './texture-patterns.js';
import { collectPlacements } from './texture-placements.js';
import './texture-grid.js';

const ROOT = process.cwd();
const TEXTURES_DIR = resolve(ROOT, 'src/assets/prints/textures');
const RENDERS_DIR = resolve(ROOT, 'src/assets/prints/renders');

/**
 *
 */
export function placementsToSvg(placements, canvas, bgColor, iconInner, needsClip) {
  const lines = [];
  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${canvas} ${canvas}">`,
  );
  lines.push(`  <defs><symbol id="ic" viewBox="0 0 80 50">${iconInner}</symbol>`);
  if (needsClip)
    lines.push(`    <clipPath id="clip"><rect width="${canvas}" height="${canvas}"/></clipPath>`);
  lines.push(`  </defs>`);
  if (bgColor) lines.push(`  <rect width="${canvas}" height="${canvas}" fill="${bgColor}"/>`);
  if (needsClip) lines.push(`  <g clip-path="url(#clip)">`);
  /**
   *
   */
  function emitIcon(p) {
    const x = (p.cx - p.w / 2).toFixed(2);
    const y = (p.cy - p.h / 2).toFixed(2);
    const w = p.w.toFixed(2);
    const h = p.h.toFixed(2);
    const transforms = [];
    if (p.flip) transforms.push(`scale(-1,1) translate(${(-2 * p.cx).toFixed(2)},0)`);
    if (Math.abs(p.angle) > 0.01)
      transforms.push(`rotate(${p.angle.toFixed(2)},${p.cx.toFixed(2)},${p.cy.toFixed(2)})`);
    const t = transforms.length ? ` transform="${transforms.join(' ')}"` : '';
    const o = p.opacity < 1 ? ` opacity="${p.opacity}"` : '';
    lines.push(`  <use xlink:href="#ic" x="${x}" y="${y}" width="${w}" height="${h}"${t}${o}/>`);
  }
  for (const p of placements) {
    if (p.group) {
      lines.push(`  <g>`);
      for (const gp of p.group) emitIcon(gp);
      lines.push(`  </g>`);
    } else {
      emitIcon(p);
    }
  }
  if (needsClip) lines.push(`  </g>`);
  lines.push(`</svg>`);
  return lines.join('\n') + '\n';
}

/**
 *
 */
export function generateFromDef(patternPath) {
  const def = JSON.parse(readFileSync(resolve(ROOT, patternPath), 'utf-8'));
  const name = def.name || basename(patternPath, '.json');
  const canvas = def.canvas || 1000;
  const iconInner = loadIcon(def.icon);
  const { placements } = collectPlacements(patternPath);
  const needsClip = def.layers.some((l) => l.type === 'grid' && l.rotate);
  const bgs =
    typeof def.bg === 'object' && def.bg !== null
      ? Object.entries(def.bg)
      : [[null, def.bg || null]];
  const results = [];
  for (const [variant, bgColor] of bgs) {
    const svg = placementsToSvg(placements, canvas, bgColor, iconInner, needsClip);
    const suffix = variant ? `-${variant}` : '';
    const svgFile = `${name}${suffix}.svg`;
    writeFileSync(resolve(TEXTURES_DIR, svgFile), svg);
    results.push({
      name: `${name}${suffix}`,
      svgPath: `src/assets/prints/textures/${svgFile}`,
      render: def.render,
    });
  }
  return { name, variants: results, layers: def.layers.length };
}

/**
 *
 */
export function renderPng({ name, svgPath, render }) {
  if (!render) return;
  const width = render.width || 6300;
  const svg = resolve(ROOT, svgPath);
  const png = resolve(RENDERS_DIR, `${name}.png`);
  try {
    execSync(
      `inkscape "${svg}" --export-type=png --export-filename="${png}" --export-width=${width}`,
      { stdio: 'pipe' },
    );
    console.log(`  📸 ${name}.png (${width}px)`);
  } catch (e) {
    console.error(`  ✗ PNG render failed: ${e.message.split('\n')[0]}`);
  }
}

/**
 *
 */
export function logAndRender(result, png) {
  const svgs = result.variants.map((v) => v.name).join(', ');
  console.log(`  ✓ ${result.name} (${result.layers} layers) → ${svgs}`);
  if (png) result.variants.forEach((v) => renderPng(v));
}
