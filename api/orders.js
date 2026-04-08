/**
 * GET /api/orders?email=<hash> — order history lookup by email hash.
 * @module api/orders
 */

import { ok, badRequest, serverError } from './lib/response.js';
import { queryByEmail } from './lib/dynamo.js';

/**
 * @param {{ queryStringParameters: Record<string, string> }} event
 */
export async function handler(event) {
  try {
    const email = event.queryStringParameters?.email;
    if (!email) return badRequest('Missing email parameter');

    const orders = await queryByEmail(email);
    const summaries = orders.map((o) => ({
      orderId: o.PK.replace('ORDER#', ''),
      totalCents: o.totalCents,
      currency: o.currency,
      status: o.status,
      createdAt: o.createdAt,
      itemCount: (o.items || []).length,
    }));

    return ok({ orders: summaries });
  } catch (e) {
    console.error('Orders lookup error:', e);
    return serverError('Order lookup failed');
  }
}
