/**
 * GET /api/orders — order history lookup, secured by JWT.
 * @module api/orders
 */

import { ok, unauthorized, serverError } from './lib/response.js';
import { queryByEmail } from './lib/dynamo.js';
import { verifyToken } from './lib/auth.js';

/**
 * @param {{ headers: Record<string, string>, queryStringParameters: Record<string, string> }} event
 */
export async function handler(event) {
  try {
    const auth = event.headers?.authorization || event.headers?.Authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return unauthorized('Missing token');

    const claims = verifyToken(token);
    if (!claims?.sub) return unauthorized('Invalid or expired token');

    const email = claims.sub;
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
