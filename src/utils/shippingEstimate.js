/**
 * Client-side shipping estimate — mirrors api/lib/shipping logic.
 * Reads config from storeConfig, calculates from cart items + region.
 * @module utils/shippingEstimate
 */

import { getStoreConfigSync } from '#utils/storeConfig.js';
import { formatPrice } from '#utils/formatPrice.js';

const REGION_LABELS = { us: 'USA', can: 'Canada', intl: 'Intl' };
const CLASS_LABELS = { book: 'Book', tube: 'Tube' };

/** @param {any} obj @param {string} path @returns {any} */
function getField(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

/**
 * @typedef {Object} ShippingResult
 * @property {number} amount — total in cents
 * @property {string} summary — human-readable one-liner
 */

/**
 * Estimate shipping with explanation.
 * @param {Array<{price: number, quantity: number, metadata?: any}>} items
 * @param {string} region
 * @returns {ShippingResult}
 */
export function estimateShipping(items, region) {
  const shipping = getStoreConfigSync()?.shipping || {};
  if (shipping.type === 'flat') {
    const amt = shipping.amount || 0;
    return { amount: amt, summary: amt > 0 ? `Flat rate: ${formatPrice(amt)}` : 'Free' };
  }
  if (shipping.type !== 'tiered') return { amount: 0, summary: 'Free' };

  const classes = shipping.classes || {};
  const field = shipping.classField || 'metadata.productType';
  const regions = shipping.regions || {};
  const regionKey = regions[region] || regions['*'] || shipping.defaultRegion || 'us';
  const regionLabel = REGION_LABELS[regionKey] || regionKey;

  const subtotals = {};
  for (const cls of Object.keys(classes)) subtotals[cls] = 0;
  for (const item of items) {
    const val = getField(item, field);
    let matched = false;
    for (const [cls, def] of Object.entries(classes)) {
      if (/** @type {any} */ (def).match?.includes(val)) {
        subtotals[cls] += item.price * item.quantity;
        matched = true;
        break;
      }
    }
    if (!matched && shipping.defaultClass)
      subtotals[shipping.defaultClass] += item.price * item.quantity;
  }

  let total = 0;
  const parts = [];
  for (const [cls, sub] of Object.entries(subtotals)) {
    if (sub === 0) continue;
    const tiers = shipping.tiers?.[cls] || [];
    for (let i = 0; i < tiers.length; i++) {
      const tier = tiers[i];
      const matched = tier.upTo ? sub < tier.upTo : true;
      if (!matched) continue;
      const rate = tier.rates?.[regionKey] || 0;
      total += rate;
      const clsLabel = CLASS_LABELS[cls] || cls;
      const tierLabel = tier.upTo
        ? `under ${formatPrice(tier.upTo)}`
        : `${formatPrice(tiers[i - 1]?.upTo || 0)}+`;
      parts.push(
        `${clsLabel} (${tierLabel}), ${regionLabel}: ${rate > 0 ? formatPrice(rate) : 'Free'}`,
      );
      break;
    }
  }
  return { amount: total, summary: parts.join(' + ') || 'Free' };
}
