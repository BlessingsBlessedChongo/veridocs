'use client'
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { primaryBtn } from '@/components/shared/shell'

export default function Overview({ params }: { params: Promise<{ institutionId: string }> }) {
  const { institutionId } = use(params)
  const [inst, setInst] = useState<Awaited<ReturnType<typeof api.getInstitution>> | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => { api.getInstitution(institutionId).then(setInst).catch((e) => setErr(e.message)) }, [institutionId])
  if (err) return <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{err}</p>
  if (!inst) return <p role="status" className="text-sm text-slate-500">Loading...</p>
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between"><div><h1 className="text-3xl font-semibold tracking-tight">{inst.name}</h1><p className="text-sm text-slate-600">{inst.emailDomain} · {inst.verificationStatus.replace('_', ' ').toLowerCase()} · {inst.memberCount} members</p></div>
        <Link href={`/dashboard/${institutionId}/documents/new`} className={primaryBtn}>Sign document</Link></div>
      <div className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="text-sm font-medium text-slate-500">Public key</h2><pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs">{inst.publicKey}</pre></div>
    </div>
  )
}
