'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, FileSearch, Lock, QrCode, TextCursorInput } from 'lucide-react'
import { PublicLayout } from '@/components/shared/site-shell'
import { FileDrop } from '@/components/shared/file-drop'
import { QrScanner } from '@/components/verify/qr-scanner'
import { ResultCard } from '@/components/verify/result-card'
import { Button, Input, Notice } from '@/components/app/ui'
import { api, sha256File } from '@/lib/api'
import { documentIdFrom, rememberCheck } from '@/lib/verify'
import { cn } from '@/lib/utils'
import type { VerificationResult } from '@/lib/types'

type Tab = 'file' | 'scan' | 'id'
const TABS: Array<[Tab, string, React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>]> = [
  ['file', 'Check a PDF', FileSearch],
  ['scan', 'Scan the QR code', QrCode],
  ['id', 'Enter the link or ID', TextCursorInput],
]

function Verify() {
  const router = useRouter()
  const initial = (useSearchParams().get('tab') as Tab) || 'file'
  const [tab, setTab] = React.useState<Tab>(TABS.some(([t]) => t === initial) ? initial : 'file')
  const [file, setFile] = React.useState<File | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [notFound, setNotFound] = React.useState<VerificationResult | null>(null)
  const [text, setText] = React.useState('')

  async function checkFile(f: File) {
    setFile(f)
    setBusy(true)
    setError(null)
    setNotFound(null)
    try {
      // The fingerprint is worked out here, in the browser. Only these 64 characters are sent.
      const result = await api.verifyHash(await sha256File(f))
      if (result.documentId) {
        rememberCheck(result)
        router.push(`/verify/${result.documentId}?checked=file`)
      } else {
        setNotFound(result)
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const openId = React.useCallback((value: string) => {
    const id = documentIdFrom(value)
    if (!id) return setError('That is not a VeriDocs link or document ID. It looks like 3f2a…-…, or a link ending in /verify/ and an ID.')
    router.push(`/verify/${id}`)
  }, [router])

  return (
    <PublicLayout>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl dark:text-white">Is this document genuine?</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-400">Check a certificate, title deed or record signed with VeriDocs. It is free, takes seconds, and you don&apos;t need an account.</p>

        <div role="tablist" aria-label="Ways to check" className="mt-8 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
          {TABS.map(([key, label, Icon]) => (
            <button
              key={key}
              role="tab"
              id={`tab-${key}`}
              aria-selected={tab === key}
              aria-controls={`panel-${key}`}
              onClick={() => { setTab(key); setError(null) }}
              className={cn('flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-xs font-medium transition sm:flex-row sm:justify-center sm:gap-2 sm:text-sm', tab === key ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200')}
            >
              <Icon size={16} aria-hidden />
              {label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-6 space-y-4">
          {tab === 'file' && (
            <>
              <FileDrop file={file} onFiles={([f]) => void checkFile(f)} label="Drop the PDF you were given, or click to choose" />
              <p className="flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Lock size={14} className="mt-0.5 shrink-0" aria-hidden />
                Your file stays on this device. Your browser works out its fingerprint (SHA-256) and only that is sent to be looked up.
              </p>
              {busy && <p role="status" className="text-sm text-indigo-600">Checking…</p>}
            </>
          )}
          {tab === 'scan' && <QrScanner onResult={openId} />}
          {tab === 'id' && (
            <form onSubmit={(e) => { e.preventDefault(); openId(text) }} className="flex gap-2">
              <Input aria-label="Verification link or document ID" className="font-mono" placeholder="https://…/verify/… or the document ID" value={text} onChange={(e) => setText(e.target.value)} />
              <Button type="submit" aria-label="Check"><ArrowRight size={18} aria-hidden /></Button>
            </form>
          )}
          {error && <Notice tone="red">{error}</Notice>}
          {notFound && <ResultCard result={notFound} fileName={file?.name} />}
        </div>
      </div>
    </PublicLayout>
  )
}

export default function VerifyPage() {
  return (
    <React.Suspense>
      <Verify />
    </React.Suspense>
  )
}
