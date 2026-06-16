#!/usr/bin/env node

/**
 * Copies third-party ES module sources into src/vendor/ so the browser
 * can load them directly via import map. Runs on `npm run setup`.
 * Applies local patches after copy.
 */

import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const VENDOR_DIR = resolve(ROOT, 'src/vendor');

/** Walk up from ROOT to find a hoisted node_modules dep. */
function resolveDep(name, subpath) {
  let dir = ROOT;
  while (dir !== dirname(dir)) {
    const candidate = resolve(dir, 'node_modules', name, subpath);
    if (existsSync(candidate)) return candidate;
    dir = dirname(dir);
  }
  throw new Error(`Cannot find ${name}/${subpath} — is ${name} installed?`);
}

/** @type {{ name: string, subpath: string }[]} */
const DEPS = [{ name: 'hybrids', subpath: 'src' }];

mkdirSync(VENDOR_DIR, { recursive: true });

for (const dep of DEPS) {
  const src = resolveDep(dep.name, dep.subpath);
  const dest = resolve(VENDOR_DIR, dep.name);
  cpSync(src, dest, { recursive: true });
  console.log(`✓ Vendored: ${dep.name} → src/vendor/${dep.name}/`);
}

// Patch: fix router bootstrap URL rewrite (hybrids#router deep-link bug)
const routerPath = resolve(VENDOR_DIR, 'hybrids/router.js');
let routerSrc = readFileSync(routerPath, 'utf8');
const original = `    globalThis.history.replaceState([entry], "", options.url);`;
const patched = `    let nestedEntry = entry;
    while (nestedEntry.nested) nestedEntry = nestedEntry.nested;
    const entryConfig = getConfigById(nestedEntry.id);
    const bootstrapUrl = entryConfig && entryConfig.browserUrl
      ? entryConfig.url(nestedEntry.params, true)
      : options.url;

    globalThis.history.replaceState([entry], "", bootstrapUrl);`;

if (routerSrc.includes(original)) {
  routerSrc = routerSrc.replace(original, patched);
  writeFileSync(routerPath, routerSrc);
  console.log('✓ Patched: hybrids/router.js (bootstrap deep-link URL fix)');
} else if (!routerSrc.includes('bootstrapUrl')) {
  console.warn('⚠ Could not apply router patch — source changed upstream');
}
