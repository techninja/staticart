/**
 * Printful API client and variant helpers for product management scripts.
 * @module scripts/lib/printful
 */

export { loadCategories } from './printful-mapping.js';
export { buildSyncVariants } from './printful-variants.js';
export { enrichOutOfStock } from './product-merge.js';

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
      let res, data;
      try {
        res = await fetch(`${API}${path}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });
        data = await res.json();
      } catch (e) {
        const wait = 15 * (attempt + 1);
        console.warn(`  ⏳ ${e.cause?.code || 'Network error'}, retrying in ${wait}s...`);
        await new Promise((r) => setTimeout(r, wait * 1000));
        lastCall = Date.now();
        continue;
      }
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
    throw new Error(`${path}: failed after 3 retries`);
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
  const frontOpt = opts.find((o) => /^front$/i.test(o));
  const rightOpt = opts.find((o) => /^right$/i.test(o));
  // Product shot: Ghost > Default > Flat
  // Ghost products (apparel) use Front; non-Ghost (drinkware etc) use Right for side view
  if (groups.includes('Ghost')) styles.push({ option_groups: ['Ghost'], options: ['Front'] });
  else if (groups.includes('Default')) {
    const vo = rightOpt || frontOpt;
    styles.push({ option_groups: ['Default'], ...(vo ? { options: [vo] } : {}) });
  } else if (groups.includes('Flat')) {
    const vo = rightOpt || frontOpt;
    styles.push({ option_groups: ['Flat'], ...(vo ? { options: [vo] } : {}) });
  }
  // On-model/lifestyle shot: prefer Right for non-Ghost products, Front for apparel
  const onModel =
    groups.find((g) => /^(men's|women's)(\s+\d+)?$/i.test(g)) ||
    groups.find((g) => /^(men's|women's)\s+lifestyle/i.test(g)) ||
    groups.find((g) => /^lifestyle$/i.test(g)) ||
    groups.find((g) => /lifestyle|on model/i.test(g));
  if (onModel) {
    const hasGhost = groups.includes('Ghost');
    const lifeOpt = hasGhost ? frontOpt : rightOpt || frontOpt;
    styles.push({ option_groups: [onModel], ...(lifeOpt ? { options: [lifeOpt] } : {}) });
  }
  return styles;
}
