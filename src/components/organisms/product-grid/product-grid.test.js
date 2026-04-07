import { fixture, expect } from '@open-wc/testing';
import '../product-grid/product-grid.js';

const MOCK_PRODUCTS = [
  {
    sku: 'tee-1',
    name: 'Test Tee',
    price: 2499,
    currency: 'USD',
    images: ['https://placecats.com/300/300'],
    category: 'shirts',
    stock: 10,
    active: true,
    variants: [],
    metadata: {},
    createdAt: '',
    updatedAt: '',
  },
  {
    sku: 'mug-1',
    name: 'Test Mug',
    price: 1499,
    currency: 'USD',
    images: ['https://placecats.com/301/300'],
    category: 'accessories',
    stock: 5,
    active: true,
    variants: [],
    metadata: {},
    createdAt: '',
    updatedAt: '',
  },
];

/** Wait for store fetch + render */
const tick = () => new Promise((r) => setTimeout(r, 300));

describe('product-grid', () => {
  let originalFetch;

  before(() => {
    originalFetch = window.fetch;
    window.fetch = async (url) => {
      if (typeof url === 'string' && url.includes('products.json')) {
        return new Response(JSON.stringify(MOCK_PRODUCTS), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return originalFetch(url);
    };
  });

  after(() => {
    window.fetch = originalFetch;
  });

  it('renders product cards after loading', async () => {
    const el = await fixture(`<product-grid></product-grid>`);
    await tick();
    const cards = el.querySelectorAll('product-card');
    expect(cards.length).to.equal(2);
  });

  it('filters by category', async () => {
    const el = await fixture(`<product-grid category="shirts"></product-grid>`);
    await tick();
    const cards = el.querySelectorAll('product-card');
    expect(cards.length).to.equal(1);
    const name = cards[0].querySelector('.product-card__name');
    expect(name.textContent).to.contain('Test Tee');
  });
});
