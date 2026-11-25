import { NextRequest } from 'next/server';
import { InstitutionRole, updateMemberSchema } from '@veridocs/shared';
import { prisma } from '@veridocs/database';
import { requireInstitutionRole, requirePerson } from '../../../../../../lib/auth/require-auth';
import { ConflictError, NotFoundError } from '../../../../../../lib/errors';
import { ok, readJson, route } from '../../../../../../lib/http';
import { logAudit } from '../../../../../../lib/audit';

type Ctx = { params: { institutionId: string; userId: string } };

async function findMember(institutionId: string, userId: string) {
  const member = await prisma.institutionMember.findUnique({ where: { userId_institutionId: { userId, institutionId } }, include: { user: { select: { email: true } } } });
  if (!member || member.status === 'SUSPENDED') throw new NotFoundError('That person is not a member');
  return member;
}

/** An institution always keeps at least one active administrator. */
async function assertNotLastAdmin(institutionId: string, member: { role: string; status: string }) {
  if (member.role !== InstitutionRole.ADMIN || member.status !== 'ACTIVE') return;
  const admins = await prisma.institutionMember.count({ where: { institutionId, role: InstitutionRole.ADMIN, status: 'ACTIVE' } });
  if (admins <= 1) throw new ConflictError('Every institution needs at least one administrator. Make someone else an administrator first.');
}

/** Change someone's role (administrators). */
export const PATCH = route<Ctx>(async (request: NextRequest, { params }) => {
  const user = await requirePerson(request);
  await requireInstitutionRole(user, params.institutionId, [InstitutionRole.ADMIN]);
  const { role } = await readJson(request, updateMemberSchema);
  const member = await findMember(params.institutionId, params.userId);
  if (role !== InstitutionRole.ADMIN) await assertNotLastAdmin(params.institutionId, member);
  const updated = await prisma.institutionMember.update({ where: { id: member.id }, data: { role } });
  await logAudit({ action: 'MEMBER_ROLE_CHANGED', entityType: 'InstitutionMember', entityId: member.id, actorUserId: user.id, institutionId: params.institutionId, metadata: { email: member.user.email, from: member.role, to: role } });
  return ok({ userId: params.userId, role: updated.role });
});

/** Remove someone, or cancel their invitation (administrators; anyone may leave). */
export const DELETE = route<Ctx>(async (request: NextRequest, { params }) => {
  const user = await requirePerson(request);
  const leaving = params.userId === user.id;
  if (!leaving) await requireInstitutionRole(user, params.institutionId, [InstitutionRole.ADMIN]);
  const member = await findMember(params.institutionId, params.userId);
  await assertNotLastAdmin(params.institutionId, member);
  if (member.status === 'PENDING') {
    await prisma.institutionMember.delete({ where: { id: member.id } });
  } else {
    // Kept (suspended) rather than deleted, so the audit trail still says who did what.
    await prisma.institutionMember.update({ where: { id: member.id }, data: { status: 'SUSPENDED' } });
  }
  const action = member.status === 'PENDING' ? 'MEMBER_INVITE_CANCELLED' : leaving ? 'MEMBER_LEFT' : 'MEMBER_REMOVED';
  await logAudit({ action, entityType: 'InstitutionMember', entityId: member.id, actorUserId: user.id, institutionId: params.institutionId, metadata: { email: member.user.email } });
  return ok({ removed: true });
});
