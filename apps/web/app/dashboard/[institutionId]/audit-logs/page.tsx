'use client'

import * as React from 'react'
import Link from 'next/link'
import { Lock, ScrollText, Search } from 'lucide-react'
import { useInstitution } from '@/components/providers/institution-provider'
import {
  Button, EmptyState, ErrorState, Input, Loading, Notice, PageHeader, Pagination, ROLE_LABEL, Table, td, When, useLoad,
} from '@/components/app/ui'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { AuditEntry, InstitutionRole } from '@/lib/types'

const PAGE_SIZE = 20

const ACTION_LABELS: Record<string, string> = {
  INSTITUTION_REGISTERED: 'Institution created',
  INSTITUTION_RENAMED: 'Institution renamed',
  DOCUMENT_SIGNED: 'Signed a document',
  DOCUMENT_REVOKED: 'Revoked a document',
  DOCUMENTS_EXPORTED: 'Exported the document list',
  MEMBER_INVITED: 'Invited someone',
  MEMBER_ACCEPTED: 'Accepted an invitation',
  MEMBER_DECLINED: 'Declined an invitation',
  MEMBER_ROLE_CHANGED: 'Changed a member’s role',
  MEMBER_REMOVED: 'Removed a member',
  MEMBER_LEFT: 'Left the institution',
  MEMBER_INVITE_CANCELLED: 'Cancelled an invitation',
  MEMBER_SUSPENDED: 'Suspended a member',
  KEY_ROTATED: 'Rotated the signing key',
  API_KEY_CREATED: 'Created an API key',
  API_KEY_REVOKED: 'Revoked an API key',
  WEBHOOK_CREATED: 'Added a webhook',
  WEBHOOK_PAUSED: 'Turned a webhook off',
  WEBHOOK_RESUMED: 'Turned a webhook back on',
  WEBHOOK_DELETED: 'Deleted a webhook',
}

/** A code we have no words for yet, made readable: SOMETHING_HAPPENED → "Something happened". */
function actionLabel(code: string) {
  const known = ACTION_LABELS[code]
  if (known) return known
  const words = code.toLowerCase().replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/**
 * The API matches action codes (DOCUMENT_SIGNED), people and document titles. People type the
 * words they see ("signed a document"), so those become the code, or the part of it they share;
 * anything else (a name, a title) is sent as typed.
 */
function toActionSearch(text: string): string {
  const q = text.trim().toLowerCase()
  if (!q) return ''
  const codes = Object.keys(ACTION_LABELS).filter((code) => ACTION_LABELS[code].toLowerCase().includes(q))
  if (codes.length === 1) return codes[0]
  if (codes.length > 1) {
    const shared = codes.map((c) => c.split('_')).reduce((a, b) => a.filter((word) => b.includes(word)))
    if (shared.length) return shared.sort((a, b) => b.length - a.length)[0]
  }
  return q
}

// ── Reading the details each action records ──

type Meta = AuditEntry['metadata']
function text(m: Meta, key: string): string | undefined {
  const value = m?.[key]
  return typeof value === 'string' && value !== '' ? value : undefined
}
function num(m: Meta, key: string): number | undefined {
  const value = m?.[key]
  return typeof value === 'number' ? value : undefined
}
const role = (value: string | undefined) => (value && value in ROLE_LABEL ? ROLE_LABEL[value as InstitutionRole] : value)
const joined = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' · ') || null
const shortFingerprint = (f: string) => `${f.split(':').slice(0, 4).join(':')}…`

function details({ action, metadata: m }: AuditEntry): string | null {
  switch (action) {
    case 'INSTITUTION_REGISTERED':
      return joined(text(m, 'name'), text(m, 'emailDomain'))
    case 'INSTITUTION_RENAMED': {
      const from = text(m, 'from')
      const to = text(m, 'to')
      return from && to ? `“${from}” → “${to}”` : joined(to)
    }
    case 'DOCUMENT_SIGNED':
      return joined(text(m, 'batchId') && 'In a batch', text(m, 'viaApiKey') && (text(m, 'apiKeyName') ? `Through the API key “${text(m, 'apiKeyName')}”` : 'Through an API key'))
    case 'DOCUMENT_REVOKED':
      return text(m, 'reason') ? `Reason: ${text(m, 'reason')}` : null
    case 'DOCUMENTS_EXPORTED': {
      const rows = num(m, 'rows')
      return rows === undefined ? null : `${rows.toLocaleString()} ${rows === 1 ? 'document' : 'documents'}`
    }
    case 'MEMBER_INVITED':
      return joined(text(m, 'email'), text(m, 'role') && `as ${role(text(m, 'role'))?.toLowerCase()}`)
    case 'MEMBER_ROLE_CHANGED': {
      const from = role(text(m, 'from'))
      const to = role(text(m, 'to'))
      return joined(text(m, 'email'), from && to && `${from} → ${to}`)
    }
    case 'MEMBER_ACCEPTED':
    case 'MEMBER_DECLINED':
    case 'MEMBER_LEFT':
      return null // the person in the "Who" column is the member
    case 'KEY_ROTATED': {
      const fingerprint = text(m, 'fingerprint')
      return fingerprint ? `New key ${shortFingerprint(fingerprint)}` : null
    }
    case 'API_KEY_CREATED':
      return joined(text(m, 'name'), text(m, 'prefix') && `${text(m, 'prefix')}…`, role(text(m, 'role')))
    case 'API_KEY_REVOKED':
      return joined(text(m, 'name'), text(m, 'prefix') && `${text(m, 'prefix')}…`)
    case 'WEBHOOK_CREATED': {
      const raw = m?.events
      const events = Array.isArray(raw) ? raw.filter((e): e is string => typeof e === 'string') : []
      return joined(text(m, 'url'), events.length > 0 && events.join(', '))
    }
    default:
      return joined(text(m, 'email') ?? text(m, 'url'), text(m, 'reason') && `Reason: ${text(m, 'reason')}`)
  }
}

export default function AuditTrail() {
  const { institution, can } = useInstitution()
  return (
    <div>
      <PageHeader
        title="Audit trail"
        description={`A record of what people did in ${institution.name}: who signed or revoked documents, and who changed members, keys or settings, and when.`}
      />
      {can('ADMIN', 'AUDITOR') ? (
        <AuditList institutionId={institution.id} />
      ) : (
        <Notice tone="amber" icon={<Lock size={16} />}>Only administrators and auditors can see the audit trail.</Notice>
      )}
    </div>
  )
}

function AuditList({ institutionId }: { institutionId: string }) {
  const base = `/dashboard/${institutionId}`
  const [search, setSearch] = React.useState('')
  const [query, setQuery] = React.useState('')
  const [page, setPage] = React.useState(1)

  // Search as you type, without a request per keystroke.
  React.useEffect(() => {
    const t = setTimeout(() => { setQuery(search.trim()); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, error, loading, reload } = useLoad(
    () => api.auditLogs(institutionId, { page, pageSize: PAGE_SIZE, search: toActionSearch(query) }),
    [institutionId, page, query],
  )

  return (
    <>
      <div className="mb-4 space-y-1.5">
        <div className="relative max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
          <Input
            type="search"
            aria-label="Search the audit trail"
            aria-describedby="audit-search-hint"
            placeholder="Search by what happened"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <p id="audit-search-hint" className="text-xs text-slate-500 dark:text-slate-400">What happened (signed, revoked, member, key), who did it, or a document&apos;s title.</p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <Loading rows={6} label="Loading the audit trail…" />
      ) : data.items.length === 0 ? (
        query ? (
          <EmptyState icon={<Search size={28} />} title="Nothing matches" action={<Button variant="secondary" onClick={() => setSearch('')}>Clear the search</Button>}>
            Try what happened (signed, revoked, member), a person&apos;s name or email, or a document&apos;s title.
          </EmptyState>
        ) : (
          <EmptyState icon={<ScrollText size={28} />} title="No activity yet">
            Signing and revoking documents, and changes to members, keys and settings, are recorded here.
          </EmptyState>
        )
      ) : (
        <div className={cn('transition', loading && 'opacity-60')}>
          <Table head={['When', 'Who', 'What happened']}>
            {data.items.map((entry) => {
              const detail = details(entry)
              const title = entry.document?.title ?? (entry.action.startsWith('DOCUMENT_') ? text(entry.metadata, 'title') : undefined)
              return (
                <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className={cn(td, 'whitespace-nowrap align-top')}><When date={entry.createdAt} withTime /></td>
                  <td className={cn(td, 'align-top')}>
                    <span className="font-medium text-slate-900 dark:text-white">{entry.actor}</span>
                    {entry.actor !== entry.actorEmail && <span className="block text-xs text-slate-500 dark:text-slate-400">{entry.actorEmail}</span>}
                  </td>
                  <td className={cn(td, 'align-top')}>
                    <p className="text-slate-900 dark:text-white">{actionLabel(entry.action)}</p>
                    {entry.document ? (
                      <Link href={`${base}/documents/${entry.document.documentId}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                        {entry.document.title}
                      </Link>
                    ) : title ? (
                      <p className="font-medium">{title}</p>
                    ) : null}
                    {detail && <p className="mt-0.5 max-w-xl break-words text-xs text-slate-500 dark:text-slate-400">{detail}</p>}
                  </td>
                </tr>
              )
            })}
          </Table>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
        </div>
      )}
    </>
  )
}
