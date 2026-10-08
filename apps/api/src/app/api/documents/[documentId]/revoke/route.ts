import { NextRequest, NextResponse } from 'next/server';
import { InstitutionRole, revokeDocumentSchema } from '@veridocs/shared';
import { prisma } from '@veridocs/database';
import { requireAuth, requireInstitutionRole } from '../../../../../lib/auth/require-auth';
import { handleApiError, NotFoundError, ValidationError } from '../../../../../lib/errors';
import { logAudit } from '../../../../../lib/audit';

export async function POST(request: NextRequest, { params }: { params: { documentId: string } }) {
  try {
    const user = await requireAuth(request);
    const document = await prisma.document.findUnique({ where: { documentId: params.documentId } });
    if (!document) throw new NotFoundError('Document not found');
    await requireInstitutionRole(user, document.institutionId, [InstitutionRole.ADMIN, InstitutionRole.ISSUER]);
    const validation = revokeDocumentSchema.safeParse(await request.json());
    if (!validation.success) throw new ValidationError(validation.error.errors[0].message);
    const updated = await prisma.document.update({ where: { id: document.id }, data: { status: 'REVOKED', revokedAt: new Date(), revocationReason: validation.data.reason } });
    await logAudit({ action: 'DOCUMENT_REVOKED', entityType: 'Document', entityId: document.id, actorUserId: user.id, institutionId: document.institutionId, documentId: document.id, metadata: { reason: validation.data.reason } });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}