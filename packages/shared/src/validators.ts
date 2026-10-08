import { z } from 'zod';

export const issuerRegistrationSchema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email(),
});

export const institutionRegistrationSchema = z.object({
  name: z.string().min(2).max(200),
  emailDomain: z.string().trim().toLowerCase().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'ISSUER', 'AUDITOR', 'VIEWER']),
});

export const signDocumentSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  expiresAt: z.string().datetime().optional(),
});

export const verifyDocumentSchema = z.object({
  documentId: z.string().uuid(),
});

export const revokeDocumentSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type IssuerRegistration = z.infer<typeof issuerRegistrationSchema>;
export type SignDocumentRequest = z.infer<typeof signDocumentSchema>;
export type VerifyDocumentRequest = z.infer<typeof verifyDocumentSchema>;
export type InstitutionRegistration = z.infer<typeof institutionRegistrationSchema>;
export type InviteMemberRequest = z.infer<typeof inviteMemberSchema>;
export type RevokeDocumentRequest = z.infer<typeof revokeDocumentSchema>;