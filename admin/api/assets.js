/**
 * Admin assets API — list available print files with deploy status.
 * @module admin/api/assets
 */

import { Router } from 'express';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';

const router = Router();
const ROOT = process.cwd();
const PRINTS_DIR = resolve(ROOT, 'src/assets/prints');
const IMG_EXTS = new Set(['.png', '.jpg', '.jpeg', '.svg']);

function listImages(dir, base = '') {
  if (!existsSync(dir)) return [];
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = base ? `${base}/${entry}` : entry;
    if (statSync(full).isDirectory()) results.push(...listImages(full, rel));
    else if (IMG_EXTS.has(extname(entry).toLowerCase())) {
      results.push({ path: rel, name: entry, localPath: `/assets/prints/${rel}` });
    }
  }
  return results;
}

router.get('/assets', async (req, res) => {
  try {
    const files = listImages(PRINTS_DIR);
    const siteUrl = process.env.SITE_URL || process.env.SITE_ORIGIN || '';
    if (siteUrl && req.query.checkDeploy !== 'false') {
      const checks = await Promise.allSettled(
        files.map((f) => fetch(`${siteUrl}${f.localPath}`, { method: 'HEAD' })),
      );
      files.forEach((f, i) => {
        f.publicUrl = `${siteUrl}${f.localPath}`;
        f.deployed = checks[i].status === 'fulfilled' && checks[i].value.ok;
      });
    }
    res.json(files);
  } catch (e) {
    console.error('Assets list error:', e);
    res.status(500).json({ error: 'Failed to list assets' });
  }
});

export default router;
