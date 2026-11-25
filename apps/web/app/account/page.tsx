'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Check, Lock, MailWarning, User } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from '@/components/providers/session-provider'
import { Logo } from '@/components/ui/logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Button, buttonStyles, DefinitionList, ErrorState, Field, Input, Loading, PageHeader, Panel, Pill, When } from '@/components/app/ui'
import { api } from '@/lib/api'
import { auth } from '@/lib/auth/client'
import { cn } from '@/lib/utils'
import type { Me } from '@/lib/types'

export default function AccountPage() {
  return <AccountShell>{(me) => <Profile me={me} />}</AccountShell>
}

function Profile({ me }: { me: Me }) {
  const { refresh } = useSession()
  const [name, setName] = React.useState(me.user.fullName ?? '')
  const [saving, setSaving] = React.useState(false)
  const [sending, setSending] = React.useState(false)
  const trimmed = name.trim()
  const unchanged = trimmed === (me.user.fullName ?? '')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (trimmed.length < 2 || unchanged) return
    setSaving(true)
    try {
      await api.updateMe(trimmed)
      await refresh()
      toast.success('Your name is saved.')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function resend() {
    setSending(true)
    try {
      const reply = await auth.resendVerification()
      if (reply?.alreadyVerified) {
        toast.success('Your email address is already confirmed.')
        await refresh()
      } else {
        toast.success(`A new link is on its way to ${me.user.email}.`)
      }
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <PageHeader title="Your account" description="Your name and email address, as the other members of your institutions see them." back={{ href: '/dashboard', label: 'Back to your institutions' }} />
      <AccountNav current="profile" />

      <div className="space-y-6">
        <Panel title="Profile">
          <form onSubmit={save} className="max-w-md space-y-4">
            <Field label="Full name" htmlFor="full-name" hint="Shown to the other members of your institutions, and in their audit trail.">
              <Input
                id="full-name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-describedby="full-name-hint"
              />
            </Field>
            <Button type="submit" busy={saving} disabled={unchanged || trimmed.length < 2}>Save name</Button>
          </form>
        </Panel>

        <Panel title="Email address">
          <DefinitionList
            items={[
              ['Email', <span key="email" className="break-all">{me.user.email}</span>],
              ['Confirmed', me.user.emailVerified ? (
                <Pill tone="green"><Check size={12} aria-hidden />Confirmed</Pill>
              ) : (
                <div className="space-y-3">
                  <Pill tone="amber"><MailWarning size={12} aria-hidden />Not confirmed yet</Pill>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Open the link we emailed you. Until you do, you can&apos;t sign documents or join institutions.</p>
                  <Button size="sm" variant="secondary" busy={sending} onClick={resend}>Send the link again</Button>
                </div>
              )],
              ['Account created', <When key="created" date={me.user.createdAt} />],
            ]}
          />
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">This is the address you sign in with. It can&apos;t be changed here.</p>
        </Panel>

        <Panel
          title="Security"
          description={auth.provider === 'local' ? 'Change your password and see the devices where you are signed in.' : 'Change your password, or sign out of every device.'}
        >
          <Link href="/account/security" className={buttonStyles.secondary}>
            <Lock size={16} aria-hidden />
            Open security settings
          </Link>
        </Panel>
      </div>
    </>
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
