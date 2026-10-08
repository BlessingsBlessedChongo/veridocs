import { AuthUser, InstitutionRole } from '@veridocs/shared';
import { prisma } from '@veridocs/database';
import { NextRequest } from 'next/server';
import { ForbiddenError, UnauthorizedError } from '../errors';
import { getSessionUser } from './verify-session';
import { syncUserFromSupabase } from './sync-user';

export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  const user = await getSessionUser(request);
  if (!user) throw new UnauthorizedError();
  await syncUserFromSupabase(user);
  return user;
}

export async function requireInstitutionRole(user: AuthUser, institutionId: string, allowedRoles: InstitutionRole[]) {
  const membership = await prisma.institutionMember.findUnique({ where: { userId_institutionId: { userId: user.id, institutionId } } });
  if (!membership || membership.status !== 'ACTIVE') throw new ForbiddenError('You are not an active member of this institution');
  if (!allowedRoles.includes(membership.role as InstitutionRole)) throw new ForbiddenError('Your institution role does not allow this action');
  return membership;
}