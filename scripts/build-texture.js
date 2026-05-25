#!/usr/bin/env node
/**
 * Generate all-over texture SVGs + PNGs from pattern definitions.
 *
 * npm run texture            — interactive picker
 * npm run texture mandala    — build one pattern
 * npm run texture all        — build all (dependency-ordered)
 * npm run texture all --png  — build all + render PNGs via Inkscape
 *
 * Patterns live in src/assets/prints/patterns/*.json
 * Output: src/assets/prints/textures/ (SVG) + src/assets/prints/renders/ (PNG)
 * @module scripts/build-texture
 */

import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { listPatterns, resolvePatternPath, buildOrder } from './lib/texture-patterns.js';
import { generateFromDef, logAndRender } from './lib/texture-svg.js';
import './lib/texture-grid.js';

const ROOT = process.cwd();
mkdirSync(resolve(ROOT, 'src/assets/prints/textures'), { recursive: true });
mkdirSync(resolve(ROOT, 'src/assets/prints/renders'), { recursive: true });

const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(`--${name}`);

function ask(prompt) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(prompt, (a) => { rl.close(); res(a.trim()); }));
}

async function main() {
  const cmd = args.find((a) => !a.startsWith('--'));
  const png = hasFlag('png');

  if (cmd === 'all') {
    const names = buildOrder(listPatterns());
    if (!names.length) { console.log('No patterns found in src/assets/prints/patterns/'); return; }
    console.log(`Building ${names.length} pattern(s)...\n`);
    for (const name of names) logAndRender(generateFromDef(resolvePatternPath(name)), png);
    return;
  }

  if (cmd) {
    logAndRender(generateFromDef(resolvePatternPath(cmd)), png);
    if (hasFlag('watch')) {
      const { watch } = await import('node:fs');
      console.log(`⏳ Watching ${cmd} — Ctrl+C to stop`);
      let timer;
      watch(resolvePatternPath(cmd), () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          try { logAndRender(generateFromDef(resolvePatternPath(cmd)), png); }
          catch (e) { console.error(`✗ ${e.message}`); }
        }, 100);
      });
    }
    return;
  }

  const patterns = listPatterns();
  if (!patterns.length) { console.log('No patterns in src/assets/prints/patterns/'); return; }
  console.log('\nAvailable patterns:\n');
  patterns.forEach((p, i) => console.log(`  ${i + 1}) ${p}`));
  console.log(`  a) Build all\n  q) Quit\n`);
  const choice = await ask('? ');
  if (choice === 'q') return;
  if (choice === 'a') {
    for (const name of buildOrder(patterns)) logAndRender(generateFromDef(resolvePatternPath(name)), png);
    return;
  }
  const idx = parseInt(choice) - 1;
  if (idx >= 0 && idx < patterns.length) logAndRender(generateFromDef(resolvePatternPath(patterns[idx])), png);
}

main().catch((e) => { console.error(e); process.exit(1); });
