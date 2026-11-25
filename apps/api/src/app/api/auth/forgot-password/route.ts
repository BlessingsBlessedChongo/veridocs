import { NextRequest } from 'next/server';
import { prisma } from '@veridocs/database';
import { emailOnlySchema } from '@veridocs/shared';
import { handleApiError } from '../../../../lib/errors';
import { clientIp, limit, ok, readJson } from '../../../../lib/http';
import { sendPasswordResetEmail } from '../../../../lib/auth/local';
import { rateLimit } from '../../../../lib/rate-limit';
import { requireLocalAuth } from '../../../../lib/auth/local-only';

/** Always answers the same way, so it can't be used to find out who has an account. */
export async function POST(request: NextRequest) {
  try {
    requireLocalAuth();
    await limit(`forgot-ip:${clientIp(request)}`, 10, '1h');
    const { email } = await readJson(request, emailOnlySchema);
    const allowed = await rateLimit(`forgot-email:${email}`, 3, '1h'); // quietly: the answer never changes
    const user = await prisma.user.findUnique({ where: { email } });
    if (user?.passwordHash && allowed.success) await sendPasswordResetEmail(user);
    return ok({ sent: true });
  } catch (error) {
    return handleApiError(error);
  }
}
