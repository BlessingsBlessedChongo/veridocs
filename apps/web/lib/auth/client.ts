'use client'

/**
 * Sign-in for the web app, whichever system the deployment uses:
 *   NEXT_PUBLIC_AUTH_PROVIDER=local     VeriDocs' own accounts (the API issues session tokens)
 *   NEXT_PUBLIC_AUTH_PROVIDER=supabase  Supabase Auth
 * Pages only ever talk to `auth`, so they work the same either way.
 */
import { createBrowserClient } from '@/lib/supabase/client'

export const AUTH_PROVIDER: 'local' | 'supabase' = process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'supabase' ? 'supabase' : 'local'
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const STORAGE_KEY = 'veridocs.session'

export class AuthError extends Error {
  constructor(message: string, public code = 'AUTH_ERROR', public status = 0) {
    super(message)
  }
}

type Listener = (signedIn: boolean) => void
const listeners = new Set<Listener>()
const notify = (signedIn: boolean) => listeners.forEach((l) => l(signedIn))

function readLocal(): { token: string; expiresAt: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    if (!session?.token || new Date(session.expiresAt) < new Date()) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

function writeLocal(session: { token: string; expiresAt: string } | null) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Private windows can refuse storage; the session then lasts for this page only.
  }
  notify(Boolean(session))
}

// Another tab signed in or out: follow it.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) notify(Boolean(readLocal()))
  })
}

async function post<T>(path: string, body: unknown, token?: string | null): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body ?? {}),
    })
  } catch {
    throw new AuthError('Cannot reach VeriDocs. Check your connection and try again.', 'NETWORK')
  }
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json.success) throw new AuthError(json.error?.message ?? `Request failed (${res.status})`, json.error?.code, res.status)
  return json.data as T
}

type SessionReply = { token: string; expiresAt: string; user: { id: string; email: string; fullName: string | null; emailVerified: boolean } }

const sb = () => createBrowserClient()

export const auth = {
  provider: AUTH_PROVIDER,

  /** The bearer token for API calls, or null when signed out. */
  async token(): Promise<string | null> {
    if (AUTH_PROVIDER === 'local') return readLocal()?.token ?? null
    const { data } = await sb().auth.getSession()
    return data.session?.access_token ?? null
  },

  onChange(listener: Listener): () => void {
    if (AUTH_PROVIDER === 'supabase') {
      const { data } = sb().auth.onAuthStateChange((_event, session) => listener(Boolean(session)))
      return () => data.subscription.unsubscribe()
    }
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  async signIn(email: string, password: string) {
    if (AUTH_PROVIDER === 'local') {
      const reply = await post<SessionReply>('/api/auth/login', { email, password })
      writeLocal({ token: reply.token, expiresAt: reply.expiresAt })
      return reply.user
    }
    const { data, error } = await sb().auth.signInWithPassword({ email, password })
    if (error) throw new AuthError('Email or password is incorrect.')
    return { id: data.user.id, email: data.user.email ?? email, fullName: data.user.user_metadata?.full_name ?? null, emailVerified: Boolean(data.user.email_confirmed_at) }
  },

  /** Returns true when the person is signed in straight away (they still confirm their email). */
  async signUp(input: { email: string; password: string; fullName: string }): Promise<boolean> {
    if (AUTH_PROVIDER === 'local') {
      const reply = await post<SessionReply>('/api/auth/signup', input)
      writeLocal({ token: reply.token, expiresAt: reply.expiresAt })
      return true
    }
    const { data, error } = await sb().auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { full_name: input.fullName }, emailRedirectTo: `${location.origin}/auth/callback` },
    })
    if (error) throw new AuthError(error.message)
    return Boolean(data.session)
  },

  async signOut(everywhere = false) {
    if (AUTH_PROVIDER === 'local') {
      const token = readLocal()?.token
      writeLocal(null)
      if (token) await post(`/api/auth/logout${everywhere ? '?everywhere=1' : ''}`, {}, token).catch(() => undefined)
      return
    }
    await sb().auth.signOut({ scope: everywhere ? 'global' : 'local' })
  },

  async requestPasswordReset(email: string) {
    if (AUTH_PROVIDER === 'local') return void (await post('/api/auth/forgot-password', { email }))
    const { error } = await sb().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/reset-password` })
    if (error) throw new AuthError(error.message)
  },

  /** Local: the token from the emailed link. Supabase: the link already signed the person in. */
  async resetPassword(token: string | null, password: string) {
    if (AUTH_PROVIDER === 'local') {
      if (!token) throw new AuthError('This page needs the link from the reset email.')
      const reply = await post<SessionReply>('/api/auth/reset-password', { token, password })
      writeLocal({ token: reply.token, expiresAt: reply.expiresAt })
      return
    }
    const { error } = await sb().auth.updateUser({ password })
    if (error) throw new AuthError(error.message)
  },

  async verifyEmail(token: string) {
    if (AUTH_PROVIDER !== 'local') return
    await post('/api/auth/verify-email', { token })
  },

  async resendVerification() {
    if (AUTH_PROVIDER === 'local') return post<{ sent: boolean; alreadyVerified: boolean }>('/api/auth/resend-verification', {}, await this.token())
    const { data } = await sb().auth.getUser()
    if (data.user?.email) await sb().auth.resend({ type: 'signup', email: data.user.email })
    return { sent: true, alreadyVerified: false }
  },

  /** Checks the current password, sets the new one, and signs out every other device (both modes). */
  async changePassword(currentPassword: string, newPassword: string) {
    if (AUTH_PROVIDER === 'local') return void (await post('/api/auth/change-password', { currentPassword, newPassword }, await this.token()))
    const client = sb()
    const { data } = await client.auth.getUser()
    if (!data.user?.email) throw new AuthError('Sign in again, then change your password.')
    const check = await client.auth.signInWithPassword({ email: data.user.email, password: currentPassword })
    if (check.error) throw new AuthError('Your current password is not right.')
    const { error } = await client.auth.updateUser({ password: newPassword })
    if (error) throw new AuthError(error.message)
    await client.auth.signOut({ scope: 'others' })
  },

  /** Called when the API says the session is no longer valid. */
  forget() {
    if (AUTH_PROVIDER === 'local') writeLocal(null)
  },
}
