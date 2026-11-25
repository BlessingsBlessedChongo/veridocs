import { prisma, type Document } from '@veridocs/database';
import { decryptPrivateKey, PdfUnreadableError, signDocument } from '@veridocs/crypto';
import { MAX_FILE_SIZE, type SignDocumentRequest } from '@veridocs/shared';
import { masterKey, verificationUrl } from './config';
import { NotFoundError, ValidationError } from './errors';
import { logAudit } from './audit';
import { emit } from './webhooks';
import type { Principal } from './auth/verify-session';

/** Checks that an upload really is a PDF within the size limit; returns its bytes. */
export async function readPdf(file: FormDataEntryValue | null, label = 'The file'): Promise<Buffer> {
  if (!(file instanceof File)) throw new ValidationError('Attach a PDF file');
  if (file.size === 0) throw new ValidationError(`${label} is empty`);
  if (file.size > MAX_FILE_SIZE) throw new ValidationError(`${label} is larger than 10 MB`);
  const bytes = Buffer.from(await file.arrayBuffer());
  // Trust the bytes, not the browser's guess at the type.
  if (bytes.subarray(0, 5).toString() !== '%PDF-') throw new ValidationError(`${label} is not a PDF`);
  return bytes;
}

/** The institution's active key, decrypted for this request only. */
export async function signingKey(institutionId: string) {
  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    include: { keyPairs: { where: { status: 'ACTIVE' }, take: 1 } },
  });
  if (!institution) throw new NotFoundError('Institution not found');
  const keyPair = institution.keyPairs[0];
  if (!keyPair) throw new NotFoundError('This institution has no active signing key. An administrator can create one under Keys.');
  return { institution, keyPair, privateKeyPem: decryptPrivateKey(keyPair.encryptedPrivateKey, masterKey()) };
}

export interface SignOneInput {
  pdf: Buffer;
  meta: SignDocumentRequest;
  signer: Principal;
  key: Awaited<ReturnType<typeof signingKey>>;
  batchId?: string;
}

/** Stamps, hashes and signs one PDF, records it, and tells the audit trail and webhooks. */
export async function signOne({ pdf, meta, signer, key, batchId }: SignOneInput): Promise<{ document: Document; signedPdf: Buffer }> {
  const documentId = crypto.randomUUID();
  let result;
  try {
    result = await signDocument({
      pdfBuffer: pdf,
      documentId,
      verificationUrl: verificationUrl(documentId),
      issuerName: key.institution.name,
      privateKeyPem: key.privateKeyPem,
    });
  } catch (error) {
    if (error instanceof PdfUnreadableError) throw new ValidationError(error.message);
    throw error;
  }

  const document = await prisma.document.create({
    data: {
      documentId,
      title: meta.title,
      description: meta.description || null,
      recipientName: meta.recipientName || null,
      recipientEmail: meta.recipientEmail || null,
      batchId: batchId ?? null,
      fileHash: result.fileHash,
      signature: result.signature,
      qrCodeUrl: result.qrCodeDataUrl,
      expiresAt: meta.expiresAt ? new Date(meta.expiresAt) : null,
      institutionId: key.institution.id,
      signedByUserId: signer.id,
      apiKeyId: signer.apiKey?.id ?? null,
      keyPairId: key.keyPair.id,
    },
  });
  await logAudit({
    action: 'DOCUMENT_SIGNED',
    entityType: 'Document',
    entityId: document.id,
    actorUserId: signer.id,
    institutionId: key.institution.id,
    documentId: document.id,
    metadata: { title: document.title, fileHash: result.fileHash, ...(batchId ? { batchId } : {}), ...(signer.apiKey ? { viaApiKey: signer.apiKey.id, apiKeyName: signer.apiKey.name } : {}) },
  });
  emit(key.institution.id, 'document.signed', publicDocument(document, key.institution.name));
  return { document, signedPdf: result.signedPdf };
}

/** What webhooks and integrations see about a document (never the signature internals). */
export function publicDocument(document: Document, issuer: string) {
  return {
    documentId: document.documentId,
    title: document.title,
    recipientName: document.recipientName,
    issuer,
    status: document.status,
    fileHash: document.fileHash,
    issuedAt: document.issuedAt,
    expiresAt: document.expiresAt,
    verificationUrl: verificationUrl(document.documentId),
  };
}

/** A safe file name for a download: letters, numbers and dashes. */
export function fileNameFor(title: string, documentId: string): string {
  const base = title.normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'document';
  return `${base}-${documentId.slice(0, 8)}-signed.pdf`;
}
