'use client'

import * as React from 'react'
import Link from 'next/link'
import { Activity, FileCheck2, FileSignature, Files, ShieldAlert, ShieldCheck, Upload } from 'lucide-react'
import { useInstitution } from '@/components/providers/institution-provider'
import { buttonStyles, EmptyState, ErrorState, Loading, Mono, Notice, PageHeader, Panel, Pill, StatCard, timeAgo, useLoad } from '@/components/app/ui'
import { api } from '@/lib/api'
import type { Stats } from '@/lib/types'

const ACTIONS: Record<string, string> = {
  INSTITUTION_REGISTERED: 'created the institution',
  INSTITUTION_RENAMED: 'renamed the institution',
  DOCUMENT_SIGNED: 'signed',
  DOCUMENT_REVOKED: 'revoked',
  DOCUMENTS_EXPORTED: 'exported the documents list',
  MEMBER_INVITED: 'invited someone',
  MEMBER_ACCEPTED: 'joined',
  MEMBER_DECLINED: 'declined an invitation',
  MEMBER_ROLE_CHANGED: 'changed a role',
  MEMBER_REMOVED: 'removed a member',
  MEMBER_LEFT: 'left',
  KEY_ROTATED: 'rotated the signing key',
  API_KEY_CREATED: 'created an API key',
  API_KEY_REVOKED: 'revoked an API key',
  WEBHOOK_CREATED: 'added a webhook',
}

export default function Overview() {
  const { institution, can } = useInstitution()
  const { data: stats, error, reload } = useLoad(() => api.stats(institution.id), [institution.id])
  const base = `/dashboard/${institution.id}`
  const signer = can('ADMIN', 'ISSUER')

  return (
    <div className="space-y-8">
      <PageHeader
        title={institution.name}
        description={<>{institution.emailDomain} · {institution.memberCount} {institution.memberCount === 1 ? 'member' : 'members'}</>}
        actions={signer && (
          <>
            <Link href={`${base}/documents/batch`} className={buttonStyles.secondary}><Files size={16} aria-hidden />Sign a batch</Link>
            <Link href={`${base}/documents/new`} className={buttonStyles.primary}><FileSignature size={16} aria-hidden />Sign a document</Link>
          </>
        )}
      />

      {institution.verificationStatus === 'PENDING' && (
        <Notice tone="amber" icon={<ShieldAlert size={16} />}>
          This institution&apos;s domain ({institution.emailDomain}) is awaiting review, because it was created with an email address on another domain. Documents you sign are valid, but people who verify them will see that the domain is not yet confirmed.
        </Notice>
      )}

      {error ? <ErrorState message={error} onRetry={reload} /> : !stats ? <Loading rows={3} /> : <Dashboard stats={stats} base={base} signer={signer} />}
    </div>
  )
}

function Dashboard({ stats, base, signer }: { stats: Stats; base: string; signer: boolean }) {
  const failed = stats.verifications.last30Days - (stats.verifications.byResult.VALID ?? 0)
  if (stats.documents.total === 0) {
    return (
      <EmptyState
        icon={<FileSignature size={28} />}
        title="No documents signed yet"
        action={signer ? <Link href={`${base}/documents/new`} className={buttonStyles.primary}>Sign your first document</Link> : null}
      >
        Upload a PDF, and VeriDocs adds a QR code, fingerprints the file and signs it with your institution&apos;s key. Anyone can then check it in seconds.
      </EmptyState>
    )
  }
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active documents" value={stats.documents.active.toLocaleString()} hint={`${stats.documents.signedLast30Days} signed in the last 30 days`} icon={<FileCheck2 size={16} aria-hidden />} />
        <StatCard label="Checks, last 30 days" value={stats.verifications.last30Days.toLocaleString()} hint={`${(stats.verifications.byResult.VALID ?? 0).toLocaleString()} confirmed genuine`} icon={<ShieldCheck size={16} aria-hidden />} tone="good" />
        <StatCard label="Failed checks" value={failed.toLocaleString()} hint="Altered, forged, revoked or expired" icon={<ShieldAlert size={16} aria-hidden />} tone={failed > 0 ? 'bad' : 'default'} />
        <StatCard label="Revoked or expired" value={(stats.documents.revoked + stats.documents.expired).toLocaleString()} hint={`${stats.documents.revoked} revoked · ${stats.documents.expired} expired`} icon={<Activity size={16} aria-hidden />} tone={stats.documents.revoked ? 'warn' : 'default'} />
      </div>

      <Panel title="Checks over the last 30 days" description="Each bar is a day. Green: confirmed genuine. Red: the check failed.">
        <DailyChart days={stats.verifications.daily} />
        <MethodSplit byMethod={stats.verifications.byMethod} />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Most checked" description="In the last 30 days." padded={stats.mostChecked.length === 0}>
          {stats.mostChecked.length === 0 ? (
            <p className="text-sm text-slate-500">No one has checked a document in the last 30 days.</p>
          ) : (
            <ol className="divide-y divide-slate-100 dark:divide-slate-800">
              {stats.mostChecked.map((d) => (
                <li key={d.documentId}>
                  <Link href={`${base}/documents/${d.documentId}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-900 dark:text-white">{d.title}</span>
                      {d.recipientName && <span className="block truncate text-xs text-slate-500">{d.recipientName}</span>}
                    </span>
                    <Pill tone="indigo">{d.checks} {d.checks === 1 ? 'check' : 'checks'}</Pill>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Recent activity" actions={<Link href={`${base}/audit-logs`} className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">Audit trail</Link>} padded={false}>
          {stats.recentActivity.length === 0 && <p className="px-5 py-4 text-sm text-slate-500">Nothing has happened here yet.</p>}
          <ol className="divide-y divide-slate-100 dark:divide-slate-800">
            {stats.recentActivity.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 px-5 py-3 text-sm">
                <p className="min-w-0 text-slate-700 dark:text-slate-300">
                  <span className="font-medium text-slate-900 dark:text-white">{a.actor}</span> {ACTIONS[a.action] ?? a.action.toLowerCase().replace(/_/g, ' ')}
                  {a.document && (
                    <> <Link href={`${base}/documents/${a.document.documentId}`} className="text-indigo-600 hover:underline dark:text-indigo-400">{a.document.title}</Link></>
                  )}
                </p>
                <span className="shrink-0 text-xs text-slate-500">{timeAgo(a.createdAt)}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </>
  )
}

/** A simple stacked bar chart in SVG: no chart library, and it reads well in both themes. */
function DailyChart({ days }: { days: Stats['verifications']['daily'] }) {
  const max = Math.max(1, ...days.map((d) => d.valid + d.failed))
  const [hover, setHover] = React.useState<number | null>(null)
  const H = 140
  const barW = 100 / days.length
  const total = days.reduce((n, d) => n + d.valid + d.failed, 0)
  if (total === 0) return <p className="py-10 text-center text-sm text-slate-500">No checks in the last 30 days yet. When people scan your documents, they appear here.</p>
  const shown = hover !== null ? days[hover] : null
  return (
    <div>
      <div className="mb-2 h-5 text-sm text-slate-600 dark:text-slate-400" aria-live="polite">
        {shown ? <>{new Date(shown.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}: <span className="text-emerald-600">{shown.valid} genuine</span>{shown.failed ? <>, <span className="text-rose-600">{shown.failed} failed</span></> : null}</> : `${total} checks in total`}
      </div>
      <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" className="h-40 w-full" role="img" aria-label={`Checks per day over 30 days, ${total} in total`} onMouseLeave={() => setHover(null)}>
        {days.map((d, i) => {
          const validH = (d.valid / max) * (H - 4)
          const failedH = (d.failed / max) * (H - 4)
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)}>
              <rect x={i * barW} y={0} width={barW} height={H} fill="transparent" />
              <rect x={i * barW + barW * 0.15} y={H - validH} width={barW * 0.7} height={validH} rx={0.6} className="fill-emerald-500/80" />
              <rect x={i * barW + barW * 0.15} y={H - validH - failedH} width={barW * 0.7} height={failedH} rx={0.6} className="fill-rose-500/80" />
              {hover === i && <rect x={i * barW} y={0} width={barW} height={H} className="fill-slate-400/10" />}
            </g>
          )
        })}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-slate-400">
        <span>{new Date(days[0].date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
        <span>Today</span>
      </div>
    </div>
  )
}

function MethodSplit({ byMethod }: { byMethod: Stats['verifications']['byMethod'] }) {
  const items = [
    ['ID', 'Link or QR code', ShieldCheck],
    ['UPLOAD', 'File uploaded', Upload],
    ['HASH', 'Checked on their device', FileCheck2],
  ] as const
  const total = items.reduce((n, [k]) => n + (byMethod[k] ?? 0), 0)
  if (!total) return null
  return (
    <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-3 dark:border-slate-800">
      {items.map(([k, label, Icon]) => (
        <div key={k} className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <Icon size={14} aria-hidden />
          {label}: <Mono className="text-sm">{(byMethod[k] ?? 0).toLocaleString()}</Mono>
        </div>
      ))}
    </div>
  )
}
