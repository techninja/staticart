/**
 * POST /api/auth/verify — verify a passkey assertion, return JWT.
 * @module api/auth-verify
 */

import { ok, badRequest, serverError } from './lib/response.js';
import { getItem, putItem } from './lib/dynamo.js';
import { getConfig } from './lib/config.js';
import { signToken } from './lib/auth.js';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';

/** @param {{ body: string }} event */
export async function handler(event) {
  try {
    const { email, assertion } = JSON.parse(event.body || '{}');
    if (!email || !assertion) return badRequest('Missing email or assertion');

    const credentialId = assertion.id;
    const stored = await getItem(`USER#${email}`, `PASSKEY#${credentialId}`);
    if (!stored) return badRequest('Unknown credential');

    const cfg = getConfig();
    const rpId = cfg.auth?.rpId || 'localhost';
    const origin = process.env.SITE_ORIGIN || `https://${rpId}`;

    const verification = await verifyAuthenticationResponse({
      response: assertion,
      expectedChallenge: (c) => typeof c === 'string' && c.length > 0,
      expectedOrigin: origin === '*' ? undefined : origin,
      expectedRPID: rpId,
      credential: {
        id: credentialId,
        publicKey: Buffer.from(stored.publicKey, 'base64url'),
        counter: stored.counter || 0,
      },
    });

    if (!verification.verified) return badRequest('Verification failed');

    // Update counter and lastUsed
    await putItem({
      ...stored,
      counter: verification.authenticationInfo.newCounter,
      lastUsed: new Date().toISOString(),
    });

    return ok({ token: signToken(email) });
  } catch (e) {
    console.error('Verify error:', e);
    return serverError('Verification failed');
  }
}
