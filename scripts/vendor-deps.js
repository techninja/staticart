#!/usr/bin/env node

/**
 * Copies third-party ES module sources into src/vendor/ so the browser
 * can load them directly via import map. Runs on `npm postinstall`.
 */

import { cpSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const VENDOR_DIR = resolve(ROOT, 'src/vendor');
const require = createRequire(import.meta.url);

/** Resolve a package's source dir, handling npm hoisting. */
function findPkgSrc(pkg, subdir) {
  try {
    const entry = require.resolve(pkg);
    // Walk up from entry to find the package root (dir containing node_modules/<pkg>)
    const marker = `node_modules/${pkg}/`;
    const idx = entry.indexOf(marker);
    if (idx !== -1) return resolve(entry.slice(0, idx + marker.length), subdir);
  } catch {
    /* fall through */
  }
  return resolve(ROOT, 'node_modules', pkg, subdir);
}

/** @type {{ name: string, src: string, subdir: string }[]} */
const DEPS = [{ name: 'hybrids', src: 'hybrids', subdir: 'src' }];

mkdirSync(VENDOR_DIR, { recursive: true });

for (const dep of DEPS) {
  const src = findPkgSrc(dep.src, dep.subdir);
  const dest = resolve(VENDOR_DIR, dep.name);
  cpSync(src, dest, { recursive: true });
  console.log(`✓ Vendored: ${dep.name} → src/vendor/${dep.name}/`);
}
