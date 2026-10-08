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

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Why VeriDocs](#why-veridocs)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
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
| Frontend | Next.js 14 (App Router) | Server components, SEO |
| Styling | Tailwind CSS | Utility-first CSS |
| Icons | Lucide React | Consistent, accessible icons |
| Animation | Framer Motion | Performant animations |
| Backend | Next.js API Routes | Serverless endpoints |
| Database | PostgreSQL (Supabase) | Managed, free-tier database |
| ORM | Prisma | Type-safe data access |
| Cryptography | Node.js `crypto` + `node-forge` | SHA-256 hashing, RSA-2048 signing |
| PDF | `pdf-lib` | Pure-JS PDF manipulation |
| QR codes | `qrcode` | Server-side QR generation |
| Validation | Zod | Runtime type validation |
| Testing | Vitest + Playwright | Unit and end-to-end tests |
| CI/CD | GitHub Actions | Automated testing and deployment |
| Hosting | Vercel | Free-tier hosting for both apps |

---

## Getting Started

### Authentication and Authorization

VeriDocs uses Supabase Auth for identity and mirrors authenticated users into the local `User` table. Institution membership grants one of `ADMIN`, `ISSUER`, `AUDITOR`, or `VIEWER` roles. Protected API routes require a Supabase bearer token; document verification remains public.

Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` alongside the database variables in `.env`. After migrations, seed a local demo institution with:

```bash
npm run db:seed
```

The seed creates `admin@unza.zm`, the University of Zambia institution, an active admin membership, and an encrypted active signing key.

### Prerequisites

- **Node.js** 20+
- **npm** 10+
- **Git**
- **OpenSSL** (to generate the encryption key)
- A free **[Supabase](https://supabase.com)** account

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/yourusername/veridocs.git
cd veridocs
```

**2. Install dependencies**

```bash
npm install
```

**3. Create a Supabase project**

Create a project named `veridocs`, then copy the connection string from **Settings → Database**.

**4. Configure environment variables**

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
MASTER_ENCRYPTION_KEY="your-64-character-hex-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

Generate the master encryption key:

```bash
openssl rand -hex 32
```

> **Keep `MASTER_ENCRYPTION_KEY` secret and backed up.** It encrypts every issuer's private key. If it is lost, those keys cannot be recovered. Never commit `.env`.

**5. Initialize the database**

```bash
npm run db:generate
npm run db:migrate
```

**6. Start the development servers**

```bash
npm run dev
```

| App | URL |
|---|---|
| Web | http://localhost:3000 |
| API | http://localhost:3001 |

> The two apps must run on different ports. Set `"dev": "next dev -p 3001"` in `apps/api/package.json` if it isn't already.

---

## Usage

The examples below call the API on `localhost:3001`.

### Register an issuer

```bash
curl -X POST http://localhost:3001/api/issuers/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "University of Zambia",
    "email": "registrar@unza.zm"
  }'
```

The response contains the issuer's ID and public key.

### Sign a document

```bash
curl -X POST http://localhost:3001/api/documents/sign \
  -F "file=@certificate.pdf" \
  -F "issuerEmail=registrar@unza.zm" \
  -F 'metadata={"title":"Bachelor of Science in Computer Science","description":"Issued to Chanda Mwale"}' \
  -o signed-certificate.pdf
```

The response is a signed PDF with an embedded QR code.

### Verify by ID

```bash
curl http://localhost:3001/api/documents/verify/{documentId}
```

```json
{
  "success": true,
  "valid": true,
  "documentId": "abc123",
  "title": "Bachelor of Science in Computer Science",
  "issuer": "University of Zambia",
  "issuedAt": "2026-10-08T10:30:00.000Z",
  "status": "ACTIVE"
}
```

### Verify by upload

```bash
curl -X POST http://localhost:3001/api/documents/verify-upload \
  -F "file=@signed-certificate.pdf"
```

---

## API Reference

### `POST /api/issuers/register`

Registers a new issuer. Generates an RSA-2048 key pair and stores the encrypted private key.

**Body**

```json
{
  "name": "string (2-200 chars)",
  "email": "string (valid email)"
}
```

**Response**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "publicKey": "PEM-encoded public key",
    "createdAt": "ISO 8601 timestamp"
  }
}
```

### `POST /api/documents/sign`

Signs a PDF document.

**Request:** `multipart/form-data`

| Field | Type | Notes |
|---|---|---|
| `file` | PDF | Max 10 MB |
| `issuerEmail` | string | Registered issuer's email |
| `metadata` | JSON string | `title` (required), `description` and `expiresAt` (optional) |

**Response:** the signed PDF with embedded QR code.

### `GET /api/documents/verify/:documentId`

Verifies a document by ID.

```json
{
  "success": true,
  "valid": true,
  "documentId": "string",
  "title": "string",
  "issuer": "string",
  "issuedAt": "ISO 8601 timestamp",
  "status": "ACTIVE | REVOKED | EXPIRED"
}
```

### `POST /api/documents/verify-upload`

Verifies a document by uploading its PDF.

**Request:** `multipart/form-data` with `file` (PDF).
**Response:** same shape as `GET /api/documents/verify/:documentId`.

### `GET /api/health`

```json
{
  "status": "healthy",
  "timestamp": "ISO 8601 timestamp",
  "services": {
    "database": "connected",
    "api": "running"
  }
}
```

---

## Security Model

VeriDocs is built around three properties.

| Property | How it is achieved |
|---|---|
| **Integrity** | SHA-256 fingerprinting. Any modification changes the hash, and verification compares it to the stored value. |
| **Authenticity** | RSA-2048 signatures verified against the issuer's public key. |
| **Non-repudiation** | The signature is mathematically bound to the document hash and the issuer's key. |

### Key management

- Private keys are encrypted with **AES-256-GCM** before storage.
- The encryption key lives in the `MASTER_ENCRYPTION_KEY` environment variable.
- Revoked keys are checked on every verification.
- **Production recommendation:** store keys in an HSM or a managed key service (AWS KMS, Google Cloud KMS, HashiCorp Vault).

> **Trust note:** in the current design the server holds (encrypted) issuer private keys and signs on their behalf. Anyone who obtains both the database and the master key could sign as any issuer, which also weakens strict non-repudiation. Hardware-backed, issuer-held keys are on the [roadmap](#long-term) for this reason.

### Revocation

Issuers can revoke documents. Revoked documents fail verification with a clear reason, and the revocation is recorded in the audit trail.

### Audit trail

Every action is logged with timestamp, IP address and user agent:

- Issuer registrations
- Document signings
- Verifications (successful and failed)
- Revocations and status changes

### Privacy

VeriDocs does not store documents. Only hashes, signatures and metadata are kept; the document stays with its holder.

---

## Project Structure

```
veridocs/
├── apps/
│   ├── api/
│   │   ├── src/app/api/
│   │   │   ├── issuers/register/route.ts
│   │   │   ├── documents/sign/route.ts
│   │   │   ├── documents/verify/[documentId]/route.ts
│   │   │   ├── documents/verify-upload/route.ts
│   │   │   └── health/route.ts
│   │   ├── next.config.js
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/
│       ├── src/app/
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   ├── globals.css
│       │   ├── verify/
│       │   │   ├── page.tsx
│       │   │   └── [documentId]/page.tsx
│       │   ├── register/page.tsx
│       │   └── docs/page.tsx
│       ├── tailwind.config.js
│       ├── postcss.config.js
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── crypto/
│   │   ├── src/
│   │   │   ├── hash.ts
│   │   │   ├── keys.ts
│   │   │   ├── signing.ts
│   │   │   ├── index.ts
│   │   │   └── __tests__/crypto.test.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── database/
│   │   ├── prisma/schema.prisma
│   │   ├── src/index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── shared/
│       ├── src/
│       │   ├── validators.ts
│       │   ├── types.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── docs/
│   ├── architecture.md
│   ├── api-reference.md
│   └── security.md
├── .github/workflows/ci.yml
├── turbo.json
├── package.json
└── README.md
```

---

## Testing

```bash
# All tests
npm test

# Crypto package only
cd packages/crypto && npm test

# End-to-end
npm run test:e2e
```

The crypto suite covers:

- Hash consistency (same input → same hash)
- Hash uniqueness (different input → different hash)
- Single-character change detection
- Signature validity
- Signature rejection on tampered data
- Signature rejection on the wrong key

---

## Deployment

VeriDocs is designed for Vercel's free tier, as two projects from one repository.

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial VeriDocs deployment"
git push origin main
```

### 2. Deploy the API

1. In [Vercel](https://vercel.com), click **Add New Project** and select the repository.
2. Set **Root Directory** to `apps/api`.
3. Set **Build Command** to `cd ../.. && npm run build`.
4. Leave **Output Directory** as the default (`.next`).
5. Add environment variables: `DATABASE_URL`, `MASTER_ENCRYPTION_KEY`, `NEXT_PUBLIC_APP_URL`.
6. Click **Deploy**.

### 3. Deploy the web app

1. Create a second Vercel project from the same repository.
2. Set **Root Directory** to `apps/web`.
3. Set **Build Command** to `cd ../.. && npm run build`.
4. Leave **Output Directory** as the default (`.next`).
5. Add environment variables: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL` (the deployed API URL).
6. Click **Deploy**.

> **Serverless database tip:** on Vercel, use Supabase's pooled connection string (port `6543`, with `?pgbouncer=true`) for `DATABASE_URL` to avoid exhausting connections, and keep the direct connection for migrations.
>
> **CORS:** because the web app and API are separate origins, allow the web app's origin in the API's CORS configuration.

### Environment variables

| Variable | Description | Where to get it |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Supabase → Settings → Database |
| `MASTER_ENCRYPTION_KEY` | 64-char hex key encrypting issuer private keys | `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | Public URL of the web app | Vercel deployment URL |
| `NEXT_PUBLIC_API_URL` | Public URL of the API | Vercel deployment URL |

---

## Roadmap

### Near-term

- [ ] Offline verification with cached public keys
- [ ] Batch verification via CSV or ZIP upload
- [ ] Issuer dashboard with analytics
- [ ] Revocation lists (CRL/OCSP)
- [ ] Multi-signature documents for high-value records
- [ ] Dark mode with system preference detection

### Mid-term

- [ ] W3C Verifiable Credentials support
- [ ] Mobile apps (React Native)
- [ ] Blockchain anchoring for immutable audit trails
- [ ] Multi-language support (English, Bemba, Nyanja, Tonga, Lozi)
- [ ] Webhooks for verification events
- [ ] SDKs (JavaScript, Python, Go)

### Long-term

- [ ] Post-quantum cryptography (CRYSTALS-Dilithium)
- [ ] Zero-knowledge proofs for selective disclosure
- [ ] Hardware-backed keys (WebAuthn, YubiKey)
- [ ] Integration with Zambia's National PKI
- [ ] ISO 27001 alignment

---

## Comparison with Existing Systems

| Feature | Enterprise PKI | Blockchain (Blockcerts) | National platforms (verify.gov.kh) | **VeriDocs** |
|---|---|---|---|---|
| Cost | High (licensing) | Variable (gas fees) | Government-funded | **Free** |
| Tamper detection | File-level | Object-level | Cryptographic hash | **SHA-256 + RSA-2048 signature** |
| Verification speed | Low latency | ~1.5s | Instant | **Instant via QR, ~1.5s via upload** |
| Offline support | No | No | Yes (QR printouts) | **Planned** |
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
