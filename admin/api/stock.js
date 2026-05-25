/**
 * Admin stock API routes.
 * @module admin/api/stock
 */

import { Router } from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const doc = DynamoDBDocumentClient.from(client);
const TABLE = process.env.DYNAMODB_TABLE || 'staticart';

const router = Router();

router.get('/stock', async (_req, res) => {
  try {
    const { Items } = await doc.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: 'SK = :sk',
        ExpressionAttributeValues: { ':sk': 'STOCK' },
      }),
    );
    const stock = (Items || []).map((i) => ({ sku: i.PK, stock: i.stock }));
    res.json(stock);
  } catch (e) {
    console.error('Admin stock scan error:', e);
    res.status(500).json({ error: 'Failed to load stock' });
  }
});

router.put('/stock/:sku', async (req, res) => {
  const { sku } = req.params;
  const { stock } = req.body;
  if (typeof stock !== 'number') return res.status(400).json({ error: 'stock must be a number' });
  try {
    await doc.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK: sku, SK: 'STOCK' },
        UpdateExpression: 'SET stock = :val',
        ExpressionAttributeValues: { ':val': stock },
      }),
    );
    res.json({ sku, stock });
  } catch (e) {
    console.error('Admin stock update error:', e);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

export default router;
