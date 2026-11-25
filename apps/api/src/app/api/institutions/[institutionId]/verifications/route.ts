import { NextRequest } from 'next/server';
import { paginationSchema } from '@veridocs/shared';
import { prisma, type Prisma } from '@veridocs/database';
import { READERS_OF_RECORDS, requireAuth, requireInstitutionRole } from '../../../../../lib/auth/require-auth';
import { ok, readQuery, route } from '../../../../../lib/http';

type Ctx = { params: { institutionId: string } };

/** Every time someone checked one of the institution's documents. ?status= filters by outcome. */
export const GET = route<Ctx>(async (request: NextRequest, { params }) => {
  const user = await requireAuth(request);
  await requireInstitutionRole(user, params.institutionId, READERS_OF_RECORDS);
  const query = readQuery(request, paginationSchema);
  const where: Prisma.VerificationWhereInput = {
    document: { institutionId: params.institutionId },
    ...(query.status ? { result: query.status } : {}),
    ...(query.from || query.to ? { verifiedAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } } : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.verification.findMany({
      where,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      orderBy: { verifiedAt: 'desc' },
      include: { document: { select: { documentId: true, title: true, recipientName: true } } },
    }),
    prisma.verification.count({ where }),
  ]);
  // The full address and browser are personal data of the person who checked; show a coarse version.
  const items = rows.map((v) => ({
    id: v.id,
    verifiedAt: v.verifiedAt,
    result: v.result,
    method: v.method,
    failureReason: v.failureReason,
    document: v.document,
    network: v.ipAddress ? coarseNetwork(v.ipAddress) : null,
    device: v.userAgent ? describeAgent(v.userAgent) : null,
  }));
  return ok({ items, page: query.page, pageSize: query.pageSize, total });
});

/** Keeps only the network part of an address: 41.72.x.x, or the first three IPv6 groups. */
function coarseNetwork(ip: string): string {
  const v4 = /(\d+\.\d+)\.\d+\.\d+$/.exec(ip);
  if (v4) return `${v4[1]}.x.x`;
  if (ip.includes(':')) return `${ip.split(':').filter(Boolean).slice(0, 3).join(':')}::x`;
  return 'unknown';
}

function describeAgent(ua: string): string {
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : /curl|python|node|axios|okhttp/i.test(ua) ? 'Script' : 'Browser';
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  return os ? `${browser} on ${os}` : browser;
}
