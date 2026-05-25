/**
 * Admin catalog API — read/write printful-catalog.json.
 * @module admin/api/catalog
 */

import { Router } from 'express';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const router = Router();
const ROOT = process.cwd();

function catalogPath() {
  const cfg = JSON.parse(readFileSync(resolve(ROOT, 'staticart.config.json'), 'utf-8'));
  const provider = cfg.fulfillment?.provider || 'printful';
  return resolve(ROOT, `src/data/${provider}-catalog.json`);
}

function readCatalog() {
  const p = catalogPath();
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf-8')) : { skuPrefix: 'SM', products: [] };
}

function writeCatalog(data) {
  writeFileSync(catalogPath(), JSON.stringify(data, null, 2) + '\n');
}

router.get('/catalog', (_req, res) => {
  try { res.json(readCatalog()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/catalog/:sku', (req, res) => {
  try {
    const cat = readCatalog();
    const entry = cat.products.find((p) => p.sku === req.params.sku);
    if (!entry) return res.status(404).json({ error: 'Not found' });
    res.json(entry);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/catalog', (req, res) => {
  try {
    const cat = readCatalog();
    const entry = req.body;
    if (!entry.sku) return res.status(400).json({ error: 'sku required' });
    if (cat.products.find((p) => p.sku === entry.sku)) {
      return res.status(409).json({ error: 'SKU already exists' });
    }
    cat.products.push(entry);
    writeCatalog(cat);
    res.status(201).json(entry);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/catalog/:sku', (req, res) => {
  try {
    const cat = readCatalog();
    const idx = cat.products.findIndex((p) => p.sku === req.params.sku);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    cat.products[idx] = { ...cat.products[idx], ...req.body };
    writeCatalog(cat);
    res.json(cat.products[idx]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/catalog/:sku', (req, res) => {
  try {
    const cat = readCatalog();
    const idx = cat.products.findIndex((p) => p.sku === req.params.sku);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    cat.products.splice(idx, 1);
    writeCatalog(cat);
    res.json({ deleted: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
