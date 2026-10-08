import Link from 'next/link'
import { Brand } from './shell'
import { Logo } from '@/components/ui/logo'
export function Prose({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#fafbff]"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5"><Brand /><nav className="flex gap-5 text-sm text-slate-600"><Link href="/verify">Verify</Link><Link href="/docs">Docs</Link><Link href="/about">About</Link><Link href="/pricing">Pricing</Link></nav></div></header>
    <main className="mx-auto max-w-3xl px-5 py-14"><Logo size={40} variant="primary" className="mb-6" aria-hidden /><h1 className="text-4xl font-semibold tracking-tight">{title}</h1><div className="mt-8 space-y-4 leading-7 text-slate-700 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-950 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:font-mono [&_code]:text-sm">{children}</div></main></div>
}
