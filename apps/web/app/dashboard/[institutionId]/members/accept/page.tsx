'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
export default function P({ params }: { params: Promise<{ institutionId: string }> }) {
  const { institutionId } = use(params); const r = useRouter(); const [s, setS] = useState('Accepting invitation...')
  useEffect(() => { api.acceptInvite(institutionId).then(() => { setS('Invitation accepted.'); setTimeout(() => r.push(`/dashboard/${institutionId}`), 1000) }).catch((e) => setS(e.message)) }, [institutionId]) // eslint-disable-line
  return <p role="status" className="text-lg">{s}</p>
}
