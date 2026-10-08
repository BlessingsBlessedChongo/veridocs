import { NextRequest, NextResponse } from 'next/server';
import { DocumentStatus, prisma } from '@veridocs/database';
import { InstitutionRole, paginationSchema } from '@veridocs/shared';
import { requireAuth, requireInstitutionRole } from '../../../../../lib/auth/require-auth';
import { handleApiError } from '../../../../../lib/errors';

export async function GET(request: NextRequest, { params }: { params: { institutionId: string } }) {
  try {
    const user = await requireAuth(request);
    await requireInstitutionRole(user, params.institutionId, Object.values(InstitutionRole));
    const query = paginationSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const where = { institutionId: params.institutionId, ...(query.status && Object.values(DocumentStatus).includes(query.status as DocumentStatus) ? { status: query.status as DocumentStatus } : {}), ...(query.search ? { title: { contains: query.search, mode: 'insensitive' as const } } : {}), ...(query.from || query.to ? { issuedAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } } : {}) };
    const [items, total] = await prisma.$transaction([prisma.document.findMany({ where, skip: (query.page - 1) * query.pageSize, take: query.pageSize, orderBy: { issuedAt: 'desc' }, include: { _count: { select: { verifications: true } } } }), prisma.document.count({ where })]);
    return NextResponse.json({ success: true, data: { items, page: query.page, pageSize: query.pageSize, total } });
  } catch (error) {
    return handleApiError(error);
  }
}