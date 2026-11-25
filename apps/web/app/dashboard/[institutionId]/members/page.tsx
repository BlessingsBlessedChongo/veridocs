'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { DoorOpen, Mail, Send, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useInstitution } from '@/components/providers/institution-provider'
import { useSession } from '@/components/providers/session-provider'
import {
  Button, ConfirmDialog, EmptyState, ErrorState, Field, Input, Loading, PageHeader, Panel, Pill, ROLE_HELP, ROLE_LABEL, Select, Table, td, timeAgo, useLoad,
} from '@/components/app/ui'
import { api } from '@/lib/api'
import type { InstitutionRole, Member } from '@/lib/types'

const ROLES: InstitutionRole[] = ['ADMIN', 'ISSUER', 'AUDITOR', 'VIEWER']

/** "an administrator", "an issuer", "an auditor", "a viewer". */
function asRole(role: InstitutionRole) {
  const word = ROLE_LABEL[role].toLowerCase()
  return `${/^[aeiou]/.test(word) ? 'an' : 'a'} ${word}`
}

const nameOf = (m: Member) => m.fullName || m.email
const count = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

type Confirm =
  | { kind: 'remove'; member: Member }
  | { kind: 'leave' }
  | { kind: 'step-down'; member: Member; role: InstitutionRole }

export default function Members() {
  const { institution, can, reload: reloadInstitution } = useInstitution()
  const { me, refresh } = useSession()
  const router = useRouter()
  const isAdmin = can('ADMIN')
  const { data, error, loading, reload, setData } = useLoad(() => api.members(institution.id), [institution.id])
  const [confirm, setConfirm] = React.useState<Confirm | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [savingRole, setSavingRole] = React.useState<string | null>(null)

  // Members first, then invitations not yet accepted; otherwise in the order they were added.
  const members = React.useMemo(() => [...(data ?? [])].sort((a, b) => Number(a.status === 'PENDING') - Number(b.status === 'PENDING')), [data])
  const activeCount = members.filter((m) => m.status === 'ACTIVE').length
  const invitedCount = members.length - activeCount
  const you = members.find((m) => m.isYou)
  const soleAdmin = you?.role === 'ADMIN' && members.filter((m) => m.status === 'ACTIVE' && m.role === 'ADMIN').length <= 1
  // Last sign-in is only recorded for VeriDocs' own accounts.
  const showLastSignIn = me?.authProvider !== 'supabase'

  async function saveRole(member: Member, role: InstitutionRole) {
    setSavingRole(member.userId)
    try {
      await api.changeRole(institution.id, member.userId, role)
      toast.success(
        member.isYou ? `You are now ${asRole(role)}.`
          : member.status === 'PENDING' ? `${member.email} will join as ${asRole(role)}.`
            : `${nameOf(member)} is now ${asRole(role)}.`,
      )
      setData((data ?? []).map((m) => (m.userId === member.userId ? { ...m, role } : m)))
      // Your own role changed: the menu and what this page offers change with it.
      if (member.isYou) await Promise.all([reloadInstitution(), refresh()])
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSavingRole(null)
    }
  }

  function onRoleChange(member: Member, role: InstitutionRole) {
    if (role === member.role) return
    if (member.isYou && member.role === 'ADMIN') setConfirm({ kind: 'step-down', member, role })
    else void saveRole(member, role)
  }

  async function onConfirm() {
    if (!confirm) return
    if (confirm.kind === 'step-down') {
      setConfirm(null)
      await saveRole(confirm.member, confirm.role)
      return
    }
    setBusy(true)
    try {
      if (confirm.kind === 'remove') {
        const m = confirm.member
        await api.removeMember(institution.id, m.userId)
        toast.success(m.status === 'PENDING' ? `The invitation to ${m.email} is cancelled.` : `${nameOf(m)} no longer has access to ${institution.name}.`)
        setConfirm(null)
        void reload()
      } else {
        const myId = you?.userId ?? me?.user.id
        if (!myId) return
        await api.removeMember(institution.id, myId)
        toast.success(`You have left ${institution.name}.`)
        setConfirm(null)
        await refresh()
        router.push('/dashboard')
      }
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const dialog = confirm ? dialogCopy(confirm, institution.name) : null
  const head: React.ReactNode[] = [
    'Person',
    'Role',
    'Status',
    ...(showLastSignIn ? ['Last sign-in'] : []),
    'Invited by',
    ...(isAdmin ? [<span key="actions" className="sr-only">Actions</span>] : []),
  ]

  return (
    <div className="space-y-8">
      <PageHeader title="Members" description={`Everyone who can work in ${institution.name}. A person's role decides what they can do.`} />

      {isAdmin && <InviteForm institutionId={institution.id} domain={institution.emailDomain} onInvited={() => void reload()} />}

      <section aria-labelledby="people-heading" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="people-heading" className="text-base font-semibold text-slate-900 dark:text-slate-100">People</h2>
          {data && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {count(activeCount, 'member')}{invitedCount > 0 && ` · ${count(invitedCount, 'invitation')} waiting to be accepted`}
            </p>
          )}
        </div>

        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !data ? (
          <Loading rows={4} label="Loading members…" />
        ) : members.length === 0 ? (
          <EmptyState icon={<Users size={28} />} title="No members yet">
            {isAdmin ? 'Invite the people who sign or check documents for your institution.' : 'An administrator can invite people here.'}
          </EmptyState>
        ) : (
          <div className={loading ? 'opacity-60 transition' : 'transition'}>
            <Table head={head}>
              {members.map((m) => {
                const pending = m.status === 'PENDING'
                const lockedRole = m.isYou && soleAdmin
                return (
                  <tr key={m.userId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className={td}>
                      <div className="flex items-center gap-3">
                        {pending ? (
                          <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-dashed border-slate-300 text-slate-400 dark:border-slate-600"><Mail size={14} /></span>
                        ) : (
                          <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{nameOf(m).slice(0, 1).toUpperCase()}</span>
                        )}
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                            <span className="truncate">{nameOf(m)}</span>
                            {m.isYou && <Pill tone="indigo">You</Pill>}
                          </p>
                          {m.fullName && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{m.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className={td}>
                      {isAdmin && !lockedRole ? (
                        <Select
                          aria-label={`Role for ${nameOf(m)}`}
                          value={m.role}
                          disabled={savingRole === m.userId}
                          onChange={(e) => onRoleChange(m, e.target.value as InstitutionRole)}
                          className="h-9 w-40"
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                        </Select>
                      ) : (
                        <>
                          {ROLE_LABEL[m.role]}
                          {lockedRole && <span className="block text-xs text-slate-500 dark:text-slate-400">The only administrator</span>}
                        </>
                      )}
                    </td>
                    <td className={td}>
                      {pending ? (
                        <>
                          <Pill tone="amber">Pending invitation</Pill>
                          <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Sent {timeAgo(m.joinedAt)}</span>
                        </>
                      ) : (
                        <Pill tone="green">Active</Pill>
                      )}
                    </td>
                    {showLastSignIn && <td className={td}>{timeAgo(m.lastLoginAt)}</td>}
                    <td className={td}>{m.invitedBy ?? <span className="text-slate-400">—</span>}</td>
                    {isAdmin && (
                      <td className={`${td} text-right`}>
                        {!m.isYou && (
                          <Button size="sm" variant="dangerGhost" onClick={() => setConfirm({ kind: 'remove', member: m })}>
                            {pending ? 'Cancel invitation' : 'Remove'}
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </Table>
          </div>
        )}

        <RoleGuide />
      </section>

      {you && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="font-medium text-slate-900 dark:text-white">Leave {institution.name}</p>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {soleAdmin
                ? 'You are the only administrator. Make someone else an administrator first, then you can leave.'
                : 'You lose access to its documents straight away. To come back, an administrator has to invite you again.'}
            </p>
          </div>
          <Button variant="dangerGhost" className="shrink-0" disabled={soleAdmin} onClick={() => setConfirm({ kind: 'leave' })}>
            <DoorOpen size={16} aria-hidden />
            Leave institution
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={onConfirm}
        title={dialog?.title ?? ''}
        confirmLabel={dialog?.label ?? 'Confirm'}
        busy={busy}
      >
        {dialog?.body}
      </ConfirmDialog>
    </div>
  )
}

function dialogCopy(confirm: Confirm, institutionName: string): { title: string; label: string; body: React.ReactNode } {
  if (confirm.kind === 'leave') {
    return {
      title: `Leave ${institutionName}?`,
      label: 'Leave institution',
      body: <><p>You lose access to its documents straight away.</p><p>To come back, an administrator has to invite you again.</p></>,
    }
  }
  if (confirm.kind === 'step-down') {
    return {
      title: `Make yourself ${asRole(confirm.role)}?`,
      label: 'Change my role',
      body: <p>You will no longer be able to manage members, keys or settings. Another administrator can make you an administrator again.</p>,
    }
  }
  const m = confirm.member
  if (m.status === 'PENDING') {
    return {
      title: `Cancel the invitation to ${m.email}?`,
      label: 'Cancel invitation',
      body: <p>The link in their email will stop working. You can invite them again at any time.</p>,
    }
  }
  return {
    title: `Remove ${nameOf(m)}?`,
    label: 'Remove member',
    body: <><p>They lose access to {institutionName} straight away.</p><p>Documents they signed stay valid, and the audit trail keeps a record of what they did.</p></>,
  }
}

function InviteForm({ institutionId, domain, onInvited }: { institutionId: string; domain: string; onInvited: () => void }) {
  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState<InstitutionRole>('ISSUER')
  const [busy, setBusy] = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const address = email.trim().toLowerCase()
    if (!address) return
    setBusy(true)
    try {
      await api.invite(institutionId, { email: address, role })
      toast.success(`Invitation sent to ${address}.`)
      setEmail('')
      onInvited()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel
      title="Invite someone"
      description="We email them a link. If they are new to VeriDocs, they create an account with this address and the invitation is waiting for them."
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email address" htmlFor="invite-email">
            <Input id="invite-email" type="email" required autoComplete="off" maxLength={254} placeholder={`name@${domain}`} value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Role" htmlFor="invite-role" hint={ROLE_HELP[role]}>
            <Select id="invite-role" aria-describedby="invite-role-hint" value={role} onChange={(e) => setRole(e.target.value as InstitutionRole)}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </Select>
          </Field>
        </div>
        <Button type="submit" busy={busy}>
          <Send size={16} aria-hidden />
          Send invitation
        </Button>
      </form>
    </Panel>
  )
}

function RoleGuide() {
  return (
    <details className="text-sm">
      <summary className="w-fit cursor-pointer select-none text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">What each role can do</summary>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        {ROLES.map((r) => (
          <div key={r} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <dt className="font-medium text-slate-900 dark:text-white">{ROLE_LABEL[r]}</dt>
            <dd className="mt-0.5 text-slate-600 dark:text-slate-400">{ROLE_HELP[r]}</dd>
          </div>
        ))}
      </dl>
    </details>
  )
}
