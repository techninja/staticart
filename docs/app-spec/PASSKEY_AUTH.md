# Passkey Authentication

> Lightweight identity for order tracking — no passwords, no email flows.

## Problem

StatiCart stores currently use an honor-system email lookup for order
history. Anyone who knows an email can see orders. There's no real
authentication, and adding traditional auth (passwords, OAuth, magic
links) conflicts with the "99% static, minimal backend" philosophy.

## Solution: WebAuthn Passkeys

Browser-native passkeys provide cryptographic proof of identity with
zero friction — one biometric tap or PIN. No third-party SDKs, no
email round-trips, no password management.

## User Flow

### First Purchase (Registration)

```
Checkout → Stripe payment → success page
  → "Save a passkey to track your orders?"
  → Browser WebAuthn prompt (fingerprint/face/PIN)
  → Credential public key stored in DynamoDB
  → User sees "You're set! View orders anytime."
```

Registration is **optional** and happens post-purchase. No signup wall.
The email comes from Stripe's `customer_details.email`.

### Return Visit (Authentication)

```
Click "Orders" → passkey prompt (biometric/PIN)
  → Browser sends signed assertion
  → Lambda verifies against stored public key
  → Returns short-lived token (JWT, 1hr)
  → Orders page fetches with token
```

### No Passkey? Fallback

If the user never registered a passkey (or is on a new device):

```
Click "Orders" → "Enter your email"
  → Check if passkey exists for email → prompt passkey
  → No passkey? → "Create a passkey to view orders"
  → Or: one-time magic link as last resort
```

## API Endpoints

### POST /api/auth/register

Called after checkout to create a passkey.

```javascript
// Request
{ email, credential: { id, publicKey, algorithm } }

// DynamoDB
{ PK: "USER#email", SK: "PASSKEY#credentialId", publicKey, algorithm, createdAt }

// Response
{ success: true }
```

### POST /api/auth/challenge

Generates a random challenge for the WebAuthn ceremony.

```javascript
// Request
{ email }

// Response
{ challenge: "base64-random-bytes", allowCredentials: [{ id, type }] }
```

### POST /api/auth/verify

Validates the signed assertion and returns a token.

```javascript
// Request
{ email, credential: { id, signature, authenticatorData, clientDataJSON } }

// Verify signature against stored public key
// Response
{ token: "jwt-1hr-expiry" }
```

### GET /api/orders (updated)

Now requires `Authorization: Bearer <token>` header instead of
trusting a raw `?email=` query param.

## Frontend Components

### `<passkey-prompt>`

Molecule component shown on the success page after first purchase.
Handles the WebAuthn `navigator.credentials.create()` ceremony and
calls `/api/auth/register`.

### `<passkey-login>`

Shown on the orders page when not authenticated. Handles
`navigator.credentials.get()` and calls `/api/auth/verify`.

### Token Storage

JWT stored in `sessionStorage` (not localStorage — expires on tab
close). The orders page checks for a valid token before fetching.

## DynamoDB Schema Addition

```
PK: USER#<email>
SK: PASSKEY#<credentialId>
  publicKey: <base64>
  algorithm: -7 (ES256) or -257 (RS256)
  createdAt: ISO timestamp
  lastUsed: ISO timestamp
```

Uses the existing table. No new GSI needed — lookups are by email
(PK) which is already the pattern.

## Browser Support

WebAuthn / Passkeys (2026):

- Chrome 67+ (2018) — 8 years of support
- Safari 14+ (2020) — 6 years
- Firefox 60+ (2018) — 8 years
- Edge 18+ (2018) — 8 years
- iOS 16+ (2022) — cross-device via iCloud Keychain
- Android 9+ (2023) — cross-device via Google Password Manager

Effectively universal. No polyfill needed.

## Security Model

- **No secrets on the client.** Public key crypto — private key never
  leaves the user's device.
- **No session cookies.** JWT in sessionStorage, short-lived.
- **No email enumeration.** Challenge endpoint returns the same shape
  whether the email exists or not.
- **Replay protection.** Challenge is single-use, server-generated.
- **Device binding.** Passkey is tied to the device/password manager.
  Cross-device sync handled by the platform (iCloud/Google).

## Implementation Order

1. `/api/auth/challenge` + `/api/auth/verify` — core crypto
2. `/api/auth/register` — credential storage
3. `<passkey-login>` component — orders page gate
4. `<passkey-prompt>` component — post-purchase registration
5. Update `/api/orders` to require token
6. Fallback: magic link for users without passkeys

## Dependencies

- None on the frontend (WebAuthn is a browser API)
- `@simplewebauthn/server` (npm) for the Lambda verification logic —
  handles the CBOR parsing and signature verification. ~50KB.

## Config

```json
{
  "auth": {
    "type": "passkey",
    "rpName": "StatiCart Shop",
    "rpId": "shop.staticart.org",
    "tokenExpiry": "1h"
  }
}
```

`rpId` is the relying party identifier — must match the domain.
Each store sets its own.
