/**
 * Admin orders API — list recent orders from DynamoDB.
 * @module admin/api/orders
 */

import { Router } from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const doc = DynamoDBDocumentClient.from(client);
const TABLE = process.env.DYNAMODB_TABLE || 'staticart';

const router = Router();

router.get('/orders', async (req, res) => {
  const limit = parseInt(req.query.limit) || 25;
  try {
    const { Items } = await doc.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: 'begins_with(PK, :pk) AND SK = :sk',
        ExpressionAttributeValues: { ':pk': 'ORDER#', ':sk': 'META' },
      }),
    );
    const orders = (Items || [])
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, limit);
    res.json(orders);
  } catch (e) {
    console.error('Admin orders scan error:', e);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

router.get('/orders/:id', async (req, res) => {
  try {
    const pk = req.params.id.startsWith('ORDER#') ? req.params.id : `ORDER#${req.params.id}`;
    const { Item } = await doc.send(new GetCommand({ TableName: TABLE, Key: { PK: pk, SK: 'META' } }));
    if (!Item) return res.status(404).json({ error: 'Order not found' });
    res.json(Item);
  } catch (e) {
    console.error('Admin order detail error:', e);
    res.status(500).json({ error: 'Failed to load order' });
  }
});

export default router;
