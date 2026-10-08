import { NextRequest } from 'next/server';
import { AuthUser } from '@veridocs/shared';
import { createSupabaseAdminClient } from '../supabase/server';

export async function getSessionUser(request: NextRequest): Promise<AuthUser | null> {
  const authorization = request.headers.get('authorization');
  const bearerToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  const cookieToken = request.cookies.get('sb-access-token')?.value;
  const token = bearerToken || cookieToken;
  if (!token) return null;

  const { data, error } = await createSupabaseAdminClient().auth.getUser(token);
  if (error || !data.user?.email) return null;
  return {
    id: data.user.id,
    email: data.user.email,
    emailVerified: Boolean(data.user.email_confirmed_at),
  };
}