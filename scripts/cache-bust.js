#!/usr/bin/env node
/**
 * Cache bust — stamps a version hash on CSS/JS references in index.html.
 * Run after deploy or release to break CDN/browser caches.
 *
 * Usage: node scripts/cache-bust.js [--hash <custom>]
 * Without --hash, uses a short timestamp-based hash.
 * @module scripts/cache-bust
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** Generate a short hash from current timestamp + random bytes. */
function generateHash() {
  const input = Date.now().toString() + Math.random().toString();
  return createHash('md5').update(input).digest('hex').slice(0, 8);
}

const customHash = process.argv.includes('--hash')
  ? process.argv[process.argv.indexOf('--hash') + 1]
  : null;
const hash = customHash || generateHash();

const indexPath = resolve(ROOT, 'src/index.html');
let html = readFileSync(indexPath, 'utf-8');

// Strip existing ?v= params
html = html.replace(/(\.(css|js))\?v=[a-f0-9]+/g, '$1');

// Add ?v=hash to .css and .js references (href and src attributes)
html = html.replace(/(href|src)="([^"]+\.(css|js))"/g, `$1="$2?v=${hash}"`);

writeFileSync(indexPath, html);
console.log(`✓ Cache bust: ?v=${hash} on ${indexPath}`);
