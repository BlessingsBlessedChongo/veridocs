'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react'
import { PublicLayout } from '@/components/shared/site-shell'
import { FileDrop } from '@/components/shared/file-drop'
import { ResultCard } from '@/components/verify/result-card'
import { ErrorState, Panel } from '@/components/app/ui'
import { api, sha256File } from '@/lib/api'
import { recallCheck } from '@/lib/verify'
import type { VerificationResult } from '@/lib/types'

function Result() {
  const { documentId } = useParams<{ documentId: string }>()
  const checkedFile = useSearchParams().get('checked') === 'file'
  const [result, setResult] = React.useState<VerificationResult | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [file, setFile] = React.useState<File | null>(null)
  const [matched, setMatched] = React.useState<boolean | null>(null)
  const [checking, setChecking] = React.useState(false)

  const load = React.useCallback(() => {
    setError(null)
    // A file was just checked on the previous page: show that answer rather than asking again.
    const remembered = checkedFile ? recallCheck(documentId) : null
    if (remembered) {
      setResult(remembered)
      setMatched(remembered.outcome !== 'ALTERED' && Boolean(remembered.checkedHash))
      return
    }
    api.verifyById(documentId).then(setResult).catch((e) => setError(e.message))
  }, [documentId, checkedFile])
  // sessionStorage only exists in the browser, so the remembered result is read after mounting.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(load, [load])

  /** Compares the visitor's copy with what was signed. Only its fingerprint leaves the device. */
  async function compare(f: File) {
    setFile(f)
    setChecking(true)
    try {
      const r = await api.verifyHash(await sha256File(f), documentId)
      setResult(r)
      setMatched(r.outcome !== 'ALTERED')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setChecking(false)
    }
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:py-14">
        <Link href="/verify" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 print:hidden"><ArrowLeft size={14} aria-hidden />Check another document</Link>
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : !result ? (
          <div role="status" className="flex flex-col items-center gap-3 py-20 text-sm text-slate-500">
            <ShieldCheck size={36} className="animate-pulse text-indigo-600" aria-hidden />
            Checking the signature…
          </div>
        ) : (
          <>
            <ResultCard result={result} fileName={file?.name} fileMatched={matched} />
            {result.documentId && matched === null && result.outcome !== 'NOT_FOUND' && (
              <Panel title="Do you have the PDF?" description="The QR code proves the document exists. To be sure your copy hasn't been edited, check the file itself." className="print:hidden">
                <FileDrop file={file} onFiles={([f]) => void compare(f)} compact label="Drop your copy here, or click to choose" />
                <p className="mt-3 flex items-start gap-2 text-xs text-slate-500"><Lock size={12} className="mt-0.5 shrink-0" aria-hidden />The file stays on your device. Only its fingerprint is compared.</p>
                {checking && <p role="status" className="mt-2 text-sm text-indigo-600">Comparing…</p>}
              </Panel>
            )}
          </>
        )}
      </div>
    </PublicLayout>
  )
}

export default function ResultPage() {
  return (
    <React.Suspense>
      <Result />
    </React.Suspense>
  )
}
