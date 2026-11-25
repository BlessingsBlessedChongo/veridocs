'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Lock, LogOut, Monitor, Smartphone, Tablet, User } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from '@/components/providers/session-provider'
import { Logo } from '@/components/ui/logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  Button, ConfirmDialog, EmptyState, ErrorState, Field, Input, Loading, Mono, PageHeader, Panel, Pill, timeAgo, When, useLoad,
} from '@/components/app/ui'
import { api } from '@/lib/api'
import { auth } from '@/lib/auth/client'
import { cn } from '@/lib/utils'
import type { DeviceSession, Me } from '@/lib/types'

export default function SecurityPage() {
  return <AccountShell>{(me) => <Security me={me} />}</AccountShell>
}

function Security({ me }: { me: Me }) {
  // Changing the password signs out the other devices, so the list is loaded again after it.
  const [devicesVersion, setDevicesVersion] = React.useState(0)
  return (
    <>
      <PageHeader title="Security" description="Keep your account safe: change your password, and check where you are signed in." back={{ href: '/dashboard', label: 'Back to your institutions' }} />
      <AccountNav current="security" />
      <div className="space-y-6">
        <ChangePassword email={me.user.email} onChanged={() => setDevicesVersion((v) => v + 1)} />
        {auth.provider === 'local' && <Devices version={devicesVersion} />}
        <SignOutEverywhere />
      </div>
    </>
  )
}

// ── Password ──

/** The same rules the API applies, so problems show before sending. */
function passwordProblem(password: string, email: string): string | null {
  if (password.length < 10) return 'Use at least 10 characters.'
  if (password.length > 200) return 'Use at most 200 characters.'
  if (!/[a-zA-Z]/.test(password) || !/[0-9\W_]/.test(password)) return 'Use letters and at least one number or symbol.'
  const emailName = email.split('@')[0].toLowerCase()
  if (emailName.length >= 4 && password.toLowerCase().includes(emailName)) return 'Don’t use the part of your email address before the @.'
  return null
}

function ChangePassword({ email, onChanged }: { email: string; onChanged: () => void }) {
  const [current, setCurrent] = React.useState('')
  const [next, setNext] = React.useState('')
  const [repeat, setRepeat] = React.useState('')
  const [show, setShow] = React.useState(false)
  const [tried, setTried] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  const problems = {
    current: current ? null : 'Enter your current password.',
    next: passwordProblem(next, email) ?? (next === current ? 'Choose a password different from your current one.' : null),
    repeat: repeat === next ? null : 'This doesn’t match the new password.',
  }
  // Problems show once someone has tried to submit, then update as they type.
  const shown = tried ? problems : { current: null, next: null, repeat: null }
  const type = show ? 'text' : 'password'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setTried(true)
    if (problems.current || problems.next || problems.repeat) return
    setBusy(true)
    try {
      await auth.changePassword(current, next)
      toast.success('Password changed. Other devices were signed out.')
      setCurrent('')
      setNext('')
      setRepeat('')
      setShow(false)
      setTried(false)
      onChanged()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel title="Change password" description={auth.provider === 'local' ? 'Changing it signs you out on every other device.' : undefined}>
      <form onSubmit={submit} noValidate className="max-w-md space-y-4">
        {/* Lets password managers know which account this password belongs to. */}
        <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
        <Field label="Current password" htmlFor="current-password" error={shown.current}>
          <Input
            id="current-password"
            type={type}
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            aria-invalid={Boolean(shown.current)}
            aria-describedby={shown.current ? 'current-password-error' : undefined}
          />
        </Field>
        <Field label="New password" htmlFor="new-password" error={shown.next} hint="At least 10 characters, with letters and at least one number or symbol.">
          <Input
            id="new-password"
            type={type}
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            aria-invalid={Boolean(shown.next)}
            aria-describedby={shown.next ? 'new-password-error' : 'new-password-hint'}
          />
        </Field>
        <Field label="New password again" htmlFor="repeat-password" error={shown.repeat}>
          <Input
            id="repeat-password"
            type={type}
            autoComplete="new-password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            aria-invalid={Boolean(shown.repeat)}
            aria-describedby={shown.repeat ? 'repeat-password-error' : undefined}
          />
        </Field>
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={show} onChange={(e) => setShow(e.target.checked)} />
          Show passwords
        </label>
        <Button type="submit" busy={busy}>Change password</Button>
      </form>
    </Panel>
  )
}

// ── Devices (VeriDocs' own accounts only; Supabase keeps its own sessions) ──

/** "Chrome on Windows", "Safari on iPhone", from the browser's user agent. */
function describeDevice(ua: string | null): string {
  if (!ua) return 'Unknown device'
  const browser =
    /Edg(e|A|iOS)?\//.test(ua) ? 'Edge'
      : /OPR\/|Opera/.test(ua) ? 'Opera'
        : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
          : /Firefox\/|FxiOS/.test(ua) ? 'Firefox'
            : /Chrome\/|CriOS/.test(ua) ? 'Chrome'
              : /Safari\//.test(ua) ? 'Safari'
                : /curl|python|node|axios|okhttp|postman/i.test(ua) ? 'A script or app'
                  : 'A browser'
  const os =
    /Android/.test(ua) ? 'Android'
      : /iPhone/.test(ua) ? 'iPhone'
        : /iPad/.test(ua) ? 'iPad'
          : /Windows/.test(ua) ? 'Windows'
            : /Macintosh|Mac OS X/.test(ua) ? 'Mac'
              : /CrOS/.test(ua) ? 'ChromeOS'
                : /Linux/.test(ua) ? 'Linux'
                  : ''
  return os ? `${browser} on ${os}` : browser
}

function DeviceIcon({ ua }: { ua: string | null }) {
  if (ua && /iPad|Tablet/.test(ua)) return <Tablet size={18} aria-hidden />
  if (ua && /Mobi|Android|iPhone/.test(ua)) return <Smartphone size={18} aria-hidden />
  return <Monitor size={18} aria-hidden />
}

function Devices({ version }: { version: number }) {
  const { data, error, loading, reload, setData } = useLoad(() => api.sessions(), [version])
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [busyOthers, setBusyOthers] = React.useState(false)
  // This device first, then the most recently used.
  const sessions = React.useMemo(() => [...(data ?? [])].sort((a, b) => Number(b.current) - Number(a.current)), [data])
  const others = sessions.filter((s) => !s.current)

  async function signOutOne(session: DeviceSession) {
    setBusyId(session.id)
    try {
      await api.signOutDevice(session.id)
      toast.success(`Signed out of ${describeDevice(session.userAgent)}.`)
      setData((data ?? []).filter((s) => s.id !== session.id))
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusyId(null)
    }
  }

  async function signOutOthers() {
    setBusyOthers(true)
    const results = await Promise.allSettled(others.map((s) => api.signOutDevice(s.id)))
    const failed = results.filter((r) => r.status === 'rejected').length
    if (failed) toast.error(`${failed} of ${others.length} ${others.length === 1 ? 'device' : 'devices'} could not be signed out. Try again.`)
    else toast.success(others.length === 1 ? 'Signed out of the other device.' : `Signed out of ${others.length} other devices.`)
    setBusyOthers(false)
    void reload()
  }

  return (
    <Panel
      title="Signed-in devices"
      description="Where your account is signed in now. If you don't recognise a device, sign it out and change your password."
      actions={others.length > 0 ? (
        <Button size="sm" variant="secondary" busy={busyOthers} onClick={signOutOthers}>Sign out everywhere else</Button>
      ) : null}
    >
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <Loading rows={2} label="Loading your devices…" />
      ) : sessions.length === 0 ? (
        <EmptyState icon={<Monitor size={28} />} title="No devices found">Sign in again to see this device here.</EmptyState>
      ) : (
        <ul className={cn('divide-y divide-slate-100 transition dark:divide-slate-800', loading && 'opacity-60')}>
          {sessions.map((s) => {
            const device = describeDevice(s.userAgent)
            return (
              <li key={s.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <DeviceIcon ua={s.userAgent} />
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900 dark:text-white">
                      {device}
                      {s.current && <Pill tone="green">This device</Pill>}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {s.ipAddress && s.ipAddress !== 'unknown' && <>From <Mono>{s.ipAddress}</Mono> · </>}
                      {s.current ? 'Active now' : `Last active ${timeAgo(s.lastUsedAt)}`} · Signed in <When date={s.createdAt} />
                    </p>
                  </div>
                </div>
                {!s.current && (
                  <Button size="sm" variant="secondary" className="self-start sm:self-auto" busy={busyId === s.id} onClick={() => signOutOne(s)} aria-label={`Sign out of ${device}`}>
                    Sign out
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

function SignOutEverywhere() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  async function signOutAll() {
    setBusy(true)
    try {
      await auth.signOut(true)
      router.push('/auth/login')
    } catch (err) {
      toast.error((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <Panel title="Sign out of all devices" className="border-rose-200 dark:border-rose-900/60">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Signs you out everywhere, including here. Use it if you signed in on a shared computer or lost a device. You can sign in again with your password.
        </p>
        <Button variant="dangerGhost" className="shrink-0" onClick={() => setOpen(true)}>
          <LogOut size={16} aria-hidden />
          Sign out of all devices
        </Button>
      </div>
      <ConfirmDialog open={open} onClose={() => setOpen(false)} onConfirm={signOutAll} title="Sign out of all devices?" confirmLabel="Sign out everywhere" busy={busy}>
        <p>You will be signed out here too, and on every other device.</p>
        <p>To come back, sign in with your email address and password.</p>
      </ConfirmDialog>
    </Panel>
  )
}

// ── The page's frame. /account sits outside the dashboard, so it has its own simple shell. ──

function AccountShell({ children }: { children: (me: Me) => React.ReactNode }) {
  const { status, me, error, refresh } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  React.useEffect(() => {
    if (status === 'signed-out' && !error) router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`)
  }, [status, error, router, pathname])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow">Skip to content</a>
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight text-slate-900 dark:text-white">
            <Logo size={28} aria-hidden />
            VeriDocs
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {status === 'signed-in' && me ? (
          children(me)
        ) : error ? (
          <ErrorState message={error} onRetry={() => void refresh()} />
        ) : (
          <Loading rows={3} label="Loading your account…" />
        )}
      </main>
    </div>
  )
}

function AccountNav({ current }: { current: 'profile' | 'security' }) {
  const items = [
    { key: 'profile', label: 'Profile', href: '/account', icon: User },
    { key: 'security', label: 'Security', href: '/account/security', icon: Lock },
  ] as const
  return (
    <nav aria-label="Account" className="mb-6 flex gap-1 border-b border-slate-200 dark:border-slate-800">
      {items.map(({ key, label, href, icon: Icon }) => (
        <Link
          key={key}
          href={href}
          aria-current={current === key ? 'page' : undefined}
          className={cn(
            '-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition',
            current === key
              ? 'border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
          )}
        >
          <Icon size={16} aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  )
}
