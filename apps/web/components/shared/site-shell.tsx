'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  Compass,
  FileText,
  KeyRound,
  LayoutDashboard,
  Menu,
  Search,
  ShieldCheck,
  Users,
  ScrollText,
  Settings,
  LogOut,
  X,
} from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Logo } from '@/components/ui/logo'
import { cn } from '@/lib/utils'

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = React.useState(false)

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
            <Button asChild variant="ghost" size="sm">
              <Link href="/auth/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/auth/signup">Get started</Link>
            </Button>
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
                ['Sign in', '/auth/login'],
                ['Get started', '/auth/signup'],
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
          {[
            ['Product', ['Verify', 'Documents', 'Pricing']],
            ['Developers', ['API', 'Docs', 'SDKs']],
            ['Legal', ['Privacy', 'Terms', 'Security']],
            ['Company', ['About', 'Contact', 'GitHub']],
          ].map(([title, items]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
              <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                {items.map((item) => (
                  <li key={item}><Link href={item === 'Privacy' ? '/legal/privacy' : item === 'Terms' ? '/legal/terms' : item === 'Docs' ? '/docs' : item === 'Verify' ? '/verify' : item === 'About' ? '/about' : item === 'Security' ? '/docs' : item === 'Pricing' ? '/pricing' : item === 'API' ? '/docs' : item === 'GitHub' ? 'https://github.com' : '/'} className="hover:text-indigo-600">{item}</Link></li>
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

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen bg-slate-50 dark:bg-slate-950 lg:grid-cols-[1.5fr_1fr]">
      <section className="hidden items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.18),transparent_35%),#0f172a] p-8 lg:flex">
        <div className="relative w-full max-w-2xl rounded-[32px] border border-white/10 bg-white/5 p-10 text-white shadow-2xl backdrop-blur-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.25),transparent_35%)]" />
          <div className="relative">
            <div className="mb-8 flex justify-center">
              <Logo variant="mono-light" size={96} aria-hidden />
            </div>
            <p className="text-center text-3xl font-semibold tracking-tight">Trust, cryptographically verified.</p>
            <div className="mt-10 space-y-5">
              {[
                ['ShieldCheck', 'Cryptographic integrity'],
                ['QrCode', 'Fast verification'],
                ['Compass', 'Revocation control'],
              ].map(([icon, label]) => {
                const Icon = icon === 'ShieldCheck' ? ShieldCheck : icon === 'QrCode' ? Search : Compass
                return (
                  <div key={label} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                    <Icon className="h-5 w-5 text-indigo-300" aria-hidden="true" />
                    <span>{label}</span>
                  </div>
                )
              })}
            </div>
            <div className="mt-10 border-t border-white/10 pt-6 text-center text-sm text-slate-300">Built on SHA-256 and RSA-2048</div>
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to home
            </Link>
            <ThemeToggle />
          </div>
          {children}
        </div>
      </section>
    </main>
  )
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublic = pathname === '/dashboard' || pathname === '/dashboard/institutions'
  const segments = pathname.split('/').filter(Boolean)
  const institutionId = segments[1] ?? 'institution'
  const baseHref = segments[1] ? `/dashboard/${segments[1]}` : '/dashboard/institutions'
  const navItems = [
    ['Overview', `${baseHref}`, LayoutDashboard],
    ['Documents', `${baseHref}/documents`, FileText],
    ['Members', `${baseHref}/members`, Users],
    ['Verifications', `${baseHref}/verifications`, ShieldCheck],
    ['Audit logs', `${baseHref}/audit-logs`, ScrollText],
    ['Keys', `${baseHref}/keys`, KeyRound],
    ['Settings', `${baseHref}/settings`, Settings],
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:block">
          <div className="flex items-center gap-3 border-b border-slate-200 px-2 pb-4 dark:border-slate-800">
            <Logo variant="primary" size={32} aria-hidden />
            <div className="text-sm font-semibold">VeriDocs</div>
          </div>
          <div className="mt-6 space-y-2">
            {navItems.map(([label, href, Icon]) => {
              const active = pathname === href
              return (
                <Link
                  key={label}
                  href={href}
                  className={cn(
                    'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                    active ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                  )}
                >
                  {active && <span className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-indigo-600" />}
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </Link>
              )
            })}
          </div>
          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold text-white">AC</div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">Alex Carter</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">alex@veridocs.app</p>
              </div>
            </div>
            <button className="mt-4 inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300" type="button">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </aside>

        <div className="flex-1">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
            <div className="flex items-center gap-3">
              <button type="button" className="rounded-lg border border-slate-200 p-2 text-slate-700 dark:border-slate-700 dark:text-slate-200 lg:hidden">
                <Menu className="h-4 w-4" aria-hidden="true" />
              </button>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <span>Institution</span>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
                <span className="font-medium text-slate-900 dark:text-slate-100">Overview</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-200">
                <Search className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Search</span>
                <span className="hidden rounded border border-slate-200 px-1 text-[10px] font-medium dark:border-slate-700 sm:inline">⌘K</span>
              </button>
              <button type="button" className="relative rounded-lg border border-slate-200 p-2 text-slate-700 dark:border-slate-700 dark:text-slate-200">
                <Bell className="h-4 w-4" aria-hidden="true" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-indigo-600" />
              </button>
              <ThemeToggle />
            </div>
          </header>
          <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  )
}
