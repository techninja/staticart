#!/usr/bin/env node

/**
 * Extracts SVG path data from lucide-static for icons used in the app.
 * Merges platform icon requirements from vendor manifests automatically.
 * Generates src/icons.json — loaded by app-icon at runtime.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ICONS_DIR = resolve(ROOT, 'node_modules/lucide-static/icons');
const OUT = resolve(ROOT, 'src/icons.json');
const VENDOR_DIR = resolve(ROOT, 'src/vendor');

/** Project-specific icons — lucide name → app name */
const PROJECT_ICONS = {};

/** Merge all platform icon manifests from vendor directories */
function loadPlatformIcons() {
  const merged = {};
  if (!existsSync(VENDOR_DIR)) return merged;
  for (const platform of readdirSync(VENDOR_DIR)) {
    const manifest = resolve(VENDOR_DIR, platform, 'icons.json');
    if (existsSync(manifest)) {
      Object.assign(merged, JSON.parse(readFileSync(manifest, 'utf-8')));
    }
  }
  return merged;
}

/** @param {string} file @returns {string} */
function extractInner(file) {
  const svg = readFileSync(file, 'utf-8');
  const inner = svg.match(/<(path|line|circle|rect|polyline|ellipse)\s[^>]*\/>/g);
  return inner ? inner.join('') : '';
}

const ICON_MAP = { ...loadPlatformIcons(), ...PROJECT_ICONS };

mkdirSync(dirname(OUT), { recursive: true });

/** @type {Record<string, string>} */
const icons = {};
let count = 0;

for (const [lucideName, appName] of Object.entries(ICON_MAP)) {
  const file = resolve(ICONS_DIR, `${lucideName}.svg`);
  if (!existsSync(file)) {
    console.warn(`⚠ Icon not found: ${lucideName}`);
    continue;
  }
  icons[appName] = extractInner(file);
  count++;
}

writeFileSync(OUT, JSON.stringify(icons, null, 2));
console.log(`✓ Built ${count} icons → src/icons.json`);
