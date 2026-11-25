'use client'

import * as React from 'react'
import { KeyRound, Lock, Plus, Send, Trash2, TriangleAlert, Webhook as WebhookIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useInstitution } from '@/components/providers/institution-provider'
import { useSession } from '@/components/providers/session-provider'
import {
  Button, ConfirmDialog, CopyButton, EmptyState, ErrorState, Field, Input, Loading, Mono, Notice, PageHeader, Panel, Pill, ROLE_LABEL, Select, Table, td, timeAgo, When, useLoad,
} from '@/components/app/ui'
import { api, API_URL } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { ApiKey, InstitutionRole, Webhook } from '@/lib/types'

type KeyRole = Exclude<InstitutionRole, 'ADMIN'>
const KEY_ROLES: KeyRole[] = ['ISSUER', 'AUDITOR', 'VIEWER']
/** What a key with each role can do. API keys never manage members, keys, settings or the audit trail. */
const KEY_ROLE_HELP: Record<KeyRole, string> = {
  ISSUER: 'Sign and revoke documents, and read them.',
  AUDITOR: 'Read documents and the checks made on them.',
  VIEWER: 'Read documents.',
}

const EVENTS = [
  { value: 'document.signed', label: 'A document is signed' },
  { value: 'document.revoked', label: 'A document is revoked' },
  { value: 'document.verified', label: 'Someone checks a document' },
] as const
type EventName = (typeof EVENTS)[number]['value']
const eventLabel = (value: string) => EVENTS.find((e) => e.value === value)?.label ?? value

export default function Developers() {
  const { institution, can } = useInstitution()
  return (
    <div className="space-y-8">
      <PageHeader
        title="API and webhooks"
        description="Connect your own systems to VeriDocs, so they can sign documents automatically and hear about events as they happen."
      />
      {can('ADMIN') ? (
        <>
          <ApiKeys institutionId={institution.id} />
          <Webhooks institutionId={institution.id} />
          <QuickStart institutionId={institution.id} />
        </>
      ) : (
        <Notice tone="amber" icon={<Lock size={16} />}>
          Only administrators can manage API keys and webhooks. If another system needs to work with {institution.name}, ask one of its administrators.
        </Notice>
      )}
    </div>
  )
}

// ── API keys ──

function ApiKeys({ institutionId }: { institutionId: string }) {
  const { me } = useSession()
  const { data, error, loading, reload } = useLoad(() => api.apiKeys(institutionId), [institutionId])
  const [name, setName] = React.useState('')
  const [role, setRole] = React.useState<KeyRole>('ISSUER')
  const [creating, setCreating] = React.useState(false)
  const [created, setCreated] = React.useState<{ name: string; secret: string } | null>(null)
  const [revoking, setRevoking] = React.useState<ApiKey | null>(null)
  const [busy, setBusy] = React.useState(false)
  const verified = me?.user.emailVerified ?? false

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const key = await api.createApiKey(institutionId, { name: name.trim(), role })
      setCreated({ name: key.name, secret: key.secret })
      setName('')
      toast.success('API key created. Copy it now.')
      void reload()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  async function revoke() {
    if (!revoking) return
    setBusy(true)
    try {
      await api.revokeApiKey(revoking.id)
      toast.success(`"${revoking.name}" is revoked. Systems using it can no longer connect.`)
      setRevoking(null)
      void reload()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel
      title={<span className="flex items-center gap-2"><KeyRound size={16} aria-hidden />API keys</span>}
      description="Let another system, such as your student records system, sign or read documents for your institution without a person signing in. Treat each key like a password."
    >
      <div className="space-y-6">
        {created ? (
          <SecretReveal title={`Your new API key "${created.name}"`} secret={created.secret} onDone={() => setCreated(null)}>
            Put it in the other system&apos;s settings. It sends the key with every request, in the header <Mono>Authorization: Bearer {created.secret.slice(0, 8)}…</Mono>
          </SecretReveal>
        ) : (
          <form onSubmit={create} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" htmlFor="api-key-name" hint="So you know later which system uses it.">
                <Input
                  id="api-key-name"
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="off"
                  placeholder="Student records system"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-describedby="api-key-name-hint"
                />
              </Field>
              <Field label="What it may do" htmlFor="api-key-role" hint={KEY_ROLE_HELP[role]}>
                <Select id="api-key-role" aria-describedby="api-key-role-hint" value={role} onChange={(e) => setRole(e.target.value as KeyRole)}>
                  {KEY_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </Select>
              </Field>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" busy={creating} disabled={!verified || name.trim().length < 2}>
                <Plus size={16} aria-hidden />
                Create API key
              </Button>
              {!verified && <p className="text-sm text-amber-700 dark:text-amber-300">Confirm your email address first, using the link we sent you.</p>}
            </div>
          </form>
        )}

        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !data ? (
          <Loading rows={2} label="Loading API keys…" />
        ) : data.length === 0 ? (
          <EmptyState icon={<KeyRound size={28} />} title="No API keys yet">Create one when another system needs to sign or read documents for you.</EmptyState>
        ) : (
          <div className={cn('transition', loading && 'opacity-60')}>
            <Table head={['Name', 'Key', 'Can', 'Created', 'Last used', 'Documents signed', <span key="actions" className="sr-only">Actions</span>]}>
              {data.map((k) => (
                <tr key={k.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className={td}><span className={cn('font-medium', k.revokedAt ? 'text-slate-500 line-through dark:text-slate-500' : 'text-slate-900 dark:text-white')}>{k.name}</span></td>
                  <td className={td}><Mono>{k.prefix}…</Mono></td>
                  <td className={td}>{ROLE_LABEL[k.role]}</td>
                  <td className={cn(td, 'whitespace-nowrap')}>
                    <When date={k.createdAt} />
                    <span className="block max-w-48 truncate text-xs text-slate-500 dark:text-slate-400">by {k.createdBy}</span>
                  </td>
                  <td className={cn(td, 'whitespace-nowrap')}>{timeAgo(k.lastUsedAt)}</td>
                  <td className={cn(td, 'tabular-nums')}>{k.documentCount.toLocaleString()}</td>
                  <td className={cn(td, 'text-right')}>
                    {k.revokedAt ? (
                      <Pill tone="red">Revoked <When date={k.revokedAt} /></Pill>
                    ) : (
                      <Button size="sm" variant="dangerGhost" onClick={() => setRevoking(k)} aria-label={`Revoke ${k.name}`}>Revoke</Button>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(revoking)}
        onClose={() => setRevoking(null)}
        onConfirm={revoke}
        title={revoking ? `Revoke "${revoking.name}"?` : 'Revoke this API key?'}
        confirmLabel="Revoke key"
        busy={busy}
      >
        <p>Any system using this key stops working straight away. A revoked key can&apos;t be turned back on, but you can create a new one.</p>
        <p>Documents it signed stay valid.</p>
      </ConfirmDialog>
    </Panel>
  )
}

/** Shows a secret once, right after it is made. The API never returns it again. */
function SecretReveal({ title, secret, children, onDone }: { title: string; secret: string; children?: React.ReactNode; onDone: () => void }) {
  return (
    <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800/70 dark:bg-amber-950/30">
      <p className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-200">
        <TriangleAlert size={16} aria-hidden />
        {title}
      </p>
      <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
        Copy it now and keep it somewhere safe, such as a password manager. For your security it won&apos;t be shown again. If you lose it, revoke it and make a new one.
      </p>
      <div className="mt-3 flex flex-col gap-2 rounded-lg border border-amber-200 bg-white p-3 sm:flex-row sm:items-center dark:border-amber-900/60 dark:bg-slate-950">
        <code className="min-w-0 flex-1 break-all font-mono text-sm text-slate-900 dark:text-slate-100">{secret}</code>
        <CopyButton value={secret} label="Copy" className="self-end sm:self-auto" />
      </div>
      {children && <p className="mt-3 text-sm text-amber-800 dark:text-amber-300">{children}</p>}
      <div className="mt-4 flex justify-end">
        <Button size="sm" variant="secondary" onClick={onDone}>I have saved it</Button>
      </div>
    </div>
  )
}

// ── Webhooks ──

function urlProblem(value: string): string | null {
  const url = value.trim()
  if (!url) return 'Enter the address to send messages to.'
  if (url.length > 500) return 'Use an address of at most 500 characters.'
  try {
    new URL(url)
  } catch {
    return 'Enter a full address, starting with https://'
  }
  if (!url.startsWith('https://') && !url.startsWith('http://localhost') && !url.startsWith('http://127.0.0.1')) return 'Use an https:// address.'
  return null
}

function Webhooks({ institutionId }: { institutionId: string }) {
  const { data, error, loading, reload, setData } = useLoad(() => api.webhooks(institutionId), [institutionId])
  const [url, setUrl] = React.useState('')
  const [events, setEvents] = React.useState<EventName[]>(['document.signed', 'document.revoked'])
  const [tried, setTried] = React.useState(false)
  const [creating, setCreating] = React.useState(false)
  const [created, setCreated] = React.useState<{ url: string; secret: string } | null>(null)
  const [deleting, setDeleting] = React.useState<Webhook | null>(null)
  const [busy, setBusy] = React.useState(false)
  const urlError = tried ? urlProblem(url) : null
  const eventsError = tried && events.length === 0 ? 'Choose at least one event.' : null

  function toggleEvent(value: EventName, on: boolean) {
    setEvents((list) => (on ? [...list, value] : list.filter((e) => e !== value)))
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setTried(true)
    if (urlProblem(url) || events.length === 0) return
    setCreating(true)
    try {
      const hook = await api.createWebhook(institutionId, { url: url.trim(), events: EVENTS.map((ev) => ev.value).filter((v) => events.includes(v)) })
      setCreated({ url: hook.url, secret: hook.secret })
      setUrl('')
      setTried(false)
      toast.success('Webhook added. Copy its signing secret now.')
      void reload()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  async function remove() {
    if (!deleting) return
    setBusy(true)
    try {
      await api.deleteWebhook(deleting.id)
      toast.success('Webhook deleted. Nothing more will be sent to that address.')
      setDeleting(null)
      void reload()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel
      title={<span className="flex items-center gap-2"><WebhookIcon size={16} aria-hidden />Webhooks</span>}
      description="Tell your own systems the moment something happens, for example when a document is signed. VeriDocs sends a short message (an HTTPS POST request) to an address you choose."
    >
      <div className="space-y-6">
        {created ? (
          <SecretReveal title="Your webhook signing secret" secret={created.secret} onDone={() => setCreated(null)}>
            Your system uses it to confirm that messages sent to <Mono>{created.url}</Mono> really come from VeriDocs. The quick start below shows how.
          </SecretReveal>
        ) : (
          <form onSubmit={create} noValidate className="space-y-4">
            <Field label="Address to send to" htmlFor="webhook-url" error={urlError} hint="An https:// address on your own server.">
              <Input
                id="webhook-url"
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder="https://records.example.org/veridocs"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                aria-invalid={Boolean(urlError)}
                aria-describedby={urlError ? 'webhook-url-error' : 'webhook-url-hint'}
              />
            </Field>
            <fieldset aria-describedby={eventsError ? 'webhook-events-error' : undefined}>
              <legend className="text-sm font-medium text-slate-800 dark:text-slate-200">Send a message when</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {EVENTS.map((ev) => (
                  <label
                    key={ev.value}
                    className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 p-3 text-sm transition has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50/60 dark:border-slate-700 dark:has-[:checked]:border-indigo-700 dark:has-[:checked]:bg-indigo-950/30"
                  >
                    <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-indigo-600" checked={events.includes(ev.value)} onChange={(e) => toggleEvent(ev.value, e.target.checked)} />
                    <span className="min-w-0">
                      <span className="block font-medium text-slate-900 dark:text-white">{ev.label}</span>
                      <Mono className="text-slate-500 dark:text-slate-400">{ev.value}</Mono>
                    </span>
                  </label>
                ))}
              </div>
              {eventsError && <p id="webhook-events-error" className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{eventsError}</p>}
            </fieldset>
            <Button type="submit" busy={creating}>
              <Plus size={16} aria-hidden />
              Add webhook
            </Button>
          </form>
        )}

        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !data ? (
          <Loading rows={2} label="Loading webhooks…" />
        ) : data.length === 0 ? (
          <EmptyState icon={<WebhookIcon size={28} />} title="No webhooks yet">Add one to have VeriDocs tell your systems when documents are signed, revoked or checked.</EmptyState>
        ) : (
          <ul className={cn('space-y-4 transition', loading && 'opacity-60')}>
            {data.map((hook) => (
              <WebhookCard
                key={hook.id}
                hook={hook}
                onChanged={(next) => setData(data.map((h) => (h.id === next.id ? next : h)))}
                onTested={() => void reload()}
                onDelete={() => setDeleting(hook)}
              />
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title="Delete this webhook?"
        confirmLabel="Delete webhook"
        busy={busy}
      >
        {deleting && <p>VeriDocs stops sending messages to <Mono>{deleting.url}</Mono>, and its delivery history is deleted.</p>}
        <p>To stop it for a while instead, turn it off. You can turn it back on later.</p>
      </ConfirmDialog>
    </Panel>
  )
}

function WebhookCard({ hook, onChanged, onTested, onDelete }: { hook: Webhook; onChanged: (hook: Webhook) => void; onTested: () => void; onDelete: () => void }) {
  const [toggling, setToggling] = React.useState(false)
  const [testing, setTesting] = React.useState(false)

  async function toggle() {
    setToggling(true)
    try {
      await api.setWebhookActive(hook.id, !hook.active)
      onChanged({ ...hook, active: !hook.active })
      toast.success(hook.active ? 'Webhook turned off. Nothing is sent until you turn it back on.' : 'Webhook turned back on.')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setToggling(false)
    }
  }

  async function test() {
    setTesting(true)
    try {
      const result = await api.testWebhook(hook.id)
      if (result.ok) toast.success(`Test delivered. Your endpoint answered ${result.statusCode ?? 'with success'}.`)
      else toast.error(`Test failed: ${result.error ?? 'the endpoint did not answer'}.`)
      onTested()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setTesting(false)
    }
  }

  return (
    <li className="rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="flex flex-wrap items-center gap-2">
            <Mono className="text-sm text-slate-900 dark:text-white">{hook.url}</Mono>
            {!hook.active && <Pill tone="amber">Off</Pill>}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {hook.events.map((e) => <Pill key={e} tone="indigo">{eventLabel(e)}</Pill>)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Added <When date={hook.createdAt} /></p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={hook.active}
            aria-label={`Send messages to ${hook.url}`}
            disabled={toggling}
            onClick={toggle}
            className="mr-1 inline-flex items-center gap-2 rounded-full text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50 dark:text-slate-300 dark:focus-visible:ring-offset-slate-900"
          >
            <span aria-hidden className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition', hook.active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700')}>
              <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition', hook.active ? 'translate-x-[22px]' : 'translate-x-0.5')} />
            </span>
            <span aria-hidden className="w-6 text-left">{hook.active ? 'On' : 'Off'}</span>
          </button>
          <Button size="sm" variant="secondary" busy={testing} onClick={test}>
            {!testing && <Send size={14} aria-hidden />}
            Send test
          </Button>
          <Button size="sm" variant="dangerGhost" onClick={onDelete}>
            <Trash2 size={14} aria-hidden />
            Delete
          </Button>
        </div>
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800">
        {hook.deliveries.length === 0 ? (
          <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">No messages sent yet. Send a test to try it: it posts a sample document.verified message marked as a test.</p>
        ) : (
          <>
            <p className="px-4 pt-3 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Recent deliveries</p>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {hook.deliveries.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
                  {d.ok ? <Pill tone="green">Delivered</Pill> : <Pill tone="red">Failed</Pill>}
                  <Mono>{d.event}</Mono>
                  {d.statusCode !== null && <span className="text-slate-600 dark:text-slate-400">Answered {d.statusCode}</span>}
                  {d.error && <span className="min-w-0 text-rose-600 dark:text-rose-400">{d.error}</span>}
                  <span className="ml-auto flex gap-3 text-xs text-slate-500 dark:text-slate-400">
                    {d.durationMs !== null && <span className="tabular-nums">{d.durationMs.toLocaleString()} ms</span>}
                    <span>{timeAgo(d.createdAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </li>
  )
}

// ── Quick start ──

function CodeBlock({ code, label, copyLabel = 'Copy' }: { code: string; label: string; copyLabel?: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
      <div className="flex justify-end border-b border-slate-200 bg-slate-50 px-2 py-1 dark:border-slate-800 dark:bg-slate-900/60">
        <CopyButton value={code} label={copyLabel} />
      </div>
      <pre tabIndex={0} aria-label={label} className="overflow-x-auto bg-white p-4 font-mono text-xs leading-relaxed text-slate-800 dark:bg-slate-950 dark:text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function Example({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
      {children}
    </section>
  )
}

const NODE_CHECK = [
  "const crypto = require('node:crypto')",
  '',
  '// rawBody: the request body exactly as it arrived (a string or Buffer), before any JSON parsing.',
  'function isFromVeriDocs(rawBody, signatureHeader, secret) {',
  "  const parts = Object.fromEntries(signatureHeader.split(',').map((part) => part.split('=')))",
  "  const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.${rawBody}`).digest('hex')",
  '  const recent = Math.abs(Date.now() / 1000 - Number(parts.t)) < 5 * 60 // refuse old, replayed messages',
  "  const given = String(parts.v1 || '')",
  '  return recent && given.length === expected.length &&',
  '    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))',
  '}',
  '',
  '// With Express: keep the raw body for the check, then parse it.',
  "app.post('/veridocs', express.raw({ type: 'application/json' }), (req, res) => {",
  "  if (!isFromVeriDocs(req.body, req.get('X-VeriDocs-Signature') || '', process.env.VERIDOCS_WEBHOOK_SECRET)) {",
  "    return res.status(400).send('Bad signature')",
  '  }',
  '  const { event, data } = JSON.parse(req.body) // document.signed, document.revoked or document.verified',
  '  res.sendStatus(200)',
  '})',
].join('\n')

function QuickStart({ institutionId }: { institutionId: string }) {
  const sign = [
    `curl -X POST ${API_URL}/api/documents/sign \\`,
    '  -H "Authorization: Bearer vd_live_…" \\',
    '  -F "file=@certificate.pdf" \\',
    `  -F "institutionId=${institutionId}" \\`,
    `  -F 'metadata={"title":"Bachelor of Science","recipientName":"Jane Banda"}' \\`,
    '  -D - -o certificate-signed.pdf',
  ].join('\n')
  const verify = `curl ${API_URL}/api/documents/verify/<document-id>`
  const header = 'X-VeriDocs-Signature: t=1767225600,v1=<64 hexadecimal characters>'

  return (
    <Panel title="Quick start" description="Examples to copy into a terminal or your own code. Replace vd_live_… with one of your API keys.">
      <div className="space-y-8">
        <Example title="Sign one PDF">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Needs a key that can sign (Issuer). The signed PDF is saved as <Mono>certificate-signed.pdf</Mono>. The reply headers are printed first, and <Mono>X-Document-Id</Mono> is the new document&apos;s ID.
          </p>
          <CodeBlock code={sign} label="Command to sign one PDF" copyLabel="Copy command" />
        </Example>

        <Example title="Check a document by its ID">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No key needed: this is what the QR code on a signed document does. The answer says whether the document is valid, and why. Each call counts as a check and appears under Checks.
          </p>
          <CodeBlock code={verify} label="Command to check a document" copyLabel="Copy command" />
        </Example>

        <Example title="Confirm a webhook message came from VeriDocs">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Each message is JSON with <Mono>event</Mono>, <Mono>createdAt</Mono> and <Mono>data</Mono>, and carries this header. <Mono>t</Mono> is the time it was sent, in seconds since 1970. <Mono>v1</Mono> is an HMAC-SHA256 code of <Mono>{'${t}.${rawBody}'}</Mono>, made with your webhook&apos;s signing secret. Work out the same code and compare: if they match, the message is genuine and unchanged.
          </p>
          <CodeBlock code={header} label="Signature header" />
          <CodeBlock code={NODE_CHECK} label="Node.js code to check a webhook signature" copyLabel="Copy code" />
        </Example>
      </div>
    </Panel>
  )
}
