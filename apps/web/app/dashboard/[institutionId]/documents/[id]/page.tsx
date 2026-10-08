'use client'
import { use, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { field } from '@/components/shared/shell'
import type { DocumentRecord } from '@/lib/types'
export default function Detail({ params }: { params: Promise<{ institutionId: string; id: string }> }) {
  const { institutionId, id } = use(params); const [d, setD] = useState<DocumentRecord | null | false>(null); const [reason, setReason] = useState(''); const [open, setOpen] = useState(false)
  useEffect(() => { api.listDocuments(institutionId, { pageSize: 100 }).then((r) => setD(r.items.find((x) => x.id === id || x.documentId === id) ?? false)).catch(() => setD(false)) }, [institutionId, id])
  if (d === null) return <p role="status" className="text-sm text-slate-500">Loading...</p>
  if (d === false) return <p role="alert" className="text-rose-700">Document not found.</p>
  const link = `${location.origin}/verify/${d.documentId}`
  return <div className="max-w-2xl space-y-6"><h1 className="text-3xl font-semibold tracking-tight">{d.title}</h1>
    <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white text-sm">{([['Status', d.status], ['File hash', d.fileHash], ['Signed by', d.signedByEmail], ['Issued', new Date(d.issuedAt).toLocaleString()], ['Verifications', String(d.verificationCount)], ['Revocation reason', d.revocationReason]] as const).map(([k, v]) => v ? <div key={k} className="flex justify-between gap-4 px-4 py-3"><dt className="text-slate-500">{k}</dt><dd className="break-all text-right font-mono text-xs">{v}</dd></div> : null)}</dl>
    <div className="flex gap-3"><button className="text-sm text-indigo-600" onClick={() => { navigator.clipboard.writeText(link); toast.success('Verification link copied.') }}>Copy link</button>{d.status === 'ACTIVE' && <button className="text-sm text-rose-600" onClick={() => setOpen(true)}>Revoke</button>}</div>
    {open && <div role="dialog" aria-label="Revoke document" className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4"><label htmlFor="r" className="text-sm font-medium">Reason (required)</label><textarea id="r" maxLength={500} className={`${field} h-24 py-2`} value={reason} onChange={(e) => setReason(e.target.value)} />
      <button disabled={!reason.trim()} className="h-10 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white disabled:opacity-50" onClick={() => api.revokeDocument(d.documentId, reason).then(() => { toast.success('Document revoked.'); setD({ ...d, status: 'REVOKED', revocationReason: reason }); setOpen(false) }).catch((e) => toast.error(e.message))}>Revoke document</button></div>}</div>
}
