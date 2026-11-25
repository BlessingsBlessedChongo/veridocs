import { NextRequest } from 'next/server';
import { prisma } from '@veridocs/database';
import { loginSchema } from '@veridocs/shared';
import { handleApiError, UnauthorizedError } from '../../../../lib/errors';
import { clientIp, limit, ok, readJson } from '../../../../lib/http';
import { verifyPassword } from '../../../../lib/auth/password';
import { createSession } from '../../../../lib/auth/local';
import { publicUser, requireLocalAuth } from '../../../../lib/auth/local-only';

export async function POST(request: NextRequest) {
  try {
    requireLocalAuth();
    const { email, password } = await readJson(request, loginSchema);
    // Slow down guessing, both from one network and against one account.
    await limit(`login-ip:${clientIp(request)}`, 30, '15m', 'Too many sign-in attempts. Wait a few minutes and try again.');
    await limit(`login-email:${email}`, 10, '15m', 'Too many sign-in attempts for this account. Wait a few minutes, or reset your password.');

    const user = await prisma.user.findUnique({ where: { email } });
    if (!(await verifyPassword(password, user?.passwordHash)) || !user) throw new UnauthorizedError('Email or password is incorrect.');

    const session = await createSession(user, request);
    return ok({ token: session.token, expiresAt: session.expiresAt, user: publicUser(user) });
  } catch (error) {
    return handleApiError(error);
  }
}
