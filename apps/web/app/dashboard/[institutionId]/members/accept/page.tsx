import { redirect } from 'next/navigation'

/**
 * Invitations are accepted on /dashboard now, but older invitation emails link here.
 *
 * This redirects on the server on purpose: a client page here would sit inside the institution
 * layout, which shows "You are not an active member" and never renders its page for someone
 * whose invitation is still pending, so they would never be sent on.
 */
export default function AcceptInvitation() {
  redirect('/dashboard')
}
