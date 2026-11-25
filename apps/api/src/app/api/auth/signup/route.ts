import { NextRequest } from 'next/server';
import { prisma } from '@veridocs/database';
import { signupSchema } from '@veridocs/shared';
import { ConflictError, handleApiError, ValidationError } from '../../../../lib/errors';
import { clientIp, limit, ok, readJson } from '../../../../lib/http';
import { hashPassword, passwordProblem } from '../../../../lib/auth/password';
import { createSession, sendVerificationEmail } from '../../../../lib/auth/local';
import { publicUser, requireLocalAuth } from '../../../../lib/auth/local-only';

export async function POST(request: NextRequest) {
  try {
    requireLocalAuth();
    await limit(`signup:${clientIp(request)}`, 10, '1h', 'Too many new accounts from this network. Try again later.');
    const { email, password, fullName } = await readJson(request, signupSchema);
    const problem = passwordProblem(password, email);
    if (problem) throw new ValidationError(problem);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing?.passwordHash) throw new ConflictError('An account with this email already exists. Sign in instead.');

    const passwordHash = await hashPassword(password);
    // Someone invited before they had an account already has a record: they claim it here,
    // and confirming the email proves it is theirs before any invitation can be accepted.
    const user = existing
      ? await prisma.user.update({ where: { id: existing.id }, data: { passwordHash, fullName } })
      : await prisma.user.create({ data: { email, fullName, passwordHash } });

    await sendVerificationEmail(user);
    const session = await createSession(user, request);
    return ok({ token: session.token, expiresAt: session.expiresAt, user: publicUser(user) }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
