#!/usr/bin/env node
/**
 * Product manager — interactive menu for provider-based product management.
 * Discovers provider from staticart.config.json, delegates to provider helpers.
 *
 * Usage: node --env-file=.env --env-file=.env.local scripts/products.js
 * @module scripts/products
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import * as actions from './lib/product-actions.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const r = (/** @type {string} */ p) => resolve(ROOT, p);

/** @param {string} prompt @returns {Promise<string>} */
function ask(prompt) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) =>
    rl.question(prompt, (a) => {
      rl.close();
      res(a.trim());
    }),
  );
}

const MENU = [
  { key: '1', label: 'Sync from provider → products.json', action: 'sync' },
  { key: '2', label: 'Create from catalog → provider', action: 'create' },
  { key: '3', label: 'Delete orphans', action: 'deleteOrphans' },
  { key: '4', label: 'Status', action: 'status' },
  { key: 'q', label: 'Quit', action: 'quit' },
];

/**
 *
 */
async function main() {
  const config = JSON.parse(readFileSync(r('staticart.config.json'), 'utf-8'));
  const name = config.fulfillment?.provider;
  if (!name) {
    console.error('No fulfillment.provider in staticart.config.json');
    process.exit(1);
  }

  const helpersPath = r(`scripts/lib/${name}.js`);
  if (!existsSync(helpersPath)) {
    console.error(`Not found: scripts/lib/${name}.js`);
    process.exit(1);
  }
  const helpers = await import(helpersPath);

  const envKey = `${name.toUpperCase()}_API_KEY`;
  const apiKey = process.env[envKey];
  if (!apiKey) {
    console.error(`Set ${envKey} in .env.local`);
    process.exit(1);
  }

  console.log(`\nProduct Manager — ${name}\n`);
  for (const m of MENU) console.log(`  ${m.key}) ${m.label}`);
  const choice = await ask('\n? ');
  const selected = MENU.find((m) => m.key === choice);
  if (!selected || selected.action === 'quit') return;

  if (selected.action === 'create') await actions.create(helpers, apiKey, config);
  else await actions[selected.action](helpers, apiKey);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
