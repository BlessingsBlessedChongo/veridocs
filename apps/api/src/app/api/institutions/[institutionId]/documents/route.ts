import { NextRequest } from 'next/server';
import { prisma } from '@veridocs/database';
import { ALL_ROLES, requireAuth, requireInstitutionRole } from '../../../../../lib/auth/require-auth';
import { ok, route } from '../../../../../lib/http';
import { documentFilter, effectiveStatus } from '../../../../../lib/document-query';

type Ctx = { params: { institutionId: string } };

/** The institution's documents: search by title, recipient or ID; filter by status and date. */
export const GET = route<Ctx>(async (request: NextRequest, { params }) => {
  const user = await requireAuth(request);
  await requireInstitutionRole(user, params.institutionId, ALL_ROLES);
  const { where, query } = documentFilter(request, params.institutionId);
  const [rows, total] = await prisma.$transaction([
    prisma.document.findMany({
      where,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      orderBy: { issuedAt: 'desc' },
      include: {
        signedByUser: { select: { email: true, fullName: true } },
        _count: { select: { verifications: true } },
        verifications: { orderBy: { verifiedAt: 'desc' }, take: 1, select: { verifiedAt: true } },
      },
    }),
    prisma.document.count({ where }),
  ]);
  const items = rows.map((d) => ({
    id: d.id,
    documentId: d.documentId,
    title: d.title,
    recipientName: d.recipientName,
    recipientEmail: d.recipientEmail,
    status: effectiveStatus(d),
    issuedAt: d.issuedAt,
    expiresAt: d.expiresAt,
    revokedAt: d.revokedAt,
    batchId: d.batchId,
    signedBy: d.signedByUser.fullName || d.signedByUser.email,
    verificationCount: d._count.verifications,
    lastVerifiedAt: d.verifications[0]?.verifiedAt ?? null,
  }));
  return ok({ items, page: query.page, pageSize: query.pageSize, total });
});
