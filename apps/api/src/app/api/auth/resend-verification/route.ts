import { NextRequest } from 'next/server';
import { prisma } from '@veridocs/database';
import { handleApiError } from '../../../../lib/errors';
import { limit, ok } from '../../../../lib/http';
import { requirePerson } from '../../../../lib/auth/require-auth';
import { sendVerificationEmail } from '../../../../lib/auth/local';
import { requireLocalAuth } from '../../../../lib/auth/local-only';

export async function POST(request: NextRequest) {
  try {
    requireLocalAuth();
    const principal = await requirePerson(request);
    await limit(`resend-verification:${principal.id}`, 5, '1h', 'We have sent several links already. Check your spam folder, or try again in an hour.');
    const user = await prisma.user.findUniqueOrThrow({ where: { id: principal.id } });
    if (!user.emailVerified) await sendVerificationEmail(user);
    return ok({ sent: !user.emailVerified, alreadyVerified: user.emailVerified });
  } catch (error) {
    return handleApiError(error);
  }
}
