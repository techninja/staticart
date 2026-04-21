/**
 * POST /api/auth/challenge — generate a WebAuthn challenge.
 * @module api/auth-challenge
 */

import { ok, badRequest, serverError } from './lib/response.js';
import { queryByPK, putItem } from './lib/dynamo.js';
import { generateChallenge } from './lib/auth.js';

/** @param {{ body: string }} event */
export async function handler(event) {
  try {
    const { email } = JSON.parse(event.body || '{}');
    if (!email) return badRequest('Missing email');

    const challenge = generateChallenge();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Store challenge for verification (single-use, 5 min TTL)
    await putItem({
      PK: `USER#${email}`,
      SK: `CHALLENGE#${challenge}`,
      challenge,
      expiresAt,
    });

    // Look up existing credentials for allowCredentials
    const credentials = await queryByPK(`USER#${email}`, 'PASSKEY#');
    const allowCredentials = credentials.map((c) => ({
      id: c.SK.replace('PASSKEY#', ''),
      type: 'public-key',
    }));

    return ok({ challenge, allowCredentials });
  } catch (e) {
    console.error('Challenge error:', e);
    return serverError('Challenge generation failed');
  }
}
