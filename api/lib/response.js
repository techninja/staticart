/**
 * Lambda response helpers.
 * @module api/lib/response
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.SITE_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

/** @param {number} statusCode @param {any} body */
export function json(statusCode, body) {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

export const ok = (body) => json(200, body);
export const created = (body) => json(201, body);
export const badRequest = (msg) => json(400, { error: msg });
export const unauthorized = (msg) => json(401, { error: msg || 'Unauthorized' });
export const conflict = (body) => json(409, body);
export const serverError = (msg) => json(500, { error: msg });
