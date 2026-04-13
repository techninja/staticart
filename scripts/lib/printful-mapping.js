/**
 * Printful → StatiCart product mapping.
 * Resolves categories from Printful's category tree, builds tags,
 * and maps sync products to the StatiCart product shape.
 * @module scripts/lib/printful-mapping
 */

/** @type {Map<number, { title: string, parentTitle: string }>|null} */
let _categoryCache = null;

/** Printful parent category → StatiCart category slug. */
const CATEGORY_MAP = {
  'All shirts': 'apparel',
  'All hoodies & sweatshirts': 'apparel',
  'All hats': 'accessories',
  Bags: 'accessories',
  'Drinkware & coasters': 'drinkware',
  Stationery: 'stickers',
  'Wall art': 'prints',
};

/** Printful category title → StatiCart tags. */
const TAG_MAP = {
  'T-shirts': ['tee', 'clothing'],
  Hoodies: ['hoodie', 'clothing'],
  Beanies: ['beanie', 'hat'],
  'Bucket hats': ['hat'],
  'Dad hats / baseball caps': ['hat'],
  'Tote bags': ['tote', 'bag'],
  Mugs: ['drinkware', 'mug'],
  Stickers: ['sticker'],
  Posters: ['print', 'wall-art'],
};

/** @param {any} client */
export async function loadCategories(client) {
  if (_categoryCache) return _categoryCache;
  const data = await client.call('GET', '/categories');
  const byId = new Map();
  for (const cat of data.categories) byId.set(cat.id, cat);
  _categoryCache = new Map();
  for (const [id, cat] of byId) {
    const parent = byId.get(cat.parent_id);
    _categoryCache.set(id, { title: cat.title, parentTitle: parent?.title || cat.title });
  }
  return _categoryCache;
}

/** @param {number} categoryId @param {Map<number, any>} categories */
export function resolveCategory(categoryId, categories) {
  const cat = categories.get(categoryId);
  if (!cat) return 'other';
  return CATEGORY_MAP[cat.parentTitle] || CATEGORY_MAP[cat.title] || 'other';
}

/** @param {number} categoryId @param {Map<number, any>} categories */
export function resolveTags(categoryId, categories) {
  const cat = categories.get(categoryId);
  if (!cat) return [];
  return TAG_MAP[cat.title] || TAG_MAP[cat.parentTitle] || [];
}

/**
 * Map a Printful sync product + variants to StatiCart product shape.
 * @param {any} syncProduct
 * @param {any[]} syncVariants
 * @param {{ categoryId?: number, categories?: Map<number, any> }} [ctx]
 */
export function toProduct(syncProduct, syncVariants, ctx) {
  const first = syncVariants[0];
  const categories = ctx?.categories;
  const categoryId = ctx?.categoryId || 0;

  // Collect unique product-level images from previews
  const seen = new Set();
  const images = syncVariants
    .flatMap((v) => v.files?.filter((f) => f.type === 'preview') || [])
    .filter((f) => f.preview_url && !seen.has(f.preview_url) && seen.add(f.preview_url))
    .map((f) => f.preview_url);

  // Build variant-specific image map
  const variants = syncVariants.map((v) => {
    const preview = v.files?.find((f) => f.type === 'preview')?.preview_url || '';
    return {
      id: String(v.id),
      label: v.name.replace(syncProduct.name, '').replace(/^[\s—-]+/, '') || 'Default',
      sku: v.external_id || `pf-v-${v.id}`,
      price: 0,
      stock: -1,
      image: preview,
    };
  });

  const category = categories ? resolveCategory(categoryId, categories) : 'other';
  const tags = categories ? resolveTags(categoryId, categories) : [];

  return {
    sku: syncProduct.external_id || `pf-${syncProduct.id}`,
    name: syncProduct.name,
    description: syncProduct.name,
    price: Math.round(parseFloat(first?.retail_price || '0') * 100),
    currency: first?.currency || 'USD',
    images: images.length ? images : [],
    category,
    tags,
    stock: -1,
    active: true,
    variants,
    metadata: { printfulSyncProductId: syncProduct.id, printfulCategoryId: categoryId },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
