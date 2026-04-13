/**
 * GET /api/session/:id — fetch customer details from a Stripe checkout session.
 * @module api/session
 */

import { ok, badRequest, serverError } from './lib/response.js';
import { getStripe } from './lib/stripe.js';
import { getItem } from './lib/dynamo.js';

/**
 * @param {{ pathParameters: { id: string } }} event
 */
export async function handler(event) {
  try {
    const id = event.pathParameters?.id;
    if (!id) return badRequest('Missing session ID');
    const session = await getStripe().checkout.sessions.retrieve(id);
    const order = await getItem(`ORDER#${id}`, 'META').catch(() => null);
    const fulfillment = await getItem(`ORDER#${id}`, 'FULFILLMENT').catch(() => null);
    return ok({
      email: session.customer_details?.email || session.customer_email || '',
      name: session.customer_details?.name || '',
      orderStatus: order?.status || 'pending',
      fulfillment: fulfillment
        ? { success: fulfillment.success, providerId: fulfillment.providerId, error: fulfillment.error }
        : null,
    });
  } catch (e) {
    console.error('Session lookup error:', e);
    return serverError('Session lookup failed');
  }
}
