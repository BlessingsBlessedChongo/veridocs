import { NextRequest } from 'next/server';
import { prisma, type Document, type Institution, type KeyPair } from '@veridocs/database';
import { hashesMatch, publicKeyFingerprint, verifySignature } from '@veridocs/crypto';
import { clientIp } from './http';
import { emit } from './webhooks';
import { verificationUrl } from './config';

/**
 * One answer for every way of checking a document: by ID (link or QR code), by uploading the
 * PDF, or by a SHA-256 fingerprint computed in the browser (the file never leaves the device).
 *
 * outcome:
 *   VALID      signed by the institution, unchanged, not revoked, not expired
 *   ALTERED    a file was checked and its fingerprint differs from what was signed
 *   NOT_FOUND  nothing with this ID or fingerprint was ever signed
 *   FORGED     the stored signature does not match the institution's key
 *   REVOKED    the institution withdrew it
 *   EXPIRED    past its expiry date
 */
export type Outcome = 'VALID' | 'ALTERED' | 'NOT_FOUND' | 'FORGED' | 'REVOKED' | 'EXPIRED';
export type Method = 'ID' | 'UPLOAD' | 'HASH';

type Full = Document & { institution: Institution; keyPair: KeyPair };

const REASONS: Record<Outcome, string> = {
  VALID: 'This document is authentic and has not been changed since it was signed.',
  ALTERED: 'This file is not the one that was signed. It has been changed, even if only slightly.',
  NOT_FOUND: 'No document like this was ever signed through VeriDocs. It may have been altered, or it is not genuine.',
  FORGED: 'The signature on record does not match the institution\'s key. Do not trust this document.',
  REVOKED: 'The institution has withdrawn this document.',
  EXPIRED: 'This document has passed its expiry date.',
};

export function findById(documentId: string) {
  return prisma.document.findUnique({ where: { documentId }, include: { institution: true, keyPair: true } });
}

export function findByHash(fileHash: string) {
  return prisma.document.findFirst({ where: { fileHash }, include: { institution: true, keyPair: true }, orderBy: { issuedAt: 'desc' } });
}

/** Works out the outcome. `checkedHash` is the fingerprint of a file someone presented, if any. */
export function assess(document: Full, checkedHash?: string): Outcome {
  if (checkedHash && !hashesMatch(checkedHash, document.fileHash)) return 'ALTERED';
  if (!verifySignature(document.fileHash, document.signature, document.keyPair.publicKey)) return 'FORGED';
  if (document.status === 'REVOKED') return 'REVOKED';
  if (document.status === 'EXPIRED' || (document.expiresAt && document.expiresAt < new Date())) return 'EXPIRED';
  return 'VALID';
}

/** The public answer. Shows what a verifier needs, nothing about who signed inside the institution. */
export function present(document: Full | null, outcome: Outcome, method: Method, extra: { revocationReason?: boolean } = {}) {
  const base = { valid: outcome === 'VALID', outcome, method, reason: REASONS[outcome], checkedAt: new Date().toISOString() };
  if (!document || outcome === 'NOT_FOUND') return base;
  return {
    ...base,
    // Kept for older clients: the document's own status.
    status: outcome === 'EXPIRED' ? 'EXPIRED' : document.status,
    documentId: document.documentId,
    title: document.title,
    description: document.description,
    recipientName: document.recipientName,
    issuer: document.institution.name,
    issuerDetails: {
      id: document.institution.id,
      name: document.institution.name,
      emailDomain: document.institution.emailDomain,
      verificationStatus: document.institution.verificationStatus,
    },
    issuedAt: document.issuedAt.toISOString(),
    expiresAt: document.expiresAt?.toISOString() ?? null,
    revokedAt: document.revokedAt?.toISOString() ?? null,
    revocationReason: outcome === 'REVOKED' && extra.revocationReason !== false ? document.revocationReason : null,
    fileHash: document.fileHash,
    signature: { algorithm: document.keyPair.algorithm, keyFingerprint: publicKeyFingerprint(document.keyPair.publicKey), keyStatus: document.keyPair.status },
    verificationUrl: verificationUrl(document.documentId),
  };
}

/** Records the check (for the institution's analytics) and tells its webhooks. */
export async function record(request: NextRequest, document: Full | null, outcome: Outcome, method: Method) {
  if (!document) return;
  await prisma.verification.create({
    data: {
      documentId: document.id,
      result: outcome,
      method,
      ipAddress: clientIp(request),
      userAgent: request.headers.get('user-agent')?.slice(0, 300) ?? null,
      failureReason: outcome === 'VALID' ? null : REASONS[outcome],
    },
  });
  emit(document.institutionId, 'document.verified', { documentId: document.documentId, title: document.title, outcome, method });
}
