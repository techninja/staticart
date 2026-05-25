/**
 * Admin mockups API — enqueue tasks with validation, per-variant generation.
 * @module admin/api/mockups
 */

import { Router } from 'express';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { getProvider } from './provider-cache.js';
import { enqueueMockup, getAllTaskStatus, getQueueLength } from './mockup-queue.js';
import { loadCatalogEntry, loadStore, configHash, cleanStale } from './mockup-files.js';

const router = Router();
const ROOT = process.cwd();

const pfCache = new Map();
/**
 *
 */
async function getPrintfiles(catalogId) {
  if (pfCache.has(catalogId)) return pfCache.get(catalogId);
  const { client } = await getProvider();
  const pf = await client.call('GET', `/mockup-generator/printfiles/${catalogId}`);
  pfCache.set(catalogId, pf);
  return pf;
}

router.get('/mockups/status', (_req, res) => {
  res.json({ tasks: getAllTaskStatus(), queueLength: getQueueLength() });
});

router.post('/mockups/enqueue', async (req, res) => {
  const { sku, storeProductId, configName, style, variantId, catalogId } = req.body;
  if (!sku || !storeProductId || !style) return res.status(400).json({ error: 'Missing fields' });
  if (!catalogId) return res.status(400).json({ error: 'catalogId required' });

  // Validate option_groups + options against Printful printfiles
  try {
    const pf = await getPrintfiles(catalogId);
    const validGroups = pf.option_groups || [];
    const validOptions = pf.options || [];
    for (const g of (style.option_groups || [])) {
      if (g && !validGroups.includes(g)) {
        return res.status(400).json({ error: `Invalid option_group: "${g}"` });
      }
    }
    for (const o of (style.options || [])) {
      if (o && !validOptions.includes(o)) {
        return res.status(400).json({ error: `Invalid option: "${o}"` });
      }
    }
  } catch (e) {
    return res.status(500).json({ error: `Validation failed: ${e.message}` });
  }

  // Multi-color: enqueue one task per color variant from store
  const store = loadStore();
  const cfg = JSON.parse(readFileSync(resolve(ROOT, 'staticart.config.json'), 'utf-8'));
  const prefix = store.skuPrefix || cfg.store?.skuPrefix || 'SM';
  const fullSku = `${prefix}-${sku}`;
  const colorMap = store.products?.[fullSku] || {};
  const colorEntries = Object.entries(colorMap);

  if (colorEntries.length > 1 && !variantId) {
    // Enqueue one per color
    for (const [color, spId] of colorEntries) {
      enqueueMockup({ sku, storeProductId: spId, configName, style, catalogId, color });
    }
    res.json({ queued: true, count: colorEntries.length, queueLength: getQueueLength() });
  } else {
    enqueueMockup({ sku, storeProductId: parseInt(storeProductId), configName, style, variantId, catalogId });
    res.json({ queued: true, queueLength: getQueueLength() });
  }
});

router.get('/mockups/images/:storeProductId', (req, res) => {
  const dir = resolve(ROOT, 'src/assets/products', req.params.storeProductId);
  if (!existsSync(dir)) return res.json([]);
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.png') || f.endsWith('.jpg'))
    .map((f) => ({ f, mtime: statSync(resolve(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
    .map(({ f }) => `/assets/products/${req.params.storeProductId}/${f}`);
  res.json(files);
});

router.post('/mockups/clean/:sku', (req, res) => {
  try {
    const catEntry = loadCatalogEntry(req.params.sku);
    const store = loadStore();
    if (!catEntry) return res.status(404).json({ error: 'Not found' });
    const styles = catEntry.mockupStyles || [];
    const prefix = store.skuPrefix || 'SM';
    const fullSku = `${prefix}-${req.params.sku}`;
    const colorMap = store.products?.[fullSku] || {};
    const validHashes = [];
    for (const pf of (catEntry.printful || [])) {
      for (const style of styles) {
        validHashes.push(configHash(pf, { option_groups: style.option_groups, options: style.options }));
      }
    }
    for (const spId of Object.values(colorMap)) {
      const dir = resolve(ROOT, 'src/assets/products', String(spId));
      cleanStale(dir, validHashes);
    }
    res.json({ cleaned: true, validHashes });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/mockups/:catalogId', async (req, res) => {
  try {
    const id = parseInt(req.params.catalogId);
    if (!id || isNaN(id)) return res.status(400).json({ error: 'Invalid catalog ID' });
    const { client } = await getProvider();
    const [pf, tpl] = await Promise.all([
      client.call('GET', `/mockup-generator/printfiles/${id}`),
      client.call('GET', `/mockup-generator/templates/${id}`),
    ]);
    const tplById = new Map(tpl.templates.map((t) => [t.template_id, t]));
    const vm = tpl.variant_mapping?.[0];
    const placements = {};
    if (vm) {
      for (const mt of vm.templates) {
        const t = tplById.get(mt.template_id);
        if (t) placements[mt.placement] = {
          templateId: mt.template_id, width: t.template_width, height: t.template_height,
          printWidth: t.print_area_width, printHeight: t.print_area_height,
          printTop: t.print_area_top, printLeft: t.print_area_left,
          image: t.image_url || null, background: t.background_url || null,
        };
      }
    }
    res.json({
      catalogId: id,
      optionGroups: (pf.option_groups || []).map((g) => ({ name: g })),
      options: pf.options || [],
      placements,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
