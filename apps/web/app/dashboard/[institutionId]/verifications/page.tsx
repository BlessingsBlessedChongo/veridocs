'use client'

import * as React from 'react'
import Link from 'next/link'
import { ListFilter, Lock, ShieldCheck } from 'lucide-react'
import { useInstitution } from '@/components/providers/institution-provider'
import {
  Button, EmptyState, ErrorState, Loading, Mono, Notice, OUTCOME, OutcomePill, PageHeader, Pagination, Select, Table, td, When, useLoad,
} from '@/components/app/ui'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Method, Outcome } from '@/lib/types'

const PAGE_SIZE = 20

const FILTERS: Outcome[] = ['VALID', 'ALTERED', 'FORGED', 'REVOKED', 'EXPIRED']

const METHOD: Record<Method, string> = {
  ID: 'Link or QR code',
  UPLOAD: 'File uploaded',
  HASH: 'File checked on device',
}

const MEANING: Array<[Outcome, string]> = [
  ['VALID', 'The document is exactly as you signed it, and still in force.'],
  ['ALTERED', 'Someone checked a file that is not the one you signed. It has been changed, even if only slightly.'],
  ['FORGED', 'The signature on record does not match your institution’s key. The document should not be trusted.'],
  ['REVOKED', 'A genuine document that your institution has withdrawn.'],
  ['EXPIRED', 'A genuine document that is past its expiry date.'],
]

/** The API shortens IPv4 addresses (41.72.x.x); shorten IPv6 ones the same way before showing them. */
function shortNetwork(network: string) {
  if (network.includes('.') || !network.includes(':')) return network
  return `${network.split(':').filter(Boolean).slice(0, 2).join(':')}:…`
}

export default function Checks() {
  const { institution, can } = useInstitution()
  return (
    <div>
      <PageHeader
        title="Checks"
        description={`Every time someone checked one of ${institution.name}'s documents, newest first. To protect the privacy of the people checking, only part of their network address and the kind of device they used are shown.`}
      />
      {can('ADMIN', 'ISSUER', 'AUDITOR') ? (
        <CheckList institutionId={institution.id} />
      ) : (
        <Notice tone="amber" icon={<Lock size={16} />}>Only administrators, issuers and auditors can see who checked your documents.</Notice>
      )}
    </div>
  )
}

function CheckList({ institutionId }: { institutionId: string }) {
  const base = `/dashboard/${institutionId}`
  const [status, setStatus] = React.useState<Outcome | ''>('')
  const [page, setPage] = React.useState(1)
  const { data, error, loading, reload } = useLoad(
    () => api.verifications(institutionId, { page, pageSize: PAGE_SIZE, status }),
    [institutionId, page, status],
  )

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Select
          aria-label="Show checks with this result"
          className="sm:max-w-56"
          value={status}
          onChange={(e) => { setStatus(e.target.value as Outcome | ''); setPage(1) }}
        >
          <option value="">All results</option>
          {FILTERS.map((o) => <option key={o} value={o}>{OUTCOME[o][1]}</option>)}
        </Select>
        {data && <p className="text-sm text-slate-500 dark:text-slate-400">{data.total.toLocaleString()} {data.total === 1 ? 'check' : 'checks'}</p>}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <Loading rows={6} label="Loading checks…" />
      ) : data.items.length === 0 ? (
        status ? (
          <EmptyState icon={<ListFilter size={28} />} title={`No checks with the result “${OUTCOME[status][1]}”`} action={<Button variant="secondary" onClick={() => { setStatus(''); setPage(1) }}>Show all results</Button>}>
            Try another result, or show them all.
          </EmptyState>
        ) : (
          <EmptyState icon={<ShieldCheck size={28} />} title="No checks yet">
            When someone scans the QR code on one of your documents, opens its link or uploads it to check it, it appears here.
          </EmptyState>
        )
      ) : (
        <div className={cn('transition', loading && 'opacity-60')}>
          <Table head={['When', 'Document', 'Result', 'How it was checked', 'Network', 'Device']}>
            {data.items.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className={cn(td, 'whitespace-nowrap')}><When date={v.verifiedAt} withTime /></td>
                <td className={td}>
                  <Link href={`${base}/documents/${v.document.documentId}`} className="font-medium text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400">
                    {v.document.title}
                  </Link>
                  {v.document.recipientName && <span className="block text-xs text-slate-500 dark:text-slate-400">{v.document.recipientName}</span>}
                </td>
                <td className={td}><OutcomePill outcome={v.result} /></td>
                <td className={td}>{METHOD[v.method] ?? v.method}</td>
                <td className={td}>{v.network ? <Mono>{shortNetwork(v.network)}</Mono> : <span className="text-slate-400">—</span>}</td>
                <td className={td}>{v.device ?? <span className="text-slate-400">—</span>}</td>
              </tr>
            ))}
          </Table>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
        </div>
      )}

      <details className="mt-6 text-sm">
        <summary className="w-fit cursor-pointer select-none text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">What each result means</summary>
        <dl className="mt-3 space-y-2">
          {MEANING.map(([outcome, meaning]) => (
            <div key={outcome} className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
              <dt className="shrink-0 sm:w-24"><OutcomePill outcome={outcome} /></dt>
              <dd className="text-slate-600 dark:text-slate-400">{meaning}</dd>
            </div>
          ))}
        </dl>
      </details>
    </>
  )
}
