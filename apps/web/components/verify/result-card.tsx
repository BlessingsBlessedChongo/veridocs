'use client'

import * as React from 'react'
import { BadgeCheck, CircleCheck, CircleX, Clock, FileCheck2, FileX2, Printer, ShieldAlert, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Outcome, VerificationResult } from '@/lib/types'
import { CopyButton, Mono } from '@/components/app/ui'

const HERO: Record<Outcome, { title: string; tone: 'good' | 'warn' | 'bad'; icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }> }> = {
  VALID: { title: 'Genuine document', tone: 'good', icon: CircleCheck },
  ALTERED: { title: 'This file has been changed', tone: 'bad', icon: FileX2 },
  NOT_FOUND: { title: 'Not a VeriDocs document', tone: 'bad', icon: CircleX },
  FORGED: { title: 'Signature does not match', tone: 'bad', icon: ShieldAlert },
  REVOKED: { title: 'Withdrawn by the issuer', tone: 'warn', icon: TriangleAlert },
  EXPIRED: { title: 'Expired', tone: 'warn', icon: Clock },
}

const TONE = {
  good: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100',
  warn: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100',
  bad: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100',
}
const ICON = { good: 'text-emerald-600', warn: 'text-amber-600', bad: 'text-rose-600' }

const DOMAIN: Record<string, string> = {
  DOMAIN_VERIFIED: 'Domain confirmed',
  MANUALLY_VERIFIED: 'Identity confirmed',
  PENDING: 'Domain not yet confirmed',
  REJECTED: 'Identity rejected',
}

/** The verdict, in plain words first, then the evidence for anyone who wants it. */
export function ResultCard({ result, fileName, fileMatched }: { result: VerificationResult; fileName?: string; fileMatched?: boolean | null }) {
  const hero = HERO[result.outcome]
  const Icon = hero.icon
  const issuer = result.issuerDetails
  const confirmed = issuer && (issuer.verificationStatus === 'DOMAIN_VERIFIED' || issuer.verificationStatus === 'MANUALLY_VERIFIED')

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:shadow-none dark:border-slate-800 dark:bg-slate-900" aria-live="polite">
      <header className={cn('flex items-start gap-4 border-b p-6', TONE[hero.tone])}>
        <Icon size={44} className={cn('shrink-0', ICON[hero.tone])} aria-hidden />
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{hero.title}</h2>
          <p className="mt-1 text-sm opacity-90">{result.reason}</p>
          {result.outcome === 'REVOKED' && result.revocationReason && <p className="mt-2 text-sm"><span className="font-medium">The issuer said:</span> “{result.revocationReason}”</p>}
        </div>
      </header>

      {fileMatched !== undefined && fileMatched !== null && result.outcome !== 'ALTERED' && (
        <p className={cn('flex items-center gap-2 border-b px-6 py-3 text-sm', fileMatched ? 'border-slate-100 text-emerald-700 dark:border-slate-800 dark:text-emerald-300' : 'text-rose-700')}>
          <FileCheck2 size={16} aria-hidden />
          {fileName ? <>Your copy, <span className="font-medium">{fileName}</span>, is byte-for-byte the file that was signed.</> : 'Your copy is byte-for-byte the file that was signed.'}
        </p>
      )}

      {result.documentId ? (
        <dl className="divide-y divide-slate-100 px-6 text-sm dark:divide-slate-800">
          {issuer && (
            <Row label="Issued by">
              <span className="font-medium text-slate-900 dark:text-white">{issuer.name}</span>
              <span className={cn('mt-0.5 flex items-center gap-1 text-xs', confirmed ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400')}>
                {confirmed ? <BadgeCheck size={14} aria-hidden /> : <TriangleAlert size={14} aria-hidden />}
                {DOMAIN[issuer.verificationStatus]} · {issuer.emailDomain}
              </span>
            </Row>
          )}
          <Row label="Document"><span className="font-medium text-slate-900 dark:text-white">{result.title}</span>{result.description && <span className="block text-slate-500">{result.description}</span>}</Row>
          {result.recipientName && <Row label="Issued to">{result.recipientName}</Row>}
          {result.issuedAt && <Row label="Issued on">{new Date(result.issuedAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</Row>}
          <Row label="Valid until">{result.expiresAt ? new Date(result.expiresAt).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'No expiry date'}</Row>
          {result.revokedAt && <Row label="Withdrawn on">{new Date(result.revokedAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</Row>}
        </dl>
      ) : (
        <div className="space-y-2 p-6 text-sm text-slate-600 dark:text-slate-300">
          {fileName && <p>We checked <span className="font-medium">{fileName}</span>.</p>}
          <p>Either it was changed after it was signed (even re-saving or re-printing to PDF changes it), or it was never signed through VeriDocs. Ask the issuer for the original file, or use the QR code printed on it.</p>
        </div>
      )}

      {result.documentId && (
        <details className="group border-t border-slate-100 px-6 py-4 text-sm dark:border-slate-800">
          <summary className="cursor-pointer select-none font-medium text-slate-700 marker:text-slate-400 dark:text-slate-300">Technical evidence</summary>
          <dl className="mt-3 space-y-3">
            <Evidence label="Document ID" value={result.documentId} />
            {result.fileHash && <Evidence label="SHA-256 fingerprint of the signed file" value={result.fileHash} />}
            {result.checkedHash && result.checkedHash !== result.fileHash && <Evidence label="Fingerprint of the file you checked" value={result.checkedHash} />}
            {result.signature && <Evidence label={`Signing key (${result.signature.algorithm}${result.signature.keyStatus !== 'ACTIVE' ? ', since replaced' : ''})`} value={result.signature.keyFingerprint} />}
            <p className="text-xs text-slate-500">Checked {new Date(result.checkedAt).toLocaleString()}. The signature was verified against the institution&apos;s public key; no person made this judgement.</p>
          </dl>
        </details>
      )}

      <footer className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-3 print:hidden dark:border-slate-800">
        <span className="text-xs text-slate-500">VeriDocs · SHA-256 and RSA-2048</span>
        <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
          <Printer size={14} aria-hidden />Print or save as PDF
        </button>
      </footer>
    </article>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[140px_1fr] sm:gap-4">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="flex flex-col text-slate-800 dark:text-slate-200">{children}</dd>
    </div>
  )
}

function Evidence({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="flex items-start gap-1"><Mono>{value}</Mono><CopyButton value={value} className="print:hidden" /></dd>
    </div>
  )
}
