/**
 * Printful API helpers — category loading.
 * Product mapping is now handled directly by product-actions.js
 * using the unified catalog format.
 * @module scripts/lib/printful-mapping
 */

/** @type {Map<number, { title: string, parentTitle: string }>|null} */
let _categoryCache = null;

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
