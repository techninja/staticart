import { fixture, expect } from '@open-wc/testing';
import '../product-card/product-card.js';

/** Wait for hybrids render cycle */
const tick = () => new Promise((r) => setTimeout(r, 100));

describe('product-card', () => {
  beforeEach(() => {
    localStorage.removeItem('staticart-cart');
  });

  it('renders product name and price', async () => {
    const el = await fixture(
      `<product-card name="Test Tee" price="2499" currency="USD" stock="10"></product-card>`,
    );
    await tick();
    const name = el.querySelector('.product-card__name');
    const price = el.querySelector('.product-card__price');
    expect(name.textContent).to.contain('Test Tee');
    expect(price.textContent).to.contain('$24.99');
  });

  it('shows In Stock badge when stock > 5', async () => {
    const el = await fixture(`<product-card name="A" stock="10"></product-card>`);
    await tick();
    const badge = el.querySelector('app-badge');
    expect(badge).to.exist;
    const span = badge.querySelector('.badge');
    expect(span.textContent).to.contain('In Stock');
    expect(span.classList.contains('badge-success')).to.be.true;
  });

  it('shows Low Stock badge when stock <= 5', async () => {
    const el = await fixture(`<product-card name="A" stock="3"></product-card>`);
    await tick();
    const badge = el.querySelector('app-badge');
    const span = badge.querySelector('.badge');
    expect(span.textContent).to.contain('Low Stock');
    expect(span.classList.contains('badge-warning')).to.be.true;
  });

  it('shows Out of Stock and disables button when stock is 0', async () => {
    const el = await fixture(`<product-card name="A" stock="0"></product-card>`);
    await tick();
    const badge = el.querySelector('app-badge');
    const span = badge.querySelector('.badge');
    const btn = el.querySelector('.product-card__add');
    expect(span.textContent).to.contain('Out of Stock');
    expect(btn.disabled).to.be.true;
  });
});
