/**
 * Load staticart.config.json — shared store configuration.
 * @module api/lib/config
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const API_DIR = dirname(dirname(fileURLToPath(import.meta.url)));

/** Try path relative to api/ first (Lambda), then project root (local dev). */
function readJSON(apiPath, rootPath) {
  for (const p of [resolve(API_DIR, apiPath), resolve(ROOT, rootPath)]) {
    try { return JSON.parse(readFileSync(p, 'utf-8')); } catch { /* next */ }
  }
  return null;
}

/** @type {any} */
let _config = null;

/** @type {any[]|null} */
let _products = null;

/**
 *
 */
export function getConfig() {
  if (!_config) _config = readJSON('staticart.config.json', 'staticart.config.json') || { store: {}, shipping: {}, tax: {}, productFields: {} };
  return _config;
}

/** @returns {any[]} */
export function getProducts() {
  if (!_products) _products = readJSON('products.json', 'src/data/products.json') || [];
  return _products;
}
