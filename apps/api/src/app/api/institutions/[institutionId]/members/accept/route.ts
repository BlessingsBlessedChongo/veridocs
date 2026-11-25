import { NextRequest } from 'next/server';
import { prisma } from '@veridocs/database';
import { requirePerson, requireVerifiedEmail } from '../../../../../../lib/auth/require-auth';
import { NotFoundError } from '../../../../../../lib/errors';
import { ok, route } from '../../../../../../lib/http';
import { logAudit } from '../../../../../../lib/audit';

type Ctx = { params: { institutionId: string } };

/** Accept (POST) or decline (DELETE) an invitation. Accepting needs a confirmed email. */
export const POST = route<Ctx>(async (request: NextRequest, { params }) => {
  const user = await requirePerson(request);
  requireVerifiedEmail(user);
  const member = await prisma.institutionMember.findUnique({ where: { userId_institutionId: { userId: user.id, institutionId: params.institutionId } } });
  if (!member || member.status !== 'PENDING') throw new NotFoundError('There is no invitation waiting for you here.');
  const updated = await prisma.institutionMember.update({ where: { id: member.id }, data: { status: 'ACTIVE' } });
  await logAudit({ action: 'MEMBER_ACCEPTED', entityType: 'InstitutionMember', entityId: member.id, actorUserId: user.id, institutionId: params.institutionId });
  return ok({ institutionId: params.institutionId, role: updated.role, status: updated.status });
});

export const DELETE = route<Ctx>(async (request: NextRequest, { params }) => {
  const user = await requirePerson(request);
  const member = await prisma.institutionMember.findUnique({ where: { userId_institutionId: { userId: user.id, institutionId: params.institutionId } } });
  if (!member || member.status !== 'PENDING') throw new NotFoundError('There is no invitation waiting for you here.');
  await prisma.institutionMember.delete({ where: { id: member.id } });
  await logAudit({ action: 'MEMBER_DECLINED', entityType: 'InstitutionMember', entityId: member.id, actorUserId: user.id, institutionId: params.institutionId });
  return ok({ declined: true });
});
