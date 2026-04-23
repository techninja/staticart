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
    const catProdId = p.metadata?.printfulCatalogProductId || p.sku;
    if (!groups.has(catProdId)) groups.set(catProdId, []);
    groups.get(catProdId).push(p);
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
  base.name = base.name.replace(/\s*[—–-]\s*[^—–-]+$/, '') || base.name;
  base.sku = `pf-${base.metadata.printfulCatalogProductId}`;
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

/**
 * Enrich merged products with out-of-stock variants from the Printful catalog.
 * Only adds variants for colors listed in the project's catalog file.
 * @param {any[]} products
 * @param {Map<number, any[]>} catalogVariants - catalogId → catalog variant list
 * @param {any[]} projectCatalog - entries from printful-catalog.json
 */
export function enrichOutOfStock(products, catalogVariants, projectCatalog) {
  const wantedColors = new Map();
  for (const entry of projectCatalog) {
    if (!wantedColors.has(entry.catalogId)) wantedColors.set(entry.catalogId, new Set());
    if (entry.colors) entry.colors.forEach((c) => wantedColors.get(entry.catalogId).add(c));
  }
  for (const p of products) {
    const catId = p.metadata?.printfulCatalogProductId;
    const catVars = catalogVariants.get(catId);
    const wanted = wantedColors.get(catId);
    if (!catVars || !wanted) continue;
    const existing = new Set(p.variants.map((v) => `${v.color}|${v.size}`));
    for (const cv of catVars) {
      if (!wanted.has(cv.color)) continue;
      const key = `${cv.color}|${cv.size}`;
      if (existing.has(key)) continue;
      if (cv.in_stock) continue;
      p.variants.push({
        id: `oos-${cv.id}`,
        label: [cv.color, cv.size].filter(Boolean).join(' / ') || cv.name,
        sku: `pf-oos-${cv.id}`,
        price: 0,
        stock: 0,
        color: cv.color || '',
        size: cv.size || '',
        image: '',
      });
    }
  }
}
