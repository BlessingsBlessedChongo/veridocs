import { NextRequest, NextResponse } from 'next/server';
import { InstitutionRole, paginationSchema } from '@veridocs/shared';
import { prisma } from '@veridocs/database';
import { requireAuth, requireInstitutionRole } from '../../../../../lib/auth/require-auth';
import { handleApiError } from '../../../../../lib/errors';

export async function GET(request: NextRequest, { params }: { params: { institutionId: string } }) {
  try {
    const user = await requireAuth(request);
    await requireInstitutionRole(user, params.institutionId, [InstitutionRole.ADMIN, InstitutionRole.AUDITOR]);
    const query = paginationSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const where = { institutionId: params.institutionId };
    const [items, total] = await prisma.$transaction([prisma.auditLog.findMany({ where, skip: (query.page - 1) * query.pageSize, take: query.pageSize, orderBy: { createdAt: 'desc' } }), prisma.auditLog.count({ where })]);
    return NextResponse.json({ success: true, data: { items, page: query.page, pageSize: query.pageSize, total } });
  } catch (error) {
    return handleApiError(error);
  }
}