/**
 * POST /api/webhook — Stripe webhook receiver.
 * Handles checkout.session.completed and charge.refunded.
 * @module api/webhook
 */

import { verifyWebhook, refundPayment } from './lib/stripe.js';
import { decrementStock, incrementStock, putItem, getItem } from './lib/dynamo.js';
import { ok, badRequest, serverError } from './lib/response.js';
import { getConfig } from './lib/config.js';
import { loadProvider } from './lib/providers/index.js';

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
  const email = session.customer_email || session.customer_details?.email || 'unknown';

  let stockChanged = false;
  for (const item of items) {
    const success = await decrementStock(item.sku, item.quantity);
    if (success) stockChanged = true;
  }

  await putItem({
    PK: `ORDER#${orderId}`,
    SK: 'META',
    email,
    items,
    totalCents: session.amount_total,
    currency: session.currency,
    stripePaymentId: session.payment_intent,
    status: 'paid',
    createdAt: new Date().toISOString(),
  });

  if (stockChanged) await triggerRebuild(process.env.BUILD_HOOK_URL);

  const config = getConfig();
  const provider = await loadProvider(config);
  if (provider?.fulfillOrder) {
    await handleFulfillment(provider, config, { orderId, email, items, session });
  }

  return ok({ received: true });
}

/** @param {any} provider @param {any} config @param {any} order */
async function handleFulfillment(provider, config, order) {
  const result = await provider.fulfillOrder(order);

  await putItem({
    PK: `ORDER#${order.orderId}`,
    SK: 'FULFILLMENT',
    provider: config.fulfillment.provider,
    success: result.success,
    providerId: result.providerId || null,
    error: result.error || null,
    createdAt: new Date().toISOString(),
  });

  if (!result.success && config.fulfillment?.autoRefundOnFailure) {
    console.error('Fulfillment failed, auto-refunding:', result.error);
    try {
      await refundPayment(order.session.payment_intent, result.error);
      await putItem({
        PK: `ORDER#${order.orderId}`, SK: 'META',
        email: order.email, items: order.items,
        totalCents: order.session.amount_total,
        currency: order.session.currency,
        stripePaymentId: order.session.payment_intent,
        status: 'refunded-fulfillment-failed',
        createdAt: new Date().toISOString(),
      });
    } catch (refundErr) {
      console.error('Auto-refund also failed:', refundErr);
    }
  }
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
