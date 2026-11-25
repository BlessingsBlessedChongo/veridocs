import { NextRequest } from 'next/server';
import { prisma } from '@veridocs/database';
import { handleApiError } from '../../../../lib/errors';
import { ok } from '../../../../lib/http';
import { requireLocalAuth } from '../../../../lib/auth/local-only';
import { getSessionUser } from '../../../../lib/auth/verify-session';
import { revokeAllSessions } from '../../../../lib/auth/local';

/** Signs out this device, or every device with ?everywhere=1. Always succeeds. */
export async function POST(request: NextRequest) {
  try {
    requireLocalAuth();
    const user = await getSessionUser(request);
    if (user?.sessionId) {
      if (request.nextUrl.searchParams.get('everywhere') === '1') await revokeAllSessions(user.id);
      else await prisma.session.update({ where: { id: user.sessionId }, data: { revokedAt: new Date() } });
    }
    return ok({ signedOut: true });
  } catch (error) {
    return handleApiError(error);
  }
}
