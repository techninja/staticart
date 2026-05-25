/**
 * Admin mode API — detect provider vs standalone from config.
 * @module admin/api/mode
 */

import { Router } from 'express';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const router = Router();
const ROOT = process.cwd();

router.get('/mode', (_req, res) => {
  try {
    const cfg = JSON.parse(readFileSync(resolve(ROOT, 'staticart.config.json'), 'utf-8'));
    const mode = cfg.fulfillment?.provider ? 'provider' : 'standalone';
    res.json({ mode, provider: cfg.fulfillment?.provider || null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
