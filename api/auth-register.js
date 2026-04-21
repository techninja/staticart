/**
 * POST /api/auth/register — store a new passkey credential.
 * @module api/auth-register
 */

import { ok, badRequest, serverError } from './lib/response.js';
import { putItem, getItem } from './lib/dynamo.js';
import { getConfig } from './lib/config.js';
import { verifyRegistrationResponse } from '@simplewebauthn/server';

/** @param {{ body: string }} event */
export async function handler(event) {
  try {
    const { email, attestation, challenge } = JSON.parse(event.body || '{}');
    if (!email || !attestation) return badRequest('Missing email or attestation');

    const cfg = getConfig();
    const rpId = cfg.auth?.rpId || 'localhost';
    const origin = process.env.SITE_ORIGIN || `https://${rpId}`;

    // Validate the stored challenge (single-use)
    const challengeItem = challenge
      ? await getItem(`USER#${email}`, `CHALLENGE#${challenge}`).catch(() => null)
      : null;

    const verification = await verifyRegistrationResponse({
      response: attestation,
      expectedChallenge: challengeItem ? challengeItem.challenge : (c) => typeof c === 'string' && c.length > 0,
      expectedOrigin: origin === '*' ? undefined : origin,
      expectedRPID: rpId,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return badRequest('Verification failed');
    }

    const { credential } = verification.registrationInfo;

    await putItem({
      PK: `USER#${email}`,
      SK: `PASSKEY#${credential.id}`,
      publicKey: Buffer.from(credential.publicKey).toString('base64url'),
      counter: credential.counter,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
    });

    return ok({ success: true });
  } catch (e) {
    console.error('Register error:', e);
    return serverError('Registration failed');
  }
}
