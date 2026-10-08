'use client'
import { use, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { field, primaryBtn } from '@/components/shared/shell'
export default function Members({ params }: { params: Promise<{ institutionId: string }> }) {
  const { institutionId } = use(params); const [email, setEmail] = useState(''); const [role, setRole] = useState('ISSUER'); const [uid, setUid] = useState('')
  const roles: Record<string, string> = { ADMIN: 'Manage everything', ISSUER: 'Sign documents', AUDITOR: 'Read audit logs', VIEWER: 'Read-only' }
  return <div className="max-w-xl space-y-8"><h1 className="text-3xl font-semibold tracking-tight">Members</h1>
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); api.inviteMember(institutionId, { email, role }).then(() => { toast.success('Invitation sent.'); setEmail('') }).catch((x) => toast.error(x.message)) }}>
      <label htmlFor="e" className="text-sm font-medium">Invite by email</label><input id="e" type="email" required className={field} value={email} onChange={(e) => setEmail(e.target.value)} />
      <fieldset className="grid gap-2 sm:grid-cols-2"><legend className="sr-only">Role</legend>{Object.entries(roles).map(([r, d]) => <label key={r} className={`cursor-pointer rounded-lg border p-3 text-sm ${role === r ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}><input type="radio" className="sr-only" checked={role === r} onChange={() => setRole(r)} /><span className="font-medium">{r}</span><br /><span className="text-slate-500">{d}</span></label>)}</fieldset>
      <button className={primaryBtn}>Send invitation</button></form>
    <div className="space-y-2"><label htmlFor="u" className="text-sm font-medium">Remove a member by user ID</label><div className="flex gap-2"><input id="u" className={`${field} font-mono`} value={uid} onChange={(e) => setUid(e.target.value)} /><button disabled={!uid} onClick={() => confirm('Remove this member?') && api.removeMember(institutionId, uid.trim()).then(() => toast.success('Member removed.')).catch((x) => toast.error(x.message))} className="h-10 rounded-lg border border-rose-300 px-4 text-sm text-rose-700 disabled:opacity-50">Remove</button></div></div>
    <p className="text-sm text-slate-500">The API has no member-list route yet, so members cannot be listed here.</p></div>
}
