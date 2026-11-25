import { NextRequest } from 'next/server';
import { prisma } from '@veridocs/database';
import { ALL_ROLES, requirePerson, requireInstitutionRole } from '../../../../../lib/auth/require-auth';
import { ok, route } from '../../../../../lib/http';

type Ctx = { params: { institutionId: string } };

const DAYS = 30;

/** The overview numbers: documents by status, checks over the last 30 days, recent activity. */
export const GET = route<Ctx>(async (request: NextRequest, { params }) => {
  const user = await requirePerson(request);
  await requireInstitutionRole(user, params.institutionId, ALL_ROLES);
  const institutionId = params.institutionId;
  const now = new Date();
  const since = new Date(now.getTime() - DAYS * 24 * 60 * 60 * 1000);
  since.setUTCHours(0, 0, 0, 0);

  const [active, expired, revoked, signedRecently, verifications, byResult, byMethod, mostChecked, recent] = await Promise.all([
    prisma.document.count({ where: { institutionId, status: 'ACTIVE', OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] } }),
    prisma.document.count({ where: { institutionId, OR: [{ status: 'EXPIRED' }, { status: 'ACTIVE', expiresAt: { lt: now } }] } }),
    prisma.document.count({ where: { institutionId, status: 'REVOKED' } }),
    prisma.document.count({ where: { institutionId, issuedAt: { gte: since } } }),
    prisma.verification.findMany({ where: { document: { institutionId }, verifiedAt: { gte: since } }, select: { verifiedAt: true, result: true } }),
    prisma.verification.groupBy({ by: ['result'], where: { document: { institutionId }, verifiedAt: { gte: since } }, _count: true }),
    prisma.verification.groupBy({ by: ['method'], where: { document: { institutionId }, verifiedAt: { gte: since } }, _count: true }),
    prisma.document.findMany({
      where: { institutionId, verifications: { some: { verifiedAt: { gte: since } } } },
      select: { documentId: true, title: true, recipientName: true, _count: { select: { verifications: { where: { verifiedAt: { gte: since } } } } } },
      orderBy: { verifications: { _count: 'desc' } },
      take: 5,
    }),
    prisma.auditLog.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { actor: { select: { email: true, fullName: true } }, document: { select: { documentId: true, title: true } } },
    }),
  ]);

  // One bar per day, oldest first, split into valid checks and failed ones.
  const days = Array.from({ length: DAYS + 1 }, (_, i) => {
    const day = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
    return { date: day.toISOString().slice(0, 10), valid: 0, failed: 0 };
  });
  const index = new Map(days.map((d, i) => [d.date, i]));
  for (const v of verifications) {
    const i = index.get(v.verifiedAt.toISOString().slice(0, 10));
    if (i !== undefined) days[i][v.result === 'VALID' ? 'valid' : 'failed']++;
  }

  return ok({
    documents: { active, expired, revoked, total: active + expired + revoked, signedLast30Days: signedRecently },
    verifications: {
      last30Days: verifications.length,
      byResult: Object.fromEntries(byResult.map((r) => [r.result, r._count])),
      byMethod: Object.fromEntries(byMethod.map((r) => [r.method, r._count])),
      daily: days,
    },
    mostChecked: mostChecked.map((d) => ({ documentId: d.documentId, title: d.title, recipientName: d.recipientName, checks: d._count.verifications })),
    recentActivity: recent.map((r) => ({ id: r.id, action: r.action, actor: r.actor.fullName || r.actor.email, document: r.document, createdAt: r.createdAt, metadata: r.metadata })),
  });
});
