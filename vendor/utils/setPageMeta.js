/**
 * Update document title and meta description.
 * @param {string} title
 * @param {string} [description]
 */

import { getStoreConfigSync } from '#utils/storeConfig.js';

/**
 *
 */
export function setPageMeta(title, description) {
  const cfg = getStoreConfigSync()?.store || {};
  const name = cfg.name || 'StatiCart';
  const tagline = cfg.tagline || '';
  if (!title || title === name) {
    document.title = tagline ? `${name} — ${tagline}` : name;
  } else {
    document.title = `${title} — ${name}`;
  }
  if (description) {
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', description);
  }
}
