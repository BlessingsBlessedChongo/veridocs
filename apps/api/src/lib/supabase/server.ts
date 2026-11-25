import 'server-only';

import { createClient } from '@supabase/supabase-js';

/**
 * Supabase mode only (AUTH_PROVIDER=supabase): the service-role client that checks access tokens
 * and invites people. The API never uses cookies; tokens arrive in the Authorization header.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error('Supabase admin environment variables are not configured');
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}
