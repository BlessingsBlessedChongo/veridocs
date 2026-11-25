import { NextRequest } from 'next/server';
import { revokeDocumentSchema } from '@veridocs/shared';
import { prisma } from '@veridocs/database';
import { requireAuth, requireInstitutionRole, SIGNERS } from '../../../../../lib/auth/require-auth';
import { ConflictError, NotFoundError } from '../../../../../lib/errors';
import { ok, readJson, route } from '../../../../../lib/http';
import { logAudit } from '../../../../../lib/audit';
import { emit } from '../../../../../lib/webhooks';
import { publicDocument } from '../../../../../lib/signing';

type Ctx = { params: { documentId: string } };

/** Withdraw a document. Permanent: anyone who checks it afterwards is told it was revoked, and why. */
export const POST = route<Ctx>(async (request: NextRequest, { params }) => {
  const user = await requireAuth(request);
  const document = await prisma.document.findUnique({ where: { documentId: params.documentId }, include: { institution: true } });
  if (!document) throw new NotFoundError('Document not found');
  await requireInstitutionRole(user, document.institutionId, SIGNERS);
  if (document.status === 'REVOKED') throw new ConflictError('This document is already revoked');
  const { reason } = await readJson(request, revokeDocumentSchema);

  const updated = await prisma.document.update({ where: { id: document.id }, data: { status: 'REVOKED', revokedAt: new Date(), revocationReason: reason } });
  await logAudit({ action: 'DOCUMENT_REVOKED', entityType: 'Document', entityId: document.id, actorUserId: user.id, institutionId: document.institutionId, documentId: document.id, metadata: { title: document.title, reason } });
  emit(document.institutionId, 'document.revoked', { ...publicDocument(updated, document.institution.name), revocationReason: reason });
  return ok({ documentId: updated.documentId, status: updated.status, revokedAt: updated.revokedAt, revocationReason: updated.revocationReason });
});
