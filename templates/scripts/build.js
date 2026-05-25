#!/usr/bin/env node

/**
 * Build script for Cloudflare Pages deployment.
 * Copies src/ into dist/, generates OG metadata pages for products.
 */

import { cpSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DIST = resolve(ROOT, 'dist');

// Clean
if (existsSync(DIST)) rmSync(DIST, { recursive: true });
mkdirSync(DIST, { recursive: true });

// Build icons
console.log('→ Building icons...');
execSync('node scripts/build-icons.js', { cwd: ROOT, stdio: 'inherit' });

// Vendor deps
console.log('→ Vendoring dependencies...');
execSync('node scripts/vendor-deps.js', { cwd: ROOT, stdio: 'inherit' });

// Copy src/ as the root
console.log('→ Copying src/ → dist/');
cpSync(resolve(ROOT, 'src'), DIST, { recursive: true });

// Remove server.js from dist
const serverFile = resolve(DIST, 'server.js');
if (existsSync(serverFile)) rmSync(serverFile);

// SPA fallback
console.log('→ Creating 404.html for SPA routing');
cpSync(resolve(DIST, 'index.html'), resolve(DIST, '404.html'));

// OG metadata pages
const routesFile = resolve(ROOT, 'clearstack.routes.json');
if (existsSync(routesFile)) {
  console.log('→ Generating OG metadata pages...');
  const config = JSON.parse(readFileSync(resolve(ROOT, 'staticart.config.json'), 'utf-8'));
  const baseUrl = config.store?.url || '';
  const { buildOG } = await import('@techninja/clearstack/lib/build-og.js');
  buildOG({ projectDir: ROOT, outDir: 'dist', baseUrl, context: { store: config.store } });
}

console.log('✓ Build complete → dist/');
