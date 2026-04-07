import { fixture, expect } from '@open-wc/testing';
import '../app-header/app-header.js';

describe('app-header', () => {
  it('renders the header with logo', async () => {
    const el = await fixture(`<app-header></app-header>`);
    await new Promise((r) => requestAnimationFrame(r));
    const logo = el.querySelector('.app-header__logo');
    expect(logo).to.exist;
    expect(logo.getAttribute('src')).to.equal('/assets/staticart_logo.svg');
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
