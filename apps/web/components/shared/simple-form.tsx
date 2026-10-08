'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CenterCard, field, primaryBtn } from './shell'
import { createBrowserClient } from '@/lib/supabase/client'
export function SimpleForm({ mode }: { mode: 'forgot' | 'reset' }) {
  const [v, setV] = useState(''); const [c, setC] = useState(''); const [sent, setSent] = useState(false); const r = useRouter(); const sb = createBrowserClient()
  async function go(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'forgot') { const { error } = await sb.auth.resetPasswordForEmail(v, { redirectTo: `${location.origin}/auth/reset-password` }); return error ? toast.error(error.message) : setSent(true) }
    if (v.length < 8) return toast.error('Use at least 8 characters.'); if (v !== c) return toast.error('Passwords do not match.')
    const { error } = await sb.auth.updateUser({ password: v }); if (error) return toast.error(error.message); toast.success('Password updated.'); r.push('/dashboard')
  }
  if (sent) return <CenterCard><h1 className="text-2xl font-semibold">Check your email</h1><p className="mt-2 text-slate-600">If an account exists for {v}, a reset link is on its way.</p><Link className="mt-6 inline-block text-indigo-600" href="/auth/login">Back to sign in</Link></CenterCard>
  return <CenterCard><h1 className="text-2xl font-semibold">{mode === 'forgot' ? 'Reset your password' : 'Choose a new password'}</h1>
    <form onSubmit={go} className="mt-6 space-y-4"><div><label htmlFor="a" className="mb-1 block text-sm font-medium">{mode === 'forgot' ? 'Email' : 'New password'}</label><input id="a" required type={mode === 'forgot' ? 'email' : 'password'} className={field} value={v} onChange={(e) => setV(e.target.value)} /></div>
      {mode === 'reset' && <div><label htmlFor="b" className="mb-1 block text-sm font-medium">Confirm password</label><input id="b" required type="password" className={field} value={c} onChange={(e) => setC(e.target.value)} /></div>}
      <button className={`${primaryBtn} w-full`}>{mode === 'forgot' ? 'Send reset link' : 'Update password'}</button></form><Link className="mt-6 inline-block text-sm text-slate-600" href="/auth/login">Back to sign in</Link></CenterCard>
}
