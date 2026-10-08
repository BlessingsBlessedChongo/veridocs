export interface VerificationResult {
  valid: boolean;
  documentId?: string;
  title?: string;
  issuer?: string;
  issuedAt?: string;
  status?: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  reason?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
}

export enum InstitutionRole {
  ADMIN = 'ADMIN',
  ISSUER = 'ISSUER',
  AUDITOR = 'AUDITOR',
  VIEWER = 'VIEWER',
}

export enum InstitutionVerificationStatus {
  PENDING = 'PENDING',
  DOMAIN_VERIFIED = 'DOMAIN_VERIFIED',
  MANUALLY_VERIFIED = 'MANUALLY_VERIFIED',
  REJECTED = 'REJECTED',
}

export enum KeyPairStatus {
  ACTIVE = 'ACTIVE',
  ROTATED = 'ROTATED',
  REVOKED = 'REVOKED',
  COMPROMISED = 'COMPROMISED',
}

export interface ApiError {
  code: string;
  message: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}