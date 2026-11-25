'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { MailCheck } from 'lucide-react'
import { toast } from 'sonner'
import { CenterCard } from './shell'
import { Button, Field, Input, Notice } from '@/components/app/ui'
import { auth } from '@/lib/auth/client'
import { useSession } from '@/components/providers/session-provider'

function problem(password: string): string | null {
  if (password.length < 10) return 'Use at least 10 characters.'
  if (!/[a-zA-Z]/.test(password) || !/[0-9\W_]/.test(password)) return 'Use letters and at least one number or symbol.'
  return null
}

function Inner({ mode }: { mode: 'forgot' | 'reset' }) {
  const router = useRouter()
  const token = useSearchParams().get('token')
  const { refresh } = useSession()
  const [value, setValue] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [sent, setSent] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (mode === 'reset') {
      const p = problem(value)
      if (p) return setError(p)
      if (value !== confirm) return setError('The passwords don\'t match.')
    }
    setBusy(true)
    try {
      if (mode === 'forgot') {
        await auth.requestPasswordReset(value.trim())
        setSent(true)
      } else {
        await auth.resetPassword(token, value)
        await refresh()
        toast.success('Password changed. You are signed in.')
        router.push('/dashboard')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <CenterCard>
        <div className="text-center">
          <MailCheck size={40} className="mx-auto text-indigo-600" aria-hidden />
          <h1 className="mt-4 text-2xl font-semibold text-slate-950 dark:text-white">Check your email</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">If there is an account for <span className="font-medium">{value}</span>, a link to choose a new password is on its way. It works for 30 minutes.</p>
          <Link className="mt-6 inline-block text-sm text-indigo-600 dark:text-indigo-400" href="/auth/login">Back to sign in</Link>
        </div>
      </CenterCard>
    )
  }

  const missingToken = mode === 'reset' && auth.provider === 'local' && !token
  return (
    <CenterCard>
      <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">{mode === 'forgot' ? 'Forgot your password?' : 'Choose a new password'}</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{mode === 'forgot' ? 'We\'ll email you a link to choose a new one.' : 'Choosing a new password signs you out on every other device.'}</p>
      {missingToken ? (
        <div className="mt-6 space-y-4">
          <Notice tone="amber">Open this page from the link in your reset email. Links work once, for 30 minutes.</Notice>
          <Link href="/auth/forgot-password" className="text-sm text-indigo-600 dark:text-indigo-400">Send a new link</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <Field label={mode === 'forgot' ? 'Email' : 'New password'} htmlFor="value" hint={mode === 'reset' ? 'At least 10 characters, with letters and a number or symbol.' : undefined}>
            <Input id="value" required type={mode === 'forgot' ? 'email' : 'password'} autoComplete={mode === 'forgot' ? 'email' : 'new-password'} value={value} onChange={(e) => setValue(e.target.value)} />
          </Field>
          {mode === 'reset' && (
            <Field label="Confirm password" htmlFor="confirm">
              <Input id="confirm" required type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </Field>
          )}
          {error && <Notice tone="red">{error}</Notice>}
          <Button type="submit" className="w-full" busy={busy}>{mode === 'forgot' ? 'Send the link' : 'Change password'}</Button>
        </form>
      )}
      <Link className="mt-6 inline-block text-sm text-slate-600 hover:text-indigo-600 dark:text-slate-400" href="/auth/login">Back to sign in</Link>
    </CenterCard>
  )
}

export function SimpleForm({ mode }: { mode: 'forgot' | 'reset' }) {
  return (
    <React.Suspense>
      <Inner mode={mode} />
    </React.Suspense>
  )
}
