/**
 * Printful API client and variant helpers for product management scripts.
 * Product mapping lives in printful-mapping.js.
 * @module scripts/lib/printful
 */

export { toProduct, loadCategories } from './printful-mapping.js';
export { buildSyncVariants } from './printful-variants.js';
export { mergeByBaseName, enrichOutOfStock } from './product-merge.js';

const API = 'https://api.printful.com';
const MIN_INTERVAL = 6000;

/** @param {string} key */
export function createClient(key) {
  const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  let lastCall = 0;

  /** @param {string} method @param {string} path @param {any} [body] */
  async function call(method, path, body) {
    const now = Date.now();
    const wait = Math.max(0, MIN_INTERVAL - (now - lastCall));
    if (wait > 0) {
      process.stdout.write(` (${Math.ceil(wait / 1000)}s)`);
      await new Promise((r) => setTimeout(r, wait));
    }
    lastCall = Date.now();

    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(`${API}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (data.code === 429 || (data.error?.message || '').includes('too many requests')) {
        const retry = parseInt(res.headers.get('retry-after') || '60', 10);
        console.warn(`  ⏳ Rate limited, waiting ${retry}s...`);
        await new Promise((r) => setTimeout(r, retry * 1000));
        lastCall = Date.now();
        continue;
      }
      if (data.code !== 200) throw new Error(`${path}: ${data.error?.message}`);
      return data.result;
    }
    throw new Error(`${path}: rate limited after 3 retries`);
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

/** Search the Printful product catalog by keyword. */
export async function browseCatalog(client, query) {
  const all = await client.call('GET', '/products');
  const q = query.toLowerCase();
  return all.filter((p) => p.title.toLowerCase().includes(q));
}

/** Get detailed variant info for a catalog product. */
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

/** Pick best mockup styles for a catalog product. */
export async function pickMockupStyles(client, catalogProductId) {
  const pf = await client.call('GET', `/mockup-generator/printfiles/${catalogProductId}`);
  const groups = pf.option_groups || [];
  const opts = pf.options || [];
  const styles = [];
  const hasRight = opts.includes('Right');
  if (groups.includes('Ghost')) styles.push({ option_groups: ['Ghost'], options: ['Front'] });
  else if (groups.includes('Default')) {
    const vo = hasRight ? ['Right'] : opts.filter((o) => /front/i.test(o)).slice(0, 1);
    styles.push({ option_groups: ['Default'], ...(vo.length ? { options: vo } : {}) });
  } else if (groups.includes('Flat'))
    styles.push({ option_groups: ['Flat'], ...(hasRight ? { options: ['Right'] } : {}) });
  if (groups.includes("Men's")) styles.push({ option_groups: ["Men's"], options: ['Front'] });
  else if (groups.includes('Lifestyle'))
    styles.push({ option_groups: ['Lifestyle'], ...(hasRight ? { options: ['Right'] } : {}) });
  return styles;
}
