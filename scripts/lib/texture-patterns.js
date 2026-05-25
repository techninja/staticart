/**
 * Pattern file utilities — load, list, resolve, dependency-order.
 * @module scripts/lib/texture-patterns
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';

const ROOT = process.cwd();
const PATTERNS_DIR = resolve(ROOT, 'src/assets/prints/patterns');

/**
 *
 */
export function loadIcon(iconPath) {
  const raw = readFileSync(resolve(ROOT, iconPath), 'utf-8');
  const m = raw.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  return m ? m[1].trim() : '';
}

/**
 *
 */
export function listPatterns() {
  if (!existsSync(PATTERNS_DIR)) return [];
  return readdirSync(PATTERNS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''));
}

/**
 *
 */
export function resolvePatternPath(name) {
  const p = resolve(PATTERNS_DIR, `${name}.json`);
  if (!existsSync(p)) throw new Error(`Pattern not found: ${p}`);
  return p;
}

/**
 *
 */
export function buildOrder(names) {
  const deps = new Map();
  for (const name of names) {
    const def = JSON.parse(readFileSync(resolvePatternPath(name), 'utf-8'));
    const d = (def.layers || [])
      .filter((l) => l.type === 'pattern')
      .map((l) => basename(l.src).replace('.json', ''));
    deps.set(name, d);
  }
  const ordered = [],
    visited = new Set();
  /**
   *
   */
  function visit(n) {
    if (visited.has(n)) return;
    visited.add(n);
    for (const d of deps.get(n) || []) if (deps.has(d)) visit(d);
    ordered.push(n);
  }
  for (const n of names) visit(n);
  return ordered;
}
