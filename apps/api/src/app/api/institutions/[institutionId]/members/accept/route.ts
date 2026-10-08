import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@veridocs/database';
import { requireAuth } from '../../../../../../lib/auth/require-auth';
import { handleApiError, NotFoundError } from '../../../../../../lib/errors';
import { logAudit } from '../../../../../../lib/audit';

export async function POST(request: NextRequest, { params }: { params: { institutionId: string } }) {
  try {
    const user = await requireAuth(request);
    const member = await prisma.institutionMember.findUnique({ where: { userId_institutionId: { userId: user.id, institutionId: params.institutionId } } });
    if (!member || member.status !== 'PENDING') throw new NotFoundError('Pending institution invitation not found');
    const updated = await prisma.institutionMember.update({ where: { id: member.id }, data: { status: 'ACTIVE' } });
    await logAudit({ action: 'MEMBER_ACCEPTED', entityType: 'InstitutionMember', entityId: member.id, actorUserId: user.id, institutionId: params.institutionId });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}