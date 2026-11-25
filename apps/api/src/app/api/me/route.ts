import { NextRequest } from 'next/server';
import { prisma } from '@veridocs/database';
import { updateProfileSchema } from '@veridocs/shared';
import { ok, readJson, route } from '../../../lib/http';
import { requirePerson } from '../../../lib/auth/require-auth';
import { authProvider } from '../../../lib/auth/verify-session';

/** The signed-in person, their institutions, and invitations waiting for them. */
export const GET = route(async (request: NextRequest) => {
  const principal = await requirePerson(request);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: principal.id },
    include: {
      memberships: {
        where: { status: { in: ['ACTIVE', 'PENDING'] } },
        include: {
          institution: { select: { id: true, name: true, emailDomain: true, verificationStatus: true, _count: { select: { documents: true, members: { where: { status: 'ACTIVE' } } } } } },
          invitedBy: { select: { email: true, fullName: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  const pick = (status: string) => user.memberships.filter((m) => m.status === status);
  return ok({
    user: { id: user.id, email: user.email, fullName: user.fullName, emailVerified: user.emailVerified, createdAt: user.createdAt },
    authProvider: authProvider(),
    institutions: pick('ACTIVE').map((m) => ({
      ...m.institution,
      role: m.role,
      documentCount: m.institution._count.documents,
      memberCount: m.institution._count.members,
      _count: undefined,
    })),
    invitations: pick('PENDING').map((m) => ({
      institutionId: m.institution.id,
      institutionName: m.institution.name,
      role: m.role,
      invitedBy: m.invitedBy?.fullName || m.invitedBy?.email || null,
      invitedAt: m.createdAt,
    })),
  });
});

export const PATCH = route(async (request: NextRequest) => {
  const principal = await requirePerson(request);
  const { fullName } = await readJson(request, updateProfileSchema);
  const user = await prisma.user.update({ where: { id: principal.id }, data: { fullName } });
  return ok({ id: user.id, email: user.email, fullName: user.fullName, emailVerified: user.emailVerified });
});
