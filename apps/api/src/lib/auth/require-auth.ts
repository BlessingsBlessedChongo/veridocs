import { InstitutionRole } from '@veridocs/shared';
import { prisma } from '@veridocs/database';
import { NextRequest } from 'next/server';
import { ForbiddenError, UnauthorizedError } from '../errors';
import { authProvider, getSessionUser, type Principal } from './verify-session';
import { syncUserFromSupabase } from './sync-user';

export type { Principal } from './verify-session';

export async function requireAuth(request: NextRequest): Promise<Principal> {
  const user = await getSessionUser(request);
  if (!user) throw new UnauthorizedError();
  if (!user.apiKey && authProvider() === 'supabase') await syncUserFromSupabase(user);
  return user;
}

/** For people only: API keys cannot manage accounts, members, keys or other API keys. */
export async function requirePerson(request: NextRequest): Promise<Principal> {
  const user = await requireAuth(request);
  if (user.apiKey) throw new ForbiddenError('API keys cannot do this. Sign in to the dashboard instead.');
  return user;
}

export function requireVerifiedEmail(user: Principal) {
  if (!user.emailVerified) throw new ForbiddenError('Verify your email address first. Check your inbox for the link.');
}

export async function requireInstitutionRole(user: Principal, institutionId: string, allowedRoles: InstitutionRole[]) {
  if (user.apiKey) {
    if (user.apiKey.institutionId !== institutionId) throw new ForbiddenError('This API key belongs to a different institution');
    if (!allowedRoles.includes(user.apiKey.role)) throw new ForbiddenError('This API key is not allowed to do this');
    return { userId: user.id, institutionId, role: user.apiKey.role, status: 'ACTIVE' as const };
  }
  const membership = await prisma.institutionMember.findUnique({ where: { userId_institutionId: { userId: user.id, institutionId } } });
  if (!membership || membership.status !== 'ACTIVE') throw new ForbiddenError('You are not an active member of this institution');
  if (!allowedRoles.includes(membership.role as InstitutionRole)) throw new ForbiddenError('Your institution role does not allow this action');
  return membership;
}

export const ALL_ROLES = Object.values(InstitutionRole);
export const SIGNERS = [InstitutionRole.ADMIN, InstitutionRole.ISSUER];
export const READERS_OF_RECORDS = [InstitutionRole.ADMIN, InstitutionRole.ISSUER, InstitutionRole.AUDITOR];
