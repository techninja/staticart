import { fixture, expect } from '@open-wc/testing';
import { store } from 'hybrids';
import CartState from '#store/CartState.js';
import '#atoms/cart-count/cart-count.js';

describe('cart-count', () => {
  beforeEach(() => {
    localStorage.removeItem('staticart-cart');
    store.clear(CartState, false);
  });

  it('renders a count badge', async () => {
    const el = await fixture(`<cart-count></cart-count>`);
    await new Promise((r) => requestAnimationFrame(r));
    const span = el.querySelector('.cart-count');
    expect(span).to.exist;
  });

  it('shows 0 when cart is empty', async () => {
    const el = await fixture(`<cart-count></cart-count>`);
    await new Promise((r) => requestAnimationFrame(r));
    const span = el.querySelector('.cart-count');
    expect(span.textContent.trim()).to.equal('0');
  });

  it('reflects stored cart item count', async () => {
    localStorage.setItem(
      'staticart-cart',
      JSON.stringify({ items: [{ sku: 'test', variantId: '', quantity: 3, addedAt: '' }] }),
    );
    store.clear(CartState, false);
    const el = await fixture(`<cart-count></cart-count>`);
    await new Promise((r) => setTimeout(r, 100));
    const span = el.querySelector('.cart-count');
    expect(span.textContent.trim()).to.equal('3');
  });
});
