'use client'

import * as React from 'react'
import Link from 'next/link'
import { CheckCircle2, Download, ExternalLink, FileSignature, ShieldCheck } from 'lucide-react'
import { useInstitution } from '@/components/providers/institution-provider'
import { useSession } from '@/components/providers/session-provider'
import { Button, buttonStyles, CopyButton, Field, Input, Mono, Notice, PageHeader, Panel, Textarea } from '@/components/app/ui'
import { FileDrop } from '@/components/shared/file-drop'
import { api, saveBlob } from '@/lib/api'

type Done = { documentId: string; blob: Blob; fileName: string; qr: string | null }

/** The earliest expiry date that makes sense (the date picker's minimum). */
const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)

function titleFromFile(name: string) {
  return name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export default function SignDocument() {
  const { institution, can } = useInstitution()
  const { me } = useSession()
  const base = `/dashboard/${institution.id}`
  const [file, setFile] = React.useState<File | null>(null)
  const [title, setTitle] = React.useState('')
  const [recipientName, setRecipientName] = React.useState('')
  const [recipientEmail, setRecipientEmail] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [expiresAt, setExpiresAt] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [done, setDone] = React.useState<Done | null>(null)

  if (!can('ADMIN', 'ISSUER')) {
    return <Notice tone="amber">Only administrators and issuers can sign documents. Ask an administrator if you need to.</Notice>
  }

  async function sign(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return setError('Choose the PDF to sign.')
    setBusy(true)
    setError(null)
    try {
      const signed = await api.sign(file, institution.id, {
        title: title.trim(),
        recipientName: recipientName.trim() || undefined,
        recipientEmail: recipientEmail.trim() || undefined,
        description: description.trim() || undefined,
        // End of the chosen day, so "expires on 31 March" still works all of 31 March.
        expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : undefined,
      })
      saveBlob(signed.blob, signed.fileName)
      const detail = signed.documentId ? await api.document(signed.documentId).catch(() => null) : null
      setDone({ documentId: signed.documentId ?? '', blob: signed.blob, fileName: signed.fileName, qr: detail?.qrCodeUrl ?? null })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setDone(null); setFile(null); setTitle(''); setRecipientName(''); setRecipientEmail(''); setDescription(''); setExpiresAt('')
  }

  if (done) {
    const link = `${location.origin}/verify/${done.documentId}`
    return (
      <div className="mx-auto max-w-2xl">
        <Panel>
          <div className="flex flex-col items-center gap-3 text-center">
            <CheckCircle2 size={48} className="text-emerald-600" aria-hidden />
            <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">Signed and ready to share</h1>
            <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
              Your download has started. Give this exact file to the recipient: any change to it, even re-saving it, will make the check fail.
            </p>
          </div>
          <div className="mt-6 grid items-center gap-6 sm:grid-cols-[160px_1fr]">
            {done.qr && (
              // eslint-disable-next-line @next/next/no-img-element -- a data: URL QR code; next/image adds nothing here
              <img src={done.qr} alt="QR code that opens this document's verification page" className="mx-auto h-40 w-40 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700" />
            )}
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-500">Verification link</p>
                <div className="flex items-center gap-1"><Mono className="text-sm">{link}</Mono><CopyButton value={link} /></div>
              </div>
              <div>
                <p className="text-slate-500">Document ID</p>
                <div className="flex items-center gap-1"><Mono>{done.documentId}</Mono><CopyButton value={done.documentId} /></div>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button variant="secondary" onClick={() => saveBlob(done.blob, done.fileName)}><Download size={16} aria-hidden />Download again</Button>
            <a href={link} target="_blank" rel="noreferrer" className={buttonStyles.secondary}><ExternalLink size={16} aria-hidden />Open the verification page</a>
            <Link href={`${base}/documents/${done.documentId}`} className={buttonStyles.secondary}>View document</Link>
            <Button onClick={reset}><FileSignature size={16} aria-hidden />Sign another</Button>
          </div>
        </Panel>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Sign a document" back={{ href: `${base}/documents`, label: 'Documents' }} description="VeriDocs adds a QR code to the first page, fingerprints the final file (SHA-256) and signs that fingerprint with your institution's key. The PDF itself is not stored." />
      <form onSubmit={sign} className="space-y-6">
        <Panel>
          <div className="space-y-5">
            <FileDrop file={file} onFiles={([f]) => { setFile(f); if (!title) setTitle(titleFromFile(f.name).slice(0, 200)) }} />
            <Field label="Title" htmlFor="title" hint="What the document is, as people who verify it will see it.">
              <Input id="title" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bachelor of Science in Computer Science" />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Recipient's name" htmlFor="recipient" optional hint="Shown when someone verifies it, so they know whose document it is.">
                <Input id="recipient" maxLength={200} value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Chanda Mwale" />
              </Field>
              <Field label="Recipient's email" htmlFor="recipient-email" optional hint="Kept for your records; never shown publicly.">
                <Input id="recipient-email" type="email" maxLength={254} value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} />
              </Field>
            </div>
            <Field label="Description" htmlFor="description" optional>
              <Textarea id="description" maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="First class honours, conferred 12 March 2026" />
            </Field>
            <Field label="Expires on" htmlFor="expires" optional hint="After this day, checks say the document has expired. Leave empty if it never expires.">
              <Input id="expires" type="date" min={tomorrow} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="sm:max-w-56" />
            </Field>
          </div>
        </Panel>

        {error && <Notice tone="red">{error}</Notice>}
        {!me?.user.emailVerified && <Notice tone="amber">Confirm your email address before signing. The link is in your inbox.</Notice>}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-slate-500"><ShieldCheck size={16} aria-hidden />Signed with key <Mono>{institution.activeKey?.fingerprint.slice(0, 23) ?? 'none'}</Mono></p>
          <Button type="submit" busy={busy} disabled={!institution.activeKey || !me?.user.emailVerified}>{busy ? 'Signing…' : 'Sign document'}</Button>
        </div>
      </form>
    </div>
  )
}
