import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@veridocs/database';
import { hashBuffer, verifySignature } from '@veridocs/crypto';
import { handleApiError } from '../../../../lib/errors';
import { VERIFY_UPLOAD_RATE_LIMIT } from '@veridocs/shared';
import { rateLimit } from '../../../../lib/rate-limit';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const identifier = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rate = await rateLimit(`verify-upload:${identifier}`, VERIFY_UPLOAD_RATE_LIMIT, '1m');
    if (!rate.success) return NextResponse.json({ success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Rate limit exceeded' } }, { status: 429 });
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File) || file.size > MAX_FILE_SIZE || file.type !== 'application/pdf') {
      return NextResponse.json({ success: false, error: 'A PDF file up to 10MB is required' }, { status: 400 });
    }
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    if (fileBuffer.subarray(0, 5).toString() !== '%PDF-') return NextResponse.json({ success: false, error: 'The uploaded file is not a valid PDF' }, { status: 400 });

    const fileHash = hashBuffer(fileBuffer);
    const document = await prisma.document.findFirst({ where: { fileHash }, include: { institution: true, keyPair: true } });
    if (!document) return NextResponse.json({ success: true, valid: false, reason: 'Document not found in registry. It may have been altered or never registered.' });
    if (!verifySignature(fileHash, document.signature, document.keyPair.publicKey)) return NextResponse.json({ success: true, valid: false, reason: 'Invalid signature. Document may be forged.' });
    if (document.status !== 'ACTIVE') return NextResponse.json({ success: true, valid: false, documentId: document.documentId, title: document.title, issuer: document.institution.name, status: document.status, reason: `Document is ${document.status.toLowerCase()}` });
    if (document.expiresAt && document.expiresAt < new Date()) return NextResponse.json({ success: true, valid: false, documentId: document.documentId, title: document.title, issuer: document.institution.name, status: 'EXPIRED', reason: 'Document has expired' });
    return NextResponse.json({ success: true, valid: true, documentId: document.documentId, title: document.title, issuer: document.institution.name, issuedAt: document.issuedAt.toISOString(), status: 'ACTIVE' });
  } catch (error) {
    return handleApiError(error);
  }
}