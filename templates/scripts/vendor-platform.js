#!/usr/bin/env node

/**
 * Vendors StatiCart platform files from node_modules into src/vendor/staticart/.
 * Also syncs platform locale files to src/locales/ (skips project overrides).
 * Runs as part of postinstall via setup.js.
 */

import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = resolve(ROOT, 'node_modules/@techninja/staticart/vendor');
const DEST = resolve(ROOT, 'src/vendor/staticart');

if (existsSync(SRC)) {
  mkdirSync(DEST, { recursive: true });
  cpSync(SRC, DEST, { recursive: true });
  console.log('✓ Vendored: staticart → src/vendor/staticart/');

  // Copy platform locale files to src/locales/ (skip overrides*)
  const localeSrc = resolve(DEST, 'locales');
  const localeDest = resolve(ROOT, 'src/locales');
  if (existsSync(localeSrc)) {
    mkdirSync(localeDest, { recursive: true });
    for (const f of readdirSync(localeSrc)) {
      if (!f.startsWith('overrides')) {
        cpSync(resolve(localeSrc, f), resolve(localeDest, f));
      }
    }
    console.log('✓ Synced: platform locales → src/locales/');
  }
  // Run platform migrations
  const migrationsPath = resolve(DEST, 'migrations.js');
  if (existsSync(migrationsPath)) {
    const { runMigrations } = await import(migrationsPath);
    runMigrations(ROOT);
  }
} else {
  console.warn('⚠ @techninja/staticart vendor dir not found, skipping');
}
