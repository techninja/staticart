/**
 * Auth helpers — JWT tokens and challenge management.
 * @module api/lib/auth
 */

import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const TOKEN_EXPIRY = 3600; // 1 hour in seconds

/** Base64url encode a buffer or string. */
function b64url(input) {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64url');
}

/** Base64url decode to buffer. */
function b64urlDecode(str) {
  return Buffer.from(str, 'base64url');
}

/** Sign a JWT with HMAC-SHA256. */
export function signToken(email) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ sub: email, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRY }));
  const sig = b64url(createHmac('sha256', SECRET).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${sig}`;
}

/** Verify a JWT. Returns { sub } or null. */
export function verifyToken(token) {
  try {
    const [header, payload, sig] = token.split('.');
    if (!header || !payload || !sig) return null;
    const expected = b64url(createHmac('sha256', SECRET).update(`${header}.${payload}`).digest());
    if (!timingSafeEqual(b64urlDecode(sig), b64urlDecode(expected))) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch { return null; }
}

/** Generate a random challenge (base64url, 32 bytes). */
export function generateChallenge() {
  return randomBytes(32).toString('base64url');
}
