'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Building2, Check, FileText, MailOpen, Plus, ShieldCheck, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from '@/components/providers/session-provider'
import { Button, EmptyState, Field, Input, PageHeader, Panel, Pill, ROLE_LABEL, timeAgo } from '@/components/app/ui'
import { api } from '@/lib/api'

const VERIFICATION_TONE = { DOMAIN_VERIFIED: ['green', 'Domain verified'], MANUALLY_VERIFIED: ['green', 'Verified'], PENDING: ['amber', 'Awaiting review'], REJECTED: ['red', 'Rejected'] } as const

export default function DashboardHome() {
  const { me, refresh } = useSession()
  const router = useRouter()
  const wantsNew = useSearchParams().get('new') === '1'
  const [creating, setCreating] = React.useState(false)
  if (!me) return null

  const showCreate = creating || wantsNew || me.institutions.length === 0
  const firstName = me.user.fullName?.split(' ')[0]

  async function respond(institutionId: string, accept: boolean) {
    try {
      if (accept) {
        await api.acceptInvite(institutionId)
        toast.success('You have joined. Welcome.')
        await refresh()
        router.push(`/dashboard/${institutionId}`)
      } else {
        await api.declineInvite(institutionId)
        toast.success('Invitation declined.')
        await refresh()
      }
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={firstName ? `Welcome, ${firstName}` : 'Your institutions'}
        description="Pick an institution to sign documents, see who has checked them, and manage your team."
        actions={me.institutions.length > 0 && !showCreate ? <Button onClick={() => setCreating(true)}><Plus size={16} aria-hidden />New institution</Button> : null}
      />

      {me.invitations.length > 0 && (
        <Panel title="Invitations waiting for you">
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {me.invitations.map((inv) => (
              <li key={inv.institutionId} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <MailOpen size={18} className="mt-0.5 text-indigo-600" aria-hidden />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{inv.institutionName}</p>
                    <p className="text-sm text-slate-500">
                      As {ROLE_LABEL[inv.role].toLowerCase()}{inv.invitedBy ? `, from ${inv.invitedBy}` : ''} · {timeAgo(inv.invitedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => respond(inv.institutionId, true)} disabled={!me.user.emailVerified} title={me.user.emailVerified ? undefined : 'Confirm your email first'}><Check size={14} aria-hidden />Accept</Button>
                  <Button size="sm" variant="secondary" onClick={() => respond(inv.institutionId, false)}><X size={14} aria-hidden />Decline</Button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {me.institutions.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {me.institutions.map((inst) => {
            const [tone, label] = VERIFICATION_TONE[inst.verificationStatus]
            return (
              <li key={inst.id}>
                <Link
                  href={`/dashboard/${inst.id}`}
                  className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><Building2 size={20} aria-hidden /></span>
                    <Pill tone={tone}>{label}</Pill>
                  </div>
                  <p className="mt-4 font-semibold text-slate-900 dark:text-white">{inst.name}</p>
                  <p className="text-sm text-slate-500">{inst.emailDomain} · {ROLE_LABEL[inst.role]}</p>
                  <div className="mt-4 flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5"><FileText size={14} aria-hidden />{inst.documentCount.toLocaleString()} documents</span>
                    <span className="flex items-center gap-1.5"><Users size={14} aria-hidden />{inst.memberCount}</span>
                  </div>
                  <span className="mt-4 flex items-center gap-1 text-sm font-medium text-indigo-600 opacity-0 transition group-hover:opacity-100 dark:text-indigo-400">Open <ArrowRight size={14} aria-hidden /></span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {showCreate ? (
        <CreateInstitution
          emailVerified={me.user.emailVerified}
          suggestedDomain={me.user.email.split('@')[1] ?? ''}
          firstOne={me.institutions.length === 0}
          onCancel={me.institutions.length ? () => { setCreating(false); router.replace('/dashboard') } : undefined}
          onCreated={async (id) => { await refresh(); router.push(`/dashboard/${id}`) }}
        />
      ) : me.institutions.length === 0 && me.invitations.length === 0 ? (
        <EmptyState icon={<ShieldCheck size={28} />} title="No institutions yet">Create one to start signing documents.</EmptyState>
      ) : null}
    </div>
  )
}

const PUBLIC_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'live.com', 'proton.me', 'protonmail.com']

function CreateInstitution({ emailVerified, suggestedDomain, firstOne, onCancel, onCreated }: { emailVerified: boolean; suggestedDomain: string; firstOne: boolean; onCancel?: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = React.useState('')
  const [domain, setDomain] = React.useState(PUBLIC_DOMAINS.includes(suggestedDomain) ? '' : suggestedDomain)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const ownsDomain = domain.trim().toLowerCase() === suggestedDomain.toLowerCase()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const created = await api.registerInstitution({ name: name.trim(), emailDomain: domain.trim().toLowerCase() })
      toast.success('Institution created. Its signing key is ready.')
      onCreated(created.id)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel title={firstOne ? 'Create your institution' : 'Create an institution'} description="The organisation whose name appears on the documents you sign: a university, a land registry, a hospital.">
      <form onSubmit={submit} className="grid max-w-xl gap-5">
        <Field label="Name" htmlFor="inst-name" hint="As it should appear to anyone who verifies a document.">
          <Input id="inst-name" required minLength={2} maxLength={200} value={name} onChange={(e) => setName(e.target.value)} placeholder="University of Zambia" />
        </Field>
        <Field
          label="Email domain"
          htmlFor="inst-domain"
          error={error}
          hint={domain && ownsDomain ? 'Your email is on this domain, so it is verified straight away.' : 'Use your organisation\'s domain. If your email is not on it, it will wait for review.'}
        >
          <Input id="inst-domain" required value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="unza.zm" aria-invalid={Boolean(error)} />
        </Field>
        <p className="text-sm text-slate-500 dark:text-slate-400">An RSA-2048 signing key is created for the institution and stored encrypted. You become its administrator.</p>
        <div className="flex gap-2">
          <Button type="submit" busy={busy} disabled={!emailVerified} title={emailVerified ? undefined : 'Confirm your email first'}>Create institution</Button>
          {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
        </div>
        {!emailVerified && <p className="text-sm text-amber-700 dark:text-amber-300">Confirm your email address first, using the link we sent you.</p>}
      </form>
    </Panel>
  )
}
