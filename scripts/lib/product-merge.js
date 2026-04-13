/**
 * Product merge — consolidates same-catalogId products into one
 * with structured color + size variant dimensions.
 * @module scripts/lib/product-merge
 */

/**
 * Merge products that share a printfulCategoryId into one with color+size variants.
 * Products with unique catalogIds pass through unchanged.
 * @param {any[]} products
 * @returns {any[]}
 */
export function mergeByBaseName(products) {
  const groups = new Map();
  for (const p of products) {
    const catId = p.metadata?.printfulCategoryId || p.sku;
    if (!groups.has(catId)) groups.set(catId, []);
    groups.get(catId).push(p);
  }
  const merged = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      assignDimensions(group[0]);
      merged.push(group[0]);
      continue;
    }
    merged.push(mergeGroup(group));
  }
  return merged;
}

/** Assign color/size fields to variants of a single (non-merged) product. */
function assignDimensions(product) {
  for (const v of product.variants) {
    const parts = v.label.split('/').map((s) => s.trim());
    if (parts.length >= 2) {
      v.color = parts[0] || '';
      v.size = parts[1] || '';
    } else if (parts.length === 1) {
      v.size = parts[0] || '';
    }
  }
}

/** Merge a group of same-catalogId products into one. */
function mergeGroup(group) {
  const base = { ...group[0] };
  // Strip color suffix: "Logo Tee — Black" → "Logo Tee"
  base.name = base.name.replace(/\s*[—–-]\s*[^—–-]+$/, '') || base.name;
  base.sku = `pf-${base.metadata.printfulCategoryId}`;
  base.description = base.name;
  const allImages = new Set();
  const allVariants = [];
  for (const p of group) {
    p.images.forEach((img) => allImages.add(img));
    for (const v of p.variants) {
      const parts = v.label.split('/').map((s) => s.trim());
      v.color = parts[0] || '';
      v.size = parts[1] || '';
      v.label = parts.filter(Boolean).join(' / ') || v.label;
      if (v.image) allImages.add(v.image);
      allVariants.push(v);
    }
  }
  base.images = [...allImages];
  base.variants = allVariants;
  base.metadata.mergedFrom = group.map((p) => p.metadata.printfulSyncProductId);
  return base;
}
