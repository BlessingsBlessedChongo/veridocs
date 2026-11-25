import { auth } from './auth/client'
import type {
  ApiKey, AuditEntry, DeviceSession, DocumentDetail, DocumentRow, InstitutionDetail, InstitutionRole, Me, Member,
  Paginated, SignMetadata, SigningKey, Stats, VerificationEntry, VerificationResult, Webhook,
} from './types'

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export class ApiError extends Error {
  constructor(public code: string, message: string, public status = 0) { super(message) }
}

/** Calls the API with the signed-in person's token; turns error replies into ApiError. */
async function call<T>(path: string, init: RequestInit = {}, signedIn = true): Promise<T> {
  const headers = new Headers(init.headers)
  if (signedIn) {
    const token = await auth.token()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers })
  } catch {
    throw new ApiError('NETWORK', 'Cannot reach VeriDocs. Check your connection, then try again.')
  }
  if (res.status === 401 && signedIn) auth.forget()
  const type = res.headers.get('content-type') || ''
  if (!type.includes('json')) {
    if (!res.ok) throw new ApiError('HTTP_ERROR', `Request failed (${res.status})`, res.status)
    return res as unknown as T
  }
  const body = await res.json()
  if (!res.ok || !body.success) throw new ApiError(body.error?.code ?? 'ERROR', body.error?.message ?? `Request failed (${res.status})`, res.status)
  return body.data as T
}

const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) })

export const qs = (p: Record<string, string | number | undefined | null>) => {
  const s = new URLSearchParams(Object.entries(p).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)]))
  return s.size ? `?${s}` : ''
}

export type ListParams = { page?: number; pageSize?: number; search?: string; status?: string; from?: string; to?: string }

/** Downloads a file the API sends back (signed PDF, ZIP, CSV) and tells you its name. */
async function download(path: string, init: RequestInit) {
  const res = await call<Response>(path, init)
  const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1]
  return { blob: await res.blob(), fileName: name ?? 'download', headers: res.headers }
}

export const api = {
  me: () => call<Me>('/api/me'),
  updateMe: (fullName: string) => call<Me['user']>('/api/me', json('PATCH', { fullName })),
  sessions: () => call<DeviceSession[]>('/api/auth/sessions'),
  signOutDevice: (id: string) => call(`/api/auth/sessions/${id}`, json('DELETE')),

  registerInstitution: (b: { name: string; emailDomain: string }) => call<{ id: string }>('/api/institutions/register', json('POST', b)),
  institution: (id: string) => call<InstitutionDetail>(`/api/institutions/${id}`),
  renameInstitution: (id: string, name: string) => call(`/api/institutions/${id}`, json('PATCH', { name })),
  stats: (id: string) => call<Stats>(`/api/institutions/${id}/stats`),

  members: (id: string) => call<Member[]>(`/api/institutions/${id}/members`),
  invite: (id: string, b: { email: string; role: InstitutionRole }) => call(`/api/institutions/${id}/members/invite`, json('POST', b)),
  acceptInvite: (id: string) => call(`/api/institutions/${id}/members/accept`, json('POST')),
  declineInvite: (id: string) => call(`/api/institutions/${id}/members/accept`, json('DELETE')),
  changeRole: (id: string, userId: string, role: InstitutionRole) => call(`/api/institutions/${id}/members/${userId}`, json('PATCH', { role })),
  removeMember: (id: string, userId: string) => call(`/api/institutions/${id}/members/${userId}`, json('DELETE')),

  documents: (id: string, p: ListParams = {}) => call<Paginated<DocumentRow>>(`/api/institutions/${id}/documents${qs(p)}`),
  exportDocuments: (id: string, p: ListParams = {}) => download(`/api/institutions/${id}/documents/export${qs(p)}`, { method: 'GET' }),
  document: (documentId: string) => call<DocumentDetail>(`/api/documents/${documentId}`),
  revoke: (documentId: string, reason: string) => call(`/api/documents/${documentId}/revoke`, json('POST', { reason })),

  async sign(file: File, institutionId: string, metadata: SignMetadata) {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('institutionId', institutionId)
    fd.append('metadata', JSON.stringify(metadata))
    const { blob, fileName, headers } = await download('/api/documents/sign', { method: 'POST', body: fd })
    return { blob, fileName, documentId: headers.get('X-Document-Id') }
  },
  async signBatch(files: File[], institutionId: string, documents: SignMetadata[]) {
    const fd = new FormData()
    fd.append('institutionId', institutionId)
    files.forEach((f) => fd.append('files', f))
    fd.append('documents', JSON.stringify(documents))
    const { blob, fileName, headers } = await download('/api/documents/sign-batch', { method: 'POST', body: fd })
    return { blob, fileName, batchId: headers.get('X-Batch-Id'), signed: Number(headers.get('X-Batch-Signed') ?? files.length), failed: Number(headers.get('X-Batch-Failed') ?? 0) }
  },

  keys: (id: string) => call<SigningKey[]>(`/api/institutions/${id}/keys`),
  rotateKey: (keyPairId: string) => call<{ id: string; fingerprint: string }>(`/api/key-pairs/${keyPairId}/rotate`, json('POST')),

  apiKeys: (id: string) => call<ApiKey[]>(`/api/institutions/${id}/api-keys`),
  createApiKey: (id: string, b: { name: string; role: InstitutionRole }) => call<ApiKey & { secret: string }>(`/api/institutions/${id}/api-keys`, json('POST', b)),
  revokeApiKey: (apiKeyId: string) => call(`/api/api-keys/${apiKeyId}`, json('DELETE')),

  webhooks: (id: string) => call<Webhook[]>(`/api/institutions/${id}/webhooks`),
  createWebhook: (id: string, b: { url: string; events: string[] }) => call<Webhook & { secret: string }>(`/api/institutions/${id}/webhooks`, json('POST', b)),
  setWebhookActive: (webhookId: string, active: boolean) => call(`/api/webhooks/${webhookId}`, json('PATCH', { active })),
  deleteWebhook: (webhookId: string) => call(`/api/webhooks/${webhookId}`, json('DELETE')),
  testWebhook: (webhookId: string) => call<{ ok: boolean; statusCode: number | null; error: string | null }>(`/api/webhooks/${webhookId}/test`, json('POST')),

  auditLogs: (id: string, p: ListParams = {}) => call<Paginated<AuditEntry>>(`/api/institutions/${id}/audit-logs${qs(p)}`),
  verifications: (id: string, p: ListParams = {}) => call<Paginated<VerificationEntry>>(`/api/institutions/${id}/verifications${qs(p)}`),

  // Public: no sign-in needed.
  verifyById: (documentId: string) => call<VerificationResult>(`/api/documents/verify/${encodeURIComponent(documentId)}`, {}, false),
  verifyHash: (hash: string, documentId?: string) => call<VerificationResult>('/api/documents/verify-hash', json('POST', { hash, documentId }), false),
  verifyUpload(file: File, documentId?: string) {
    const fd = new FormData()
    fd.append('file', file)
    if (documentId) fd.append('documentId', documentId)
    return call<VerificationResult>('/api/documents/verify-upload', { method: 'POST', body: fd }, false)
  },
  health: () => call<{ status: string }>('/api/health', {}, false),
}

/** SHA-256 of a file, computed in the browser. The file is never uploaded. */
export async function sha256File(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Saves a Blob as a file. */
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
