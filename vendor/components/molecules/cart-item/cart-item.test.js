import { fixture, expect } from '@open-wc/testing';
import '../cart-item/cart-item.js';

const tick = () => new Promise((r) => setTimeout(r, 100));

describe('cart-item', () => {
  beforeEach(() => {
    localStorage.removeItem('staticart-cart');
  });

  it('renders item name and line total', async () => {
    const el = await fixture(
      `<cart-item name="Test Tee" price="2499" quantity="2" currency="USD"></cart-item>`,
    );
    await tick();
    const name = el.querySelector('.cart-item__name');
    const total = el.querySelector('.cart-item__total');
    expect(name.textContent).to.contain('Test Tee');
    expect(total.textContent).to.contain('$49.98');
  });

  it('renders variant label when provided', async () => {
    const el = await fixture(`<cart-item name="Tee"></cart-item>`);
    el.variantLabel = 'Large';
    await tick();
    const variant = el.querySelector('.cart-item__variant');
    expect(variant).to.exist;
    expect(variant.textContent).to.contain('Large');
  });

  it('displays quantity between stepper buttons', async () => {
    const el = await fixture(`<cart-item name="Tee" quantity="3"></cart-item>`);
    await tick();
    await tick();
    const spans = el.querySelectorAll('.cart-item__qty span');
    const qtyText = Array.from(spans)
      .map((s) => s.textContent.trim())
      .find((t) => t === '3');
    expect(qtyText).to.equal('3');
  });

  it('renders thumbnail image', async () => {
    const el = await fixture(
      `<cart-item name="Tee" image="https://picsum.photos/seed/test/64/64"></cart-item>`,
    );
    await tick();
    const img = el.querySelector('.cart-item__thumb');
    expect(img).to.exist;
    expect(img.getAttribute('src')).to.contain('picsum');
  });
});
