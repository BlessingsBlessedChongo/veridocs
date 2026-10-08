import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@veridocs/database';
import { verifyDocumentSchema } from '@veridocs/shared';
import { handleApiError } from '../../../../../lib/errors';
import { VERIFY_DOCUMENT_RATE_LIMIT } from '@veridocs/shared';
import { rateLimit } from '../../../../../lib/rate-limit';

export async function GET(request: NextRequest, { params }: { params: { documentId: string } }) {
  const validation = verifyDocumentSchema.safeParse(params);
  if (!validation.success) return NextResponse.json({ success: false, valid: false, error: 'Invalid document ID' }, { status: 400 });

  try {
    const identifier = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rate = await rateLimit(`verify-document:${identifier}`, VERIFY_DOCUMENT_RATE_LIMIT, '1m');
    if (!rate.success) return NextResponse.json({ success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Rate limit exceeded' } }, { status: 429 });
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const document = await prisma.document.findUnique({ where: { documentId: validation.data.documentId }, include: { institution: true } });

    if (!document) return NextResponse.json({ success: false, valid: false, error: 'Document not found' }, { status: 404 });

    let result: { valid: boolean; status: string; reason?: string } = { valid: true, status: 'ACTIVE' };
    if (document.status === 'REVOKED') result = { valid: false, status: 'REVOKED', reason: document.revocationReason || 'Document has been revoked' };
    else if (document.expiresAt && document.expiresAt < new Date()) result = { valid: false, status: 'EXPIRED', reason: 'Document has expired' };

    await prisma.verification.create({ data: { documentId: document.id, result: result.valid ? 'VALID' : result.status, ipAddress, userAgent, failureReason: result.reason } });
    return NextResponse.json({ success: true, valid: result.valid, documentId: document.documentId, title: document.title, issuer: document.institution.name, issuedAt: document.issuedAt.toISOString(), status: result.status, reason: result.reason });
  } catch (error) {
    return handleApiError(error);
  }
}