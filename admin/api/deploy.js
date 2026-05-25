/**
 * Admin deploy status API — compare local vs deployed, check asset availability.
 * @module admin/api/deploy
 */

import { Router } from 'express';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const router = Router();
const ROOT = process.cwd();
const r = (/** @type {string} */ p) => resolve(ROOT, p);

/**
 *
 */
function getSiteUrl() {
  return process.env.SITE_URL || process.env.SITE_ORIGIN || '';
}

router.get('/deploy/status', async (_req, res) => {
  const siteUrl = getSiteUrl();
  if (!siteUrl) return res.status(400).json({ error: 'SITE_URL not configured' });
  try {
    const localProducts = existsSync(r('src/data/products.json'))
      ? JSON.parse(readFileSync(r('src/data/products.json'), 'utf-8')) : [];
    const remoteRes = await fetch(`${siteUrl}/data/products.json`);
    if (!remoteRes.ok) return res.json({ siteUrl, deployed: false, local: localProducts.length });
    const remoteProducts = await remoteRes.json();
    const remoteBySku = new Map(remoteProducts.map((p) => [p.sku, p]));
    const localBySku = new Map(localProducts.map((p) => [p.sku, p]));
    const added = localProducts.filter((p) => !remoteBySku.has(p.sku)).map((p) => p.sku);
    const removed = remoteProducts.filter((p) => !localBySku.has(p.sku)).map((p) => p.sku);
    const changed = localProducts.filter((p) => {
      const rp = remoteBySku.get(p.sku);
      if (!rp) return false;
      return p.variants?.length !== rp.variants?.length || p.updatedAt !== rp.updatedAt;
    }).map((p) => p.sku);
    res.json({
      siteUrl, deployed: true,
      local: localProducts.length, remote: remoteProducts.length,
      added, removed, changed, inSync: !added.length && !removed.length && !changed.length,
    });
  } catch (e) {
    console.error('Deploy status error:', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/deploy/check-assets', async (req, res) => {
  const siteUrl = getSiteUrl();
  if (!siteUrl) return res.status(400).json({ error: 'SITE_URL not configured' });
  const { paths } = req.body;
  if (!Array.isArray(paths)) return res.status(400).json({ error: 'paths array required' });
  const results = {};
  for (const p of paths) {
    try {
      const url = p.startsWith('http') ? p : `${siteUrl}${p}`;
      const r = await fetch(url, { method: 'HEAD' });
      results[p] = r.ok;
    } catch { results[p] = false; }
  }
  res.json(results);
});

export default router;
