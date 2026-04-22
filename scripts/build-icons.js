#!/usr/bin/env node

/**
 * Extracts SVG path data from lucide-static for icons used in the app.
 * Generates src/icons.json — loaded by app-icon at runtime.
 * Runs on `npm postinstall`.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ICONS_DIR = resolve(ROOT, 'node_modules/lucide-static/icons');
const OUT = resolve(ROOT, 'src/icons.json');

/** Icons used in the app — lucide name → app name */
const ICON_MAP = {
  plus: 'plus',
  minus: 'minus',
  check: 'check',
  'trash-2': 'trash',
  x: 'x',
  'chevron-right': 'chevron',
  'chevron-left': 'chevron-left',
  search: 'search',
  'shopping-cart': 'cart',
  package: 'package',
  tag: 'tag',
  heart: 'heart',
  star: 'star',
  filter: 'filter',
  'arrow-left': 'arrow-left',
  'arrow-right': 'arrow-right',
  sun: 'sun',
  moon: 'moon',
  user: 'user',
  'circle-check': 'circle-check',
  'circle-x': 'circle-x',
  'alert-triangle': 'alert-triangle',
  image: 'image',
  'log-out': 'log-out',
  'user-x': 'user-x',
  'user-key': 'user-key',
  'mail-check': 'mail-check',
  store: 'store',
  shirt: 'shirt',
  'wallet-cards': 'wallet-cards',
  'shopping-bag': 'shopping-bag',
  zap: 'zap',
  rocket: 'rocket',
  'code-2': 'code',
  terminal: 'terminal',
  layers: 'layers',
  server: 'server',
  database: 'database',
  'shield-check': 'shield-check',
  'git-branch': 'git-branch',
  sparkles: 'sparkles',
  'hand-heart': 'hand-heart',
  'party-popper': 'party-popper',
  gem: 'gem',
  infinity: 'infinity',
};

/**
 * Extract all <path>, <line>, <circle>, <rect>, <polyline> inner content from an SVG file.
 * @param {string} file
 * @returns {string} Combined SVG inner elements
 */
function extractInner(file) {
  const svg = readFileSync(file, 'utf-8');
  const inner = svg.match(/<(path|line|circle|rect|polyline|ellipse)\s[^>]*\/>/g);
  return inner ? inner.join('') : '';
}

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
