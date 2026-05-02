/**
 * Mockup generation helpers — download, position calc, task runner.
 * @module scripts/lib/mockup-helpers
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const sleep = (/** @type {number} */ ms) => new Promise((r) => setTimeout(r, ms));

/** @param {string} url @param {string} dest */
export async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

/** Pick one variant per unique color. */
export function uniqueColorVariants(variants) {
  const seen = new Set();
  return variants.filter((v) => {
    const color = v.product?.name?.replace(/\s*\([^)]+\)\s*$/, '') || v.id;
    return !seen.has(color) && seen.add(color);
  });
}

/** Fit logo into print area, or fill if file matches print area aspect ratio. */
export function calcPosition(tpl, logoFile, placement) {
  const pw = tpl.print_area_width;
  const ph = tpl.print_area_height;
  const lw = logoFile.width || 602;
  const lh = logoFile.height || 490;
  const areaRatio = pw / ph;
  const logoRatio = lw / lh;
  if (Math.abs(logoRatio - areaRatio) / areaRatio < 0.1) {
    return { placement, area_width: pw, area_height: ph, width: pw, height: ph, top: 0, left: 0 };
  }
  let w = Math.round(pw * 0.5);
  let h = Math.round(w / logoRatio);
  if (h > ph * 0.8) {
    h = Math.round(ph * 0.8);
    w = Math.round(h * logoRatio);
  }
  return {
    placement,
    area_width: pw,
    area_height: ph,
    width: w,
    height: h,
    top: Math.round((ph - h) / 2),
    left: Math.round((pw - w) / 2),
  };
}

/** Run a mockup task, poll for result, return image URLs. */
export async function runTask(client, productId, variantId, style, files) {
  const taskFiles = files.map((f) => {
    const entry = { placement: f.placement, image_url: f.image_url };
    if (f.position?.area_width) entry.position = f.position;
    return entry;
  });
  const task = await client.call('POST', `/mockup-generator/create-task/${productId}`, {
    variant_ids: [variantId],
    ...style,
    format: 'png',
    files: taskFiles,
  });
  await sleep(6000);
  let result = await client.call('GET', `/mockup-generator/task?task_key=${task.task_key}`);
  if (result.status === 'pending') {
    await sleep(6000);
    result = await client.call('GET', `/mockup-generator/task?task_key=${task.task_key}`);
  }
  if (result.status !== 'completed') return [];
  return (result.mockups || [])
    .filter((m) => m.mockup_url)
    .map((m) => ({ url: m.mockup_url, label: 'main' }));
}
