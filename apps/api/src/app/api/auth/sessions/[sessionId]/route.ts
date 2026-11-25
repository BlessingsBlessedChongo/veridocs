import { NextRequest } from 'next/server';
import { prisma } from '@veridocs/database';
import { NotFoundError } from '../../../../../lib/errors';
import { ok, route } from '../../../../../lib/http';
import { requirePerson } from '../../../../../lib/auth/require-auth';
import { requireLocalAuth } from '../../../../../lib/auth/local-only';

type Ctx = { params: { sessionId: string } };

/** Signs out one device. */
export const DELETE = route<Ctx>(async (request: NextRequest, { params }) => {
  requireLocalAuth();
  const user = await requirePerson(request);
  const result = await prisma.session.updateMany({ where: { id: params.sessionId, userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  if (result.count === 0) throw new NotFoundError('That device is not signed in');
  return ok({ signedOut: true });
});
