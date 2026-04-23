#!/usr/bin/env node
/**
 * Product manager — interactive menu + CLI subcommands.
 * Discovers provider from staticart.config.json, delegates to provider helpers.
 * Lib scripts resolve from @techninja/staticart package, with local fallback.
 *
 * Interactive: node scripts/products.js
 * CLI:        node scripts/products.js sync|create|delete|browse|status [args]
 *   browse <query>       — search provider catalog by keyword
 *   browse <query> <id>  — search + inspect a specific product ID
 * @module scripts/products
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const r = (/** @type {string} */ p) => resolve(ROOT, p);
const require = createRequire(import.meta.url);

/** Resolve a script from the platform package, fall back to local. */
function resolveLib(name) {
  try {
    return require.resolve(`@techninja/staticart/scripts/lib/${name}`);
  } catch {
    return new URL(`./lib/${name}`, import.meta.url).pathname;
  }
}

const actions = await import(resolveLib('product-actions.js'));
const { mockups: mockupsAction } = await import(resolveLib('mockup-action.js'));
const { browse: browseAction } = await import(resolveLib('browse-action.js'));

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
  { key: '3', label: 'Generate mockup images', action: 'mockups' },
  { key: '4', label: 'Delete orphans', action: 'deleteOrphans' },
  { key: '5', label: 'Browse provider catalog', action: 'browse' },
  { key: '6', label: 'Status', action: 'status' },
  { key: 'q', label: 'Quit', action: 'quit' },
];

const CLI_MAP = {
  sync: 'sync',
  create: 'create',
  mockups: 'mockups',
  delete: 'deleteOrphans',
  browse: 'browse',
  status: 'status',
};

/** @param {any} helpers @param {string} apiKey @param {any} config */
async function run(helpers, apiKey, config) {
  const [cmd, ...args] = process.argv.slice(2);

  if (cmd && CLI_MAP[cmd]) {
    const action = CLI_MAP[cmd];
    if (action === 'create') return actions.create(helpers, apiKey, config);
    if (action === 'sync') return actions.sync(helpers, apiKey, config);
    if (action === 'mockups') {
      const filter = args.find((a) => !a.startsWith('--'));
      return mockupsAction(helpers, apiKey, {
        force: args.includes('--force'),
        fresh: args.includes('--fresh'),
        filter,
      });
    }
    if (action === 'browse') return browseAction(helpers, apiKey, args[0], args[1]);
    return actions[action](helpers, apiKey);
  }

  if (cmd) {
    console.error(`Unknown: ${cmd}. Use: sync|create|delete|browse|status`);
    return;
  }

  console.log('');
  for (const m of MENU) console.log(`  ${m.key}) ${m.label}`);
  const choice = await ask('\n? ');
  const selected = MENU.find((m) => m.key === choice);
  if (!selected || selected.action === 'quit') return;
  if (selected.action === 'create') return actions.create(helpers, apiKey, config);
  if (selected.action === 'sync') return actions.sync(helpers, apiKey, config);
  if (selected.action === 'mockups') return mockupsAction(helpers, apiKey);
  if (selected.action === 'browse') return browseAction(helpers, apiKey);
  return actions[selected.action](helpers, apiKey);
}

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
  const helpers = await import(resolveLib(`${name}.js`));
  const envKey = `${name.toUpperCase()}_API_KEY`;
  const apiKey = process.env[envKey];
  if (!apiKey) {
    console.error(`Set ${envKey} in .env.local`);
    process.exit(1);
  }
  console.log(`Product Manager — ${name}`);
  await run(helpers, apiKey, config);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
