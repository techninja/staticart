/**
 * Admin provider API — browse catalog + categories (cached).
 * @module admin/api/provider
 */

import { Router } from 'express';
import { getProducts, getCategories } from './provider-cache.js';

const router = Router();

router.get('/provider/categories', async (_req, res) => {
  try {
    const { tree } = await getCategories();
    res.json(tree.filter((c) => !['Collections', 'Brands', 'All products'].includes(c.title)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/provider/browse', async (req, res) => {
  try {
    const { query, categoryId } = req.body;
    const all = await getProducts();
    const { byId } = await getCategories();
    let results = all.filter((p) => !p.is_discontinued);
    if (categoryId) {
      const childIds = new Set(
        [...byId.values()].filter((c) => c.parent_id === categoryId).map((c) => c.id),
      );
      childIds.add(categoryId);
      results = results.filter((p) => childIds.has(p.main_category_id));
    }
    if (query) {
      const q = query.toLowerCase();
      results = results.filter(
        (p) => p.title.toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q),
      );
    }
    const catNames = new Map([...byId].map(([id, c]) => [id, c.title]));
    res.json(results.slice(0, 40).map((p) => ({
      id: p.id, title: p.title, image: p.image, brand: p.brand || null,
      type: p.type_name, variants: p.variant_count,
      category: catNames.get(p.main_category_id) || null,
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
