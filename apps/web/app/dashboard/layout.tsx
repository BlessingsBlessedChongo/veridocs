'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FileText, KeyRound, LayoutDashboard, LogOut, ScrollText, Settings, ShieldCheck, Users } from 'lucide-react'
import { Brand } from '@/components/shared/shell'
import { createBrowserClient } from '@/lib/supabase/client'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter(); const path = usePathname()
  const [email, setEmail] = useState<string | null>(null)
  const sb = createBrowserClient()
  useEffect(() => { sb.auth.getSession().then(({ data }) => data.session ? setEmail(data.session.user.email ?? '') : router.replace('/auth/login')) }, []) // eslint-disable-line
  const inst = path.split('/')[2]
  const links = inst && inst !== 'institutions' ? [[`/dashboard/${inst}`, 'Overview', LayoutDashboard], [`/dashboard/${inst}/documents`, 'Documents', FileText], [`/dashboard/${inst}/members`, 'Members', Users], [`/dashboard/${inst}/verifications`, 'Verifications', ShieldCheck], [`/dashboard/${inst}/audit-logs`, 'Audit logs', ScrollText], [`/dashboard/${inst}/keys`, 'Keys', KeyRound], [`/dashboard/${inst}/settings`, 'Settings', Settings]] as const : []
  if (email === null) return <div role="status" className="grid min-h-screen place-items-center text-sm text-slate-500">Loading...</div>
  return (
    <div className="min-h-screen bg-[#fafbff] md:flex">
      <aside className="border-b border-slate-200 bg-white p-4 md:w-60 md:border-b-0 md:border-r">
        <Brand />
        <nav aria-label="Dashboard" className="mt-6 flex gap-1 md:flex-col">
          <Link href="/dashboard/institutions" className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">Institutions</Link>
          {links.map(([h, l, Icon]) => <Link key={h} href={h} aria-current={path === h ? 'page' : undefined} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${path === h ? 'bg-indigo-50 font-medium text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}><Icon size={16} strokeWidth={1.5} aria-hidden />{l}</Link>)}
        </nav>
        <div className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-500 md:mt-auto"><p className="truncate">{email}</p>
          <button onClick={async () => { await sb.auth.signOut(); router.push('/auth/login') }} className="mt-2 flex items-center gap-2 text-slate-600 hover:text-slate-950"><LogOut size={14} aria-hidden />Sign out</button></div>
      </aside>
      <main className="flex-1 p-6 lg:p-10">{children}</main>
    </div>
  )
}
