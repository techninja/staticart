#!/usr/bin/env node

/**
 * Update stock — admin script to increment stock in DynamoDB.
 * Usage: node scripts/update-stock.js <sku> <quantity>
 * @module scripts/update-stock
 */

const [sku, qtyStr] = process.argv.slice(2);
if (!sku || !qtyStr) {
  console.error('Usage: node scripts/update-stock.js <sku> <quantity>');
  process.exit(1);
}

const qty = parseInt(qtyStr, 10);
if (Number.isNaN(qty) || qty <= 0) {
  console.error('Quantity must be a positive integer');
  process.exit(1);
}

/**
 *
 */
async function main() {
  const { DynamoDBClient } = /** @type {any} */ (await import('@aws-sdk/client-dynamodb'));
  const { DynamoDBDocumentClient, UpdateCommand } = /** @type {any} */ (
    await import('@aws-sdk/lib-dynamodb')
  );
  const client = new DynamoDBClient({});
  const doc = DynamoDBDocumentClient.from(client);
  const table = process.env.DYNAMODB_TABLE || 'staticart';

  await doc.send(
    new UpdateCommand({
      TableName: table,
      Key: { PK: sku, SK: 'STOCK' },
      UpdateExpression: 'SET stock = stock + :qty',
      ExpressionAttributeValues: { ':qty': qty },
    }),
  );
  console.log(`✓ Added ${qty} stock to ${sku}`);

  const hookUrl = process.env.BUILD_HOOK_URL;
  if (hookUrl) {
    await fetch(hookUrl, { method: 'POST' });
    console.log('✓ Rebuild triggered');
  }
}

main().catch((e) => {
  console.error('✗ Stock update failed:', e.message);
  process.exit(1);
});
