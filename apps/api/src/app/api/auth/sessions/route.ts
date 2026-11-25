import { NextRequest } from 'next/server';
import { prisma } from '@veridocs/database';
import { handleApiError } from '../../../../lib/errors';
import { ok } from '../../../../lib/http';
import { requirePerson } from '../../../../lib/auth/require-auth';
import { requireLocalAuth } from '../../../../lib/auth/local-only';

/** The devices signed in to this account, newest use first. */
export async function GET(request: NextRequest) {
  try {
    requireLocalAuth();
    const user = await requirePerson(request);
    const sessions = await prisma.session.findMany({
      where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
      select: { id: true, userAgent: true, ipAddress: true, createdAt: true, lastUsedAt: true, expiresAt: true },
    });
    return ok(sessions.map((s) => ({ ...s, current: s.id === user.sessionId })));
  } catch (error) {
    return handleApiError(error);
  }
}
