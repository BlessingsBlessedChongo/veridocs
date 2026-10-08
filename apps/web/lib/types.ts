export type InstitutionRole = 'ADMIN' | 'ISSUER' | 'AUDITOR' | 'VIEWER'
export type DocumentStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED'
export type MemberStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED'
export type InstitutionVerificationStatus = 'PENDING' | 'DOMAIN_VERIFIED' | 'MANUALLY_VERIFIED' | 'REJECTED'
export interface Institution { id: string; name: string; emailDomain: string; verificationStatus: InstitutionVerificationStatus; publicKey: string; createdAt: string }
export interface DocumentRecord { id: string; documentId: string; title: string; description: string | null; fileHash: string; signature: string; status: DocumentStatus; issuedAt: string; expiresAt: string | null; revokedAt: string | null; revocationReason: string | null; institutionId: string; institutionName: string; signedByUserId: string; signedByEmail: string; keyPairId: string; verificationCount: number; lastVerifiedAt: string | null }
export interface VerificationResult { valid: boolean; documentId?: string; title?: string; issuer?: string; issuedAt?: string; status?: DocumentStatus; reason?: string }
export interface Paginated<T> { items: T[]; page: number; pageSize: number; total: number }
