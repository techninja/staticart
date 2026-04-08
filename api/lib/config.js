/**
 * Load staticart.config.json — shared store configuration.
 * @module api/lib/config
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

/** @type {any} */
let _config = null;

/**
 *
 */
export function getConfig() {
  if (!_config) {
    try {
      _config = JSON.parse(readFileSync(resolve(ROOT, 'staticart.config.json'), 'utf-8'));
    } catch {
      _config = { store: {}, shipping: {}, tax: {}, productFields: {} };
    }
  }
  return _config;
}
