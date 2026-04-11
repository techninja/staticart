/**
 * Shipping calculator — resolves shipping cost from config + cart data.
 *
 * Supports:
 * - "flat" — single fixed amount
 * - "tiered" — rate tiers by cart subtotal, with optional product classes
 * - "custom" — loads a project-provided module for bespoke logic
 *
 * @module api/lib/shipping/index
 */

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const ROOT = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));

/**
 * @typedef {Object} ShippingContext
 * @property {any[]} items - cart items with { sku, name, price, quantity, metadata }
 * @property {string} [country] - ISO country code from shipping address
 * @property {any} config - full staticart.config.json
 */

/**
 * Calculate shipping cost.
 * @param {ShippingContext} ctx
 * @returns {Promise<number>} amount in cents
 */
export async function calculateShipping(ctx) {
  const shipping = ctx.config.shipping || {};
  switch (shipping.type) {
    case 'flat': return shipping.amount || 0;
    case 'tiered': return tieredRate(shipping, ctx);
    case 'custom': return customRate(ctx);
    default: return 0;
  }
}

/**
 * Tiered shipping — rate based on cart subtotal per product class.
 * Config shape:
 * {
 *   "type": "tiered",
 *   "classes": { "book": { "match": [...] }, "tube": { "match": [...] } },
 *   "classField": "metadata.productType",
 *   "regions": { "US": "us", "CA": "can", "*": "intl" },
 *   "defaultRegion": "us",
 *   "tiers": {
 *     "book": [
 *       { "upTo": 7000, "rates": { "us": 870, "can": 3450, "intl": 3800 } },
 *       { "upTo": 11000, "rates": { "us": 1650, ... } },
 *       { "rates": { "us": 2450, ... } }
 *     ]
 *   }
 * }
 * @param {any} shipping
 * @param {ShippingContext} ctx
 * @returns {number}
 */
function tieredRate(shipping, ctx) {
  const classes = shipping.classes || {};
  const field = shipping.classField || 'metadata.productType';
  const regions = shipping.regions || { US: 'us', CA: 'can', '*': 'intl' };
  const region = regions[ctx.country] || regions['*'] || shipping.defaultRegion || 'us';

  const subtotals = {};
  for (const cls of Object.keys(classes)) subtotals[cls] = 0;

  for (const item of ctx.items) {
    const val = getNestedField(item, field);
    let matched = false;
    for (const [cls, def] of Object.entries(classes)) {
      if (/** @type {any} */ (def).match?.includes(val)) {
        subtotals[cls] += item.price * item.quantity;
        matched = true;
        break;
      }
    }
    if (!matched && shipping.defaultClass) {
      subtotals[shipping.defaultClass] += item.price * item.quantity;
    }
  }

  let total = 0;
  for (const [cls, subtotal] of Object.entries(subtotals)) {
    if (subtotal === 0) continue;
    const tiers = shipping.tiers?.[cls] || [];
    for (const tier of tiers) {
      if (tier.upTo && subtotal < tier.upTo) {
        total += tier.rates?.[region] || 0;
        break;
      }
      if (!tier.upTo) {
        total += tier.rates?.[region] || 0;
      }
    }
  }
  return total;
}

/**
 * Custom shipping — loads project module at api/lib/shipping-custom.js.
 * Module must export: calculateShipping(ctx) => Promise<number>
 * @param {ShippingContext} ctx
 * @returns {Promise<number>}
 */
async function customRate(ctx) {
  const customPath = resolve(ROOT, 'api/lib/shipping-custom.js');
  if (!existsSync(customPath)) {
    console.warn('Custom shipping configured but api/lib/shipping-custom.js not found');
    return 0;
  }
  const mod = await import(customPath);
  return mod.calculateShipping(ctx);
}

/**
 * Resolve a dotted field path on an object.
 * @param {any} obj
 * @param {string} path
 * @returns {any}
 */
function getNestedField(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}
