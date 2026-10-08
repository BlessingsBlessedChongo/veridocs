'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { createBrowserClient } from '@/lib/supabase/client'
import { field, primaryBtn } from '@/components/shared/shell'
export default function Security() {
  const [p, setP] = useState(''); const sb = createBrowserClient()
  return <main className="mx-auto max-w-lg space-y-8 p-10"><h1 className="text-3xl font-semibold">Security</h1>
    <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (p.length < 8) return toast.error('Use at least 8 characters.'); const { error } = await sb.auth.updateUser({ password: p }); error ? toast.error(error.message) : (toast.success('Password updated.'), setP('')) }}>
      <label htmlFor="np" className="text-sm font-medium">New password</label><input id="np" type="password" className={field} value={p} onChange={(e) => setP(e.target.value)} /><button className={primaryBtn}>Change password</button></form>
    <button className="text-sm text-rose-600" onClick={async () => { await sb.auth.signOut({ scope: 'global' }); location.href = '/auth/login' }}>Sign out all devices</button></main>
}
