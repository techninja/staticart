We're implementing passkey-based authentication for StatiCart — see `docs/app-spec/PASSKEY_AUTH.md` for the full design. This gives users frictionless order tracking without passwords or email flows.

The store already has:
- DynamoDB table with orders keyed by email
- `/api/orders` endpoint (currently trusts raw `?email=` param — insecure)
- `/api/session/:id` that returns customer email after checkout
- Working Stripe checkout flow that captures email

What we need to build:
1. Three new API endpoints: `/api/auth/challenge`, `/api/auth/register`, `/api/auth/verify`
2. JWT token generation and validation
3. `<passkey-prompt>` component for post-purchase registration on the success page
4. `<passkey-login>` component for the orders page
5. Update `/api/orders` to require a Bearer token

Use `@simplewebauthn/server` for the WebAuthn verification logic. Keep everything under 150 lines per file (Clearstack spec). The API handlers follow the same Lambda pattern as the existing endpoints in `api/`.

Start with the API endpoints — they're the foundation everything else depends on.
