#!/usr/bin/env node

/**
 * Override a platform component for project customization.
 * Copies the vendor source to src/components/ and patches the import map.
 *
 * Usage: node scripts/override.js molecules/product-card
 *        node scripts/override.js organisms/product-grid
 */

import { cpSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);

if (!args[0]) {
  console.error('Usage: node scripts/override.js <layer/component>');
  console.error('  e.g. node scripts/override.js molecules/product-card');
  process.exit(1);
}

const component = args[0].replace(/\/$/, '');
const parts = component.split('/');
if (parts.length !== 2) {
  console.error('Expected format: <layer>/<component>');
  process.exit(1);
}

const [layer, name] = parts;
const LAYERS = ['atoms', 'molecules', 'organisms', 'pages', 'store', 'utils'];
const layerPrefix = LAYERS.includes(layer) ? `#${layer}/` : null;

if (!layerPrefix) {
  console.error(`Unknown layer: ${layer}. Expected: ${LAYERS.join(', ')}`);
  process.exit(1);
}

const vendorSrc = resolve(ROOT, `src/vendor/staticart/components/${component}`);
const projectDest = resolve(ROOT, `src/components/${component}`);

if (!existsSync(vendorSrc)) {
  console.error(`Vendor component not found: ${vendorSrc}`);
  process.exit(1);
}

if (existsSync(projectDest)) {
  console.log(`⚠ Override already exists: src/components/${component}/`);
  console.log('  Edit the existing files or delete and re-run.');
  process.exit(0);
}

cpSync(vendorSrc, projectDest, {
  recursive: true,
  filter: (src) => !src.endsWith('.test.js'),
});
console.log(`✓ Copied to src/components/${component}/`);

const htmlPath = resolve(ROOT, 'src/index.html');
const html = readFileSync(htmlPath, 'utf-8');

const mapEntry = `"${layerPrefix}${name}/": "/components/${component}/"`;
const generalEntry = `"${layerPrefix}": "/vendor/staticart/components/${layer}/"`;

if (html.includes(mapEntry)) {
  console.log('✓ Import map already has override entry');
} else {
  const patched = html.replace(
    `"${layerPrefix}"`,
    `${mapEntry},\n          "${layerPrefix}"`,
  );
  writeFileSync(htmlPath, patched);
  console.log(`✓ Patched import map: ${mapEntry}`);
}

console.log(`\nOverride ready. Edit src/components/${component}/ freely.`);
console.log('This file is project-owned and will not be overwritten by updates.');
