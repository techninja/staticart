/**
 * Route map — single source of truth for all application paths.
 * Import and reference these instead of hardcoding paths.
 * @module utils/routes
 */

export const routes = {
  home: '/',
  shop: '/shop',
  product: '/shop/product/:sku',
  cart: '/shop/cart',
  orderSuccess: '/shop/order/success',
  orderCancelled: '/shop/order/cancelled',
  orders: '/orders',
  content: '/page/:slug',
  notFound: '/:path',
};

/** Build a product detail URL. @param {string} sku */
export function productUrl(sku) {
  return routes.product.replace(':sku', sku);
}

/** Build a content page URL. @param {string} slug */
export function contentUrl(slug) {
  return routes.content.replace(':slug', slug);
}
