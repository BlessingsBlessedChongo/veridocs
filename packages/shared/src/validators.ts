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
  title: z.string().trim().min(1, 'Give the document a title').max(500),
  description: z.string().max(2000).optional(),
  recipientName: z.string().trim().max(200).optional(),
  recipientEmail: z.string().trim().toLowerCase().email().max(254).optional(),
  expiresAt: z.string().datetime().optional().refine((v) => !v || new Date(v) > new Date(), 'The expiry date must be in the future'),
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

// ── Built-in sign-in ──
const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);
const password = z.string().min(1, 'Enter a password').max(200);

export const signupSchema = z.object({ email, password, fullName: z.string().trim().min(2, 'Enter your full name').max(120) });
export const loginSchema = z.object({ email, password });
export const emailOnlySchema = z.object({ email });
export const tokenSchema = z.object({ token: z.string().min(10).max(200) });
export const resetPasswordSchema = z.object({ token: z.string().min(10).max(200), password });
export const changePasswordSchema = z.object({ currentPassword: password, newPassword: password });
export const updateProfileSchema = z.object({ fullName: z.string().trim().min(2).max(120) });

// ── Institutions ──
export const updateInstitutionSchema = z.object({ name: z.string().trim().min(2).max(200) });
export const updateMemberSchema = z.object({ role: z.enum(['ADMIN', 'ISSUER', 'AUDITOR', 'VIEWER']) });

// ── API keys and webhooks ──
export const createApiKeySchema = z.object({ name: z.string().trim().min(2).max(80), role: z.enum(['ISSUER', 'AUDITOR', 'VIEWER']).default('ISSUER') });
export const WEBHOOK_EVENTS = ['document.signed', 'document.revoked', 'document.verified'] as const;
export const createWebhookSchema = z.object({
  url: z.string().url().max(500).refine((u) => u.startsWith('https://') || u.startsWith('http://localhost') || u.startsWith('http://127.0.0.1'), 'Use an https:// address'),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
});

// ── Verification without sending the file ──
export const verifyHashSchema = z.object({ hash: z.string().trim().toLowerCase().regex(/^[0-9a-f]{64}$/, 'A SHA-256 hash is 64 hexadecimal characters') });
