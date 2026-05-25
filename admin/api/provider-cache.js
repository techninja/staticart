/**
 * Provider cache — shared Printful client + cached catalog/categories.
 * Caches warm on first request, refresh in background after TTL.
 * @module admin/api/provider-cache
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const require = createRequire(import.meta.url);

function resolveLib(name) {
  try { return require.resolve(`@techninja/staticart/scripts/lib/${name}`); }
  catch { return resolve(ROOT, `scripts/lib/${name}`); }
}

/** @type {{ helpers: any, client: any, config: any } | null} */
let _provider = null;

export async function getProvider() {
  if (_provider) return _provider;
  const config = JSON.parse(readFileSync(resolve(ROOT, 'staticart.config.json'), 'utf-8'));
  const name = config.fulfillment?.provider;
  if (!name) throw new Error('No fulfillment.provider configured');
  const helpers = await import(resolveLib(`${name}.js`));
  const apiKey = process.env[`${name.toUpperCase()}_API_KEY`];
  if (!apiKey) throw new Error(`${name.toUpperCase()}_API_KEY not set`);
  _provider = { helpers, client: helpers.createClient(apiKey), config };
  return _provider;
}

const TTL = 5 * 60 * 1000;
const _cache = new Map();

async function cached(key, fetcher) {
  const entry = _cache.get(key);
  if (entry) {
    if (Date.now() - entry.ts > TTL) {
      fetcher().then((data) => _cache.set(key, { data, ts: Date.now() })).catch(() => {});
    }
    return entry.data;
  }
  const data = await fetcher();
  _cache.set(key, { data, ts: Date.now() });
  return data;
}

export async function getProducts() {
  const { client } = await getProvider();
  return cached('products', () => client.call('GET', '/products'));
}

export async function getCategories() {
  const { client } = await getProvider();
  return cached('categories', async () => {
    const data = await client.call('GET', '/categories');
    const byId = new Map(data.categories.map((c) => [c.id, c]));
    const tree = [];
    for (const c of data.categories) {
      if (!c.parent_id) tree.push({ id: c.id, title: c.title, children: [] });
    }
    for (const c of data.categories) {
      const parent = tree.find((t) => t.id === c.parent_id);
      if (parent) parent.children.push({ id: c.id, title: c.title });
    }
    return { tree, byId };
  });
}

export async function getStoreProducts() {
  const { client } = await getProvider();
  return cached('store-products', () => client.call('GET', '/store/products'));
}

/** Warm the cache on server start — non-blocking. */
export function warmCache() {
  getProducts().catch(() => {});
  getCategories().catch(() => {});
}
