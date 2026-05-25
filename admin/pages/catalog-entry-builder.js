/**
 * Catalog entry builder — constructs the catalog JSON from form state.
 * Handles logo products (color variants) and all-over (pattern variants).
 * @module admin/pages/catalog-entry-builder
 */

const SITE_URL = location.origin.includes('localhost') ? '' : location.origin;

/**
 *
 */
function resolveAssetUrl(localPath, assets) {
  const asset = assets?.find((a) => a.localPath === localPath || a.path === localPath);
  return asset?.publicUrl || localPath;
}

/**
 *
 */
function labelFromPath(path) {
  return path.replace(/^renders\//, '').replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Build a catalog entry object from the add form host state. */
export function buildEntry(host) {
  const sizes = host.selectedSizes.length ? host.selectedSizes : undefined;
  const isAllOver = host.selectedPatterns.length > 0;

  const files = host.placements.map((p) => {
    const f = { placement: p.id };
    if (p.url) f.url = p.url;
    if (p.position) f.position = p.position;
    return f;
  });

  let printful;
  if (isAllOver) {
    const labelAsset = host.assets?.find((a) => /label.logo/i.test(a.name));
    const labelUrl = labelAsset?.publicUrl || labelAsset?.localPath || '';
    printful = host.selectedPatterns.map((patternPath) => {
      const label = labelFromPath(patternPath);
      const url = resolveAssetUrl(patternPath, host.assets);
      const pf = { label, catalogId: host.inspect.product.id, colors: ['White'] };
      if (sizes) pf.sizes = sizes;
      pf.files = host.inspect.placements
        .filter((p) => p.type !== 'mockup' && p.id !== 'preview')
        .map((p) => {
          if (/label/i.test(p.id) && labelUrl) return { placement: p.id, url: labelUrl };
          return { placement: p.id, url };
        });
      return pf;
    });
  } else {
    const colors = host.selectedColors.length ? host.selectedColors : host.inspect.colors;
    printful = colors.map((color) => {
      const pf = { label: color, catalogId: host.inspect.product.id, colors: [color] };
      if (sizes) pf.sizes = sizes;
      if (files.length) pf.files = files;
      return pf;
    });
  }

  return {
    sku: host.sku, name: host.name, description: host.description || host.name,
    category: host.category || 'other',
    tags: host.tags ? host.tags.split(',').map((t) => t.trim()) : [],
    retail: parseFloat(host.retail), heroStyle: host.heroStyle, printful,
  };
}

/** Save a catalog entry via the admin API. */
export async function saveEntry(host) {
  const entry = buildEntry(host);
  const res = await fetch('/admin/api/catalog', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (res.ok || res.status === 409) {
    history.pushState(null, '', `/admin/product/${entry.sku}`);
    dispatchEvent(new PopStateEvent('popstate'));
  } else {
    const e = await res.json();
    alert(e.error);
  }
}
