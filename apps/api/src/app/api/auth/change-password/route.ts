import { NextRequest } from 'next/server';
import { prisma } from '@veridocs/database';
import { changePasswordSchema } from '@veridocs/shared';
import { handleApiError, UnauthorizedError, ValidationError } from '../../../../lib/errors';
import { limit, ok, readJson } from '../../../../lib/http';
import { hashPassword, passwordProblem, verifyPassword } from '../../../../lib/auth/password';
import { revokeAllSessions } from '../../../../lib/auth/local';
import { requirePerson } from '../../../../lib/auth/require-auth';
import { requireLocalAuth } from '../../../../lib/auth/local-only';

/** Changes the password and signs out every other device. */
export async function POST(request: NextRequest) {
  try {
    requireLocalAuth();
    const principal = await requirePerson(request);
    await limit(`change-password:${principal.id}`, 10, '15m');
    const { currentPassword, newPassword } = await readJson(request, changePasswordSchema);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: principal.id } });
    if (!(await verifyPassword(currentPassword, user.passwordHash))) throw new UnauthorizedError('Your current password is not right.');
    const problem = passwordProblem(newPassword, user.email);
    if (problem) throw new ValidationError(problem);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
    await revokeAllSessions(user.id, principal.sessionId);
    return ok({ changed: true });
  } catch (error) {
    return handleApiError(error);
  }
}
