import { createBrowserClient } from './supabase/client'
import type { DocumentRecord, Institution, Paginated, VerificationResult } from './types'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export class ApiError extends Error {
  constructor(public code: string, message: string, public status = 0) { super(message) }
}

async function token() {
  const { data } = await createBrowserClient().auth.getSession()
  return data.session?.access_token
}

async function call<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers = new Headers(init.headers)
  if (auth) { const t = await token(); if (t) headers.set('Authorization', `Bearer ${t}`) }
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  let res: Response
  try { res = await fetch(`${BASE}${path}`, { ...init, headers }) }
  catch { throw new ApiError('NETWORK', 'Cannot reach the VeriDocs API. Check that the backend is running.') }
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('json')) {
    if (!res.ok) throw new ApiError('HTTP_ERROR', `Request failed (${res.status})`, res.status)
    return res as unknown as T
  }
  const body = await res.json()
  if (!body.success) throw new ApiError(body.error?.code ?? 'ERROR', body.error?.message ?? 'Request failed', res.status)
  return body.data as T
}

const qs = (p: Record<string, string | number | undefined>) => {
  const s = new URLSearchParams(Object.entries(p).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]))
  return s.size ? `?${s}` : ''
}

export const api = {
  registerInstitution: (b: { name: string; emailDomain: string }) => call<Institution>('/api/institutions/register', { method: 'POST', body: JSON.stringify(b) }),
  getInstitution: (id: string) => call<Institution & { memberCount: number }>(`/api/institutions/${id}`),
  inviteMember: (id: string, b: { email: string; role: string }) => call(`/api/institutions/${id}/members/invite`, { method: 'POST', body: JSON.stringify(b) }),
  acceptInvite: (id: string) => call(`/api/institutions/${id}/members/accept`, { method: 'POST' }),
  removeMember: (id: string, userId: string) => call(`/api/institutions/${id}/members/${userId}`, { method: 'DELETE' }),
  listDocuments: (id: string, p: { page?: number; pageSize?: number; search?: string; status?: string; from?: string; to?: string } = {}) =>
    call<Paginated<DocumentRecord>>(`/api/institutions/${id}/documents${qs(p)}`),
  listAuditLogs: (id: string, p: Record<string, string | number | undefined> = {}) => call<Paginated<Record<string, unknown>>>(`/api/institutions/${id}/audit-logs${qs(p)}`),
  listVerifications: (id: string, p: Record<string, string | number | undefined> = {}) => call<Paginated<Record<string, unknown>>>(`/api/institutions/${id}/verifications${qs(p)}`),
  async signDocument(file: File, institutionId: string, metadata: { title: string; description?: string; expiresAt?: string }) {
    const fd = new FormData(); fd.append('file', file); fd.append('institutionId', institutionId); fd.append('metadata', JSON.stringify(metadata))
    const res = await call<Response>('/api/documents/sign', { method: 'POST', body: fd })
    return { blob: await res.blob(), documentId: res.headers.get('X-Document-Id') }
  },
  verifyById: (id: string) => call<VerificationResult>(`/api/documents/verify/${encodeURIComponent(id)}`, {}, false),
  verifyUpload(file: File) { const fd = new FormData(); fd.append('file', file); return call<VerificationResult>('/api/documents/verify-upload', { method: 'POST', body: fd }, false) },
  revokeDocument: (id: string, reason: string) => call(`/api/documents/${id}/revoke`, { method: 'POST', body: JSON.stringify({ reason }) }),
  rotateKey: (id: string) => call(`/api/key-pairs/${id}/rotate`, { method: 'POST' }),
  health: () => call<{ status: string; timestamp: string; version: string }>('/api/health', {}, false),
}
