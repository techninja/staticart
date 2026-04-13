/**
 * Printful fulfillment provider — shipping rates + order creation.
 * Requires PRINTFUL_API_KEY env var and printfulSyncProductId in product metadata.
 * @module api/lib/providers/printful
 */

import { getProducts } from '../config.js';

const API = 'https://api.printful.com';

/** @returns {{ Authorization: string, 'Content-Type': string }|null} */
function headers() {
  const key = process.env.PRINTFUL_API_KEY;
  if (!key) return null;
  return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

/** @param {any} session */
function extractRecipient(session) {
  const s = session.shipping_details || session.customer_details;
  return {
    name: s?.name || '',
    address1: s?.address?.line1 || '',
    address2: s?.address?.line2 || '',
    city: s?.address?.city || '',
    state_code: s?.address?.state || '',
    country_code: s?.address?.country || 'US',
    zip: s?.address?.postal_code || '',
  };
}

export default {
  name: 'printful',

  /** @param {{ items: any[], country?: string }} ctx */
  async calculateShipping(ctx) {
    const h = headers();
    if (!h) return 0;
    const printfulItems = ctx.items
      .filter((i) => i.metadata?.printfulProductId)
      .map((i) => ({
        variant_id: i.metadata.printfulVariantId || i.metadata.printfulProductId,
        quantity: i.quantity,
      }));
    if (!printfulItems.length) return 0;
    try {
      const res = await fetch(`${API}/shipping/rates`, {
        method: 'POST', headers: h,
        body: JSON.stringify({ recipient: { country_code: ctx.country || 'US' }, items: printfulItems }),
      });
      const data = await res.json();
      const rate = data.result?.find((r) => r.id === 'STANDARD') || data.result?.[0];
      return rate ? Math.round(parseFloat(rate.rate) * 100) : 0;
    } catch (e) {
      console.error('Printful shipping rate error:', e);
      return 499;
    }
  },

  /** @param {{ orderId: string, email: string, items: any[], session: any }} order */
  async fulfillOrder(order) {
    const h = headers();
    if (!h) return { success: false, error: 'PRINTFUL_API_KEY not set' };
    const products = getProducts();
    const recipient = { ...extractRecipient(order.session), email: order.email };

    const printfulItems = [];
    for (const item of order.items) {
      const product = products.find((p) => p.sku === item.sku);
      const syncId = product?.metadata?.printfulSyncProductId;
      if (!syncId) continue;
      try {
        const res = await fetch(`${API}/store/products/${syncId}`, { headers: h });
        const data = await res.json();
        const variant = data.result?.sync_variants?.[0];
        if (variant) printfulItems.push({ sync_variant_id: variant.id, quantity: item.quantity });
      } catch (e) {
        console.warn(`Printful variant lookup failed for ${item.sku}:`, e.message);
      }
    }
    if (!printfulItems.length) return { success: false, error: 'No Printful variants found' };

    try {
      const res = await fetch(`${API}/orders`, {
        method: 'POST', headers: h,
        body: JSON.stringify({
          external_id: order.orderId.slice(0, 32),
          recipient,
          items: printfulItems,
        }),
      });
      const data = await res.json();
      if (data.code === 200) return { success: true, providerId: String(data.result.id) };
      return { success: false, error: data.error?.message || 'Printful API error' };
    } catch (e) {
      console.error('Printful fulfillment error:', e);
      return { success: false, error: e.message };
    }
  },
};
