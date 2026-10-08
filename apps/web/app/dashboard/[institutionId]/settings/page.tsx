'use client'
import { use, useEffect, useState } from 'react'
import { api } from '@/lib/api'
export default function P({ params }: { params: Promise<{ institutionId: string }> }) {
  const { institutionId } = use(params); const [i, setI] = useState<any>(null)
  useEffect(() => { api.getInstitution(institutionId).then(setI).catch(() => setI(false)) }, [institutionId])
  return <div className="max-w-xl space-y-4"><h1 className="text-3xl font-semibold tracking-tight">Settings</h1>{i === false ? <p role="alert" className="text-rose-700">Could not load institution.</p> : i && <dl className="space-y-2 text-sm"><div><dt className="text-slate-500">Name</dt><dd>{i.name}</dd></div><div><dt className="text-slate-500">Email domain</dt><dd>{i.emailDomain}</dd></div><div><dt className="text-slate-500">Verification</dt><dd>{i.verificationStatus}</dd></div></dl>}<p className="text-sm text-slate-500">The API has no update route yet, so these values are read-only.</p></div>
}
