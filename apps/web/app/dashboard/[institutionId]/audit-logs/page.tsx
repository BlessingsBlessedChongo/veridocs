'use client'
import { use, useState } from 'react'
import { Paged } from '@/components/shared/paged'
import { api } from '@/lib/api'
import { field } from '@/components/shared/shell'
export default function P({ params }: { params: Promise<{ institutionId: string }> }) {
  const { institutionId } = use(params); const [action, setAction] = useState('')
  return <div className="space-y-6"><h1 className="text-3xl font-semibold tracking-tight">Audit logs</h1><input aria-label="Filter by action" placeholder="Filter by action" className={`${field} max-w-xs`} value={action} onChange={(e) => setAction(e.target.value)} />
    <Paged deps={[action]} empty="No audit events match." load={(p) => api.listAuditLogs(institutionId, { page: p, pageSize: 20, action })}
      cols={[['Action', (r) => <code className="text-xs">{r.action}</code>], ['Actor', (r) => r.actorEmail ?? 'System'], ['Entity', (r) => `${r.entityType} ${String(r.entityId).slice(0, 8)}`], ['When', (r) => new Date(r.createdAt).toLocaleString()]]} /></div>
}
