import { NextRequest, NextResponse } from 'next/server';
import { InstitutionRole } from '@veridocs/shared';
import { prisma } from '@veridocs/database';
import { requireAuth, requireInstitutionRole } from '../../../../lib/auth/require-auth';
import { handleApiError, NotFoundError } from '../../../../lib/errors';

export async function GET(request: NextRequest, { params }: { params: { institutionId: string } }) {
  try {
    const user = await requireAuth(request);
    await requireInstitutionRole(user, params.institutionId, Object.values(InstitutionRole));
    const institution = await prisma.institution.findUnique({ where: { id: params.institutionId }, include: { keyPairs: { where: { status: 'ACTIVE' }, select: { id: true, algorithm: true, createdAt: true } }, _count: { select: { members: true, documents: true } } } });
    if (!institution) throw new NotFoundError('Institution not found');
    return NextResponse.json({ success: true, data: institution });
  } catch (error) {
    return handleApiError(error);
  }
}