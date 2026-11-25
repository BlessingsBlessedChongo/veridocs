import { prisma, User } from '@veridocs/database';
import type { Principal } from './verify-session';

/** Supabase mode: keep a local copy of the person so memberships and audit logs can point at them. */
export function syncUserFromSupabase(authUser: Principal): Promise<User> {
  return prisma.user.upsert({
    where: { id: authUser.id },
    update: { email: authUser.email, emailVerified: authUser.emailVerified },
    create: { id: authUser.id, email: authUser.email, emailVerified: authUser.emailVerified },
  });
}
