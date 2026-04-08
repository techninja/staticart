/**
 * POST /api/checkout — validate stock, create Stripe Checkout Session.
 * Reads shipping + tax config from staticart.config.json.
 * @module api/checkout
 */

import { getStock } from './lib/dynamo.js';
import { createCheckoutSession } from './lib/stripe.js';
import { getConfig } from './lib/config.js';
import { ok, badRequest, conflict, serverError } from './lib/response.js';

/** @param {any[]} items */
async function validateStock(items) {
  const unavailable = [];
  for (const item of items) {
    try {
      const stock = await getStock(item.sku);
      if (stock < item.quantity) {
        unavailable.push({ sku: item.sku, requested: item.quantity, available: stock });
      }
    } catch {
      console.warn(`Stock check skipped for ${item.sku} (DynamoDB unavailable)`);
    }
  }
  return unavailable;
}

/** @param {{ body: string, headers: Record<string, string> }} event */
export async function handler(event) {
  try {
    const { items, successUrl, cancelUrl } = JSON.parse(event.body || '{}');
    if (!Array.isArray(items) || items.length === 0) return badRequest('Cart is empty');
    if (!successUrl || !cancelUrl) return badRequest('Missing redirect URLs');

    const unavailable = await validateStock(items);
    if (unavailable.length > 0) {
      return conflict({ error: 'Insufficient stock', unavailable });
    }

    const cfg = getConfig();
    const url = await createCheckoutSession({
      items: items.map((i) => ({
        name: i.name,
        price: i.price,
        currency: i.currency || cfg.store?.currency || 'usd',
        quantity: i.quantity,
      })),
      successUrl,
      cancelUrl,
      shipping: cfg.shipping,
      automaticTax: cfg.tax?.automatic,
      locale: cfg.store?.locale,
    });

    return ok({ url });
  } catch (e) {
    console.error('Checkout error:', e);
    return serverError(e.message || 'Checkout failed');
  }
}
