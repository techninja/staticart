/**
 * Admin products API — serves products.json from the consumer project.
 * @module admin/api/products
 */

import { Router } from 'express';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const router = Router();

router.get('/products', (_req, res) => {
  try {
    const data = readFileSync(resolve('src/data/products.json'), 'utf-8');
    res.type('json').send(data);
  } catch (e) {
    console.error('Admin products read error:', e);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

export default router;
