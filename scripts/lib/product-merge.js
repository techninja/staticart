/**
 * Product enrichment — adds out-of-stock variants from the Printful catalog.
 * Merge logic removed: the unified catalog defines product groupings directly.
 * @module scripts/lib/product-merge
 */

/**
 * Enrich products with out-of-stock variants from the Printful catalog.
 * Uses the unified catalog format to determine wanted colors per catalogId.
 * @param {any[]} products
 * @param {Map<number, any[]>} catalogVariants - catalogId → catalog variant list
 * @param {{ skuPrefix: string, products: any[] }} catalog - unified catalog
 */
export function enrichOutOfStock(products, catalogVariants, catalog) {
  const wantedColors = new Map();
  for (const entry of catalog.products) {
    for (const pf of entry.printful) {
      if (!wantedColors.has(pf.catalogId)) wantedColors.set(pf.catalogId, new Set());
      if (pf.colors) pf.colors.forEach((c) => wantedColors.get(pf.catalogId).add(c));
    }
  }
  for (const p of products) {
    const existing = new Set(p.variants.map((v) => `${v.color}|${v.size}`));
    // Collect catalogIds from this product's sync products
    const catIds = new Set();
    for (const entry of catalog.products) {
      const fullSku = `${catalog.skuPrefix}-${entry.sku}`;
      if (fullSku === p.sku) {
        for (const pf of entry.printful) catIds.add(pf.catalogId);
      }
    }
    for (const catId of catIds) {
      const catVars = catalogVariants.get(catId);
      const wanted = wantedColors.get(catId);
      if (!catVars || !wanted) continue;
      for (const cv of catVars) {
        if (!wanted.has(cv.color)) continue;
        const key = `${cv.color}|${cv.size}`;
        if (existing.has(key)) continue;
        if (cv.in_stock) continue;
        p.variants.push({
          id: `oos-${cv.id}`,
          label: [cv.color, cv.size].filter(Boolean).join(' / ') || cv.name,
          sku: `${p.sku}-oos-${cv.id}`,
          price: 0,
          stock: 0,
          color: cv.color || '',
          size: cv.size || '',
          image: '',
        });
      }
    }
  }
}
