/**
 * Admin provider inspect + status routes (uses cached client).
 * @module admin/api/provider-detail
 */

import { Router } from 'express';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getProvider, getStoreProducts, getCategories } from './provider-cache.js';

const router = Router();
const ROOT = process.cwd();

async function buildPlacements(client, productId, productFiles) {
  const fileMap = new Map(productFiles.filter((f) => f.type !== 'mockup').map((f) => [f.id, f]));
  let tplDims = new Map();
  try {
    const tpl = await client.call('GET', `/mockup-generator/templates/${productId}`);
    const tplById = new Map(tpl.templates.map((t) => [t.template_id, t]));
    const vm = tpl.variant_mapping?.[0];
    if (vm) {
      for (const mt of vm.templates) {
        const t = tplById.get(mt.template_id);
        if (t) tplDims.set(mt.placement, { w: t.print_area_width, h: t.print_area_height });
      }
    }
  } catch { /* templates not available for all products */ }
  const placements = [];
  for (const [id, f] of fileMap) {
    const dims = tplDims.get(id) || tplDims.get(f.type);
    const orient = dims ? (dims.w > dims.h ? 'landscape' : dims.w < dims.h ? 'portrait' : 'square') : null;
    placements.push({
      id, title: f.title, type: f.type, additionalPrice: f.additional_price || null,
      width: dims?.w || null, height: dims?.h || null, orientation: orient,
      ratio: dims ? +(dims.w / dims.h).toFixed(2) : null,
    });
  }
  return placements;
}

router.get('/provider/browse/:id', async (req, res) => {
  try {
    const { helpers, client } = await getProvider();
    const info = await helpers.inspectProduct(client, parseInt(req.params.id));
    const prod = await client.call('GET', `/products/${req.params.id}`);
    const placements = await buildPlacements(client, req.params.id, prod.product.files || []);
    const techniques = (prod.product.techniques || []).map((t) => t.display_name || t.key || t);
    const variants = prod.variants || [];
    const prices = variants.map((v) => parseFloat(v.price)).filter((p) => p > 0);
    const pricing = prices.length ? {
      minCost: Math.min(...prices), maxCost: Math.max(...prices),
      suggestedRetail: +(Math.max(...prices) * 1.4).toFixed(2),
    } : null;
    const { byId } = await getCategories();
    const cat = byId.get(prod.product.main_category_id);
    const parentCat = cat?.parent_id ? byId.get(cat.parent_id) : null;
    const inferredCategory = cat?.title || '';
    const inferredTags = [prod.product.type, parentCat?.title, cat?.title]
      .filter(Boolean).map((t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    res.json({
      ...info, placements, techniques, description: prod.product.description,
      pricing, inferredCategory, inferredTags: [...new Set(inferredTags)],
    });
  } catch (e) {
    console.error('Inspect error:', e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/provider/status', async (_req, res) => {
  try {
    const remote = await getStoreProducts();
    const localPath = resolve(ROOT, 'src/data/products.json');
    const local = existsSync(localPath) ? JSON.parse(readFileSync(localPath, 'utf-8')) : [];
    res.json({ remote: remote.length, local: local.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
