#!/usr/bin/env node

/**
 * Build products — reads all products from DynamoDB, writes src/data/products.json.
 * Falls back to existing file if DynamoDB is unavailable (local dev).
 * Also generates per-product HTML files with OG meta tags.
 * @module scripts/build-products
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = resolve(ROOT, 'dist/data/products.json');
const PRODUCT_DIR = resolve(ROOT, 'dist/product');

/**
 *
 */
async function fetchFromDynamo() {
  const { DynamoDBClient } = /** @type {any} */ (await import('@aws-sdk/client-dynamodb'));
  const { DynamoDBDocumentClient, ScanCommand } = /** @type {any} */ (
    await import('@aws-sdk/lib-dynamodb')
  );
  const client = new DynamoDBClient({});
  const doc = DynamoDBDocumentClient.from(client);
  const table = process.env.DYNAMODB_TABLE || 'staticart';

  const { Items } = await doc.send(
    new ScanCommand({
      TableName: table,
      FilterExpression: 'SK = :sk',
      ExpressionAttributeValues: { ':sk': 'STOCK' },
    }),
  );
  return (Items || []).map((item) => ({
    sku: item.PK,
    name: item.name || '',
    description: item.description || '',
    price: item.price || 0,
    currency: item.currency || 'USD',
    images: item.images || [],
    category: item.category || '',
    stock: item.stock || 0,
    active: item.active !== false,
    variants: item.variants || [],
    metadata: item.metadata || {},
    createdAt: item.createdAt || '',
    updatedAt: new Date().toISOString(),
  }));
}

/** @param {any} product @param {string} siteUrl */
function buildProductHtml(product, siteUrl) {
  const price = (product.price / 100).toFixed(2);
  const image = product.images?.[0] || '';
  const url = `${siteUrl}/product/${product.sku}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${product.name} — StatiCart</title>
  <meta name="description" content="${product.description}" />
  <meta property="og:title" content="${product.name}" />
  <meta property="og:description" content="${product.description}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:type" content="product" />
  <meta property="product:price:amount" content="${price}" />
  <meta property="product:price:currency" content="${product.currency}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta http-equiv="refresh" content="0;url=${url}" />
</head>
<body><p>Redirecting to <a href="${url}">${product.name}</a>…</p></body>
</html>`;
}

/**
 *
 */
async function main() {
  let products;
  try {
    products = await fetchFromDynamo();
    console.log(`✓ Fetched ${products.length} products from DynamoDB`);
  } catch (e) {
    if (existsSync(OUT)) {
      console.warn(`⚠ DynamoDB unavailable, keeping existing products.json`);
      products = JSON.parse(readFileSync(OUT, 'utf-8'));
    } else {
      console.error('✗ No DynamoDB and no existing products.json');
      process.exit(1);
    }
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(products, null, 2));
  console.log(`✓ Wrote ${products.length} products → src/data/products.json`);

  const siteUrl = process.env.SITE_URL || 'https://example.com';
  for (const p of products) {
    const dir = resolve(PRODUCT_DIR, p.sku);
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, 'index.html'), buildProductHtml(p, siteUrl));
  }
  console.log(`✓ Generated ${products.length} OG tag pages → src/product/`);
}

main();
