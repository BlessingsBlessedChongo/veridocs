import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@veridocs/database';
import { decryptPrivateKey, signDocument } from '@veridocs/crypto';
import { InstitutionRole, MAX_FILE_SIZE, SIGN_RATE_LIMIT, signDocumentSchema } from '@veridocs/shared';
import { requireAuth, requireInstitutionRole } from '../../../../lib/auth/require-auth';
import { handleApiError, NotFoundError, ValidationError } from '../../../../lib/errors';
import { logAudit } from '../../../../lib/audit';
import { rateLimit } from '../../../../lib/rate-limit';


export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const rate = await rateLimit(`sign:${user.id}`, SIGN_RATE_LIMIT, '1m');
    if (!rate.success) throw new ValidationError('Signing rate limit exceeded');
    const formData = await request.formData();
    const file = formData.get('file');
    const institutionId = formData.get('institutionId');
    const metadataJson = formData.get('metadata');

    if (!(file instanceof File) || typeof institutionId !== 'string') throw new ValidationError('File and institutionId are required');
    await requireInstitutionRole(user, institutionId, [InstitutionRole.ADMIN, InstitutionRole.ISSUER]);
    if (file.size > MAX_FILE_SIZE || file.type !== 'application/pdf') {
      throw new ValidationError('Only PDF files up to 10MB are accepted');
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    if (fileBuffer.subarray(0, 5).toString() !== '%PDF-') {
      throw new ValidationError('The uploaded file is not a valid PDF');
    }

    let metadata: unknown;
    try {
      metadata = JSON.parse(typeof metadataJson === 'string' ? metadataJson : '{}');
    } catch {
      throw new ValidationError('Metadata must be valid JSON');
    }
    const validation = signDocumentSchema.safeParse(metadata);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const institution = await prisma.institution.findUnique({ where: { id: institutionId }, include: { keyPairs: { where: { status: 'ACTIVE' }, take: 1 } } });
    if (!institution || institution.keyPairs.length === 0) throw new NotFoundError('Institution or active signing key not found');

    const masterKey = process.env.MASTER_ENCRYPTION_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!masterKey || !appUrl) throw new Error('Required environment variables are not configured');

    const documentId = crypto.randomUUID();
    const keyPair = institution.keyPairs[0];
    const privateKey = decryptPrivateKey(keyPair.encryptedPrivateKey, masterKey);
    const result = await signDocument({
      pdfBuffer: fileBuffer,
      documentId,
      verificationUrl: `${appUrl}/verify/${documentId}`,
      issuerName: institution.name,
      privateKeyPem: privateKey,
    });

    const document = await prisma.document.create({
      data: {
        documentId,
        title: validation.data.title,
        description: validation.data.description,
        fileHash: result.fileHash,
        signature: result.signature,
        qrCodeUrl: result.qrCodeDataUrl,
        expiresAt: validation.data.expiresAt ? new Date(validation.data.expiresAt) : null,
        institutionId: institution.id,
        signedByUserId: user.id,
        keyPairId: keyPair.id,
      },
    });
    await logAudit({ action: 'DOCUMENT_SIGNED', entityType: 'Document', entityId: document.id, actorUserId: user.id, institutionId: institution.id, documentId: document.id, metadata: { title: document.title, fileHash: result.fileHash } });

    return new NextResponse(new Uint8Array(result.signedPdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="signed-${documentId}.pdf"`,
        'X-Document-Id': documentId,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}