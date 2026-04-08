/**
 * Stripe helpers — checkout session creation and webhook verification.
 * Client is lazy-initialized so the module can be imported without keys.
 * @module api/lib/stripe
 */

import Stripe from 'stripe';

/** @type {Stripe|null} */
let _stripe = null;

/**
 *
 */
export function getStripe() {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
    _stripe = new Stripe(key);
  }
  return _stripe;
}

/**
 * Create a Stripe Checkout Session from cart items.
 * @param {Array<{name: string, price: number, currency: string, quantity: number}>} items
 * @param {string} successUrl
 * @param {string} cancelUrl
 * @returns {Promise<string>} session URL
 */
export async function createCheckoutSession(items, successUrl, cancelUrl) {
  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: items.map((item) => ({
      price_data: {
        currency: item.currency.toLowerCase(),
        unit_amount: item.price,
        product_data: { name: item.name },
      },
      quantity: item.quantity,
    })),
  });
  return session.url;
}

/**
 * Verify Stripe webhook signature and parse event.
 * @param {string|Buffer} body - Raw request body
 * @param {string} signature - Stripe-Signature header
 * @returns {Stripe.Event}
 */
export function verifyWebhook(body, signature) {
  return getStripe().webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET || '',
  );
}
