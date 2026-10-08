import Link from 'next/link'
import { Compass } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#fafbff] px-6 text-center">
      <div>
        <Logo size={64} variant="primary" className="mx-auto mb-8" aria-hidden />
        <Compass className="mx-auto text-indigo-600" size={48} strokeWidth={1.25} aria-hidden />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-3 text-slate-600">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        <Link href="/" className="mt-8 inline-flex rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700">Back to home</Link>
      </div>
    </main>
  )
}
