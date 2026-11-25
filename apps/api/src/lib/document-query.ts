import { NextRequest } from 'next/server';
import type { Prisma } from '@veridocs/database';
import { paginationSchema } from '@veridocs/shared';
import { readQuery } from './http';

/** The filters shared by the documents list and its CSV export. */
export function documentFilter(request: NextRequest, institutionId: string) {
  const query = readQuery(request, paginationSchema);
  const search = query.search?.trim();
  const where: Prisma.DocumentWhereInput = { institutionId };
  if (query.status === 'EXPIRED') {
    // Expiry is a date, so a document past it counts as expired even before anyone checks it.
    where.OR = [{ status: 'EXPIRED' }, { status: 'ACTIVE', expiresAt: { lt: new Date() } }];
  } else if (query.status === 'ACTIVE') {
    where.status = 'ACTIVE';
    where.AND = [{ OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] }];
  } else if (query.status === 'REVOKED') {
    where.status = 'REVOKED';
  }
  if (search) {
    const anyOf: Prisma.DocumentWhereInput[] = [
      { title: { contains: search, mode: 'insensitive' } },
      { recipientName: { contains: search, mode: 'insensitive' } },
      { recipientEmail: { contains: search, mode: 'insensitive' } },
    ];
    if (/^[0-9a-f-]{8,36}$/i.test(search)) anyOf.push({ documentId: { startsWith: search.toLowerCase() } });
    where.AND = [...((where.AND as Prisma.DocumentWhereInput[]) ?? []), { OR: anyOf }];
  }
  if (query.from || query.to) where.issuedAt = { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) };
  return { where, query };
}

/** A document's real status today (ACTIVE becomes EXPIRED once its date has passed). */
export function effectiveStatus(document: { status: string; expiresAt: Date | null }) {
  return document.status === 'ACTIVE' && document.expiresAt && document.expiresAt < new Date() ? 'EXPIRED' : document.status;
}
