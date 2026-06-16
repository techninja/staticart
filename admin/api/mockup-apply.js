/**
 * Apply generated mockup images to products.json — hero + variant images.
 * Reads the hero-flagged mockupStyle, finds matching files on disk, updates product data.
 * @module admin/api/mockup-apply
 */

import { Router } from 'express';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadCatalogEntry, loadStore, configHash } from './mockup-files.js';
import { broadcast } from './admin-ws.js';

const router = Router();
const ROOT = process.cwd();
const PRODUCTS_PATH = resolve(ROOT, 'src/data/products.json');

/**
 *
 */
function readProducts() { return JSON.parse(readFileSync(PRODUCTS_PATH, 'utf-8')); }
/**
 *
 */
function writeProducts(data) { writeFileSync(PRODUCTS_PATH, JSON.stringify(data, null, 2) + '\n'); }

/**
 *
 */
function findImages(spId, hash) {
  const dir = resolve(ROOT, 'src/assets/products', String(spId));
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.includes(hash) && (f.endsWith('.png') || f.endsWith('.jpg')))
    .map((f) => `/assets/products/${spId}/${f}`);
}

router.post('/mockups/apply/:sku', (req, res) => {
  try {
    const catEntry = loadCatalogEntry(req.params.sku);
    if (!catEntry) return res.status(404).json({ error: 'Catalog entry not found' });
    const store = loadStore();
    const prefix = store.skuPrefix || 'SM';
    const fullSku = `${prefix}-${req.params.sku}`;
    const colorMap = store.products?.[fullSku] || {};
    const heroStyle = catEntry.mockupStyles?.find((s) => s.hero);
    if (!heroStyle) return res.status(400).json({ error: 'No hero style flagged' });

    const products = readProducts();
    const product = products.find((p) => p.sku === fullSku);
    if (!product) return res.status(404).json({ error: 'Product not found in products.json' });

    // Collect all mockup images per store product, hero-tagged ones first
    const allImages = [];
    for (const [label, spId] of Object.entries(colorMap)) {
      const pfEntry = catEntry.printful?.find((p) => p.label === label) || catEntry.printful?.[0];
      const heroHash = configHash(pfEntry, { option_groups: heroStyle.option_groups, options: heroStyle.options });
      const heroImgs = findImages(spId, heroHash);
      allImages.push(...heroImgs);
      // Also collect non-hero style images
      for (const style of (catEntry.mockupStyles || [])) {
        if (style.hero) continue;
        const h = configHash(pfEntry, { option_groups: style.option_groups, options: style.options });
        allImages.push(...findImages(spId, h));
      }
    }

    // Set product images (hero first, deduplicated)
    product.images = [...new Set(allImages)];
    if (allImages[0]) product.heroImage = allImages[0];

    // Update variant images — each variant gets ALL images from its store product
    for (const variant of (product.variants || [])) {
      const spId = variant.printfulSyncProductId;
      if (!spId) continue;
      const label = Object.entries(colorMap).find(([, id]) => id === spId)?.[0];
      const pfEntry = catEntry.printful?.find((p) => p.label === label) || catEntry.printful?.[0];
      const heroHash = configHash(pfEntry, { option_groups: heroStyle.option_groups, options: heroStyle.options });
      const heroImgs = findImages(spId, heroHash);
      const otherImgs = [];
      for (const style of (catEntry.mockupStyles || [])) {
        if (style.hero) continue;
        const h = configHash(pfEntry, { option_groups: style.option_groups, options: style.options });
        otherImgs.push(...findImages(spId, h));
      }
      const all = [...heroImgs, ...otherImgs];
      if (all.length) { variant.image = all[0]; variant.images = all; }
    }

    writeProducts(products);
    broadcast('product:updated', { sku: fullSku, hero: product.heroImage });
    res.json({ applied: true, imageCount: product.images.length, hero: product.heroImage });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
