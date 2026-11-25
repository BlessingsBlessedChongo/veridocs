# VeriDocs security model

## What VeriDocs guarantees

| Property | How |
|---|---|
| Integrity | SHA-256 of the final signed PDF. Any change, even re-saving, changes the fingerprint. |
| Authenticity | RSA-2048 signatures (RSA-SHA256, PKCS#1 v1.5) checked on every verification with Node's OpenSSL-backed crypto. Old keys stay available, so rotation never invalidates documents. |
| Accountability | An audit trail of every signing, revocation, export, role change, key rotation, API key and webhook change. |
| Privacy | Documents are never stored. Browser checks send only the fingerprint. Recipient emails are never public. Verifiers' addresses are stored for abuse protection and shown to institutions only in shortened form. |

## Keys

- Private keys are encrypted with AES-256-GCM under `MASTER_ENCRYPTION_KEY` (64 hex characters) and decrypted only for the moment of signing.
- The master key lives only in the environment. Lose it and the private keys can't be recovered; leak it together with the database and anyone could sign as any institution. Keep it in a secrets manager and back it up offline.
- Production recommendation: a managed KMS or HSM, so private keys never exist in application memory. Issuer-held hardware keys are on the roadmap.

## Accounts and sessions

- scrypt (N=16384, r=8, p=1) password hashes with per-password salts; the format records its parameters so the cost can be raised later.
- Passwords: at least 10 characters, letters plus a number or symbol, not built from the email name.
- Session tokens and email links are random (256-bit) and stored only as SHA-256 hashes. Email links are single-use (48 hours to confirm an address, 30 minutes to reset a password).
- A password reset or change signs out every other device. Each device can also be signed out individually.
- Sign-in is rate limited per network and per account. Password-reset requests always answer the same way, so they can't reveal who has an account.
- Signing, creating an institution, accepting an invitation and creating API keys need a confirmed email address.
- An institution always keeps at least one administrator.

## Uploads

PDFs must be at most 10 MB, start with `%PDF-`, load with a page tree, and not be password-protected. A PDF VeriDocs already signed is refused, so stamps never stack.

## Integrations

- API keys are shown once, stored as hashes, scoped to one institution and one role, revocable at once, and unable to manage people, keys or settings.
- Webhook deliveries are signed (HMAC-SHA256 with a timestamp to stop replays), time out after 5 seconds, never follow redirects, and in production refuse private, loopback, link-local (cloud metadata) and other internal addresses.
- Webhook secrets are encrypted at rest like private keys.

## HTTP

- Private routes answer only the web app's origin (plus `CORS_ORIGINS`); public verification is open to all.
- API responses carry `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy and, in production, HSTS.
- CSV exports neutralise spreadsheet formulas.
- Dependencies are audited (`npm audit --omit=dev`); the crypto core uses no third-party cryptography.

## Reporting a vulnerability

Please email the maintainer listed in the README rather than opening a public issue.
