'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
export default function Account() {
  const [u, setU] = useState<{ email?: string; name?: string } | null>(null)
  useEffect(() => { createBrowserClient().auth.getUser().then(({ data }) => setU({ email: data.user?.email, name: data.user?.user_metadata?.full_name })) }, [])
  return <main className="mx-auto max-w-lg p-10"><h1 className="text-3xl font-semibold">Account</h1>{u && <dl className="mt-6 space-y-2 text-sm"><div><dt className="text-slate-500">Name</dt><dd>{u.name ?? 'Not set'}</dd></div><div><dt className="text-slate-500">Email</dt><dd>{u.email}</dd></div></dl>}<Link className="mt-6 inline-block text-indigo-600" href="/account/security">Security</Link></main>
}
