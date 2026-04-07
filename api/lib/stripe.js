/**
 * Stripe helpers — checkout session creation and webhook verification.
 * @module api/lib/stripe
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

/**
 * Create a Stripe Checkout Session from cart items.
 * @param {Array<{name: string, price: number, currency: string, quantity: number}>} items
 * @param {string} successUrl
 * @param {string} cancelUrl
 * @returns {Promise<string>} session URL
 */
export async function createCheckoutSession(items, successUrl, cancelUrl) {
  const session = await stripe.checkout.sessions.create({
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
  return stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET || '');
}

export { stripe };
