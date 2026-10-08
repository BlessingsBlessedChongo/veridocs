import { NextRequest, NextResponse } from 'next/server';
import { InstitutionRole } from '@veridocs/shared';
import { prisma } from '@veridocs/database';
import { requireAuth, requireInstitutionRole } from '../../../../../../lib/auth/require-auth';
import { ConflictError, handleApiError, NotFoundError } from '../../../../../../lib/errors';
import { logAudit } from '../../../../../../lib/audit';

export async function DELETE(request: NextRequest, { params }: { params: { institutionId: string; userId: string } }) {
  try {
    const user = await requireAuth(request);
    await requireInstitutionRole(user, params.institutionId, [InstitutionRole.ADMIN]);
    const member = await prisma.institutionMember.findUnique({ where: { userId_institutionId: { userId: params.userId, institutionId: params.institutionId } } });
    if (!member) throw new NotFoundError('Institution member not found');
    if (member.role === InstitutionRole.ADMIN && member.status === 'ACTIVE') {
      const adminCount = await prisma.institutionMember.count({ where: { institutionId: params.institutionId, role: InstitutionRole.ADMIN, status: 'ACTIVE' } });
      if (adminCount <= 1) throw new ConflictError('The last active administrator cannot be removed');
    }
    const updated = await prisma.institutionMember.update({ where: { id: member.id }, data: { status: 'SUSPENDED' } });
    await logAudit({ action: 'MEMBER_SUSPENDED', entityType: 'InstitutionMember', entityId: member.id, actorUserId: user.id, institutionId: params.institutionId });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}