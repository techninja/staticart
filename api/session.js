/**
 * GET /api/session/:id — fetch customer details from a Stripe checkout session.
 * @module api/session
 */

import { ok, badRequest, serverError } from './lib/response.js';
import { getStripe } from './lib/stripe.js';

/**
 * @param {{ pathParameters: { id: string } }} event
 */
export async function handler(event) {
  try {
    const id = event.pathParameters?.id;
    if (!id) return badRequest('Missing session ID');
    const session = await getStripe().checkout.sessions.retrieve(id);
    return ok({
      email: session.customer_details?.email || session.customer_email || '',
      name: session.customer_details?.name || '',
    });
  } catch (e) {
    console.error('Session lookup error:', e);
    return serverError('Session lookup failed');
  }
}
