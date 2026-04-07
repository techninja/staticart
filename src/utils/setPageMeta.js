/**
 * Update document title and meta description.
 * @param {string} title
 * @param {string} [description]
 */
export function setPageMeta(title, description) {
  document.title = title ? `${title} — StatiCart` : 'StatiCart — Static E-Commerce';
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
