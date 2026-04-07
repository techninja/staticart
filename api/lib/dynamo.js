/**
 * DynamoDB client — shared across all Lambda handlers.
 * @module api/lib/dynamo
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const doc = DynamoDBDocumentClient.from(client);
const TABLE = process.env.DYNAMODB_TABLE || 'staticart';

/** @param {string} pk @param {string} sk */
export async function getItem(pk, sk) {
  const { Item } = await doc.send(new GetCommand({ TableName: TABLE, Key: { PK: pk, SK: sk } }));
  return Item;
}

/** @param {Record<string, any>} item */
export async function putItem(item) {
  await doc.send(new PutCommand({ TableName: TABLE, Item: item }));
}

/**
 * Conditional stock decrement — fails if stock < qty.
 * @param {string} sku
 * @param {number} qty
 * @returns {Promise<boolean>} true if decremented, false if insufficient stock
 */
export async function decrementStock(sku, qty) {
  try {
    await doc.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK: sku, SK: 'STOCK' },
        UpdateExpression: 'SET stock = stock - :qty',
        ConditionExpression: 'stock >= :qty',
        ExpressionAttributeValues: { ':qty': qty },
      }),
    );
    return true;
  } catch (e) {
    if (e.name === 'ConditionalCheckFailedException') return false;
    throw e;
  }
}

/**
 * Restore stock (for refunds).
 * @param {string} sku
 * @param {number} qty
 */
export async function incrementStock(sku, qty) {
  await doc.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: sku, SK: 'STOCK' },
      UpdateExpression: 'SET stock = stock + :qty',
      ExpressionAttributeValues: { ':qty': qty },
    }),
  );
}

/** @param {string} sku */
export async function getStock(sku) {
  const item = await getItem(sku, 'STOCK');
  return item?.stock ?? 0;
}

/** @param {string} pk @param {string} skPrefix */
export async function queryByPK(pk, skPrefix) {
  const { Items } = await doc.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': pk, ':sk': skPrefix },
    }),
  );
  return Items || [];
}
