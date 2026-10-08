'use client'
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { field, primaryBtn } from '@/components/shared/shell'
import type { DocumentRecord } from '@/lib/types'

const tone = { ACTIVE: 'bg-emerald-50 text-emerald-700', REVOKED: 'bg-rose-50 text-rose-700', EXPIRED: 'bg-amber-50 text-amber-700' }

export default function Documents({ params }: { params: Promise<{ institutionId: string }> }) {
  const { institutionId } = use(params)
  const [items, setItems] = useState<DocumentRecord[] | null>(null)
  const [page, setPage] = useState(1); const [total, setTotal] = useState(0)
  const [search, setSearch] = useState(''); const [status, setStatus] = useState('')
  useEffect(() => {
    setItems(null)
    api.listDocuments(institutionId, { page, pageSize: 20, search, status }).then((r) => { setItems(r.items); setTotal(r.total) }).catch((e) => { toast.error(e.message); setItems([]) })
  }, [institutionId, page, search, status])
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-semibold tracking-tight">Documents</h1><Link href={`/dashboard/${institutionId}/documents/new`} className={primaryBtn}>Sign document</Link></div>
      <div className="flex gap-2"><input aria-label="Search documents" placeholder="Search" className={field} value={search} onChange={(e) => { setPage(1); setSearch(e.target.value) }} />
        <select aria-label="Status" className={`${field} max-w-40`} value={status} onChange={(e) => { setPage(1); setStatus(e.target.value) }}><option value="">All statuses</option><option>ACTIVE</option><option>REVOKED</option><option>EXPIRED</option></select></div>
      {items === null ? <p role="status" className="text-sm text-slate-500">Loading...</p> : items.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">No documents yet. Sign your first document to see it here.</p> : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">Title</th><th>Status</th><th>Issued</th><th>Verifications</th></tr></thead>
          <tbody>{items.map((d) => <tr key={d.id} className="border-t border-slate-100"><td className="px-4 py-3 font-medium"><Link href={`/dashboard/${institutionId}/documents/${d.id}`} className="hover:text-indigo-600">{d.title}</Link></td><td><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone[d.status]}`}>{d.status}</span></td><td>{new Date(d.issuedAt).toLocaleDateString()}</td><td>{d.verificationCount}</td></tr>)}</tbody></table></div>)}
      {total > 20 && <div className="flex items-center gap-3 text-sm"><button disabled={page === 1} onClick={() => setPage(page - 1)} className="disabled:opacity-40">Previous</button><span>Page {page} of {Math.ceil(total / 20)}</span><button disabled={page * 20 >= total} onClick={() => setPage(page + 1)} className="disabled:opacity-40">Next</button></div>}
    </div>
  )
}
