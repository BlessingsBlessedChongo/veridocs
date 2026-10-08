'use client'
import Link from 'next/link'
import { TriangleAlert } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#fafbff] px-6 text-center">
      <div>
        <Logo size={64} variant="primary" className="mx-auto mb-8" aria-hidden />
        <TriangleAlert className="mx-auto text-amber-600" size={48} strokeWidth={1.25} aria-hidden />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-3 text-slate-600">An unexpected error occurred. Please try again.</p>
        <div className="mt-8 flex justify-center gap-4">
          <button onClick={reset} className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700">Try again</button>
          <Link href="/" className="px-3 py-3 text-sm font-medium text-slate-600 hover:text-slate-950">Back to home</Link>
        </div>
      </div>
    </main>
  )
}
