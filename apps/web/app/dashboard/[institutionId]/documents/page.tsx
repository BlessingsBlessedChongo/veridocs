'use client'

import * as React from 'react'
import Link from 'next/link'
import { Download, FileSignature, Files, Search } from 'lucide-react'
import { toast } from 'sonner'
import { useInstitution } from '@/components/providers/institution-provider'
import {
  Button, buttonStyles, DocumentStatusPill, EmptyState, ErrorState, Input, Loading, PageHeader, Pagination, Select, Table, td, timeAgo, When, useLoad,
} from '@/components/app/ui'
import { api, saveBlob } from '@/lib/api'

const PAGE_SIZE = 20

export default function Documents() {
  const { institution, can } = useInstitution()
  const base = `/dashboard/${institution.id}`
  const [search, setSearch] = React.useState('')
  const [query, setQuery] = React.useState('')
  const [status, setStatus] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [exporting, setExporting] = React.useState(false)

  // Search as you type, without a request per keystroke.
  React.useEffect(() => {
    const t = setTimeout(() => { setQuery(search.trim()); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, error, loading, reload } = useLoad(
    () => api.documents(institution.id, { page, pageSize: PAGE_SIZE, search: query, status }),
    [institution.id, page, query, status],
  )
  const signer = can('ADMIN', 'ISSUER')
  const filtered = Boolean(query || status)

  async function exportCsv() {
    setExporting(true)
    try {
      const { blob, fileName } = await api.exportDocuments(institution.id, { search: query, status })
      saveBlob(blob, fileName)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Everything your institution has signed. Search by title, recipient or document ID."
        actions={
          <>
            {can('ADMIN', 'ISSUER', 'AUDITOR') && <Button variant="secondary" onClick={exportCsv} busy={exporting}><Download size={16} aria-hidden />Export CSV</Button>}
            {signer && <Link href={`${base}/documents/batch`} className={buttonStyles.secondary}><Files size={16} aria-hidden />Sign a batch</Link>}
            {signer && <Link href={`${base}/documents/new`} className={buttonStyles.primary}><FileSignature size={16} aria-hidden />Sign a document</Link>}
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
          <Input aria-label="Search documents" placeholder="Search by title, recipient or ID" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select aria-label="Filter by status" className="sm:max-w-48" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="REVOKED">Revoked</option>
          <option value="EXPIRED">Expired</option>
        </Select>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <Loading rows={6} />
      ) : data.items.length === 0 ? (
        filtered ? (
          <EmptyState icon={<Search size={28} />} title="Nothing matches" action={<Button variant="secondary" onClick={() => { setSearch(''); setStatus('') }}>Clear filters</Button>}>Try a different word, or show all statuses.</EmptyState>
        ) : (
          <EmptyState icon={<FileSignature size={28} />} title="No documents yet" action={signer ? <Link href={`${base}/documents/new`} className={buttonStyles.primary}>Sign your first document</Link> : null}>
            Signed documents appear here with their status and how often they have been checked.
          </EmptyState>
        )
      ) : (
        <div className={loading ? 'opacity-60 transition' : 'transition'}>
          <Table head={['Document', 'Status', 'Issued', 'Checks', 'Signed by']}>
            {data.items.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className={td}>
                  <Link href={`${base}/documents/${d.documentId}`} className="font-medium text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400">{d.title}</Link>
                  <span className="block text-xs text-slate-500">{d.recipientName ?? <span className="font-mono">{d.documentId.slice(0, 8)}</span>}</span>
                </td>
                <td className={td}><DocumentStatusPill status={d.status} /></td>
                <td className={td}><When date={d.issuedAt} /></td>
                <td className={td}>
                  <span className="tabular-nums">{d.verificationCount}</span>
                  {d.lastVerifiedAt && <span className="block text-xs text-slate-500">last {timeAgo(d.lastVerifiedAt)}</span>}
                </td>
                <td className={`${td} max-w-48 truncate`}>{d.signedBy}</td>
              </tr>
            ))}
          </Table>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
        </div>
      )}
    </div>
  )
}
