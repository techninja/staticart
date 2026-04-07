import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatPrice } from '../src/utils/formatPrice.js';

describe('formatPrice', () => {
  it('formats cents to USD string', () => {
    assert.equal(formatPrice(2499), '$24.99');
  });

  it('formats zero', () => {
    assert.equal(formatPrice(0), '$0.00');
  });

  it('formats large amounts', () => {
    assert.equal(formatPrice(999999), '$9,999.99');
  });

  it('respects currency parameter', () => {
    const result = formatPrice(1500, 'EUR');
    assert.ok(result.includes('15'));
  });
});
