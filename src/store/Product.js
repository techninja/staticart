/**
 * Product store model — reads from static JSON, supports list + filtering.
 * @module store/Product
 */

import { store } from 'hybrids';

/**
 * @typedef {Object} Variant
 * @property {string} id
 * @property {string} label
 * @property {string} sku
 * @property {number} price
 * @property {number} stock
 */

/**
 * @typedef {Object} Product
 * @property {string} sku
 * @property {string} name
 * @property {string} description
 * @property {number} price
 * @property {string} currency
 * @property {string[]} images
 * @property {string} category
 * @property {number} stock
 * @property {boolean} active
 * @property {any[]} variants
 * @property {Object} metadata
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/** @type {Product[]|null} */
let cache = null;

/** @returns {Promise<Product[]>} */
async function fetchProducts() {
  if (cache) return cache;
  const res = await fetch('/data/products.json');
  cache = await res.json();
  return cache;
}

/** @type {any} — hybrids Model with id:true; cast to bypass tsc limitations */
const Product = {
  id: true,
  sku: '',
  name: '',
  description: '',
  price: 0,
  currency: 'USD',
  images: [String],
  category: '',
  stock: 0,
  active: true,
  variants: [{ id: true, label: '', sku: '', price: 0, stock: 0 }],
  metadata: { key: '' },
  createdAt: '',
  updatedAt: '',
  [store.connect]: {
    get: async (sku) => {
      const products = await fetchProducts();
      return products.find((p) => p.sku === sku);
    },
    list: async (params) => {
      const products = await fetchProducts();
      const active = products.filter((p) => p.active);
      const category = /** @type {any} */ (params)?.category;
      if (category) return active.filter((p) => p.category === category);
      return active;
    },
  },
};

export default Product;
