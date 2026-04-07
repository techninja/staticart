import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { effectivePrice, effectiveStock } from '../src/utils/productVariants.js';

const product = {
  price: 2499,
  stock: 10,
  variants: [
    { id: 'sm', price: 0, stock: 5 },
    { id: 'xl', price: 3499, stock: 2 },
  ],
};

describe('effectivePrice', () => {
  it('returns base price when no variant selected', () => {
    assert.equal(effectivePrice(product, ''), 2499);
  });

  it('returns base price when variant price is 0', () => {
    assert.equal(effectivePrice(product, 'sm'), 2499);
  });

  it('returns variant price when set', () => {
    assert.equal(effectivePrice(product, 'xl'), 3499);
  });
});

describe('effectiveStock', () => {
  it('returns base stock when no variant selected', () => {
    assert.equal(effectiveStock(product, ''), 10);
  });

  it('returns variant stock when selected', () => {
    assert.equal(effectiveStock(product, 'sm'), 5);
  });

  it('returns 0 for unknown variant', () => {
    assert.equal(effectiveStock(product, 'xxl'), 0);
  });
});
