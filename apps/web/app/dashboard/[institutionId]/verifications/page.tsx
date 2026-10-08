'use client'
import { use } from 'react'
import { Paged } from '@/components/shared/paged'
import { api } from '@/lib/api'
export default function P({ params }: { params: Promise<{ institutionId: string }> }) {
  const { institutionId } = use(params)
  return <div className="space-y-6"><h1 className="text-3xl font-semibold tracking-tight">Verifications</h1><Paged empty="No verifications yet. They appear here when someone checks one of your documents." load={(p) => api.listVerifications(institutionId, { page: p, pageSize: 20 })}
    cols={[['Document', (r) => r.documentTitle], ['Result', (r) => r.result], ['IP', (r) => r.ipAddress ?? '-'], ['Failure reason', (r) => r.failureReason ?? '-'], ['When', (r) => new Date(r.verifiedAt).toLocaleString()]]} /></div>
}
