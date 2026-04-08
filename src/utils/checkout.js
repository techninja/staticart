/**
 * Checkout client — sends cart to /api/checkout, handles stock conflicts.
 * @module utils/checkout
 */

const API_BASE = '/api';

/**
 * @param {Array<{sku: string, name: string, price: number, currency: string, quantity: number}>} items
 * @returns {Promise<{url?: string, error?: string, unavailable?: any[]}>}
 */
export async function requestCheckout(items) {
  const origin = window.location.origin;
  const res = await fetch(`${API_BASE}/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items,
      successUrl: `${origin}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/order/cancelled`,
    }),
  });
  const body = await res.json();
  if (res.ok) return { url: body.url };
  if (res.status === 409) return { error: 'Insufficient stock', unavailable: body.unavailable };
  return { error: body.error || 'Checkout failed' };
}
