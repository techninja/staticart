/**
 * Browse action — search and inspect Printful catalog products.
 * @module scripts/lib/browse-action
 */

import { createInterface } from 'node:readline';

/** @param {string} prompt @returns {Promise<string>} */
function ask(prompt) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) =>
    rl.question(prompt, (a) => {
      rl.close();
      res(a.trim());
    }),
  );
}

/** @param {any} helpers @param {string} apiKey @param {string} [query] @param {string} [inspectId] */
export async function browse(helpers, apiKey, query, inspectId) {
  const client = helpers.createClient(apiKey);
  const q = query || (await ask('  Search catalog: '));
  if (!q) return;
  const results = await helpers.browseCatalog(client, q);
  if (!results.length) {
    console.log('  No matches.');
    return;
  }
  console.log(`\n  ${results.length} match(es):\n`);
  for (const p of results.slice(0, 15)) console.log(`    ${p.id}  ${p.title}`);
  const id = inspectId || (query ? null : await ask('\n  Inspect ID (or enter to skip): '));
  if (!id) return;
  const info = await helpers.inspectProduct(client, parseInt(id));
  console.log(`\n  ${info.product.title} (id: ${info.product.id})`);
  console.log(`  Brand:    ${info.brand || '(none)'}`);
  console.log(`  Category: ${info.categoryId}`);
  console.log(`  Colors:   ${info.colors.join(', ') || '(none)'}`);
  console.log(`  Sizes:    ${info.sizes.join(', ') || '(none)'}`);
  console.log(`  In stock: ${info.inStock}/${info.total} variants`);
}
