'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { Ban, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { useInstitution } from '@/components/providers/institution-provider'
import {
  Button, buttonStyles, ConfirmDialog, CopyButton, DefinitionList, DocumentStatusPill, ErrorState, Field, Loading, Mono, Notice,
  OutcomePill, PageHeader, Panel, Pill, Textarea, timeAgo, When, useLoad,
} from '@/components/app/ui'
import { api } from '@/lib/api'
import type { Outcome } from '@/lib/types'

const METHOD: Record<string, string> = { ID: 'Link or QR code', UPLOAD: 'File uploaded', HASH: 'Checked on their device' }

export default function DocumentDetail() {
  const { institution, can } = useInstitution()
  const { documentId } = useParams<{ documentId: string }>()
  const { data: doc, error, reload, setData } = useLoad(() => api.document(documentId), [documentId])
  const [revoking, setRevoking] = React.useState(false)
  const [reason, setReason] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const base = `/dashboard/${institution.id}`

  if (error) return <ErrorState message={error} onRetry={reload} />
  if (!doc) return <Loading rows={5} />

  const expired = doc.status === 'ACTIVE' && doc.expiresAt && new Date(doc.expiresAt) < new Date()
  const status = expired ? 'EXPIRED' : doc.status

  async function revoke() {
    setBusy(true)
    try {
      await api.revoke(doc!.documentId, reason.trim())
      toast.success('Document revoked. Anyone who checks it now sees that it was withdrawn.')
      setData({ ...doc!, status: 'REVOKED', revokedAt: new Date().toISOString(), revocationReason: reason.trim() })
      setRevoking(false)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: `${base}/documents`, label: 'Documents' }}
        title={doc.title}
        description={doc.recipientName ? `Issued to ${doc.recipientName}` : undefined}
        actions={
          <>
            <a href={doc.verificationUrl.replace(/^https?:\/\/[^/]+/, '')} target="_blank" rel="noreferrer" className={buttonStyles.secondary}><ExternalLink size={16} aria-hidden />Verification page</a>
            {can('ADMIN', 'ISSUER') && doc.status !== 'REVOKED' && <Button variant="danger" onClick={() => { setReason(''); setRevoking(true) }}><Ban size={16} aria-hidden />Revoke</Button>}
          </>
        }
      />

      {doc.status === 'REVOKED' && (
        <Notice tone="red">Revoked <When date={doc.revokedAt} withTime />. Reason given: “{doc.revocationReason}”. Anyone who checks this document is told it was withdrawn.</Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Panel title="Details">
          <DefinitionList
            items={[
              ['Status', <DocumentStatusPill key="s" status={status} />],
              ['Recipient', doc.recipientName ? <>{doc.recipientName}{doc.recipientEmail && <span className="block text-xs text-slate-500">{doc.recipientEmail}</span>}</> : <span className="text-slate-400">Not given</span>],
              doc.description ? ['Description', doc.description] : null,
              ['Issued', <When key="i" date={doc.issuedAt} withTime />],
              ['Expires', doc.expiresAt ? <When key="e" date={doc.expiresAt} /> : <span className="text-slate-400">Never</span>],
              ['Signed by', doc.signedBy],
              ['Document ID', <span key="id" className="flex items-center gap-1"><Mono>{doc.documentId}</Mono><CopyButton value={doc.documentId} /></span>],
              ['SHA-256 fingerprint', <span key="h" className="flex items-start gap-1"><Mono>{doc.fileHash}</Mono><CopyButton value={doc.fileHash} /></span>],
              ['Signing key', <span key="k"><Mono>{doc.key.fingerprint}</Mono> <Pill tone={doc.key.status === 'ACTIVE' ? 'green' : 'slate'} className="ml-1">{doc.key.status === 'ACTIVE' ? 'Current key' : 'Earlier key'}</Pill></span>],
              doc.batchId ? ['Batch', <Mono key="b">{doc.batchId.slice(0, 8)}</Mono>] : null,
            ]}
          />
        </Panel>

        <Panel title="Share">
          <div className="space-y-4 text-center">
            {doc.qrCodeUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- a data: URL QR code; next/image adds nothing here
              <img src={doc.qrCodeUrl} alt="QR code that opens this document's verification page" className="mx-auto h-44 w-44 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700" />
            )}
            <p className="text-xs text-slate-500">The same QR code printed on the signed PDF.</p>
            <CopyButton value={doc.verificationUrl} label="Copy verification link" className="mx-auto" />
          </div>
        </Panel>
      </div>

      <Panel title="Checks" description={doc.verificationCount ? `Checked ${doc.verificationCount} ${doc.verificationCount === 1 ? 'time' : 'times'}. The latest 25 are below.` : 'No one has checked this document yet.'} padded={doc.verifications.length === 0}>
        {doc.verifications.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
              {(Object.entries(doc.verificationsByResult) as [Outcome, number][]).map(([o, n]) => (
                <span key={o} className="flex items-center gap-1.5 text-sm"><OutcomePill outcome={o} /> {n}</span>
              ))}
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {doc.verifications.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                  <span className="flex items-center gap-3"><OutcomePill outcome={v.result} /><span className="text-slate-600 dark:text-slate-400">{METHOD[v.method] ?? v.method}</span></span>
                  <span className="text-xs text-slate-500" title={new Date(v.verifiedAt).toLocaleString()}>{timeAgo(v.verifiedAt)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </Panel>

      <ConfirmDialog
        open={revoking}
        onClose={() => setRevoking(false)}
        onConfirm={revoke}
        busy={busy}
        title="Revoke this document?"
        confirmLabel="Revoke document"
      >
        <p>This can&apos;t be undone. Everyone who checks “{doc.title}” from now on is told it was withdrawn, with your reason.</p>
        <Field label="Reason" htmlFor="revoke-reason" hint="Shown to people who check the document.">
          <Textarea id="revoke-reason" required maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Issued with an error; replaced by a corrected certificate" />
        </Field>
      </ConfirmDialog>
    </div>
  )
}
