import { NextResponse } from 'next/server';
import { prisma } from '@veridocs/database';
import { createSupabaseAdminClient } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await createSupabaseAdminClient().auth.admin.listUsers({ page: 1, perPage: 1 });

    return NextResponse.json({
      status: 'healthy',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
      services: { database: 'connected', auth: 'connected', api: 'running' },
    });
  } catch {
    return NextResponse.json(
      {
        status: 'unhealthy',
        version: process.env.npm_package_version || '1.0.0',
        timestamp: new Date().toISOString(),
        services: { database: 'disconnected', auth: 'disconnected', api: 'running' },
      },
      { status: 503 }
    );
  }
}