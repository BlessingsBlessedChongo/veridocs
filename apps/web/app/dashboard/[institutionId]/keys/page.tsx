'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { field } from '@/components/shared/shell'
export default function Keys() {
  const [id, setId] = useState(''); const [t, setT] = useState('')
  return <div className="max-w-xl space-y-6"><h1 className="text-3xl font-semibold tracking-tight">Keys</h1>
    <p className="text-sm text-slate-600">A key pair signs your documents. Rotating creates a new active key; documents signed earlier stay verifiable.</p>
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-6"><label htmlFor="k" className="text-sm font-medium">Key pair ID</label><input id="k" className={`${field} font-mono`} value={id} onChange={(e) => setId(e.target.value)} />
      <label htmlFor="c" className="text-sm font-medium">Type ROTATE to confirm</label><input id="c" className={field} value={t} onChange={(e) => setT(e.target.value)} />
      <button disabled={!id || t !== 'ROTATE'} onClick={() => api.rotateKey(id.trim()).then(() => { toast.success('Key rotated.'); setT('') }).catch((e) => toast.error(e.message))} className="h-10 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white disabled:opacity-50">Rotate key</button></div></div>
}
