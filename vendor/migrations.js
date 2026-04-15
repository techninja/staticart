/**
 * StatiCart migrations — patches project files after vendor update.
 * @param {string} root — project root directory
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

/**
 *
 */
export function runMigrations(root) {
  migrateStylesheetAggregator(root);
}

/** Replace individual platform stylesheet links with single aggregator. */
function migrateStylesheetAggregator(root) {
  const htmlPath = `${root}/src/index.html`;
  if (!existsSync(htmlPath)) return;
  const h = readFileSync(htmlPath, 'utf-8');
  if (h.includes('staticart.css')) return;
  if (!h.includes('vendor/staticart/styles/')) return;

  const lines = h.split('\n');
  const result = [];
  let inserted = false;

  for (const line of lines) {
    if (line.includes('<link') && line.includes('vendor/staticart/styles/')) {
      if (!inserted) {
        const indent = line.match(/^(\s*)/)?.[1] || '    ';
        result.push(`${indent}<link rel="stylesheet" href="/vendor/staticart/styles/staticart.css" />`);
        inserted = true;
      }
    } else {
      result.push(line);
    }
  }

  if (!inserted) return;
  writeFileSync(htmlPath, result.join('\n'));
  console.log('✓ Migrated: stylesheet links → staticart.css aggregator');
}
