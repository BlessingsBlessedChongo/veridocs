'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'
import {
  Building2, ChevronsUpDown, Code2, FileText, KeyRound, LayoutDashboard, LogOut, Menu, ScrollText,
  Settings, ShieldCheck, Users, X, MailWarning,
} from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from '@/components/providers/session-provider'
import { Logo } from '@/components/ui/logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { auth } from '@/lib/auth/client'
import { cn } from '@/lib/utils'
import type { InstitutionRole } from '@/lib/types'
import { ROLE_LABEL } from '@/components/app/ui'

type NavItem = { href: string; label: string; icon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>; roles?: InstitutionRole[] }

function navFor(id: string): NavItem[] {
  const base = `/dashboard/${id}`
  return [
    { href: base, label: 'Overview', icon: LayoutDashboard },
    { href: `${base}/documents`, label: 'Documents', icon: FileText },
    { href: `${base}/verifications`, label: 'Checks', icon: ShieldCheck, roles: ['ADMIN', 'ISSUER', 'AUDITOR'] },
    { href: `${base}/members`, label: 'Members', icon: Users },
    { href: `${base}/audit-logs`, label: 'Audit trail', icon: ScrollText, roles: ['ADMIN', 'AUDITOR'] },
    { href: `${base}/keys`, label: 'Signing keys', icon: KeyRound },
    { href: `${base}/developers`, label: 'API & webhooks', icon: Code2, roles: ['ADMIN'] },
    { href: `${base}/settings`, label: 'Settings', icon: Settings },
  ]
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams<{ institutionId?: string }>()
  const { status, me, error, signOut } = useSession()
  // The menu belongs to the page it was opened on: navigating anywhere closes it.
  const [menuOpenOn, setMenuOpenOn] = React.useState<string | null>(null)
  const menuOpen = menuOpenOn === pathname
  const setMenuOpen = (open: boolean) => setMenuOpenOn(open ? pathname : null)

  React.useEffect(() => {
    if (status === 'signed-out' && !error) router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`)
  }, [status, error, router, pathname])

  if (status !== 'signed-in' || !me) {
    return (
      <div role="status" className="grid min-h-screen place-items-center bg-slate-50 dark:bg-slate-950">
        {error ? (
          <div className="max-w-sm space-y-3 text-center text-sm">
            <p className="font-medium text-slate-900 dark:text-white">VeriDocs can&apos;t be reached right now.</p>
            <p className="text-slate-500">{error}</p>
            <button className="text-indigo-600" onClick={() => location.reload()}>Try again</button>
          </div>
        ) : (
          <Logo size={40} className="animate-pulse" aria-label="Loading VeriDocs" />
        )}
      </div>
    )
  }

  const current = params.institutionId ? me.institutions.find((i) => i.id === params.institutionId) : undefined
  const nav = current ? navFor(current.id).filter((n) => !n.roles || n.roles.includes(current.role)) : []

  const sidebar = (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link href="/dashboard" className="flex items-center gap-2 px-2 font-semibold tracking-tight text-slate-900 dark:text-white">
        <Logo size={28} aria-hidden />
        VeriDocs
      </Link>

      <InstitutionSwitcher currentId={current?.id} />

      {nav.length > 0 && (
        <nav aria-label="Institution" className="flex flex-col gap-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = href === `/dashboard/${current!.id}` ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                  active ? 'bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white',
                )}
              >
                <Icon size={16} aria-hidden />
                {label}
              </Link>
            )
          })}
        </nav>
      )}

      <div className="mt-auto space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Link href="/account" className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/60">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            {(me.user.fullName || me.user.email).slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 text-sm">
            <span className="block truncate font-medium text-slate-900 dark:text-white">{me.user.fullName || 'Your account'}</span>
            <span className="block truncate text-xs text-slate-500">{me.user.email}</span>
          </span>
        </Link>
        <div className="flex items-center justify-between px-1">
          <ThemeToggle />
          <button
            onClick={async () => { await signOut(); router.push('/auth/login') }}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <LogOut size={14} aria-hidden />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow">Skip to content</a>

      {/* Phones: a top bar and a slide-in menu. */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-950/90">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold"><Logo size={24} aria-hidden />VeriDocs</Link>
        <button onClick={() => setMenuOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Open menu" aria-expanded={menuOpen}>
          <Menu size={20} aria-hidden />
        </button>
      </header>
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-slate-950/40" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl dark:bg-slate-900">
            <button onClick={() => setMenuOpen(false)} className="absolute right-3 top-3 rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close menu"><X size={18} aria-hidden /></button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:flex">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-white lg:block dark:border-slate-800 dark:bg-slate-900">{sidebar}</aside>
        <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-6xl">
            {!me.user.emailVerified && <VerifyEmailBanner email={me.user.email} />}
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

function VerifyEmailBanner({ email }: { email: string }) {
  const [busy, setBusy] = React.useState(false)
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
      <p className="flex items-start gap-2">
        <MailWarning size={18} className="mt-0.5 shrink-0" aria-hidden />
        <span>Confirm your email address ({email}) to sign documents and join institutions. The link is in your inbox.</span>
      </p>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          try {
            const r = await auth.resendVerification()
            toast.success(r?.alreadyVerified ? 'Your email is already confirmed. Refresh the page.' : 'A new link is on its way.')
          } catch (e) {
            toast.error((e as Error).message)
          } finally {
            setBusy(false)
          }
        }}
        className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-medium hover:bg-amber-100 disabled:opacity-60 dark:border-amber-800 dark:bg-amber-950 dark:hover:bg-amber-900"
      >
        {busy ? 'Sending…' : 'Send the link again'}
      </button>
    </div>
  )
}

function InstitutionSwitcher({ currentId }: { currentId?: string }) {
  const { me } = useSession()
  const router = useRouter()
  if (!me) return null
  const current = me.institutions.find((i) => i.id === currentId)
  return (
    <div className="space-y-1">
      <label htmlFor="institution-switcher" className="px-2 text-xs font-medium uppercase tracking-wide text-slate-400">Institution</label>
      <div className="relative">
        <Building2 size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
        <select
          id="institution-switcher"
          value={currentId ?? ''}
          onChange={(e) => router.push(e.target.value === '__new' ? '/dashboard?new=1' : e.target.value ? `/dashboard/${e.target.value}` : '/dashboard')}
          className="h-10 w-full appearance-none truncate rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-sm font-medium text-slate-900 hover:border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        >
          <option value="">{me.institutions.length ? 'All institutions' : 'No institution yet'}</option>
          {me.institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          <option value="__new">+ Create an institution</option>
        </select>
        <ChevronsUpDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
      </div>
      {current && <p className="px-2 text-xs text-slate-500">You are {current.role === 'ADMIN' ? 'an' : 'a'} {ROLE_LABEL[current.role].toLowerCase()}</p>}
    </div>
  )
}

