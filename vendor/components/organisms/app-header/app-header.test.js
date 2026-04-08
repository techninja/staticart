import { fixture, expect } from '@open-wc/testing';
import '../app-header/app-header.js';

describe('app-header', () => {
  it('renders the header with brand', async () => {
    const el = await fixture(`<app-header></app-header>`);
    await new Promise((r) => requestAnimationFrame(r));
    const brand = el.querySelector('.app-header__brand');
    expect(brand).to.exist;
  });

  it('contains a Shop nav link', async () => {
    const el = await fixture(`<app-header></app-header>`);
    await new Promise((r) => requestAnimationFrame(r));
    const link = el.querySelector('.app-header__link');
    expect(link).to.exist;
    expect(link.textContent).to.contain('Shop');
  });

  it('includes cart-count and theme-toggle', async () => {
    const el = await fixture(`<app-header></app-header>`);
    await new Promise((r) => requestAnimationFrame(r));
    expect(el.querySelector('cart-count')).to.exist;
    expect(el.querySelector('theme-toggle')).to.exist;
  });
});
