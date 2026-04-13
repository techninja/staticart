/**
 * Printful API helpers for product management scripts.
 * @module scripts/lib/printful
 */

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

/** Map a Printful sync product + variants to StatiCart product shape. */
export function toProduct(syncProduct, syncVariants) {
  const first = syncVariants[0];
  const seen = new Set();
  const images = syncVariants
    .flatMap((v) => v.files?.filter((f) => f.type === 'preview') || [])
    .filter((f) => f.preview_url && !seen.has(f.preview_url) && seen.add(f.preview_url))
    .map((f) => f.preview_url);

  return {
    sku: syncProduct.external_id || `pf-${syncProduct.id}`,
    name: syncProduct.name,
    description: syncProduct.name,
    price: Math.round(parseFloat(first?.retail_price || '0') * 100),
    currency: first?.currency || 'USD',
    images: images.length ? images : [],
    category: guessCategory(syncProduct.name),
    tags: guessTags(syncProduct.name),
    stock: -1,
    active: true,
    variants: syncVariants.map((v) => ({
      id: String(v.id),
      label: v.name.replace(syncProduct.name, '').replace(/^[\s—-]+/, '') || 'Default',
      sku: v.external_id || `pf-v-${v.id}`,
      price: 0,
      stock: -1,
    })),
    metadata: { printfulSyncProductId: syncProduct.id },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
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
  const variants = data.variants || [];
  const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))];
  const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];
  const inStock = variants.filter((v) => v.in_stock).length;
  return { product: data.product, colors, sizes, inStock, total: variants.length };
}

/** @param {string} name */
function guessCategory(name) {
  const n = name.toLowerCase();
  if (n.includes('mug')) return 'drinkware';
  if (n.includes('sticker')) return 'stickers';
  if (n.includes('poster') || n.includes('print')) return 'prints';
  return 'apparel';
}

/** @param {string} name */
function guessTags(name) {
  const n = name.toLowerCase();
  const tags = [];
  if (n.includes('tee') || n.includes('hoodie')) tags.push('clothing');
  if (n.includes('tee')) tags.push('tee');
  if (n.includes('hoodie')) tags.push('hoodie');
  if (n.includes('mug')) tags.push('drinkware');
  if (n.includes('sticker')) tags.push('sticker');
  if (n.includes('hat') || n.includes('cap')) tags.push('hat');
  if (n.includes('poster')) tags.push('print');
  return tags;
}
