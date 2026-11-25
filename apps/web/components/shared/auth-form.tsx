'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CircleAlert, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { CenterCard } from './shell'
import { Button, Field, Input } from '@/components/app/ui'
import { auth } from '@/lib/auth/client'
import { useSession } from '@/components/providers/session-provider'

const email = z.string().trim().email('Enter a valid email address')
const strongPassword = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(200, 'Use at most 200 characters')
  .refine((v) => /[a-zA-Z]/.test(v) && /[0-9\W_]/.test(v), 'Use letters and at least one number or symbol')

const loginSchema = z.object({ email, password: z.string().min(1, 'Enter your password') })
const signupSchema = z
  .object({ fullName: z.string().trim().min(2, 'Enter your full name').max(120), email, password: strongPassword, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'The passwords don\'t match' })

type Values = { email: string; password: string; fullName?: string; confirm?: string }

/** Only same-site paths, so a crafted link can't send people elsewhere after signing in. */
function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'
}

function AuthFormInner({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter()
  const params = useSearchParams()
  const { refresh } = useSession()
  const [error, setError] = React.useState<string | null>(null)
  const [show, setShow] = React.useState(false)
  const next = safeNext(params.get('next'))
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(mode === 'login' ? loginSchema : signupSchema) as never,
    defaultValues: { email: params.get('email') ?? '' },
  })

  async function onSubmit(v: Values) {
    setError(null)
    try {
      if (mode === 'login') {
        await auth.signIn(v.email.trim(), v.password)
        await refresh()
        router.push(next)
      } else {
        const signedIn = await auth.signUp({ email: v.email.trim(), password: v.password, fullName: (v.fullName ?? '').trim() })
        if (signedIn) {
          await refresh()
          toast.success('Account created. Check your inbox to confirm your email address.')
          router.push('/dashboard')
        } else {
          router.push(`/auth/verify-email?email=${encodeURIComponent(v.email.trim())}`)
        }
      }
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const fields: Array<[keyof Values, string, string, string]> =
    mode === 'signup'
      ? [['fullName', 'Full name', 'text', 'name'], ['email', 'Work email', 'email', 'email'], ['password', 'Password', 'password', 'new-password'], ['confirm', 'Confirm password', 'password', 'new-password']]
      : [['email', 'Email', 'email', 'email'], ['password', 'Password', 'password', 'current-password']]

  return (
    <CenterCard>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{mode === 'login' ? 'Sign in to VeriDocs' : 'Create your account'}</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        {mode === 'login' ? 'Issue and manage signed documents.' : 'Use your work email: an institution on the same domain is confirmed automatically.'}
      </p>
      {error && (
        <div role="alert" className="mt-5 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        {fields.map(([name, label, type, autoComplete]) => {
          const isPassword = type === 'password'
          return (
            <Field
              key={name}
              label={label}
              htmlFor={name}
              error={errors[name]?.message ? String(errors[name]?.message) : null}
              hint={mode === 'signup' && name === 'password' ? 'At least 10 characters, with letters and a number or symbol.' : undefined}
            >
              <div className="relative">
                <Input
                  id={name}
                  type={isPassword && show ? 'text' : type}
                  autoComplete={autoComplete}
                  aria-invalid={Boolean(errors[name])}
                  aria-describedby={errors[name] ? `${name}-error` : undefined}
                  className={isPassword ? 'pr-10' : undefined}
                  {...register(name)}
                />
                {name === 'password' && (
                  <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label={show ? 'Hide password' : 'Show password'}>
                    {show ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                  </button>
                )}
              </div>
            </Field>
          )
        })}
        {mode === 'login' && (
          <div className="text-right"><Link href="/auth/forgot-password" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">Forgot your password?</Link></div>
        )}
        <Button type="submit" className="w-full" busy={isSubmitting}>{mode === 'login' ? 'Sign in' : 'Create account'}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        {mode === 'login' ? (
          <>New to VeriDocs? <Link className="font-medium text-indigo-600 dark:text-indigo-400" href={`/auth/signup${next !== '/dashboard' ? `?next=${encodeURIComponent(next)}` : ''}`}>Create an account</Link></>
        ) : (
          <>Already have an account? <Link className="font-medium text-indigo-600 dark:text-indigo-400" href="/auth/login">Sign in</Link></>
        )}
      </p>
      {mode === 'signup' && (
        <p className="mt-4 text-center text-xs text-slate-500">By creating an account you agree to the <Link href="/legal/terms" className="underline">terms</Link> and <Link href="/legal/privacy" className="underline">privacy policy</Link>.</p>
      )}
    </CenterCard>
  )
}

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  return (
    <React.Suspense>
      <AuthFormInner mode={mode} />
    </React.Suspense>
  )
}
