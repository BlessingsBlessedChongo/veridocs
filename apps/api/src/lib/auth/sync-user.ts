import { prisma, User } from '@veridocs/database';
import { AuthUser } from '@veridocs/shared';

export function syncUserFromSupabase(authUser: AuthUser): Promise<User> {
  return prisma.user.upsert({
    where: { id: authUser.id },
    update: { email: authUser.email, emailVerified: authUser.emailVerified },
    create: { id: authUser.id, email: authUser.email, emailVerified: authUser.emailVerified },
  });
}