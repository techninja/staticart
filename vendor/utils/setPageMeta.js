/**
 * Update document title and meta description.
 * @param {string} title
 * @param {string} [description]
 */

import { getStoreConfigSync } from '#utils/storeConfig.js';

export function setPageMeta(title, description) {
  const name = getStoreConfigSync()?.store?.name || 'StatiCart';
  document.title = title ? `${title} — ${name}` : name;
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
