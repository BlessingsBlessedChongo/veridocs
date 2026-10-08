# Security Model

Supabase Auth provides identity and JWT verification. Institution membership and role checks are enforced server-side for every protected route. Public verification exposes only document verification metadata.

PDF uploads are limited to 10 MB, require `application/pdf`, and must begin with the `%PDF-` magic bytes. Signing requests are rate limited per user; public verification is rate limited per IP.

RSA-2048 private keys are encrypted with `MASTER_ENCRYPTION_KEY` before storage. Key rotation marks the previous key as `ROTATED` and creates a new active key. Audit records identify the actor, institution, entity, and action. A managed KMS or HSM is the recommended future enhancement.