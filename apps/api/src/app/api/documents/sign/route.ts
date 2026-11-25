import { NextRequest, NextResponse } from 'next/server';
import { SIGN_RATE_LIMIT, signDocumentSchema } from '@veridocs/shared';
import { requireAuth, requireInstitutionRole, requireVerifiedEmail, SIGNERS } from '../../../../lib/auth/require-auth';
import { ValidationError } from '../../../../lib/errors';
import { limit, route } from '../../../../lib/http';
import { fileNameFor, readPdf, signingKey, signOne } from '../../../../lib/signing';

/**
 * Sign one PDF. multipart/form-data: file (PDF), institutionId, metadata (JSON:
 * title, description?, recipientName?, recipientEmail?, expiresAt?).
 * Answers with the signed PDF; its ID is in the X-Document-Id header.
 * Works with a dashboard session or an institution API key.
 */
export const POST = route(async (request: NextRequest) => {
  const user = await requireAuth(request);
  requireVerifiedEmail(user);
  await limit(`sign:${user.apiKey?.id ?? user.id}`, SIGN_RATE_LIMIT, '1m', 'You are signing faster than the limit allows. Wait a minute, or use batch signing.');

  const form = await request.formData();
  const institutionId = form.get('institutionId');
  if (typeof institutionId !== 'string' || !institutionId) throw new ValidationError('institutionId is required');
  await requireInstitutionRole(user, institutionId, SIGNERS);

  const pdf = await readPdf(form.get('file'));
  let metadata: unknown;
  try {
    metadata = JSON.parse(String(form.get('metadata') ?? '{}'));
  } catch {
    throw new ValidationError('metadata must be valid JSON');
  }
  const parsed = signDocumentSchema.safeParse(metadata);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);

  const { document, signedPdf } = await signOne({ pdf, meta: parsed.data, signer: user, key: await signingKey(institutionId) });
  return new NextResponse(new Uint8Array(signedPdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileNameFor(document.title, document.documentId)}"`,
      'X-Document-Id': document.documentId,
      'Cache-Control': 'no-store',
    },
  });
});
