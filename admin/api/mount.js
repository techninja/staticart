/**
 * Admin mount — loads all admin API routes and static files.
 * @module admin/api/mount
 */

import express from 'express';
import { resolve, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { attachWs } from './admin-ws.js';

/**
 * @param {any} app
 * @param {'package' | 'local'} mode
 * @param {import('http').Server} [server]
 */
export async function mountAdmin(app, mode = 'package', server) {
  const base = mode === 'local'
    ? resolve(dirname(fileURLToPath(import.meta.url)), '..')
    : resolve(process.cwd(), 'node_modules/@techninja/staticart/admin');
  const api = (name) => import(`${base}/api/${name}`).then((m) => m.default);

  app.use('/admin/api', express.json());
  try {
    const cfg = JSON.parse(readFileSync(resolve(process.cwd(), 'staticart.config.json'), 'utf-8'));
    const isProvider = !!cfg.fulfillment?.provider;

    const routes = [api('mode.js'), api('stock.js'), api('products.js'), api('orders.js'), api('state.js')];
    if (isProvider) {
      routes.push(api('provider.js'), api('provider-detail.js'), api('catalog.js'),
        api('assets.js'), api('deploy.js'), api('mockups.js'), api('mockup-apply.js'));
    } else {
      routes.push(api('standalone-products.js'));
    }
    const loaded = await Promise.all(routes);
    for (const r of loaded) app.use('/admin/api', r);

    if (isProvider) {
      const { warmCache } = await import(`${base}/api/provider-cache.js`);
      warmCache();
    }
  } catch (e) {
    console.warn('  Admin API routes not mounted:', e.message);
  }

  app.use('/admin', express.static(base, { redirect: false }));
  const sendIndex = (_req, res) => res.sendFile('index.html', { root: base });
  app.get('/admin', sendIndex);
  app.use('/admin', (req, res, next) => {
    if (req.method === 'GET' && !req.path.includes('.') && !req.path.startsWith('/api')) {
      return sendIndex(req, res);
    }
    next();
  });
  console.log('  Admin panel mounted at /admin');
  if (server) attachWs(server);
}
