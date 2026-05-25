/**
 * Admin product state API — drift detection.
 * @module admin/api/state
 */

import { Router } from 'express';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getProductStates } from './product-state.js';

const router = Router();
const ROOT = process.cwd();

function loadCatalogAndStore() {
  const cfg = JSON.parse(readFileSync(resolve(ROOT, 'staticart.config.json'), 'utf-8'));
  const provider = cfg.fulfillment?.provider || 'printful';
  const catPath = resolve(ROOT, `src/data/${provider}-catalog.json`);
  const storePath = resolve(ROOT, `${provider}-store.json`);
  const catalog = existsSync(catPath) ? JSON.parse(readFileSync(catPath, 'utf-8')) : { products: [] };
  const store = existsSync(storePath) ? JSON.parse(readFileSync(storePath, 'utf-8')) : { products: {} };
  return { catalog, store };
}

router.get('/state', (_req, res) => {
  try {
    const { catalog, store } = loadCatalogAndStore();
    const products = getProductStates(catalog, store);
    const dirty = products.filter((p) => p.syncDirty || p.mockupDirty).length;
    res.json({ products, dirty });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
