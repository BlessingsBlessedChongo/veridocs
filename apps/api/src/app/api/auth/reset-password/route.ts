import { NextRequest } from 'next/server';
import { prisma } from '@veridocs/database';
import { resetPasswordSchema } from '@veridocs/shared';
import { handleApiError, ValidationError } from '../../../../lib/errors';
import { clientIp, limit, ok, readJson } from '../../../../lib/http';
import { hashPassword, passwordProblem } from '../../../../lib/auth/password';
import { consumeToken, createSession, revokeAllSessions } from '../../../../lib/auth/local';
import { publicUser, requireLocalAuth } from '../../../../lib/auth/local-only';

export async function POST(request: NextRequest) {
  try {
    requireLocalAuth();
    await limit(`reset-password:${clientIp(request)}`, 20, '15m');
    const { token, password } = await readJson(request, resetPasswordSchema);
    const user = await consumeToken(token, 'PASSWORD_RESET');
    if (!user) throw new ValidationError('This reset link has expired or was already used. Ask for a new one.');
    const problem = passwordProblem(password, user.email);
    if (problem) throw new ValidationError(problem);

    // The link arrived by email, so the address is confirmed too. Every old session ends.
    const updated = await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password), emailVerified: true } });
    await revokeAllSessions(user.id);
    const session = await createSession(updated, request);
    return ok({ token: session.token, expiresAt: session.expiresAt, user: publicUser(updated) });
  } catch (error) {
    return handleApiError(error);
  }
}
