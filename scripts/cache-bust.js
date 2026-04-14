#!/usr/bin/env node
/**
 * Cache bust — stamps a version hash on all asset references in index.html.
 * Covers CSS/JS in link/script tags, import map entries, and JSON data paths.
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

// Strip existing ?v= params everywhere
html = html.replace(/(\.(css|js|json))\?v=[a-f0-9]+/g, '$1');

// HTML attributes: href="...css/js" and src="...css/js"
html = html.replace(/(href|src)="([^"]+\.(css|js))"/g, `$1="$2?v=${hash}"`);

// Import map: "key": "/path/to/file.js"
html = html.replace(/":\s*"(\/[^"]+\.js)"/g, `": "$1?v=${hash}"`);

writeFileSync(indexPath, html);
console.log(`✓ Cache bust: ?v=${hash} on ${indexPath}`);
