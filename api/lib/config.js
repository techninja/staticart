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

/** @type {any[]|null} */
let _products = null;

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

/** @returns {any[]} */
export function getProducts() {
  if (!_products) {
    try {
      _products = JSON.parse(readFileSync(resolve(ROOT, 'src/data/products.json'), 'utf-8'));
    } catch {
      _products = [];
    }
  }
  return _products;
}
