/**
 * Printful API client and variant helpers for product management scripts.
 * Product mapping lives in printful-mapping.js.
 * @module scripts/lib/printful
 */

export { toProduct, loadCategories } from './printful-mapping.js';
export { mergeByBaseName } from './product-merge.js';

const API = 'https://api.printful.com';

/** @param {string} key */
export function createClient(key) {
  const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

  /** @param {string} method @param {string} path @param {any} [body] */
  async function call(method, path, body) {
    const res = await fetch(`${API}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (data.code !== 200) throw new Error(`${path}: ${data.error?.message}`);
    return data.result;
  }

  return { call };
}

/** Filter catalog variants by color/size. */
export async function getVariants(client, productId, colors, sizes) {
  const data = await client.call('GET', `/products/${productId}`);
  return data.variants.filter(
    (v) =>
      (!colors || colors.includes(v.color)) && (!sizes || sizes.includes(v.size)) && v.in_stock,
  );
}

/** Build Printful sync_variants payload from catalog variants. */
export function buildSyncVariants(variants, product, logoFileId) {
  return variants.map((v) => {
    const sv = {
      variant_id: v.id,
      retail_price: product.retail.toFixed(2),
      files: [{ type: product.placement, id: logoFileId }],
    };
    if (product.threadColor) {
      const suffix = product.placement.replace('embroidery', '');
      sv.options = [`thread_colors${suffix}`, 'thread_colors'].map((id) => ({
        id,
        value: product.threadColor,
      }));
    }
    return sv;
  });
}

/**
 * Search the Printful product catalog by keyword.
 * @param {any} client
 * @param {string} query
 */
export async function browseCatalog(client, query) {
  const all = await client.call('GET', '/products');
  const q = query.toLowerCase();
  return all.filter((p) => p.title.toLowerCase().includes(q));
}

/**
 * Get detailed variant info for a catalog product.
 * @param {any} client
 * @param {number} productId
 */
export async function inspectProduct(client, productId) {
  const data = await client.call('GET', `/products/${productId}`);
  const p = data.product;
  const variants = data.variants || [];
  const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))];
  const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];
  const inStock = variants.filter((v) => v.in_stock).length;
  return {
    product: p,
    categoryId: p.main_category_id,
    brand: p.brand,
    colors,
    sizes,
    inStock,
    total: variants.length,
  };
}
