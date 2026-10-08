'use client'

import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { useLogoVariant } from '@/hooks/use-logo-variant'
export function Brand({ size = 32 }: { size?: number }) {
  const variant = useLogoVariant()
  return <Link href="/" aria-label="VeriDocs home" className="inline-flex items-center gap-2.5 font-semibold tracking-tight"><Logo size={size} variant={variant} aria-hidden />VeriDocs</Link>
}
export function CenterCard({ children, brandSize = 32, showBrand = true }: { children: React.ReactNode; brandSize?: number; showBrand?: boolean }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#fafbff] px-5 py-12">
      <div className="w-full max-w-[640px]">{showBrand && <div className="mb-8 flex justify-center"><Brand size={brandSize} /></div>}
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">{children}</div></div>
    </main>
  )
}
export const field = 'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-[3px] focus:ring-indigo-500/20'
export const primaryBtn = 'inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 active:scale-[0.97] disabled:opacity-50'
