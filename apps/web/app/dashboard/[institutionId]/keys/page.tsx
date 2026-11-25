'use client'

import * as React from 'react'
import { ChevronDown, ExternalLink, KeyRound, RotateCw, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { useInstitution } from '@/components/providers/institution-provider'
import {
  Button, ConfirmDialog, CopyButton, DefinitionList, EmptyState, ErrorState, Loading, Mono, Notice, PageHeader, Panel, Pill, Table, td, When, useLoad, type Tone,
} from '@/components/app/ui'
import { api, API_URL } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { SigningKey } from '@/lib/types'

const KEY_STATUS: Record<SigningKey['status'], [Tone, string]> = {
  ACTIVE: ['green', 'Active'],
  ROTATED: ['slate', 'Rotated'],
  REVOKED: ['red', 'Revoked'],
  COMPROMISED: ['red', 'Compromised'],
}

function KeyStatusPill({ status }: { status: SigningKey['status'] }) {
  const [tone, label] = KEY_STATUS[status] ?? ['slate', status]
  return <Pill tone={tone}>{label}</Pill>
}

/** The first few pairs are enough to tell keys apart at a glance. */
const shortFingerprint = (fingerprint: string) => `${fingerprint.split(':').slice(0, 4).join(':')}…`

export default function SigningKeys() {
  const { institution, can, reload: reloadInstitution } = useInstitution()
  const { data, error, loading, reload } = useLoad(() => api.keys(institution.id), [institution.id])
  const [confirming, setConfirming] = React.useState(false)
  const [rotating, setRotating] = React.useState(false)
  const registryUrl = `${API_URL}/api/public/institutions/${institution.id}`
  const active = data?.find((k) => k.status === 'ACTIVE') ?? null
  const earlier = data?.filter((k) => k.status !== 'ACTIVE') ?? []

  async function rotate() {
    if (!active) return
    setRotating(true)
    try {
      const fresh = await api.rotateKey(active.id)
      toast.success(`Key rotated. New documents are signed with key ${shortFingerprint(fresh.fingerprint)}`)
      setConfirming(false)
      await Promise.all([reload(), reloadInstitution()])
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setRotating(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Signing keys" description={`The key ${institution.name} uses to sign documents, and the keys it used before.`} />

      <Panel title="How signing keys work">
        <div className="grid gap-6 text-sm text-slate-600 sm:grid-cols-2 dark:text-slate-400">
          <div>
            <p className="font-medium text-slate-900 dark:text-white">A seal only your institution can make</p>
            <p className="mt-1">
              When you sign a document, VeriDocs seals it with your institution&apos;s private key. That key is stored encrypted on our servers and is never shown to anyone, administrators included. Anyone can check the seal with the matching public key below. If even one character of the file changes, the check fails.
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-white">Why rotate it</p>
            <p className="mt-1">
              Rotating swaps in a brand-new key for every document signed from then on. Many institutions rotate once a year, or when someone who looked after signing leaves. Documents signed earlier stay valid, because the old key is kept to check them. To stop a person signing, remove them from Members instead.
            </p>
          </div>
        </div>
      </Panel>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <Loading rows={4} label="Loading signing keys…" />
      ) : data.length === 0 ? (
        <EmptyState icon={<KeyRound size={28} />} title="No signing keys yet">
          A signing key is made when an institution is created. If you see this, contact VeriDocs support.
        </EmptyState>
      ) : (
        <div className={cn('space-y-8 transition', loading && 'opacity-60')}>
          {active ? (
            <Panel
              title={<span className="flex items-center gap-2">Current key <KeyStatusPill status={active.status} /></span>}
              description="Signs every new document."
              actions={can('ADMIN') ? (
                <Button variant="secondary" onClick={() => setConfirming(true)}>
                  <RotateCw size={16} aria-hidden />
                  Rotate key
                </Button>
              ) : null}
            >
              <DefinitionList
                items={[
                  ['Fingerprint', (
                    <div key="fingerprint">
                      <div className="flex flex-wrap items-center gap-2">
                        <Mono className="text-sm">{active.fingerprint}</Mono>
                        <CopyButton value={active.fingerprint} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">A short code that identifies this key. Verification results show it, so people can tell which key signed a document.</p>
                    </div>
                  )],
                  ['Algorithm', active.algorithm],
                  ['Created', <When key="created" date={active.createdAt} />],
                  ['Documents signed', <span key="count" className="tabular-nums">{active.documentCount.toLocaleString()}</span>],
                ]}
              />
              <PublicKey keyId={active.id} pem={active.publicKey} />
            </Panel>
          ) : (
            <Notice tone="amber" icon={<TriangleAlert size={16} />}>
              {institution.name} has no active signing key, so new documents can&apos;t be signed. Documents signed before can still be checked. Contact VeriDocs support.
            </Notice>
          )}

          <section aria-labelledby="earlier-keys-heading" className="space-y-3">
            <div>
              <h2 id="earlier-keys-heading" className="text-base font-semibold text-slate-900 dark:text-slate-100">Earlier keys</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Retired keys sign nothing new, but still confirm the documents they signed.</p>
            </div>
            {earlier.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 px-5 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                None yet. When you rotate, the current key moves here and keeps confirming the documents it signed.
              </p>
            ) : (
              <Table head={['Fingerprint', 'Status', 'Algorithm', 'Created', 'Rotated', 'Documents signed', <span key="key" className="sr-only">Public key</span>]}>
                {earlier.map((k) => <EarlierKeyRow key={k.id} signingKey={k} />)}
              </Table>
            )}
          </section>
        </div>
      )}

      <Panel title="Checking documents offline" description="Anyone can download your public keys and the list of documents you have revoked. Software that checks your documents without contacting VeriDocs uses this list.">
        <div className="flex flex-wrap items-center gap-2">
          <a href={registryUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            Public keys and revocation list (for offline checks)
            <ExternalLink size={14} aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          <CopyButton value={registryUrl} label="Copy link" />
        </div>
      </Panel>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={rotate}
        title="Rotate the signing key?"
        confirmLabel="Rotate key"
        confirmText="ROTATE"
        danger={false}
        busy={rotating}
      >
        <p>VeriDocs makes a new key and signs every new document with it from now on.</p>
        <p>Documents signed before stay valid. The current key is kept, marked as rotated, and still confirms them.</p>
        <p>This can&apos;t be undone. If other software checks your documents offline, it should download your public keys again.</p>
      </ConfirmDialog>
    </div>
  )
}

function PublicKeyBlock({ id, pem }: { id: string; pem: string }) {
  return (
    <div id={id} className="space-y-2">
      <p className="text-xs text-slate-500 dark:text-slate-400">Safe to share. Anyone can use it to check documents signed with this key.</p>
      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="flex justify-end border-b border-slate-200 bg-slate-50 px-2 py-1 dark:border-slate-800 dark:bg-slate-900/60">
          <CopyButton value={pem} label="Copy public key" />
        </div>
        <pre tabIndex={0} aria-label="Public key" className="max-h-64 overflow-auto bg-white p-4 font-mono text-xs leading-relaxed text-slate-800 dark:bg-slate-950 dark:text-slate-200">{pem}</pre>
      </div>
    </div>
  )
}

function PublicKey({ keyId, pem }: { keyId: string; pem: string }) {
  const [open, setOpen] = React.useState(false)
  const id = `public-key-${keyId}`
  return (
    <div className="mt-2 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-indigo-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-400"
      >
        <ChevronDown size={16} className={cn('transition', open && 'rotate-180')} aria-hidden />
        {open ? 'Hide public key' : 'Show public key'}
      </button>
      {open && <PublicKeyBlock id={id} pem={pem} />}
    </div>
  )
}

function EarlierKeyRow({ signingKey: k }: { signingKey: SigningKey }) {
  const [open, setOpen] = React.useState(false)
  const id = `public-key-${k.id}`
  return (
    <>
      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
        <td className={td}><Mono>{k.fingerprint}</Mono></td>
        <td className={td}><KeyStatusPill status={k.status} /></td>
        <td className={td}>{k.algorithm}</td>
        <td className={cn(td, 'whitespace-nowrap')}><When date={k.createdAt} /></td>
        <td className={cn(td, 'whitespace-nowrap')}>
          <When date={k.rotatedAt ?? k.revokedAt} />
          {!k.rotatedAt && k.revokedAt && <span className="block text-xs text-slate-500 dark:text-slate-400">Revoked</span>}
        </td>
        <td className={cn(td, 'tabular-nums')}>{k.documentCount.toLocaleString()}</td>
        <td className={cn(td, 'text-right')}>
          <Button size="sm" variant="ghost" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
            {open ? 'Hide public key' : 'Show public key'}
          </Button>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={7} className="px-4 pb-4">
            <PublicKeyBlock id={id} pem={k.publicKey} />
          </td>
        </tr>
      )}
    </>
  )
}
