# VeriDocs API reference

Base URL: your API (`http://localhost:3001` in development).

Every response is JSON, `{ "success": true, "data": … }` or `{ "success": false, "error": { "code": "…", "message": "…" } }`, except signing (a PDF), batch signing (a ZIP) and the CSV export.

**Authentication.** Private routes take `Authorization: Bearer <token>`, where the token is either a session (from signing in; `vds_…` with built-in sign-in, or a Supabase access token) or an institution API key (`vd_live_…`). API keys act for one institution with one role and cannot manage people, keys, API keys, webhooks or settings.

**Errors.** `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 CONFLICT`, `429 RATE_LIMIT_EXCEEDED`, `500 INTERNAL_ERROR`. Messages are written to be shown to people.

**Roles.** `ADMIN` (everything), `ISSUER` (sign, revoke, read), `AUDITOR` (read documents, checks and the audit trail), `VIEWER` (read documents).

In the paths below, `…` stands for `/api/institutions/:institutionId`.

## Public verification

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/documents/verify/:documentId` | | What the QR code opens. |
| POST | `/api/documents/verify-hash` | `{ "hash": "<64 hex>", "documentId"?: "<uuid>" }` | The file stays with the caller. With `documentId`, compares against that document (so a changed copy reports `ALTERED`). |
| POST | `/api/documents/verify-upload` | multipart: `file`, `documentId`? | The PDF is hashed in memory and never stored. |
| GET | `/api/public/institutions/:id` | | Identity, every public key (`fingerprint`, `validFrom`, `validUntil`), `revoked` IDs, `revokedSignature` (RSA-SHA256 over `JSON.stringify(revoked)` with the active key). Cached 5 minutes. |
| GET | `/api/health` | | `database`, `auth`, `signingKeys`; 503 when unhealthy. |

Verification result:

```json
{
  "valid": true,
  "outcome": "VALID",
  "reason": "This document is authentic and has not been changed since it was signed.",
  "method": "HASH",
  "documentId": "3f2a0c1e-…",
  "title": "Bachelor of Science",
  "recipientName": "Chanda Mwale",
  "issuer": "University of Zambia",
  "issuerDetails": { "id": "…", "name": "University of Zambia", "emailDomain": "unza.zm", "verificationStatus": "DOMAIN_VERIFIED" },
  "issuedAt": "2026-11-25T10:30:00.000Z",
  "expiresAt": null,
  "revokedAt": null,
  "revocationReason": null,
  "fileHash": "…64 hex…",
  "signature": { "algorithm": "RSA-2048", "keyFingerprint": "96:BC:…", "keyStatus": "ACTIVE" },
  "verificationUrl": "https://…/verify/3f2a0c1e-…",
  "checkedAt": "…"
}
```

`outcome` is one of `VALID`, `ALTERED`, `NOT_FOUND` (nothing else is revealed), `FORGED`, `REVOKED`, `EXPIRED`.

## Accounts (built-in sign-in, `AUTH_PROVIDER=local`)

| Method | Path | Body |
|---|---|---|
| POST | `/api/auth/signup` | `{ email, password, fullName }` → `{ token, expiresAt, user }` |
| POST | `/api/auth/login` | `{ email, password }` → `{ token, expiresAt, user }` |
| POST | `/api/auth/logout` | `?everywhere=1` signs out every device |
| POST | `/api/auth/verify-email` | `{ token }` (from the emailed link) |
| POST | `/api/auth/resend-verification` | |
| POST | `/api/auth/forgot-password` | `{ email }`; always answers the same way |
| POST | `/api/auth/reset-password` | `{ token, password }` → a new session; other sessions end |
| POST | `/api/auth/change-password` | `{ currentPassword, newPassword }`; other sessions end |
| GET | `/api/auth/sessions` | signed-in devices |
| DELETE | `/api/auth/sessions/:sessionId` | sign one device out |

Passwords: at least 10 characters, with letters and a number or symbol, not built from the email name.

## You

| Method | Path | |
|---|---|---|
| GET | `/api/me` | `{ user, authProvider, institutions[], invitations[] }` |
| PATCH | `/api/me` | `{ fullName }` |

## Institutions and members

| Method | Path | Role | Body / notes |
|---|---|---|---|
| POST | `/api/institutions/register` | confirmed email | `{ name, emailDomain }`; domain-verified when your email is on it |
| GET | `…` | any | details, your `role`, `activeKey` with fingerprint |
| PATCH | `…` | ADMIN | `{ name }` |
| GET | `…/stats` | any | documents by status, 30-day daily checks, most checked, recent activity |
| GET | `…/members` | any | members and pending invitations |
| POST | `…/members/invite` | ADMIN | `{ email, role }`; emails a link (works for people without an account) |
| POST | `…/members/accept` | invitee, confirmed email | accept |
| DELETE | `…/members/accept` | invitee | decline |
| PATCH | `…/members/:userId` | ADMIN | `{ role }`; the last administrator can't be demoted |
| DELETE | `…/members/:userId` | ADMIN, or yourself to leave | removes, or cancels an invitation |

## Documents

| Method | Path | Role | Notes |
|---|---|---|---|
| POST | `/api/documents/sign` | ADMIN, ISSUER (or API key) | multipart: `file` (PDF ≤ 10 MB), `institutionId`, `metadata` = `{ title, recipientName?, recipientEmail?, description?, expiresAt? }`. Answers with the PDF; `X-Document-Id` header. Refuses damaged, password-protected and already-signed PDFs. |
| POST | `/api/documents/sign-batch` | ADMIN, ISSUER (or API key) | multipart: `institutionId`, `files` (≤ 50), `documents` = JSON array of metadata in file order. Answers with a ZIP (PDFs + `manifest.csv`); `X-Batch-Id`, `X-Batch-Signed`, `X-Batch-Failed` headers. |
| GET | `/api/documents/:documentId` | any member | details, key fingerprint, last 25 checks, totals by outcome |
| POST | `/api/documents/:documentId/revoke` | ADMIN, ISSUER | `{ reason }` |
| GET | `…/documents` | any | `?search=` (title, recipient, ID prefix) `&status=ACTIVE|REVOKED|EXPIRED&from=&to=&page=&pageSize=` |
| GET | `…/documents/export` | ADMIN, ISSUER, AUDITOR | same filters, as CSV |

## Keys, integrations and records

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `…/keys` | any | every key with fingerprint, status and documents signed |
| POST | `/api/key-pairs/:keyPairId/rotate` | ADMIN | old documents stay valid |
| GET / POST | `…/api-keys` | ADMIN | `{ name, role }`; the secret is returned once |
| DELETE | `/api/api-keys/:apiKeyId` | ADMIN | revoke |
| GET / POST | `…/webhooks` | ADMIN | `{ url, events[] }`; the secret (`whsec_…`) is returned once |
| PATCH | `/api/webhooks/:webhookId` | ADMIN | `{ active }` |
| DELETE | `/api/webhooks/:webhookId` | ADMIN | |
| POST | `/api/webhooks/:webhookId/test` | ADMIN | sends a test delivery and reports the answer |
| GET | `…/audit-logs` | ADMIN, AUDITOR | `?search=` matches the action, the person, or the document title |
| GET | `…/verifications` | ADMIN, ISSUER, AUDITOR | `?status=<outcome>`; network addresses are shortened |

## Webhooks

Events: `document.signed`, `document.revoked`, `document.verified`. Each delivery is a POST with JSON `{ event, createdAt, data }` and the headers `X-VeriDocs-Event` and `X-VeriDocs-Signature: t=<unix seconds>,v1=<hex>`, where `v1 = HMAC-SHA256(secret, "<t>.<raw body>")`. Reject deliveries older than five minutes. Deliveries time out after 5 seconds, don't follow redirects and, in production, never go to private or internal addresses.

## Rate limits

Per network: sign-in 30 / 15 min, sign-up 10 / hour, checks by ID 300 / min, by file or fingerprint 100 / min. Per account or key: signing 10 / min, batches 10 / hour, sign-in 10 / 15 min per email. Set `UPSTASH_REDIS_URL` and `UPSTASH_REDIS_TOKEN` to share limits across servers.
