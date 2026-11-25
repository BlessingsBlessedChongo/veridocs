import { NextRequest } from 'next/server';
import { prisma } from '@veridocs/database';
import type { InstitutionRole } from '@veridocs/shared';
import { createSupabaseAdminClient } from '../supabase/server';
import { API_KEY_PREFIX, sha256 } from './tokens';

export type AuthProvider = 'local' | 'supabase';

export function authProvider(): AuthProvider {
  return process.env.AUTH_PROVIDER === 'supabase' ? 'supabase' : 'local';
}

/** Who is making a request: a signed-in person, or a system using an institution's API key. */
export interface Principal {
  id: string;
  email: string;
  emailVerified: boolean;
  /** Set for built-in sign-in, so this device can be signed out. */
  sessionId?: string;
  /** Set when the request used an API key; it can only act for that institution. */
  apiKey?: { id: string; name: string; institutionId: string; role: InstitutionRole };
}

export const SESSION_COOKIE = 'vd_session';

export function bearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get('authorization');
  if (authorization?.startsWith('Bearer ')) return authorization.slice(7).trim() || null;
  return request.cookies.get(SESSION_COOKIE)?.value || request.cookies.get('sb-access-token')?.value || null;
}

export async function getSessionUser(request: NextRequest): Promise<Principal | null> {
  const token = bearerToken(request);
  if (!token) return null;
  if (token.startsWith(API_KEY_PREFIX)) return apiKeyPrincipal(token);
  return authProvider() === 'local' ? localPrincipal(token) : supabasePrincipal(token);
}

async function apiKeyPrincipal(token: string): Promise<Principal | null> {
  const key = await prisma.apiKey.findUnique({ where: { keyHash: sha256(token) }, include: { createdBy: true } });
  if (!key || key.revokedAt) return null;
  // Note the use, at most once a minute, so busy integrations don't write on every call.
  if (!key.lastUsedAt || Date.now() - key.lastUsedAt.getTime() > 60_000) {
    await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
  }
  return {
    id: key.createdByUserId,
    email: key.createdBy.email,
    emailVerified: true,
    apiKey: { id: key.id, name: key.name, institutionId: key.institutionId, role: key.role as InstitutionRole },
  };
}

async function localPrincipal(token: string): Promise<Principal | null> {
  const session = await prisma.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
  if (Date.now() - session.lastUsedAt.getTime() > 5 * 60_000) {
    await prisma.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
  }
  return { id: session.user.id, email: session.user.email, emailVerified: session.user.emailVerified, sessionId: session.id };
}

async function supabasePrincipal(token: string): Promise<Principal | null> {
  const { data, error } = await createSupabaseAdminClient().auth.getUser(token);
  if (error || !data.user?.email) return null;
  return { id: data.user.id, email: data.user.email, emailVerified: Boolean(data.user.email_confirmed_at) };
}
