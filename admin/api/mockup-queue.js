/**
 * Mockup queue — generates individual mockup images via Printful API.
 * Broadcasts status via WebSocket. Sequential, rate-limited.
 * @module admin/api/mockup-queue
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { getProvider } from './provider-cache.js';
import { loadCatalogEntry, loadStore, getFileStrategy, buildFiles, configHash } from './mockup-files.js';
import { broadcast } from './admin-ws.js';

const ROOT = process.cwd();
const ASSETS = resolve(ROOT, 'src/assets/products');

const queue = [];
let processing = false;
const taskStatus = new Map();

/**
 *
 */
function setStatus(id, status) {
  taskStatus.set(id, status);
  broadcast('mockup:status', { id, ...status });
}

/**
 *
 */
export function getTaskStatus(taskId) { return taskStatus.get(taskId); }
/**
 *
 */
export function getAllTaskStatus() { return Object.fromEntries(taskStatus); }
/**
 *
 */
export function getQueueLength() { return queue.length; }

/**
 *
 */
export function enqueueMockup(task) {
  const id = `${task.sku}:${task.configName}:${task.variantId || task.color || 'all'}`;
  setStatus(id, { status: 'queued', position: queue.length });
  queue.push({ task: { ...task, id } });
  processNext();
  return id;
}

/**
 *
 */
async function processNext() {
  if (processing || !queue.length) return;
  processing = true;
  const { task } = queue.shift();
  queue.forEach((q, i) => setStatus(q.task.id, { status: 'queued', position: i }));
  setStatus(task.id, { status: 'generating' });
  try {
    const result = await generateOne(task);
    setStatus(task.id, { status: 'done', image: result.path });
  } catch (e) {
    const msg = e.message.includes('No variants to generate')
      ? 'Style unavailable for this variant/color' : e.message;
    console.error('Mockup generation failed:', task.id, e.message);
    setStatus(task.id, { status: 'error', error: msg });
  }
  processing = false;
  if (queue.length) setTimeout(processNext, 1000);
}

/**
 *
 */
function matchPfEntry(catEntry, storeProductId, store) {
  if (!catEntry?.printful?.length) return null;
  if (catEntry.printful.length === 1) return catEntry.printful[0];
  const prefix = store.skuPrefix || 'SM';
  const fullSku = `${prefix}-${catEntry.sku}`;
  const colorMap = store.products?.[fullSku] || {};
  for (const [label, spId] of Object.entries(colorMap)) {
    if (spId === storeProductId) {
      return catEntry.printful.find((p) => p.label === label) || catEntry.printful[0];
    }
  }
  return catEntry.printful[0];
}

/**
 *
 */
async function generateOne(task) {
  const { client } = await getProvider();
  const catEntry = loadCatalogEntry(task.sku);
  const store = loadStore();
  const pfEntry = matchPfEntry(catEntry, task.storeProductId, store);
  const catalogId = pfEntry?.catalogId || task.catalogId;
  if (!catalogId) throw new Error('No catalogId');

  const detail = await client.call('GET', `/store/products/${task.storeProductId}`);
  const sv = detail.sync_variants[0];
  if (!sv) throw new Error('No variants');

  const logoFile = sv.files.find((f) => f.type !== 'preview');
  const logoUrl = logoFile?.preview_url || logoFile?.url;
  const variantId = task.variantId || sv.product.variant_id;
  const tplData = await client.call('GET', `/mockup-generator/templates/${catalogId}`);
  const strategy = getFileStrategy(pfEntry);
  const files = buildFiles(strategy, pfEntry, tplData, variantId, logoUrl);
  if (!files.length) throw new Error('No files resolved');

  const mockupTask = await client.call('POST', `/mockup-generator/create-task/${catalogId}`, {
    variant_ids: [variantId], ...task.style, format: 'png', files,
  });

  await new Promise((r) => setTimeout(r, 6000));
  let result = await client.call('GET', `/mockup-generator/task?task_key=${mockupTask.task_key}`);
  if (result.status === 'pending') {
    await new Promise((r) => setTimeout(r, 6000));
    result = await client.call('GET', `/mockup-generator/task?task_key=${mockupTask.task_key}`);
  }
  if (result.status !== 'completed' || !result.mockups?.length) throw new Error('Generation failed');

  const tag = (task.style.option_groups?.[0] || 'default').toLowerCase().replace(/[\s']/g, '-');
  const hash = configHash(pfEntry, task.style);
  const fname = `${variantId}-${tag}-${hash}.png`;
  const dir = resolve(ASSETS, String(task.storeProductId));
  mkdirSync(dir, { recursive: true });

  const imgRes = await fetch(result.mockups[0].mockup_url);
  writeFileSync(resolve(dir, fname), Buffer.from(await imgRes.arrayBuffer()));
  return { path: `/assets/products/${task.storeProductId}/${fname}`, tag, variantId };
}
