import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for backported merch-staticart learnings.
 * Simulates handler logic for: stock:-1, email fallback, provider system,
 * auto-refund, and session enrichment.
 */

/** @type {Map<string, any>} */
let mockDb;
let mockConfig;
let mockProducts;
let mockProviderResult;
let mockRefunds;

function resetMocks() {
  mockDb = new Map();
  mockConfig = { store: {}, shipping: { type: 'flat', amount: 499 }, fulfillment: null };
  mockProducts = [];
  mockProviderResult = null;
  mockRefunds = [];
}

/** Simulate stock validation with stock:-1 skip */
function validateStock(items, productData) {
  const unavailable = [];
  for (const item of items) {
    const product = productData.find((p) => p.sku === item.sku);
    if (product?.stock < 0) continue;
    const record = mockDb.get(`${item.sku}:STOCK`);
    const stock = record?.stock ?? 0;
    if (stock >= 0 && stock < item.quantity) {
      unavailable.push({ sku: item.sku, requested: item.quantity, available: stock });
    }
  }
  return unavailable;
}

/** Simulate email extraction with fallback chain */
function extractEmail(session) {
  return session.customer_email || session.customer_details?.email || 'unknown';
}

/** Simulate provider loading from config */
function loadProvider(config) {
  if (!config?.fulfillment?.provider) return null;
  return { name: config.fulfillment.provider, fulfillOrder: () => mockProviderResult };
}

/** Simulate webhook handleCheckoutCompleted */
async function handleCheckoutCompleted(session) {
  const email = extractEmail(session);
  const metadata = session.metadata || {};
  const items = JSON.parse(metadata.items || '[]');

  mockDb.set(`ORDER#${session.id}:META`, { email, items, status: 'paid' });

  const provider = loadProvider(mockConfig);
  if (provider?.fulfillOrder) {
    const result = await provider.fulfillOrder({ orderId: session.id, email, items, session });
    mockDb.set(`ORDER#${session.id}:FULFILLMENT`, {
      provider: mockConfig.fulfillment.provider, ...result,
    });
    if (!result.success && mockConfig.fulfillment?.autoRefundOnFailure) {
      mockRefunds.push({ paymentIntent: session.payment_intent, reason: result.error });
      mockDb.set(`ORDER#${session.id}:META`, {
        email, items, status: 'refunded-fulfillment-failed',
      });
    }
  }
  return { statusCode: 200, body: { received: true } };
}

/** Simulate session endpoint with enrichment */
function sessionHandler(id) {
  if (!id) return { statusCode: 400, body: { error: 'Missing session ID' } };
  const order = mockDb.get(`ORDER#${id}:META`);
  const fulfillment = mockDb.get(`ORDER#${id}:FULFILLMENT`);
  return {
    statusCode: 200,
    body: {
      email: order?.email || '',
      orderStatus: order?.status || 'pending',
      fulfillment: fulfillment || null,
    },
  };
}

describe('stock: -1 (unlimited/dropship)', () => {
  beforeEach(resetMocks);

  it('skips stock validation for stock:-1 products', () => {
    mockProducts = [{ sku: 'pod-1', stock: -1 }];
    const result = validateStock([{ sku: 'pod-1', quantity: 100 }], mockProducts);
    assert.equal(result.length, 0);
  });

  it('still validates stock for finite-stock products', () => {
    mockProducts = [{ sku: 'tee-1', stock: 5 }];
    mockDb.set('tee-1:STOCK', { stock: 2 });
    const result = validateStock([{ sku: 'tee-1', quantity: 5 }], mockProducts);
    assert.equal(result.length, 1);
    assert.equal(result[0].available, 2);
  });

  it('handles mixed cart with unlimited and finite stock', () => {
    mockProducts = [{ sku: 'pod-1', stock: -1 }, { sku: 'tee-1', stock: 10 }];
    mockDb.set('tee-1:STOCK', { stock: 10 });
    const items = [{ sku: 'pod-1', quantity: 50 }, { sku: 'tee-1', quantity: 3 }];
    const result = validateStock(items, mockProducts);
    assert.equal(result.length, 0);
  });
});

describe('webhook email extraction', () => {
  beforeEach(resetMocks);

  it('uses customer_email when present', () => {
    assert.equal(extractEmail({ customer_email: 'a@b.com' }), 'a@b.com');
  });

  it('falls back to customer_details.email', () => {
    assert.equal(extractEmail({ customer_details: { email: 'c@d.com' } }), 'c@d.com');
  });

  it('returns unknown when no email available', () => {
    assert.equal(extractEmail({}), 'unknown');
  });

  it('prefers customer_email over customer_details', () => {
    const session = { customer_email: 'a@b.com', customer_details: { email: 'c@d.com' } };
    assert.equal(extractEmail(session), 'a@b.com');
  });
});

describe('fulfillment provider system', () => {
  beforeEach(resetMocks);

  it('returns null when no provider configured', () => {
    assert.equal(loadProvider({ fulfillment: null }), null);
    assert.equal(loadProvider({}), null);
  });

  it('loads provider when configured', () => {
    mockConfig.fulfillment = { provider: 'printful' };
    const provider = loadProvider(mockConfig);
    assert.equal(provider.name, 'printful');
  });

  it('calls fulfillOrder on successful payment', async () => {
    mockConfig.fulfillment = { provider: 'printful' };
    mockProviderResult = { success: true, providerId: 'PF-123' };
    const session = { id: 'cs_1', payment_intent: 'pi_1', metadata: { items: '[]' } };
    await handleCheckoutCompleted(session);
    const f = mockDb.get('ORDER#cs_1:FULFILLMENT');
    assert.equal(f.success, true);
    assert.equal(f.providerId, 'PF-123');
  });

  it('records fulfillment failure', async () => {
    mockConfig.fulfillment = { provider: 'printful' };
    mockProviderResult = { success: false, error: 'API down' };
    const session = { id: 'cs_2', payment_intent: 'pi_2', metadata: { items: '[]' } };
    await handleCheckoutCompleted(session);
    const f = mockDb.get('ORDER#cs_2:FULFILLMENT');
    assert.equal(f.success, false);
    assert.equal(f.error, 'API down');
  });
});

describe('auto-refund on fulfillment failure', () => {
  beforeEach(resetMocks);

  it('auto-refunds when configured and fulfillment fails', async () => {
    mockConfig.fulfillment = { provider: 'printful', autoRefundOnFailure: true };
    mockProviderResult = { success: false, error: 'No variants' };
    const session = { id: 'cs_3', payment_intent: 'pi_3', metadata: { items: '[]' } };
    await handleCheckoutCompleted(session);
    assert.equal(mockRefunds.length, 1);
    assert.equal(mockRefunds[0].paymentIntent, 'pi_3');
    const order = mockDb.get('ORDER#cs_3:META');
    assert.equal(order.status, 'refunded-fulfillment-failed');
  });

  it('does not refund when autoRefundOnFailure is false', async () => {
    mockConfig.fulfillment = { provider: 'printful', autoRefundOnFailure: false };
    mockProviderResult = { success: false, error: 'fail' };
    const session = { id: 'cs_4', payment_intent: 'pi_4', metadata: { items: '[]' } };
    await handleCheckoutCompleted(session);
    assert.equal(mockRefunds.length, 0);
    const order = mockDb.get('ORDER#cs_4:META');
    assert.equal(order.status, 'paid');
  });

  it('does not refund on successful fulfillment', async () => {
    mockConfig.fulfillment = { provider: 'printful', autoRefundOnFailure: true };
    mockProviderResult = { success: true, providerId: 'PF-5' };
    const session = { id: 'cs_5', payment_intent: 'pi_5', metadata: { items: '[]' } };
    await handleCheckoutCompleted(session);
    assert.equal(mockRefunds.length, 0);
    assert.equal(mockDb.get('ORDER#cs_5:META').status, 'paid');
  });
});

describe('session endpoint enrichment', () => {
  beforeEach(resetMocks);

  it('returns order status and fulfillment info', () => {
    mockDb.set('ORDER#cs_x:META', { email: 'a@b.com', status: 'paid' });
    mockDb.set('ORDER#cs_x:FULFILLMENT', { success: true, providerId: 'PF-1' });
    const res = sessionHandler('cs_x');
    assert.equal(res.body.orderStatus, 'paid');
    assert.equal(res.body.fulfillment.providerId, 'PF-1');
  });

  it('returns pending when no order exists', () => {
    const res = sessionHandler('cs_none');
    assert.equal(res.body.orderStatus, 'pending');
    assert.equal(res.body.fulfillment, null);
  });

  it('returns refund status after failed fulfillment', () => {
    mockDb.set('ORDER#cs_r:META', { email: 'a@b.com', status: 'refunded-fulfillment-failed' });
    mockDb.set('ORDER#cs_r:FULFILLMENT', { success: false, error: 'API down' });
    const res = sessionHandler('cs_r');
    assert.equal(res.body.orderStatus, 'refunded-fulfillment-failed');
    assert.equal(res.body.fulfillment.success, false);
  });
});
