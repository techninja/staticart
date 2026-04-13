/**
 * Fulfillment provider loader — config-driven auto-discovery.
 * Loads `api/lib/providers/{name}.js` based on config.fulfillment.provider.
 * @module api/lib/providers/index
 */

import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';

const PROVIDERS_DIR = dirname(fileURLToPath(import.meta.url));

/** @type {Map<string, any>} */
const _cache = new Map();

/**
 * Load a fulfillment provider by name from config.
 * @param {any} config - full staticart.config.json
 * @returns {Promise<any|null>} provider module or null
 */
export async function loadProvider(config) {
  const name = config?.fulfillment?.provider;
  if (!name) return null;
  if (_cache.has(name)) return _cache.get(name);

  const providerPath = resolve(PROVIDERS_DIR, `${name}.js`);
  if (!existsSync(providerPath)) {
    console.warn(`Fulfillment provider "${name}" not found at ${providerPath}`);
    return null;
  }
  const mod = await import(pathToFileURL(providerPath).href);
  const provider = mod.default || mod;
  _cache.set(name, provider);
  return provider;
}

/**
 * Calculate shipping via the fulfillment provider.
 * Used when config.shipping.type === "provider".
 * @param {any} ctx - { items, country, config }
 * @returns {Promise<number>} amount in cents
 */
export async function providerRate(ctx) {
  const provider = await loadProvider(ctx.config);
  if (!provider?.calculateShipping) {
    console.warn('No provider calculateShipping — returning 0');
    return 0;
  }
  return provider.calculateShipping(ctx);
}
