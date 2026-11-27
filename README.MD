<div align="center">

# VeriDocs

**Trust, cryptographically verified.**

Open-source document verification using SHA-256 hashing, RSA-2048 signatures and QR codes.
Make forgery detectable and verification instant.

![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)
![Status](https://img.shields.io/badge/status-active%20development-blue.svg)

[Overview](#overview) · [How It Works](#how-it-works) · [Getting Started](#getting-started) · [API](#api-reference) · [Security](#security-model) · [Roadmap](#roadmap)

</div>

---

**Try it live: <https://veridocs-blue.vercel.app/verify>** and press one of the four sample certificates (genuine, revoked, expired, tampered). The API runs at <https://veridocs-api.vercel.app/api/health>.

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Why VeriDocs](#why-veridocs)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Features](#features)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Security Model](#security-model)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Comparison with Existing Systems](#comparison-with-existing-systems)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Academic certificates, land titles, medical records and export documents are still trusted on the strength of physical seals and stamps, all of which can be reproduced with a printer and a steady hand. Verifying them means phone calls, letters and manual checks: slow, expensive and unreliable.

VeriDocs changes the trust model. Instead of trusting paper, it trusts mathematics.

| Property | What it means |
|---|---|
| **Tamper-evident** | Changing even one character of a signed document changes its hash, so verification fails. |
| **Forgery-resistant** | Valid signatures cannot be created without the issuer's private key. |
| **Instant** | Verification takes about two seconds via QR code or PDF upload. |
| **Privacy-preserving** | Documents are never stored. Only hashes, signatures and metadata are. |
| **Portable** | Works with any PDF, any browser and any smartphone. |

---

## How It Works

VeriDocs rests on three primitives: **hashing**, **digital signatures** and **QR-based verification**.

### 1. Issuance

An institution uploads a PDF. The system:

1. Generates a unique **document ID**.
2. Generates a **QR code** linking to the public verification URL for that ID.
3. **Embeds the QR code** and the issuer's name into the PDF.
4. Computes the **SHA-256 hash** of the final PDF, a 64-character fingerprint unique to that exact file.
5. **Signs the hash** with the issuer's private key (RSA-2048).
6. **Stores only** the hash, signature and metadata (title, issuer, timestamps).

> The hash is computed *after* the QR code is embedded so that the PDF the recipient holds is byte-for-byte the file whose hash was signed. Hashing before embedding would make every legitimate upload fail verification.

### 2. Verification

Anyone can verify a document by:

- **Scanning the QR code** with a smartphone, which opens a verification page in any browser.
- **Uploading the PDF** to the verification portal.
- **Requesting the document ID** through the API.

VeriDocs then:

1. Looks up the stored hash and signature.
2. If a PDF was uploaded, recomputes its hash and compares it to the stored hash.
3. Verifies the signature against the issuer's public key.
4. Checks whether the document has been revoked or has expired.
5. Returns a clear result: **valid**, **altered**, **forged**, **revoked** or **expired**.

### 3. Tamper Detection

If anyone modifies the PDF (a grade, a date, a name), its hash changes. Uploading the modified file fails immediately:

> *"Document hash does not match. Document has been altered."*

---

## Why VeriDocs

The current trust model for documents is broken, and the problem is acute in Zambia and across Africa:

- Universities issue thousands of certificates each year, and employers have no fast way to verify them.
- Land registries are paper-based, and fraudulent titles are a recurring problem.
- Export documents (minerals, agriculture) are forged to evade taxes and regulations.
- Medical records are copied, altered and misrepresented.

Existing solutions are too expensive (enterprise PKI suites), too complex (blockchain infrastructure), too slow (manual checks) or too fragmented (national systems that don't interoperate).

VeriDocs is designed to be:

- **Free to deploy**: runs on the free tiers of modern cloud services.
- **Simple to understand**: no blockchain, no exotic cryptography, just hashes and signatures.
- **Fast to verify**: under two seconds via QR code.
- **Privacy-first**: no document storage, no data mining.
- **Standards-minded**: W3C Verifiable Credentials support and alignment with Zambia's ECTA framework are on the [roadmap](#roadmap).

---

## Architecture

VeriDocs is a monorepo with two applications and three shared packages.

```
veridocs/
├── apps/
│   ├── api/          Next.js API application (REST endpoints)
│   └── web/          Next.js web application (UI)
├── packages/
│   ├── crypto/       Hashing, signing, QR generation
│   ├── database/     Prisma schema and client
│   └── shared/       Shared types and Zod validators
├── docs/             Architecture, API reference, security model
└── .github/          CI/CD workflows
```

### Data Flow

**Signing**

```
Client → POST /api/documents/sign
       → Generate document ID
       → Generate QR code and embed into PDF
       → Hash final PDF (SHA-256)
       → Sign hash with issuer's private key (RSA-2048)
       → Store hash + signature + metadata
       → Return signed PDF
```

**Verification**

```
Client → GET /api/documents/verify/:documentId
       → Look up document
       → Check status (active, revoked, expired)
       → Return verification result

Client → POST /api/documents/verify-upload
       → Hash uploaded PDF
       → Compare to stored hash
       → Verify signature against issuer's public key
       → Return verification result
```

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 16 (App Router), React 19 | Web app |
| Styling | Tailwind CSS | Utility-first CSS |
| Icons | Lucide React | Consistent, accessible icons |
| Animation | Framer Motion | Performant animations |
| Backend | Next.js API Routes | Serverless endpoints |
| Database | PostgreSQL | Local, Supabase, Neon or any host |
| ORM | Prisma | Type-safe data access |
| Cryptography | Node.js `crypto` + `node-forge` | SHA-256 hashing, RSA-2048 signing |
| PDF | `pdf-lib` | Pure-JS PDF manipulation |
| QR codes | `qrcode` | Server-side QR generation |
| Validation | Zod | Runtime type validation |
| Auth | Built-in (scrypt, hashed sessions) or Supabase Auth | Switchable |
| Testing | Vitest and an HTTP end-to-end suite | Unit and end-to-end tests |
| CI/CD | GitHub Actions | Automated testing and deployment |
| Hosting | Vercel | Free-tier hosting for both apps |

---

## Features

**For issuers** (registrars, land offices, hospitals)

- **Sign one PDF or a whole class at once.** Batch signing takes up to 50 PDFs, fills titles and recipients from a CSV, and returns a ZIP with every signed file and a manifest of verification links.
- **A stamp people can use without a phone.** The first page gets a QR code plus the issuer, the verification link and the document ID.
- **Recipients on the record.** Name the person a document is about; whoever verifies it sees whose it is.
- **Revoke with a reason.** Anyone who checks a revoked document is told it was withdrawn, and why.
- **Teams and roles.** Administrators, issuers, auditors and viewers; email invitations; the last administrator can never be removed.
- **Key rotation.** Replace the signing key at any time; documents signed with older keys stay valid.
- **Analytics.** Documents by status, checks per day for 30 days, failed checks, the most-checked documents, recent activity.
- **Audit trail and CSV export** of everything signed and every action taken.

**For verifiers** (employers, banks, embassies)

- **Three ways to check, no account needed:** scan the QR code (in the browser, or with the phone's camera app), paste the link or ID, or drop the PDF.
- **The file never leaves your device.** Dropped PDFs are fingerprinted (SHA-256) in the browser; only the 64-character fingerprint is looked up.
- **A clear verdict:** genuine, altered, not found, forged, revoked or expired, with the evidence (fingerprints, key) a step away and a printable receipt.

**For developers**

- **API keys** so student-records or land systems can sign documents directly.
- **Signed webhooks** for `document.signed`, `document.revoked` and `document.verified` (HMAC-SHA256, with delivery history and test sends).
- **A public registry per institution:** every public key it has used and its revocation list, itself signed, so documents can be checked offline.

---

## Getting Started

### Prerequisites

- **Node.js** 20 or later and **npm** 10
- **PostgreSQL** 14 or later (local, or hosted such as Supabase or Neon)

### 1. Install

```bash
git clone https://github.com/BlessingsBlessedChongo/veridocs.git
cd veridocs
npm install
```

### 2. Configure

Copy `.env.example` to `.env` at the repository root (the API, the web app and the database scripts all read this one file) and set:

| Variable | What it is |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Your Postgres. The `veridocs` database is created by the first migration. |
| `MASTER_ENCRYPTION_KEY` | 64 hex characters (`openssl rand -hex 32`). Encrypts every institution's private key. **Back it up; never commit it.** |
| `AUTH_PROVIDER`, `NEXT_PUBLIC_AUTH_PROVIDER` | `local` (VeriDocs' own accounts, the default) or `supabase`. |
| `SMTP_HOST` … `EMAIL_FROM` | Email for confirmations, password resets and invitations. Leave `SMTP_HOST` empty in development and emails are printed in the API terminal instead. |
| `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL` | Where the web app and the API run. |
| `CORS_ORIGINS` | Optional: extra websites allowed to call the private API (comma-separated). |
| `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN` | Optional: shared rate limits across several servers. |

**Sign-in: built-in or Supabase.** With `AUTH_PROVIDER=local`, VeriDocs keeps its own accounts: passwords hashed with scrypt, revocable sessions stored only as hashes, one-time email links for confirmation and resets, and a list of signed-in devices. To use Supabase Auth instead, set both provider variables to `supabase` and fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.

### 3. Create the database and demo data

```bash
npm run db:migrate   # applies the migrations (creates the database if needed)
npm run db:seed      # optional: a demo university, its admin and three signed sample certificates
```

The seed prints the demo administrator's password (or uses `SEED_ADMIN_PASSWORD`) and saves sample signed PDFs (valid, revoked, expired) to `demo-documents/`.

### 4. Run

```bash
npm run dev
```

| App | URL |
|---|---|
| Web | http://localhost:3000 |
| API | http://localhost:3001 (`/api/health` shows the database, sign-in and key status) |

---

## Usage

### In the browser

1. **Create an account** at `/auth/signup` and confirm your email (in development, the link is printed in the API terminal).
2. **Create your institution.** If your email is on its domain, it is verified at once.
3. **Sign a document** (Documents → Sign a document) or a **batch**. The signed PDF downloads; give the recipient that exact file.
4. **Check it** at `/verify`: drop the PDF, scan the QR code or paste the link. Change one byte of the file and the check says *altered*.

### From another system (API keys)

Create a key under **API & webhooks**, then:

```bash
curl -X POST http://localhost:3001/api/documents/sign \
  -H "Authorization: Bearer vd_live_…" \
  -F "file=@certificate.pdf" \
  -F "institutionId=<institution id>" \
  -F 'metadata={"title":"Bachelor of Science in Computer Science","recipientName":"Chanda Mwale"}' \
  -o signed-certificate.pdf
```

The signed PDF is the response; its ID is in the `X-Document-Id` header.

### Verify

```bash
# By ID (what the QR code opens)
curl http://localhost:3001/api/documents/verify/<document id>

# By fingerprint: the file never leaves your machine
curl -X POST http://localhost:3001/api/documents/verify-hash \
  -H "Content-Type: application/json" \
  -d "{\"hash\":\"$(sha256sum signed-certificate.pdf | cut -d' ' -f1)\"}"
```

---

## API Reference

All responses are JSON `{ "success": true, "data": … }` or `{ "success": false, "error": { "code", "message" } }`, except signing (a PDF), batch signing (a ZIP) and export (a CSV). Private routes take `Authorization: Bearer <session token or API key>`. More detail is in [docs/api-reference.md](docs/api-reference.md).

**Public (no sign-in)**

| Method | Path | |
|---|---|---|
| GET | `/api/documents/verify/:documentId` | Check by ID |
| POST | `/api/documents/verify-hash` | Check by SHA-256 fingerprint `{ hash, documentId? }` |
| POST | `/api/documents/verify-upload` | Check by uploading the PDF (`file`, optional `documentId`) |
| GET | `/api/public/institutions/:id` | Public keys and signed revocation list |
| GET | `/api/health` | Service health |

Every check returns an `outcome`: `VALID`, `ALTERED`, `NOT_FOUND`, `FORGED`, `REVOKED` or `EXPIRED`, plus a plain-language `reason`.

**Signed in** (`…` is `/api/institutions/:id`)

| Area | Routes |
|---|---|
| Accounts (built-in sign-in) | `POST /api/auth/` `signup`, `login`, `logout`, `verify-email`, `resend-verification`, `forgot-password`, `reset-password`, `change-password`; `GET /api/auth/sessions`; `DELETE /api/auth/sessions/:id` |
| You | `GET /api/me` (you, your institutions, your invitations), `PATCH /api/me` |
| Institutions | `POST /api/institutions/register`, `GET`/`PATCH …`, `GET …/stats` |
| Members | `GET …/members`, `POST …/members/invite`, `POST`/`DELETE …/members/accept`, `PATCH`/`DELETE …/members/:userId` |
| Documents | `POST /api/documents/sign`, `POST /api/documents/sign-batch`, `GET /api/documents/:documentId`, `POST /api/documents/:documentId/revoke`, `GET …/documents`, `GET …/documents/export` |
| Keys | `GET …/keys`, `POST /api/key-pairs/:id/rotate` |
| Integrations | `GET`/`POST …/api-keys`, `DELETE /api/api-keys/:id`, `GET`/`POST …/webhooks`, `PATCH`/`DELETE /api/webhooks/:id`, `POST /api/webhooks/:id/test` |
| Records | `GET …/audit-logs`, `GET …/verifications` |

### Webhook signatures

Each delivery carries `X-VeriDocs-Event` and `X-VeriDocs-Signature: t=<unix seconds>,v1=<hex>`, where `v1` is HMAC-SHA256 of `"<t>.<raw body>"` with the webhook's secret:

```js
const [, t, v1] = /t=(\d+),v1=([0-9a-f]+)/.exec(req.headers['x-veridocs-signature'])
const expected = crypto.createHmac('sha256', process.env.VERIDOCS_WEBHOOK_SECRET).update(`${t}.${rawBody}`).digest('hex')
const genuine = crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected)) && Date.now() / 1000 - Number(t) < 300
```

### Offline verification

`GET /api/public/institutions/:id` returns every key the institution has used (with validity dates) and its revoked document IDs, signed with its active key. With that cached, a document can be checked with no network: SHA-256 the PDF, verify the RSA-SHA256 signature over the hex fingerprint, and make sure the ID isn't revoked.

---

## Security Model

| Property | How it is achieved |
|---|---|
| **Integrity** | SHA-256 of the final signed PDF. Any change, even re-saving, changes the fingerprint. |
| **Authenticity** | RSA-2048 (RSA-SHA256) signatures, re-verified against the institution's key on every check, so a tampered database record is caught as *forged*. |
| **Accountability** | Every signing, revocation, role change, key rotation and API key is in the audit trail. |

**Keys.** Private keys are encrypted with AES-256-GCM under `MASTER_ENCRYPTION_KEY` and decrypted only for the moment of signing. Rotation keeps old keys for checking older documents. *Trust note:* the server signs on the institution's behalf, so whoever holds both the database and the master key could sign as any institution. Use a managed key service in production; issuer-held hardware keys are on the roadmap.

**Accounts.** scrypt password hashes; session tokens and email links stored only as SHA-256 hashes; one-time links (48 hours to confirm an email, 30 minutes for a password reset); resets and password changes sign out other devices; rate limits on sign-in per network and per account; password-reset requests never reveal whether an account exists. Signing, creating institutions, accepting invitations and creating API keys require a confirmed email.

**API keys** are shown once, stored hashed, scoped to one institution and role, and cannot manage people, keys or settings.

**Webhooks** are signed, time out after 5 seconds, never follow redirects, and in production refuse private and internal addresses (no SSRF).

**Privacy.** Documents are never stored: only fingerprints, signatures and the metadata you enter. Browser checks send only the fingerprint. Recipient emails are never shown publicly. In the checks list, verifiers' addresses are shortened (`41.72.x.x`) and browsers summarised.

**HTTP.** Strict CORS on private routes (public verification is open to any site), `Content-Security-Policy: default-src 'none'` on the API, HSTS in production, `X-Frame-Options: DENY`, `nosniff`, and CSV exports guarded against formula injection.

---

## Project Structure

```
veridocs/
├── apps/
│   ├── api/                     Next.js route handlers (port 3001)
│   │   ├── src/app/api/         auth, me, institutions, documents, public, keys, api-keys, webhooks, health
│   │   ├── src/lib/             auth (local, Supabase, API keys), signing, verify, webhooks, email, rate limits
│   │   ├── src/__tests__/       unit tests (Vitest)
│   │   └── scripts/e2e.ts       end-to-end check of every flow against running servers
│   └── web/                     Next.js app (port 3000)
│       ├── app/verify/          public checks: file (hashed in the browser), QR scan, link or ID
│       ├── app/dashboard/       institutions, overview, documents, batch, members, checks, audit, keys, API & webhooks, settings
│       ├── app/auth/, app/account/
│       ├── components/app/ui.tsx   the dashboard's shared building blocks
│       └── lib/                 API client, provider-agnostic sign-in client, types
├── packages/
│   ├── crypto/                  SHA-256, RSA signing, AES-GCM key encryption, PDF stamping, key fingerprints
│   ├── database/                Prisma schema, migrations, seed
│   └── shared/                  Zod validators, constants, types
└── .github/workflows/ci.yml     type-check, tests, migrations, schema drift, builds
```

---

## Testing

```bash
npm test             # unit tests: crypto, passwords, verdicts, webhook signatures, SSRF guard, rate limits
npm run typecheck    # TypeScript across every package
npm run e2e --workspace=@veridocs/api   # with the API running: end-to-end checks across every flow
```

The end-to-end check creates a throwaway account and institution and covers sign-up and email confirmation, signing, every verification method, one-byte tampering, batch signing with a broken file, API keys (and that revoked ones stop working), signed webhook deliveries, revocation, the signed public registry, invitations, the last-administrator rule, search, CSV export, analytics and the audit trail.

CI runs type-checks, unit tests, migrations on a fresh Postgres, a schema-drift check and production builds on every push.

---

## Deployment

Both apps deploy to any Node host (on Vercel, create one project with root `apps/api` and one with root `apps/web`). Set the same environment variables on both, with:

- `NEXT_PUBLIC_APP_URL` = the web app's public URL (it goes into every QR code, so settle it before signing real documents)
- `NEXT_PUBLIC_API_URL` = the API's public URL
- a production Postgres, then `npm run db:deploy` to apply migrations
- real SMTP settings, so confirmation and reset emails are sent

The hosted copy runs this way: two Vercel projects (the API pinned to Frankfurt in `apps/api/vercel.json`, next to its database) and a Neon PostgreSQL. Vercel's free plan limits an upload to about 4.5 MB.

---

## Roadmap

### Done

- [x] Built-in accounts alongside Supabase Auth
- [x] Batch signing with CSV import
- [x] Issuer dashboard with analytics
- [x] Signed revocation lists and a public key registry (offline verification)
- [x] Webhooks for signing, revocation and verification events
- [x] Dark mode with system preference detection
- [x] Verification without uploading the document

### Next

- [ ] W3C Verifiable Credentials export
- [ ] Multi-signature documents for high-value records
- [ ] Multi-language interface (English, Bemba, Nyanja, Tonga, Lozi)
- [ ] SDKs (JavaScript, Python, Go) and a command-line offline verifier
- [ ] A review queue for institutions whose domain is not yet confirmed

### Later

- [ ] Issuer-held, hardware-backed keys (WebAuthn, HSM, KMS)
- [ ] Post-quantum signatures (ML-DSA / CRYSTALS-Dilithium)
- [ ] Selective disclosure with zero-knowledge proofs
- [ ] Integration with Zambia's National PKI; ISO 27001 alignment

---

## Comparison with Existing Systems

| Feature | Enterprise PKI | Blockchain (Blockcerts) | National platforms (verify.gov.kh) | **VeriDocs** |
|---|---|---|---|---|
| Cost | High (licensing) | Variable (gas fees) | Government-funded | **Free** |
| Tamper detection | File-level | Object-level | Cryptographic hash | **SHA-256 + RSA-2048 signature** |
| Verification speed | Low latency | ~1.5s | Instant | **Instant via QR, ~1.5s via upload** |
| Offline support | No | No | Yes (QR printouts) | **Yes (signed key registry and revocation list)** |
| Privacy | Varies | Public ledger | Centralized | **No document storage** |
| Deployment complexity | High | High | Moderate | **Low** |
| Standards | eIDAS, ZertES | W3C VC | National | **W3C VC (planned)** |
| Open source | No | Yes | No | **Yes** |

VeriDocs is a lightweight, zero-cost, open-source alternative that pairs the cryptographic rigor of PKI with the accessibility of QR-based verification, without the complexity of blockchain or the cost of enterprise suites.

---

## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push the branch: `git push origin feature/your-feature`
5. Open a pull request.

Before submitting, make sure:

- Tests pass (`npm test`)
- Code is formatted (`npm run format`)
- Linting passes (`npm run lint`)
- New features include tests and documentation

---

## License

Released under the [MIT License](LICENSE).

---

## Acknowledgements

Inspired by:

- Kenya's KNEC TrueCert system for academic credential verification
- Cambodia's verify.gov.kh platform for digital document equivalence
- The W3C Verifiable Credentials Working Group
- The open-source community behind `pdf-lib`, `node-forge` and `qrcode`

## Contact

- Open an issue on GitHub
- Maintainer: blessingsblessedchongo@gmail.com

---

<div align="center">

**VeriDocs**: because trust should be provable, not assumed.

</div>
