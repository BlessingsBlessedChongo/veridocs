import { NextRequest } from 'next/server';
import { prisma } from '@veridocs/database';
import { tokenSchema } from '@veridocs/shared';
import { handleApiError, ValidationError } from '../../../../lib/errors';
import { clientIp, limit, ok, readJson } from '../../../../lib/http';
import { consumeToken } from '../../../../lib/auth/local';
import { publicUser, requireLocalAuth } from '../../../../lib/auth/local-only';

export async function POST(request: NextRequest) {
  try {
    requireLocalAuth();
    await limit(`verify-email:${clientIp(request)}`, 30, '15m');
    const { token } = await readJson(request, tokenSchema);
    const user = await consumeToken(token, 'EMAIL_VERIFY');
    if (!user) throw new ValidationError('This link has expired or was already used. Sign in and ask for a new one.');
    const updated = await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
    return ok({ user: publicUser(updated) });
  } catch (error) {
    return handleApiError(error);
  }
}
