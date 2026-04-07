/**
 * POST /api/webhook — Stripe webhook receiver.
 * Handles checkout.session.completed and charge.refunded.
 * @module api/webhook
 */

import { verifyWebhook } from './lib/stripe.js';
import { decrementStock, incrementStock, putItem, getItem } from './lib/dynamo.js';
import { ok, badRequest, serverError } from './lib/response.js';

/** @param {string} buildHookUrl */
async function triggerRebuild(buildHookUrl) {
  if (!buildHookUrl) return;
  try {
    await fetch(buildHookUrl, { method: 'POST' });
  } catch (e) {
    console.error('Rebuild trigger failed:', e);
  }
}

/**
 * @param {{ body: string, headers: Record<string, string> }} event
 */
export async function handler(event) {
  try {
    const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
    if (!sig) return badRequest('Missing signature');

    const stripeEvent = verifyWebhook(event.body, sig);

    if (stripeEvent.type === 'checkout.session.completed') {
      return handleCheckoutCompleted(stripeEvent.data.object);
    }
    if (stripeEvent.type === 'charge.refunded') {
      return handleRefund(stripeEvent.data.object);
    }

    return ok({ received: true });
  } catch (e) {
    console.error('Webhook error:', e);
    return e.type === 'StripeSignatureVerificationError'
      ? badRequest('Invalid signature')
      : serverError('Webhook processing failed');
  }
}

/** @param {any} session */
async function handleCheckoutCompleted(session) {
  const orderId = session.id;
  const existing = await getItem(`ORDER#${orderId}`, 'META');
  if (existing) return ok({ received: true, duplicate: true });

  const metadata = session.metadata || {};
  const items = JSON.parse(metadata.items || '[]');

  let stockChanged = false;
  for (const item of items) {
    const success = await decrementStock(item.sku, item.quantity);
    if (success) stockChanged = true;
  }

  await putItem({
    PK: `ORDER#${orderId}`,
    SK: 'META',
    email: session.customer_email || '',
    items,
    totalCents: session.amount_total,
    currency: session.currency,
    stripePaymentId: session.payment_intent,
    status: 'paid',
    createdAt: new Date().toISOString(),
  });

  if (stockChanged) await triggerRebuild(process.env.BUILD_HOOK_URL);
  return ok({ received: true });
}

/** @param {any} charge */
async function handleRefund(charge) {
  const metadata = charge.metadata || {};
  const items = JSON.parse(metadata.items || '[]');
  for (const item of items) {
    await incrementStock(item.sku, item.quantity);
  }
  if (items.length > 0) await triggerRebuild(process.env.BUILD_HOOK_URL);
  return ok({ received: true, refunded: true });
}
