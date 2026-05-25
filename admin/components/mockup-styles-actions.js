/**
 * Mockup styles actions — data loading, WS subscription, event handlers.
 * @module admin/components/mockup-styles-actions
 */

import { subscribe } from './admin-events.js';

/**
 *
 */
export async function loadData(host) {
  if (!host.catalogid || host.catalogid === 'undefined' || !host.sku) return;
  try {
    // Fast: local data (no external API)
    const [catRes, statusRes, imgRes] = await Promise.all([
      fetch(`/admin/api/catalog/${host.sku}`),
      fetch('/admin/api/mockups/status'),
      host.storeproductid ? fetch(`/admin/api/mockups/images/${host.storeproductid}`) : null,
    ]);
    if (catRes.ok) {
      const e = await catRes.json();
      host.configs = e.mockupStyles || [];
      host.catfiles = e.printful?.[0]?.files || [];
    }
    if (statusRes.ok) host.tasks = (await statusRes.json()).tasks || {};
    if (imgRes?.ok) host.diskimages = await imgRes.json();
    // Slow: Printful API (background, non-blocking render)
    fetch(`/admin/api/mockups/${host.catalogid}`).then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) host.available = data; });
  } catch (e) { console.error(e); }
}

/**
 *
 */
export function subscribeStatus(host, invalidate) {
  const handler = (data) => {
    host.tasks = { ...host.tasks, [data.id]: data };
    if (data.status === 'done' && data.image) {
      host.diskimages = [data.image, ...(host.diskimages || [])];
      // Auto-apply if hero is flagged and this task matches it
      const hero = host.configs?.find((c) => c.hero);
      if (hero && data.id?.includes(hero.name)) {
        fetch(`/admin/api/mockups/apply/${host.sku}`, { method: 'POST' });
      }
    }
    invalidate();
  };
  return subscribe('mockup:status', handler);
}

/**
 *
 */
export function matchImage(config, images, diskimages) {
  const tag = (config.option_groups?.[0] || '').toLowerCase().replace(/[\s']/g, '-');
  const disk = (diskimages || []).find((img) => img.includes(`-${tag}-`));
  if (disk) return disk;
  return (images || []).find((img) => img.includes(`-${tag}-`)) || '';
}

/**
 *
 */
export function taskKey(sku, config) { return `${sku}:${config.name}:`; }

/**
 *
 */
export function matchTaskStatus(tasks, prefix) {
  const matching = Object.entries(tasks || {}).filter(([k]) => k.startsWith(prefix));
  if (!matching.length) return undefined;
  const statuses = matching.map(([, v]) => v);
  if (statuses.some((s) => s.status === 'error')) return statuses.find((s) => s.status === 'error');
  if (statuses.some((s) => s.status === 'generating')) return { status: 'generating' };
  if (statuses.some((s) => s.status === 'queued')) return { status: 'queued', position: statuses.find((s) => s.status === 'queued').position };
  if (statuses.every((s) => s.status === 'done')) return statuses[0];
  return undefined;
}

/**
 *
 */
export function handleSave(host, e) {
  const updated = [...host.configs]; updated[e.detail.index] = e.detail.config;
  host.configs = updated; persistConfigs(host);
}

/**
 *
 */
export function handleRemove(host, e) {
  const updated = [...host.configs]; updated.splice(e.detail.index, 1);
  host.configs = updated; persistConfigs(host);
}

/**
 *
 */
export function handleHero(host, e) {
  host.configs = host.configs.map((c, i) => ({ ...c, hero: i === e.detail.index }));
  persistConfigs(host, true);
}

/**
 *
 */
export function handleAdd(host) {
  const groups = host.available?.optionGroups?.map((g) => g.name) || [];
  const opts = host.available?.options || [];
  const g = groups[0] || 'Default', o = opts[0] || 'Front';
  host.configs = [...host.configs, { name: `${g} (${o})`, option_groups: [g], options: [o] }];
  persistConfigs(host);
}

/**
 *
 */
export async function handleGenerate(host, e) {
  const config = host.configs[e.detail.index];
  if (!config || !host.storeproductid) return;
  const res = await fetch('/admin/api/mockups/enqueue', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sku: host.sku, storeProductId: parseInt(host.storeproductid),
      configName: config.name, style: { option_groups: config.option_groups, options: config.options },
      catalogId: parseInt(host.catalogid),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Enqueue failed' }));
    host.tasks = { ...host.tasks, [`${host.sku}:${config.name}:all`]: { status: 'error', error: err.error } };
  }
}

/**
 *
 */
async function persistConfigs(host, notify) {
  await fetch(`/admin/api/catalog/${host.sku}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mockupStyles: host.configs }),
  });
  if (notify) {
    // Trigger auto-apply if hero is set and images exist
    const hero = host.configs.find((c) => c.hero);
    if (hero) {
      const tag = (hero.option_groups?.[0] || '').toLowerCase().replace(/[\s']/g, '-');
      const hasImage = (host.diskimages || []).some((img) => img.includes(`-${tag}-`));
      if (hasImage) {
        await fetch(`/admin/api/mockups/apply/${host.sku}`, { method: 'POST' });
      }
    }
  }
}
