#!/usr/bin/env node

/**
 * Post-install setup — vendors dependencies and builds icon sprite.
 * @module scripts/setup
 */

import { copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

await import(resolve(ROOT, 'scripts/vendor-deps.js'));
await import(resolve(ROOT, 'scripts/vendor-platform.js'));
await import(resolve(ROOT, 'scripts/build-icons.js'));

// Copy store config into src/ for static deploys
const cfg = resolve(ROOT, 'staticart.config.json');
if (existsSync(cfg)) {
  copyFileSync(cfg, resolve(ROOT, 'src/staticart.config.json'));
  console.log('\u2713 Copied: staticart.config.json \u2192 src/');
}
