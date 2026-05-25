/**
 * Standalone products API — full CRUD on products.json for non-provider stores.
 * @module admin/api/standalone-products
 */

import { Router } from 'express';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const router = Router();
const ROOT = process.cwd();
const PRODUCTS_PATH = resolve(ROOT, 'src/data/products.json');

function readProducts() {
  if (!existsSync(PRODUCTS_PATH)) return [];
  return JSON.parse(readFileSync(PRODUCTS_PATH, 'utf-8'));
}

function writeProducts(data) {
  writeFileSync(PRODUCTS_PATH, JSON.stringify(data, null, 2) + '\n');
}

router.get('/standalone/products', (_req, res) => {
  try { res.json(readProducts()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/standalone/products/:sku', (req, res) => {
  const products = readProducts();
  const p = products.find((x) => x.sku === req.params.sku);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

router.post('/standalone/products', (req, res) => {
  const products = readProducts();
  const entry = req.body;
  if (!entry.sku || !entry.name) return res.status(400).json({ error: 'sku and name required' });
  if (products.find((p) => p.sku === entry.sku)) return res.status(409).json({ error: 'SKU exists' });
  if (!entry.variants) entry.variants = [];
  products.push(entry);
  writeProducts(products);
  res.status(201).json(entry);
});

router.put('/standalone/products/:sku', (req, res) => {
  const products = readProducts();
  const idx = products.findIndex((p) => p.sku === req.params.sku);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  products[idx] = { ...products[idx], ...req.body, sku: req.params.sku };
  writeProducts(products);
  res.json(products[idx]);
});

router.delete('/standalone/products/:sku', (req, res) => {
  const products = readProducts();
  const idx = products.findIndex((p) => p.sku === req.params.sku);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  products.splice(idx, 1);
  writeProducts(products);
  res.json({ deleted: true });
});

router.put('/standalone/products/:sku/variants', (req, res) => {
  const products = readProducts();
  const idx = products.findIndex((p) => p.sku === req.params.sku);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  products[idx].variants = req.body.variants || [];
  writeProducts(products);
  res.json(products[idx]);
});

export default router;
