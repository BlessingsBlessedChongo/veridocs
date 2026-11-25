'use client'

import * as React from 'react'
import Link from 'next/link'
import { CheckCircle2, FileSpreadsheet, Files, Trash2, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { useInstitution } from '@/components/providers/institution-provider'
import { useSession } from '@/components/providers/session-provider'
import { Button, buttonStyles, Field, Input, Notice, PageHeader, Panel, Textarea } from '@/components/app/ui'
import { FileDrop } from '@/components/shared/file-drop'
import { api, saveBlob } from '@/lib/api'
import { parseCsv } from '@/lib/csv'

const MAX = 50
type Row = { id: string; file: File; title: string; recipientName: string; recipientEmail: string }

/** The earliest expiry date that makes sense (the date picker's minimum). */
const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)

const titleFrom = (name: string) => name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)

export default function BatchSign() {
  const { institution, can } = useInstitution()
  const { me } = useSession()
  const base = `/dashboard/${institution.id}`
  const [rows, setRows] = React.useState<Row[]>([])
  const [description, setDescription] = React.useState('')
  const [expiresAt, setExpiresAt] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<{ signed: number; failed: number; blob: Blob; fileName: string } | null>(null)
  const csvInput = React.useRef<HTMLInputElement>(null)

  if (!can('ADMIN', 'ISSUER')) return <Notice tone="amber">Only administrators and issuers can sign documents.</Notice>

  function addFiles(files: File[]) {
    setRows((current) => {
      const seen = new Set(current.map((r) => r.file.name))
      const added = files.filter((f) => !seen.has(f.name)).map((file) => ({ id: crypto.randomUUID(), file, title: titleFrom(file.name), recipientName: '', recipientEmail: '' }))
      const next = [...current, ...added]
      if (next.length > MAX) toast.error(`A batch holds at most ${MAX} PDFs. The rest were left out.`)
      return next.slice(0, MAX)
    })
  }

  /** Fills titles and recipients from a spreadsheet, matching rows to PDFs by file name. */
  async function importCsv(file: File) {
    const records = parseCsv(await file.text())
    if (!records.length) return toast.error('That CSV has no rows.')
    if (!('file' in records[0] || 'filename' in records[0] || 'file_name' in records[0])) {
      return toast.error('The CSV needs a "file" column with each PDF\'s file name.')
    }
    let matched = 0
    const next = rows.map((row) => {
      const r = records.find((x) => (x.file || x.filename || x.file_name || '').toLowerCase() === row.file.name.toLowerCase())
      if (!r) return row
      matched++
      return {
        ...row,
        title: (r.title || row.title).slice(0, 200),
        recipientName: (r.recipient_name || r.recipient || r.name || row.recipientName).slice(0, 200),
        recipientEmail: (r.recipient_email || r.email || row.recipientEmail).slice(0, 254),
      }
    })
    setRows(next)
    if (matched) toast.success(`Filled in ${matched} of ${rows.length} documents from the CSV.`)
    else toast.error('No file names in the CSV match the PDFs you added.')
  }

  const update = (id: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const missingTitles = rows.filter((r) => !r.title.trim()).length

  async function sign() {
    setBusy(true)
    setError(null)
    try {
      const shared = {
        description: description.trim() || undefined,
        expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : undefined,
      }
      const out = await api.signBatch(
        rows.map((r) => r.file),
        institution.id,
        rows.map((r) => ({ title: r.title.trim(), recipientName: r.recipientName.trim() || undefined, recipientEmail: r.recipientEmail.trim() || undefined, ...shared })),
      )
      saveBlob(out.blob, out.fileName)
      setResult({ signed: out.signed, failed: out.failed, blob: out.blob, fileName: out.fileName })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-2xl">
        <Panel>
          <div className="flex flex-col items-center gap-3 text-center">
            {result.failed ? <TriangleAlert size={48} className="text-amber-500" aria-hidden /> : <CheckCircle2 size={48} className="text-emerald-600" aria-hidden />}
            <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">{result.signed} {result.signed === 1 ? 'document' : 'documents'} signed</h1>
            <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
              Your ZIP has downloaded. It holds every signed PDF and <code className="font-mono">manifest.csv</code>, which lists each document&apos;s verification link.
              {result.failed > 0 && <> {result.failed} could not be signed; the manifest says why.</>}
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Button variant="secondary" onClick={() => saveBlob(result.blob, result.fileName)}>Download again</Button>
              <Link href={`${base}/documents`} className={buttonStyles.secondary}>See the documents</Link>
              <Button onClick={() => { setResult(null); setRows([]) }}><Files size={16} aria-hidden />Sign another batch</Button>
            </div>
          </div>
        </Panel>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Sign a batch"
        back={{ href: `${base}/documents`, label: 'Documents' }}
        description={`Sign up to ${MAX} PDFs at once, such as a graduating class's certificates. You get one ZIP with every signed PDF and a list of their verification links.`}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <FileDrop multiple compact onFiles={addFiles} label={rows.length ? 'Add more PDFs' : undefined} />
          {rows.length > 0 && (
            <Panel
              title={`${rows.length} ${rows.length === 1 ? 'document' : 'documents'}`}
              description="Check each title and recipient. Titles start from the file names."
              actions={<Button variant="ghost" size="sm" onClick={() => setRows([])}>Remove all</Button>}
              padded={false}
            >
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((r, i) => (
                  <li key={r.id} className="grid gap-2 px-5 py-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <div className="sm:col-span-3 flex items-center justify-between text-xs text-slate-500">
                      <span className="truncate font-mono">{i + 1}. {r.file.name}</span>
                    </div>
                    <Input aria-label={`Title for ${r.file.name}`} value={r.title} onChange={(e) => update(r.id, { title: e.target.value })} placeholder="Title" aria-invalid={!r.title.trim()} maxLength={200} />
                    <Input aria-label={`Recipient for ${r.file.name}`} value={r.recipientName} onChange={(e) => update(r.id, { recipientName: e.target.value })} placeholder="Recipient's name (optional)" maxLength={200} />
                    <Button variant="dangerGhost" size="sm" onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))} aria-label={`Remove ${r.file.name}`}><Trash2 size={14} aria-hidden /></Button>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        <div className="space-y-4">
          <Panel title="For every document">
            <div className="space-y-4">
              <Field label="Description" htmlFor="batch-description" optional>
                <Textarea id="batch-description" maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Class of 2026 graduation" />
              </Field>
              <Field label="Expires on" htmlFor="batch-expires" optional>
                <Input id="batch-expires" type="date" min={tomorrow} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </Field>
            </div>
          </Panel>
          <Panel title="Fill in from a spreadsheet" description="Optional. A CSV with a file column (the PDF's file name) and any of: title, recipient_name, recipient_email.">
            <input ref={csvInput} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importCsv(f); e.target.value = '' }} />
            <Button variant="secondary" onClick={() => csvInput.current?.click()} disabled={!rows.length}><FileSpreadsheet size={16} aria-hidden />Choose a CSV</Button>
          </Panel>
          {error && <Notice tone="red">{error}</Notice>}
          {!me?.user.emailVerified && <Notice tone="amber">Confirm your email address before signing.</Notice>}
          <Button className="w-full" onClick={sign} busy={busy} disabled={!rows.length || missingTitles > 0 || !me?.user.emailVerified}>
            {busy ? `Signing ${rows.length}…` : `Sign ${rows.length || ''} ${rows.length === 1 ? 'document' : 'documents'}`}
          </Button>
          {missingTitles > 0 && <p className="text-center text-xs text-rose-600">{missingTitles} {missingTitles === 1 ? 'document needs' : 'documents need'} a title.</p>}
        </div>
      </div>
    </div>
  )
}
