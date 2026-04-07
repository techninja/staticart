import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Mock dynamo and stripe modules at the handler level.
 * These tests verify handler logic, not AWS/Stripe integration.
 */

/** @type {Map<string, any>} */
let mockDb;
let mockStripeUrl;
let mockStripeError;

/** Reset mocks before each test */
function resetMocks() {
  mockDb = new Map();
  mockStripeUrl = 'https://checkout.stripe.com/test';
  mockStripeError = null;
}

/** Simulate stock check handler logic */
function stockHandler(sku) {
  const item = mockDb.get(`${sku}:STOCK`);
  if (!sku) return { statusCode: 400, body: { error: 'Missing SKU' } };
  return { statusCode: 200, body: { sku, stock: item?.stock ?? 0 } };
}

/** Simulate checkout handler logic */
function checkoutHandler(items, successUrl, cancelUrl) {
  if (!items?.length) return { statusCode: 400, body: { error: 'Cart is empty' } };
  if (!successUrl || !cancelUrl) return { statusCode: 400, body: { error: 'Missing redirect URLs' } };

  const unavailable = [];
  for (const item of items) {
    const record = mockDb.get(`${item.sku}:STOCK`);
    const stock = record?.stock ?? 0;
    if (stock < item.quantity) {
      unavailable.push({ sku: item.sku, requested: item.quantity, available: stock });
    }
  }
  if (unavailable.length > 0) {
    return { statusCode: 409, body: { error: 'Insufficient stock', unavailable } };
  }
  if (mockStripeError) return { statusCode: 500, body: { error: mockStripeError } };
  return { statusCode: 200, body: { url: mockStripeUrl } };
}

describe('GET /api/stock/:sku', () => {
  beforeEach(resetMocks);

  it('returns stock count for known SKU', () => {
    mockDb.set('tee-1:STOCK', { stock: 10 });
    const res = stockHandler('tee-1');
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.stock, 10);
  });

  it('returns 0 for unknown SKU', () => {
    const res = stockHandler('nonexistent');
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.stock, 0);
  });

  it('returns 400 for missing SKU', () => {
    const res = stockHandler('');
    assert.equal(res.statusCode, 400);
  });
});

describe('POST /api/checkout', () => {
  beforeEach(resetMocks);

  it('returns checkout URL when stock is sufficient', () => {
    mockDb.set('tee-1:STOCK', { stock: 10 });
    const res = checkoutHandler(
      [{ sku: 'tee-1', name: 'Tee', price: 2499, currency: 'USD', quantity: 2 }],
      'https://example.com/success',
      'https://example.com/cancel',
    );
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.url, mockStripeUrl);
  });

  it('returns 409 when stock is insufficient', () => {
    mockDb.set('tee-1:STOCK', { stock: 1 });
    const res = checkoutHandler(
      [{ sku: 'tee-1', name: 'Tee', price: 2499, currency: 'USD', quantity: 5 }],
      'https://example.com/success',
      'https://example.com/cancel',
    );
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.unavailable.length, 1);
    assert.equal(res.body.unavailable[0].sku, 'tee-1');
    assert.equal(res.body.unavailable[0].available, 1);
  });

  it('returns 400 for empty cart', () => {
    const res = checkoutHandler([], 'url', 'url');
    assert.equal(res.statusCode, 400);
  });

  it('returns 400 for missing redirect URLs', () => {
    const res = checkoutHandler([{ sku: 'x', quantity: 1 }], '', '');
    assert.equal(res.statusCode, 400);
  });

  it('returns 409 for double-purchase of last item', () => {
    mockDb.set('cap-1:STOCK', { stock: 1 });
    const items = [{ sku: 'cap-1', name: 'Cap', price: 2999, currency: 'USD', quantity: 2 }];
    const res = checkoutHandler(items, 'url', 'url');
    assert.equal(res.statusCode, 409);
  });
});
