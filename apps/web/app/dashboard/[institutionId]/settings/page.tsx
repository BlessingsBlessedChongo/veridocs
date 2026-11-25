'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DoorOpen, ExternalLink, ShieldAlert, ShieldX } from 'lucide-react'
import { toast } from 'sonner'
import { useInstitution } from '@/components/providers/institution-provider'
import { useSession } from '@/components/providers/session-provider'
import {
  Button, ConfirmDialog, CopyButton, DefinitionList, Field, Input, Mono, Notice, PageHeader, Panel, Pill, When, useLoad, type Tone,
} from '@/components/app/ui'
import { api, API_URL } from '@/lib/api'
import type { InstitutionVerificationStatus, Member } from '@/lib/types'

const VERIFICATION: Record<InstitutionVerificationStatus, [Tone, string, string]> = {
  DOMAIN_VERIFIED: ['green', 'Domain verified', 'It was created by someone with an email address on this domain.'],
  MANUALLY_VERIFIED: ['green', 'Verified', 'VeriDocs has confirmed this institution.'],
  PENDING: ['amber', 'Awaiting review', 'VeriDocs has not yet confirmed that this domain belongs to the institution.'],
  REJECTED: ['red', 'Rejected', 'VeriDocs could not confirm that this domain belongs to the institution.'],
}

export default function Settings() {
  const { institution, can } = useInstitution()
  const isAdmin = can('ADMIN')
  const registryUrl = `${API_URL}/api/public/institutions/${institution.id}`
  const [tone, label, help] = VERIFICATION[institution.verificationStatus] ?? ['slate', institution.verificationStatus, '']

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description={`${institution.name}'s details, as people who check its documents see them.`} />

      {institution.verificationStatus === 'PENDING' && (
        <Notice tone="amber" icon={<ShieldAlert size={16} />}>
          The domain {institution.emailDomain} is awaiting review, because the person who created this institution does not have an email address on that domain. Documents you sign are valid, but people who check them will see that the domain is not yet confirmed.
        </Notice>
      )}
      {institution.verificationStatus === 'REJECTED' && (
        <Notice tone="red" icon={<ShieldX size={16} />}>
          VeriDocs could not confirm that {institution.emailDomain} belongs to this institution, and people who check your documents can see that. Contact VeriDocs support to sort it out.
        </Notice>
      )}

      <Panel title="Institution details">
        <DefinitionList
          items={[
            ['Name', institution.name],
            ['Email domain', (
              <>
                {institution.emailDomain}
                <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">Shown to people who check your documents, so they can see who issued them.</span>
              </>
            )],
            ['Verification', (
              <>
                <Pill tone={tone}>{label}</Pill>
                {help && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{help}</span>}
              </>
            )],
            ['Created', <When key="created" date={institution.createdAt} />],
            ['Institution ID', (
              <>
                <span className="flex flex-wrap items-center gap-2">
                  <Mono className="text-sm">{institution.id}</Mono>
                  <CopyButton value={institution.id} />
                </span>
                <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">Other systems that connect through the API need this.</span>
              </>
            )],
            ['Public registry', (
              <>
                <a href={registryUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                  Public keys and revocation list
                  <ExternalLink size={14} aria-hidden />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
                <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">Lets software check your documents offline, without contacting VeriDocs.</span>
              </>
            )],
          ]}
        />
      </Panel>

      {/* Keyed by the saved name: after a rename here or elsewhere, the form starts from it. */}
      {isAdmin && <RenameForm key={institution.name} />}

      <LeaveInstitution />
    </div>
  )
}

function RenameForm() {
  const { institution, reload } = useInstitution()
  const { refresh } = useSession()
  const [name, setName] = React.useState(institution.name)
  const [busy, setBusy] = React.useState(false)
  const trimmed = name.trim()


  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (trimmed.length < 2 || trimmed === institution.name) return
    setBusy(true)
    try {
      await api.renameInstitution(institution.id, trimmed)
      await Promise.all([reload(), refresh()])
      toast.success(`The institution is now called ${trimmed}.`)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel title="Rename" description="How your institution appears to anyone who checks one of its documents.">
      <form onSubmit={submit} className="max-w-xl space-y-4">
        <Field
          label="Institution name"
          htmlFor="institution-name"
          hint="People who check a document see the new name straight away. Documents already signed keep the old name printed on them."
        >
          <Input
            id="institution-name"
            required
            minLength={2}
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-describedby="institution-name-hint"
          />
        </Field>
        <Button type="submit" busy={busy} disabled={trimmed.length < 2 || trimmed === institution.name}>Save name</Button>
      </form>
    </Panel>
  )
}

function LeaveInstitution() {
  const { institution, can } = useInstitution()
  const { me, refresh } = useSession()
  const router = useRouter()
  const isAdmin = can('ADMIN')
  // Administrators: find out up front whether they are the last one (the API refuses that).
  const { data: members } = useLoad<Member[] | null>(() => (isAdmin ? api.members(institution.id) : Promise.resolve(null)), [institution.id, isAdmin])
  const soleAdmin = isAdmin && members ? members.filter((m) => m.status === 'ACTIVE' && m.role === 'ADMIN').length <= 1 : false
  const [open, setOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  async function leave() {
    if (!me) return
    setBusy(true)
    try {
      await api.removeMember(institution.id, me.user.id)
      toast.success(`You have left ${institution.name}.`)
      setOpen(false)
      await refresh()
      router.push('/dashboard')
    } catch (err) {
      toast.error((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <Panel title="Danger zone" className="border-rose-200 dark:border-rose-900/60">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-slate-900 dark:text-white">Leave {institution.name}</p>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {soleAdmin ? (
              <>You are the only administrator. Make someone else an administrator on the <Link href={`/dashboard/${institution.id}/members`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">Members</Link> page first, then you can leave.</>
            ) : (
              'You lose access to its documents straight away. To come back, an administrator has to invite you again.'
            )}
          </p>
        </div>
        <Button variant="dangerGhost" className="shrink-0" disabled={soleAdmin} onClick={() => setOpen(true)}>
          <DoorOpen size={16} aria-hidden />
          Leave institution
        </Button>
      </div>

      <ConfirmDialog open={open} onClose={() => setOpen(false)} onConfirm={leave} title={`Leave ${institution.name}?`} confirmLabel="Leave institution" busy={busy}>
        <p>You lose access to its documents straight away.</p>
        <p>To come back, an administrator has to invite you again.</p>
      </ConfirmDialog>
    </Panel>
  )
}
