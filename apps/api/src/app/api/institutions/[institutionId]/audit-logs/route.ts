import { NextRequest } from 'next/server';
import { InstitutionRole, paginationSchema } from '@veridocs/shared';
import { prisma, type Prisma } from '@veridocs/database';
import { requirePerson, requireInstitutionRole } from '../../../../../lib/auth/require-auth';
import { ok, readQuery, route } from '../../../../../lib/http';

type Ctx = { params: { institutionId: string } };

/** Who did what, newest first. ?search= matches the action (e.g. DOCUMENT_REVOKED), who did it, or the document's title. */
export const GET = route<Ctx>(async (request: NextRequest, { params }) => {
  const user = await requirePerson(request);
  await requireInstitutionRole(user, params.institutionId, [InstitutionRole.ADMIN, InstitutionRole.AUDITOR]);
  const query = readQuery(request, paginationSchema);
  const term = query.search?.trim();
  const where: Prisma.AuditLogWhereInput = {
    institutionId: params.institutionId,
    ...(term
      ? {
          OR: [
            { action: { contains: term.toUpperCase().replace(/\s+/g, '_') } },
            { actor: { email: { contains: term, mode: 'insensitive' } } },
            { actor: { fullName: { contains: term, mode: 'insensitive' } } },
            { document: { title: { contains: term, mode: 'insensitive' } } },
          ],
        }
      : {}),
    ...(query.from || query.to ? { createdAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } } : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { email: true, fullName: true } }, document: { select: { documentId: true, title: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);
  const items = rows.map((r) => ({
    id: r.id,
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    actor: r.actor.fullName || r.actor.email,
    actorEmail: r.actor.email,
    document: r.document,
    metadata: r.metadata,
    createdAt: r.createdAt,
  }));
  return ok({ items, page: query.page, pageSize: query.pageSize, total });
});
