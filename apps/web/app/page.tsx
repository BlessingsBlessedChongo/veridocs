import Link from 'next/link'
import { ArrowRight, BadgeCheck, FileSignature, Hash, KeyRound, QrCode, ShieldCheck, Sparkles, Fingerprint } from 'lucide-react'
import { PublicLayout } from '@/components/shared/site-shell'
import { Logo } from '@/components/ui/logo'
import { TourVideo } from '@/components/shared/tour-video'

const features = [
  { icon: Fingerprint, title: 'Tamper-evident', text: 'Every document gets a SHA-256 fingerprint. Change one character, and verification fails.' },
  { icon: QrCode, title: 'Instant verification', text: 'Scan the embedded QR code with any smartphone. No app required. Under two seconds.' },
  { icon: KeyRound, title: 'Cryptographically signed', text: 'Documents are signed with RSA-2048 keys. Forgery is computationally infeasible.' },
]

export default function Page() {
  return (
    <PublicLayout>
      <main className="overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.08),transparent_35%)] text-slate-900 dark:text-slate-100">
        <section className="mx-auto grid max-w-6xl items-center gap-16 px-4 pb-20 pt-20 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:pb-28 lg:pt-28">
          <div className="space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/50 dark:text-indigo-300">
              <Logo size={20} variant="primary" aria-hidden />
              Cryptographically verified
            </span>
            <div>
              <h1 className="max-w-xl text-5xl font-semibold tracking-[-0.06em] text-slate-950 dark:text-white sm:text-6xl">
                Trust documents
                <span className="block text-indigo-600">again.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                VeriDocs signs important documents with cryptographic signatures and embeds QR codes for instant verification. Any alteration is detected. Any forgery is exposed.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/auth/signup" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700">
                Issue documents
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/verify" className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-600 dark:hover:text-indigo-300">
                Verify a document
              </Link>
            </div>
            <div className="flex flex-wrap gap-6 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              <span>SHA-256</span>
              <span>RSA-2048</span>
              <span>Open standard</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-10 rounded-full bg-indigo-500/10 blur-3xl" />
            <Logo size={400} variant="primary" className="pointer-events-none absolute -right-24 -top-24 opacity-[0.03]" aria-hidden />
            <div className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_30px_80px_rgba(79,70,229,0.12)] dark:border-slate-800 dark:bg-slate-900">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/70 dark:bg-amber-950/30">
                <div className="flex items-center justify-between border-b border-amber-200 pb-4 dark:border-amber-900/60">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-amber-300 bg-white text-amber-700 dark:bg-slate-900 dark:text-amber-300">
                      <Logo size={24} variant="primary" aria-hidden />
                    </div>
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">University</p>
                      <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">Office of the Registrar</p>
                    </div>
                  </div>
                  <BadgeCheck className="h-6 w-6 text-emerald-600" aria-hidden="true" />
                </div>
                <div className="py-6 text-center">
                  <p className="text-[9px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Certificate of achievement</p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Bachelor of Arts</p>
                  <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">is hereby conferred upon</p>
                  <p className="mt-2 text-lg font-medium text-slate-900 dark:text-white">Alexandra Morgan</p>
                </div>
                <div className="flex items-end justify-between border-t border-amber-200 pt-4 dark:border-amber-900/60">
                  <div>
                    <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-slate-400">Document ID</p>
                    <p className="mt-1 font-mono text-[10px] text-slate-700 dark:text-slate-200">VERIDOC-2026-0184</p>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-md border border-amber-300 bg-white dark:border-amber-700 dark:bg-slate-900">
                    <QrCode className="h-8 w-8 text-slate-800 dark:text-slate-200" aria-hidden="true" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto grid max-w-6xl gap-px bg-slate-200/80 dark:bg-slate-800 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <article key={title} className="bg-white px-6 py-10 dark:bg-slate-900 lg:px-8">
                <Icon className="h-6 w-6 text-indigo-600" aria-hidden="true" />
                <h2 className="mt-5 text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 pt-20 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">See it in one minute.</h2>
          <p className="mb-8 mt-4 max-w-2xl text-slate-600 dark:text-slate-300">A document is signed, checked, tampered with and withdrawn, on this very site.</p>
          <TourVideo />
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3"><Logo size={24} variant="primary" aria-hidden /><p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-600">The math behind the trust</p></div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">Built for certainty, not assumptions.</h2>
            <p className="mt-5 text-slate-600 dark:text-slate-300">A verifiable chain of custody for every important document, from issuance through final verification.</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {([
              ['SHA-256', 'Unique fingerprints make alterations immediately visible.', Hash],
              ['RSA-2048', 'Industry-standard signatures prove who issued a document.', KeyRound],
              ['Instant revocation', 'Revoke compromised or outdated documents in one click.', ShieldCheck],
              ['Full audit trail', 'Every verification is recorded with a transparent timestamp.', FileSignature],
            ] as const).map(([title, text, Icon]) => (
              <div key={title} className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <Icon className="h-5 w-5 text-indigo-600" aria-hidden="true" />
                <h3 className="mt-5 text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-slate-950 px-4 py-20 text-center text-white sm:px-6">
          <Sparkles className="mx-auto h-6 w-6 text-indigo-400" aria-hidden="true" />
          <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Ready to make forgery detectable?</h2>
          <p className="mt-4 text-slate-400">Set up your institution in two minutes. Free forever.</p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/auth/signup" className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-indigo-50">
              Get started
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/docs" className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-white hover:border-indigo-500 hover:text-indigo-300">
              Read the docs
            </Link>
          </div>
        </section>
      </main>
    </PublicLayout>
  )
}

