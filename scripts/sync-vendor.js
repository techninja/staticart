#!/usr/bin/env node

/**
 * Syncs src/ → vendor/ for npm package distribution.
 * Copies components, store, utils, pages, router, styles, and locales.
 * Run before committing or publishing.
 * @module scripts/sync-vendor
 */

import { cpSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = resolve(ROOT, 'src');
const DEST = resolve(ROOT, 'vendor');

const DIRS = ['components', 'locales', 'pages', 'router', 'store', 'styles', 'utils'];
const ROOT_FILES = ['icons.json'];

// Preserve root-level vendor files before clean
const preserved = {};
for (const f of ROOT_FILES) {
  const p = resolve(DEST, f);
  if (existsSync(p)) preserved[f] = readFileSync(p, 'utf-8');
}

// Clean and rebuild
rmSync(DEST, { recursive: true, force: true });
mkdirSync(DEST, { recursive: true });

for (const dir of DIRS) {
  cpSync(resolve(SRC, dir), resolve(DEST, dir), { recursive: true });
  console.log(`✓ ${dir}/`);
}
for (const [f, content] of Object.entries(preserved)) {
  writeFileSync(resolve(DEST, f), content);
  console.log(`✓ ${f} (preserved)`);
}

console.log(`\nVendor synced from src/ → vendor/`);
