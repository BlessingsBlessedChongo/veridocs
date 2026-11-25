import { NextResponse } from 'next/server';
import { prisma } from '@veridocs/database';
import { authProvider } from '../../../lib/auth/verify-session';
import { createSupabaseAdminClient } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

/** Is the API up, can it reach the database, and is sign-in working? */
export async function GET() {
  const version = process.env.npm_package_version || '1.0.0';
  const provider = authProvider();
  const services: Record<string, string> = { api: 'running', authProvider: provider };
  let healthy = true;

  try {
    await prisma.$queryRaw`SELECT 1`;
    services.database = 'connected';
  } catch {
    services.database = 'disconnected';
    healthy = false;
  }
  if (provider === 'supabase') {
    try {
      const { error } = await createSupabaseAdminClient().auth.admin.listUsers({ page: 1, perPage: 1 });
      services.auth = error ? 'error' : 'connected';
      if (error) healthy = false;
    } catch {
      services.auth = 'not configured';
      healthy = false;
    }
  } else {
    services.auth = services.database === 'connected' ? 'connected' : 'disconnected';
  }
  services.signingKeys = /^[0-9a-f]{64}$/i.test(process.env.MASTER_ENCRYPTION_KEY || '') ? 'configured' : 'missing MASTER_ENCRYPTION_KEY';
  if (services.signingKeys !== 'configured') healthy = false;

  return NextResponse.json(
    { status: healthy ? 'healthy' : 'unhealthy', version, timestamp: new Date().toISOString(), services },
    { status: healthy ? 200 : 503 },
  );
}
