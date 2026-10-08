'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { CenterCard, field, primaryBtn } from '@/components/shared/shell'
import { FileDrop } from '@/components/shared/file-drop'
import { api } from '@/lib/api'

export default function VerifyPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'qr' | 'pdf'>('qr')
  const [id, setId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  async function verifyFile() {
    if (!file) return
    setBusy(true)
    try { const r = await api.verifyUpload(file); sessionStorage.setItem('veridocs:upload-result', JSON.stringify(r)); router.push(`/verify/${r.documentId ?? 'upload'}?source=upload`) }
    catch (e) { toast.error((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <CenterCard>
      <h1 className="text-3xl font-semibold tracking-tight">Verify a document.</h1>
      <p className="mt-2 text-slate-600">Scan a QR code or upload a PDF. Verification is free and does not require an account.</p>
      <div role="tablist" className="mt-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-medium">
        {([['qr', 'Scan QR'], ['pdf', 'Upload PDF']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-md py-2 transition ${tab === k ? 'bg-white shadow-sm' : 'text-slate-500'}`}>{l}</button>))}
      </div>
      {tab === 'qr' ? (
        <div className="mt-6">
          <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-600"><Smartphone size={20} strokeWidth={1.5} aria-hidden />Point your phone camera at the QR code on the document. It opens the result directly.</div>
          <p className="my-4 text-center text-xs text-slate-400">or enter the document ID</p>
          <form onSubmit={(e) => { e.preventDefault(); if (id.trim()) router.push(`/verify/${encodeURIComponent(id.trim())}`) }} className="flex gap-2">
            <input aria-label="Document ID" className={`${field} font-mono`} placeholder="Document ID" value={id} onChange={(e) => setId(e.target.value)} />
            <button className={primaryBtn} aria-label="Verify document ID"><ArrowRight size={18} aria-hidden /></button>
          </form>
        </div>
      ) : (
        <div className="mt-6 space-y-4"><FileDrop file={file} onFile={setFile} />{file && <button onClick={verifyFile} disabled={busy} className={`${primaryBtn} w-full`}>{busy ? 'Verifying...' : 'Verify document'}</button>}</div>
      )}
      <p className="mt-8 text-center text-xs text-slate-500">Verification is cryptographically deterministic. No human judgment is involved.</p>
    </CenterCard>
  )
}
