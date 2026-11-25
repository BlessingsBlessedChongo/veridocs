import { NotFoundError } from '../errors';
import { authProvider } from './verify-session';

/** Built-in sign-in routes exist only when AUTH_PROVIDER=local; with Supabase, Supabase handles them. */
export function requireLocalAuth() {
  if (authProvider() !== 'local') throw new NotFoundError('Built-in sign-in is turned off; this deployment uses Supabase');
}

/** What the web app gets back about the signed-in person. */
export function publicUser(user: { id: string; email: string; fullName: string | null; emailVerified: boolean }) {
  return { id: user.id, email: user.email, fullName: user.fullName, emailVerified: user.emailVerified };
}
