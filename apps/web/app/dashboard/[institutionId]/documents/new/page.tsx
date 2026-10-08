'use client'
import { use, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { FileDrop } from '@/components/shared/file-drop'
import { field, primaryBtn } from '@/components/shared/shell'

export default function SignDocument({ params }: { params: Promise<{ institutionId: string }> }) {
  const { institutionId } = use(params)
  const [file, setFile] = useState<File | null>(null); const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [expiresAt, setExpiresAt] = useState('')
  const [busy, setBusy] = useState(false); const [done, setDone] = useState<{ url: string; id: string | null } | null>(null)
  async function sign(e: React.FormEvent) {
    e.preventDefault(); if (!file) return toast.error('Choose a PDF to sign.')
    setBusy(true)
    try {
      const { blob, documentId } = await api.signDocument(file, institutionId, { title, description: description || undefined, expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined })
      setDone({ url: URL.createObjectURL(blob), id: documentId }); toast.success('Document signed.')
    } catch (err) { toast.error((err as Error).message) } finally { setBusy(false) }
  }
  if (done) return (
    <div className="max-w-md space-y-4"><h1 className="text-3xl font-semibold tracking-tight">Document signed</h1>
      <a href={done.url} download={`${title || 'document'}-signed.pdf`} className={primaryBtn}>Download PDF</a>
      {done.id && <button className="block text-sm text-indigo-600" onClick={() => { navigator.clipboard.writeText(`${location.origin}/verify/${done.id}`); toast.success('Verification link copied.') }}>Copy verification link</button>}
      <button className="block text-sm text-slate-600" onClick={() => { setDone(null); setFile(null); setTitle(''); setDescription('') }}>Sign another</button></div>)
  return (
    <form onSubmit={sign} className="max-w-xl space-y-5"><h1 className="text-3xl font-semibold tracking-tight">Sign document</h1>
      <FileDrop file={file} onFile={setFile} />
      <div><label htmlFor="t" className="mb-1 block text-sm font-medium">Title</label><input id="t" required maxLength={200} className={field} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div><label htmlFor="ds" className="mb-1 block text-sm font-medium">Description (optional)</label><textarea id="ds" maxLength={500} className={`${field} h-24 py-2`} value={description} onChange={(e) => setDescription(e.target.value)} /><p className="text-right text-xs text-slate-400">{description.length}/500</p></div>
      <div><label htmlFor="ex" className="mb-1 block text-sm font-medium">Expires on (optional)</label><input id="ex" type="date" className={field} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></div>
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">This will use your institution&apos;s active key. Signing is logged in the audit trail.</p>
      <button disabled={busy} className={primaryBtn}>{busy ? 'Signing...' : 'Sign document'}</button></form>)
}
