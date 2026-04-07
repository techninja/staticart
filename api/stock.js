/**
 * GET /api/stock/:sku — real-time stock count from DynamoDB.
 * @module api/stock
 */

import { getStock } from './lib/dynamo.js';
import { ok, badRequest, serverError } from './lib/response.js';

/**
 * @param {{ pathParameters: { sku: string } }} event
 */
export async function handler(event) {
  try {
    const sku = event.pathParameters?.sku;
    if (!sku) return badRequest('Missing SKU');
    const stock = await getStock(sku);
    return ok({ sku, stock });
  } catch (e) {
    console.error('Stock check error:', e);
    return serverError('Stock check failed');
  }
}
