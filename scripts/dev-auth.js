#!/usr/bin/env node

/**
 * Dev helper — generates a test JWT for local auth testing.
 * Paste the output into the browser console.
 * Usage: node scripts/dev-auth.js [email] [name]
 * @module scripts/dev-auth
 */

import { createHmac } from 'node:crypto';

const email = process.argv[2] || 'test@example.com';
const name = process.argv[3] || 'Test User';
const secret = process.env.JWT_SECRET || 'dev-secret-change-me';

function b64url(input) {
  return Buffer.from(typeof input === 'string' ? input : JSON.stringify(input))
    .toString('base64url');
}

const header = b64url({ alg: 'HS256', typ: 'JWT' });
const payload = b64url({ sub: email, name, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 });
const sig = b64url(createHmac('sha256', secret).update(`${header}.${payload}`).digest());
const token = `${header}.${payload}.${sig}`;

console.log(`\n🔑 Test token for: ${name} <${email}>\n`);
console.log(`sessionStorage.setItem('staticart-auth-token', '${token}'); dispatchEvent(new CustomEvent('staticart:auth-changed'));\n`);
console.log(`Paste the above into your browser console. Expires in 1 hour.\n`);
