'use client'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { Paginated } from '@/lib/types'
export type Col = [string, (r: any) => React.ReactNode]
export function Paged({ load, cols, empty, deps = [] }: { load: (page: number) => Promise<Paginated<any>>; cols: Col[]; empty: string; deps?: unknown[] }) {
  const [page, setPage] = useState(1); const [d, setD] = useState<Paginated<any> | null>(null)
  useEffect(() => { setD(null); load(page).then(setD).catch((e) => { toast.error(e.message); setD({ items: [], page, pageSize: 20, total: 0 }) }) }, [page, ...deps]) // eslint-disable-line
  if (!d) return <p role="status" className="text-sm text-slate-500">Loading...</p>
  if (!d.items.length) return <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">{empty}</p>
  return <div className="space-y-3"><div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr>{cols.map(([h]) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
    <tbody>{d.items.map((r, i) => <tr key={r.id ?? i} className="border-t border-slate-100">{cols.map(([h, f]) => <td key={h} className="px-4 py-3">{f(r)}</td>)}</tr>)}</tbody></table></div>
    <div className="flex items-center gap-3 text-sm"><button disabled={page === 1} onClick={() => setPage(page - 1)} className="disabled:opacity-40">Previous</button><span>Page {page} of {Math.max(1, Math.ceil(d.total / d.pageSize))}</span><button disabled={page * d.pageSize >= d.total} onClick={() => setPage(page + 1)} className="disabled:opacity-40">Next</button></div></div>
}
