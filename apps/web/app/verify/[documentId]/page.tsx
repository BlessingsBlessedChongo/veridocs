'use client'
import { use, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CircleCheck, CircleX, ShieldCheck, TriangleAlert } from 'lucide-react'
import { CenterCard } from '@/components/shared/shell'
import { api } from '@/lib/api'
import type { VerificationResult } from '@/lib/types'
import { Logo } from '@/components/ui/logo'

export default function Result({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = use(params)
  const upload = useSearchParams().get('source') === 'upload'
  const [r, setR] = useState<VerificationResult | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    if (upload) { const s = sessionStorage.getItem('veridocs:upload-result'); if (s) { setR(JSON.parse(s)); return } }
    api.verifyById(documentId).then(setR).catch((e) => setErr(e.message))
  }, [documentId, upload])

  if (err) return <CenterCard><Box icon={<TriangleAlert size={64} className="text-amber-600" />} title="Could not verify" sub={err} /></CenterCard>
  if (!r) return <CenterCard><div role="status" className="py-8 text-center"><ShieldCheck className="mx-auto animate-pulse text-indigo-600" size={32} aria-hidden /><p className="mt-4 font-mono text-sm text-slate-500">Verifying signature...</p></div></CenterCard>
  const ok = r.valid && r.status === 'ACTIVE'
  const inactive = r.status === 'REVOKED' || r.status === 'EXPIRED'
  return (
    <CenterCard>
      <div className="mb-4 flex justify-end"><Logo size={24} variant="primary" aria-hidden /></div>
      {ok ? <Box icon={<CircleCheck size={64} className="text-emerald-600" />} title="Document verified" sub="This document is authentic and has not been altered." />
        : inactive ? <Box icon={<TriangleAlert size={64} className="animate-pulse text-amber-600" />} title="Document no longer valid" sub={r.reason ?? `This document has been ${r.status?.toLowerCase()}.`} />
        : <Box icon={<CircleX size={64} className="text-rose-600" />} title="Verification failed" sub={r.reason ?? 'The document could not be matched to a valid signature.'} />}
      {(r.documentId || r.title) && (
        <dl className="mt-6 divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
          {([['Document ID', r.documentId, true], ['Issued by', r.issuer], ['Title', r.title], ['Issued at', r.issuedAt && new Date(r.issuedAt).toLocaleString()], ['Status', r.valid ? r.status : 'INVALID']] as const).map(([k, v, mono]) => v ? (
            <div key={k} className="flex justify-between gap-4 px-4 py-3"><dt className="text-slate-500">{k}</dt><dd className={`text-right font-medium ${mono ? 'font-mono text-xs' : ''}`}>{v}</dd></div>) : null)}
        </dl>)}
      <p className="mt-6 text-center text-xs text-slate-500">{ok ? 'Verified using cryptographic signatures. No human judgment was involved.' : 'This document may have been tampered with. Do not trust it.'}</p>
    </CenterCard>
  )
}
function Box({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return <div className="text-center"><div className="flex justify-center" aria-hidden>{icon}</div><h1 className="mt-4 text-2xl font-semibold tracking-tight">{title}</h1><p className="mt-2 text-slate-600">{sub}</p></div>
}
