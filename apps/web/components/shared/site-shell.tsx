'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Logo } from '@/components/ui/logo'
import { useSession } from '@/components/providers/session-provider'

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = React.useState(false)
  const signedIn = useSession().status === 'signed-in'

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.08),transparent_35%)] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/75 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            <Logo variant="primary" size={32} className="h-7 w-7 md:h-8 md:w-8" aria-hidden />
            <span>VeriDocs</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-slate-600 md:flex dark:text-slate-300">
            <Link href="/verify" className="transition hover:text-indigo-600">Verify</Link>
            <Link href="/docs" className="transition hover:text-indigo-600">Docs</Link>
            <Link href="/about" className="transition hover:text-indigo-600">About</Link>
            <Link href="/pricing" className="transition hover:text-indigo-600">Pricing</Link>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <ThemeToggle />
            {signedIn ? (
              <Button asChild size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/auth/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/auth/signup">Get started</Link>
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-lg border border-slate-200 p-2 text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <motion.nav
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="border-t border-slate-200 bg-white p-4 md:hidden dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="space-y-2 text-sm">
              {[
                ['Verify', '/verify'],
                ['Docs', '/docs'],
                ['About', '/about'],
                ['Pricing', '/pricing'],
                ...(signedIn ? [['Dashboard', '/dashboard']] : [['Sign in', '/auth/login'], ['Get started', '/auth/signup']]),
              ].map(([label, href], index) => (
                <motion.div key={href} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
                  <Link href={href} onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                    {label}
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.nav>
        )}
      </header>

      <AnimatePresence mode="wait">
        <motion.main key={usePathname()} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.25 }}>
          {children}
        </motion.main>
      </AnimatePresence>

      <footer className="border-t border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8">
          <div>
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
              <Logo variant="primary" size={32} aria-hidden />
              <span>VeriDocs</span>
            </div>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Trust, cryptographically verified.</p>
          </div>
          {([
            ['Product', [['Verify', '/verify'], ['Pricing', '/pricing']]],
            ['Developers', [['API reference', '/docs'], ['Security model', '/docs#security']]],
            ['Legal', [['Privacy', '/legal/privacy'], ['Terms', '/legal/terms']]],
            ['Company', [['About', '/about'], ['GitHub', 'https://github.com/BlessingsBlessedChongo/veridocs']]],
          ] as Array<[string, Array<[string, string]>]>).map(([title, items]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
              <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                {items.map(([item, href]) => (
                  <li key={item}><Link href={href} className="hover:text-indigo-600">{item}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-200 px-4 py-5 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-6xl flex-col justify-between gap-2 sm:flex-row">
            <div className="flex items-center gap-3">
              <Logo variant="mono-dark" size={32} className="dark:hidden" aria-hidden />
              <Logo variant="mono-light" size={32} className="hidden dark:block" aria-hidden />
              <span>VeriDocs</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Trust, cryptographically verified.</span>
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate-400">v1.0</span>
              <Link href="https://github.com" target="_blank" rel="noreferrer" className="text-slate-600 hover:text-indigo-600 dark:text-slate-300">GitHub</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
