import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@veridocs/database';
import { inviteMemberSchema, InstitutionRole } from '@veridocs/shared';
import { requireAuth, requireInstitutionRole } from '../../../../../../lib/auth/require-auth';
import { ConflictError, handleApiError, ValidationError } from '../../../../../../lib/errors';
import { createSupabaseAdminClient } from '../../../../../../lib/supabase/server';
import { logAudit } from '../../../../../../lib/audit';

export async function POST(request: NextRequest, { params }: { params: { institutionId: string } }) {
  try {
    const user = await requireAuth(request);
    await requireInstitutionRole(user, params.institutionId, [InstitutionRole.ADMIN]);
    const validation = inviteMemberSchema.safeParse(await request.json());
    if (!validation.success) throw new ValidationError(validation.error.errors[0].message);
    const { email, role } = validation.data;
    if (email.toLowerCase() === user.email.toLowerCase()) throw new ConflictError('You are already the inviter');
    let invitedUser = await prisma.user.findUnique({ where: { email } });
    if (!invitedUser) {
      const result = await createSupabaseAdminClient().auth.admin.inviteUserByEmail(email);
      if (result.error || !result.data.user) throw new ConflictError('Unable to invite this email address');
      invitedUser = await prisma.user.create({ data: { id: result.data.user.id, email, emailVerified: false } });
    }
    const member = await prisma.institutionMember.create({ data: { userId: invitedUser.id, institutionId: params.institutionId, role, invitedByUserId: user.id, status: 'PENDING' } });
    await logAudit({ action: 'MEMBER_INVITED', entityType: 'InstitutionMember', entityId: member.id, actorUserId: user.id, institutionId: params.institutionId, metadata: { email, role } });
    return NextResponse.json({ success: true, data: member }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}