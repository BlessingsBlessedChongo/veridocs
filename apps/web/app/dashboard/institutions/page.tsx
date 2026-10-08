'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { field, primaryBtn } from '@/components/shared/shell'
import { Logo } from '@/components/ui/logo'

// The API contract has no "list my institutions" route, so users open an institution by ID or register a new one.
export default function Institutions() {
  const router = useRouter()
  const [id, setId] = useState(''); const [name, setName] = useState(''); const [domain, setDomain] = useState(''); const [busy, setBusy] = useState(false)
  async function create(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    try { const i = await api.registerInstitution({ name, emailDomain: domain }); toast.success('Institution created. You are now an admin.'); router.push(`/dashboard/${i.id}`) }
    catch (err) { toast.error((err as Error).message) } finally { setBusy(false) }
  }
  return (
    <div className="max-w-xl space-y-10">
      <h1 className="text-3xl font-semibold tracking-tight">Institutions</h1>
      <form onSubmit={(e) => { e.preventDefault(); id && router.push(`/dashboard/${id.trim()}`) }} className="space-y-2">
        <label htmlFor="iid" className="text-sm font-medium">Open an institution by ID</label>
        <div className="flex gap-2"><input id="iid" className={`${field} font-mono`} value={id} onChange={(e) => setId(e.target.value)} /><button className={primaryBtn}>Open</button></div>
      </form>
      <form onSubmit={create} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600"><Logo size={24} variant="mono-light" aria-hidden /></span><h2 className="text-lg font-semibold">Create institution</h2></div>
        <div><label htmlFor="n" className="mb-1 block text-sm font-medium">Name</label><input id="n" required minLength={2} className={field} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label htmlFor="d" className="mb-1 block text-sm font-medium">Email domain</label><input id="d" required placeholder="example.edu" className={field} value={domain} onChange={(e) => setDomain(e.target.value)} /><p className="mt-1 text-xs text-slate-500">Used to verify your institution. A signing key pair is generated on creation.</p></div>
        <button disabled={busy} className={primaryBtn}>{busy ? 'Creating...' : 'Create institution'}</button>
      </form>
    </div>
  )
}
