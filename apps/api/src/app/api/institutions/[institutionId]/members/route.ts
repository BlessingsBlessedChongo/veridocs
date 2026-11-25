import { NextRequest } from 'next/server';
import { prisma } from '@veridocs/database';
import { ALL_ROLES, requireInstitutionRole, requirePerson } from '../../../../../lib/auth/require-auth';
import { ok, route } from '../../../../../lib/http';

type Ctx = { params: { institutionId: string } };

/** Everyone in the institution, including invitations not yet accepted. */
export const GET = route<Ctx>(async (request: NextRequest, { params }) => {
  const user = await requirePerson(request);
  await requireInstitutionRole(user, params.institutionId, ALL_ROLES);
  const members = await prisma.institutionMember.findMany({
    where: { institutionId: params.institutionId, status: { in: ['ACTIVE', 'PENDING'] } },
    include: { user: { select: { id: true, email: true, fullName: true, lastLoginAt: true } }, invitedBy: { select: { email: true, fullName: true } } },
    orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
  });
  return ok(
    members.map((m) => ({
      userId: m.userId,
      email: m.user.email,
      fullName: m.user.fullName,
      role: m.role,
      status: m.status,
      joinedAt: m.createdAt,
      lastLoginAt: m.user.lastLoginAt,
      invitedBy: m.invitedBy?.fullName || m.invitedBy?.email || null,
      isYou: m.userId === user.id,
    })),
  );
});
