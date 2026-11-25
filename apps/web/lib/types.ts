export type InstitutionRole = 'ADMIN' | 'ISSUER' | 'AUDITOR' | 'VIEWER'
export type DocumentStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED'
export type MemberStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED'
export type InstitutionVerificationStatus = 'PENDING' | 'DOMAIN_VERIFIED' | 'MANUALLY_VERIFIED' | 'REJECTED'
export type Outcome = 'VALID' | 'ALTERED' | 'NOT_FOUND' | 'FORGED' | 'REVOKED' | 'EXPIRED'
export type Method = 'ID' | 'UPLOAD' | 'HASH'

export interface Paginated<T> { items: T[]; page: number; pageSize: number; total: number }

export interface Me {
  user: { id: string; email: string; fullName: string | null; emailVerified: boolean; createdAt: string }
  authProvider: 'local' | 'supabase'
  institutions: Array<{ id: string; name: string; emailDomain: string; verificationStatus: InstitutionVerificationStatus; role: InstitutionRole; documentCount: number; memberCount: number }>
  invitations: Array<{ institutionId: string; institutionName: string; role: InstitutionRole; invitedBy: string | null; invitedAt: string }>
}

export interface InstitutionDetail {
  id: string
  name: string
  emailDomain: string
  verificationStatus: InstitutionVerificationStatus
  createdAt: string
  role: InstitutionRole
  memberCount: number
  documentCount: number
  activeKey: { id: string; algorithm: string; createdAt: string; publicKey: string; fingerprint: string } | null
}

export interface Stats {
  documents: { active: number; expired: number; revoked: number; total: number; signedLast30Days: number }
  verifications: { last30Days: number; byResult: Partial<Record<Outcome, number>>; byMethod: Partial<Record<Method, number>>; daily: Array<{ date: string; valid: number; failed: number }> }
  mostChecked: Array<{ documentId: string; title: string; recipientName: string | null; checks: number }>
  recentActivity: Array<{ id: string; action: string; actor: string; document: { documentId: string; title: string } | null; createdAt: string; metadata: Record<string, unknown> | null }>
}

export interface DocumentRow {
  id: string
  documentId: string
  title: string
  recipientName: string | null
  recipientEmail: string | null
  status: DocumentStatus
  issuedAt: string
  expiresAt: string | null
  revokedAt: string | null
  batchId: string | null
  signedBy: string
  verificationCount: number
  lastVerifiedAt: string | null
}

export interface DocumentDetail {
  id: string
  documentId: string
  title: string
  description: string | null
  recipientName: string | null
  recipientEmail: string | null
  batchId: string | null
  fileHash: string
  signature: string
  status: DocumentStatus
  issuedAt: string
  expiresAt: string | null
  revokedAt: string | null
  revocationReason: string | null
  institutionId: string
  qrCodeUrl: string | null
  signedBy: string
  key: { id: string; status: string; algorithm: string; fingerprint: string }
  verificationUrl: string
  verificationCount: number
  verificationsByResult: Partial<Record<Outcome, number>>
  verifications: Array<{ id: string; verifiedAt: string; result: Outcome; method: Method; failureReason: string | null }>
}

export interface Member {
  userId: string
  email: string
  fullName: string | null
  role: InstitutionRole
  status: MemberStatus
  joinedAt: string
  lastLoginAt: string | null
  invitedBy: string | null
  isYou: boolean
}

export interface SigningKey {
  id: string
  publicKey: string
  algorithm: string
  status: 'ACTIVE' | 'ROTATED' | 'REVOKED' | 'COMPROMISED'
  fingerprint: string
  createdAt: string
  rotatedAt: string | null
  revokedAt: string | null
  documentCount: number
}

export interface ApiKey { id: string; name: string; prefix: string; role: InstitutionRole; createdBy: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null; documentCount: number }
export interface Webhook {
  id: string
  url: string
  events: string[]
  active: boolean
  createdAt: string
  deliveries: Array<{ id: string; event: string; ok: boolean; statusCode: number | null; error: string | null; durationMs: number | null; createdAt: string }>
}

export interface AuditEntry { id: string; action: string; entityType: string; entityId: string; actor: string; actorEmail: string; document: { documentId: string; title: string } | null; metadata: Record<string, unknown> | null; createdAt: string }
export interface VerificationEntry { id: string; verifiedAt: string; result: Outcome; method: Method; failureReason: string | null; document: { documentId: string; title: string; recipientName: string | null }; network: string | null; device: string | null }
export interface DeviceSession { id: string; userAgent: string | null; ipAddress: string | null; createdAt: string; lastUsedAt: string; expiresAt: string; current: boolean }

export interface VerificationResult {
  valid: boolean
  outcome: Outcome
  method: Method
  reason: string
  checkedAt: string
  checkedHash?: string
  status?: DocumentStatus
  documentId?: string
  title?: string
  description?: string | null
  recipientName?: string | null
  issuer?: string
  issuerDetails?: { id: string; name: string; emailDomain: string; verificationStatus: InstitutionVerificationStatus }
  issuedAt?: string
  expiresAt?: string | null
  revokedAt?: string | null
  revocationReason?: string | null
  fileHash?: string
  signature?: { algorithm: string; keyFingerprint: string; keyStatus: string }
  verificationUrl?: string
}

export interface SignMetadata { title: string; description?: string; recipientName?: string; recipientEmail?: string; expiresAt?: string }
