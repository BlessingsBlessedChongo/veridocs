'use client'

import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { useLogoVariant } from '@/hooks/use-logo-variant'
export function Brand({ size = 32 }: { size?: number }) {
  const variant = useLogoVariant()
  return <Link href="/" aria-label="VeriDocs home" className="inline-flex items-center gap-2.5 font-semibold tracking-tight text-slate-900 dark:text-white"><Logo size={size} variant={variant} aria-hidden />VeriDocs</Link>
}
export function CenterCard({ children, brandSize = 32, showBrand = true }: { children: React.ReactNode; brandSize?: number; showBrand?: boolean }) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-5 py-12 dark:bg-slate-950">
      <div className="w-full max-w-[440px]">{showBrand && <div className="mb-8 flex justify-center"><Brand size={brandSize} /></div>}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">{children}</div></div>
    </main>
  )
}
