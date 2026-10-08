'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { CircleAlert } from 'lucide-react'
import { useState } from 'react'
import { CenterCard, field, primaryBtn } from './shell'
import { createBrowserClient } from '@/lib/supabase/client'
import { Logo } from '@/components/ui/logo'

const login = z.object({ email: z.string().email('Enter a valid email'), password: z.string().min(1, 'Enter your password') })
const signup = login.extend({ fullName: z.string().min(2, 'Enter your full name'), password: z.string().min(8, 'Use at least 8 characters'), confirm: z.string() }).refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' })

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<any>({ resolver: zodResolver(mode === 'login' ? login : signup) })
  const sb = createBrowserClient()
  async function onSubmit(v: any) {
    setError(null)
    if (mode === 'login') {
      const { error } = await sb.auth.signInWithPassword({ email: v.email, password: v.password })
      if (error) return setError('Invalid email or password.')
      toast.success('Welcome back.'); router.push('/dashboard')
    } else {
      const { error } = await sb.auth.signUp({ email: v.email, password: v.password, options: { data: { full_name: v.fullName }, emailRedirectTo: `${location.origin}/auth/callback` } })
      if (error) return setError(error.message)
      toast.success('Account created. Check your email to verify.'); router.push('/auth/verify-email')
    }
  }
  const rows = mode === 'signup' ? [['fullName', 'Full name', 'text'], ['email', 'Email', 'email'], ['password', 'Password', 'password'], ['confirm', 'Confirm password', 'password']] : [['email', 'Email', 'email'], ['password', 'Password', 'password']]
  return (
    <CenterCard showBrand={false}>
      <Logo size={40} variant="primary" className="mb-8" aria-hidden />
      <h1 className="text-2xl font-semibold tracking-tight">{mode === 'login' ? 'Sign in' : 'Create your account'}</h1>
      {error && <div role="alert" className="mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><CircleAlert size={16} aria-hidden />{error}</div>}
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        {rows.map(([n, l, t]) => (
          <div key={n}><label htmlFor={n} className="mb-1 block text-sm font-medium">{l}</label>
            <input id={n} type={t} autoComplete={n === 'password' ? (mode === 'login' ? 'current-password' : 'new-password') : n === 'email' ? 'email' : 'off'} className={field} aria-invalid={!!errors[n]} {...register(n)} />
            {errors[n] && <p className="mt-1 text-xs text-rose-600">{String(errors[n]?.message)}</p>}</div>))}
        <button disabled={isSubmitting} className={`${primaryBtn} w-full`}>{isSubmitting ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">{mode === 'login' ? <>Don&apos;t have an account? <Link className="font-medium text-indigo-600" href="/auth/signup">Sign up</Link></> : <>Already have an account? <Link className="font-medium text-indigo-600" href="/auth/login">Sign in</Link></>}</p>
    </CenterCard>
  )
}
