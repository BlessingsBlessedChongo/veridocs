import { beforeAll, describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { generateKeyPair, hashBuffer, signDocument } from '@veridocs/crypto';
import { assess, present } from '../lib/verify';

/** A one-page PDF, signed the way the API signs documents, as the stored record would hold it. */
async function signedRecord() {
  const pdf = await PDFDocument.create();
  pdf.addPage([595, 842]).drawText('Bachelor of Science — Chanda Mwale', { x: 50, y: 780, size: 14 });
  const keys = generateKeyPair();
  const signed = await signDocument({
    pdfBuffer: Buffer.from(await pdf.save()),
    documentId: '3f2a0c1e-1111-4222-8333-944455556666',
    verificationUrl: 'http://localhost:3000/verify/3f2a0c1e-1111-4222-8333-944455556666',
    issuerName: 'Université de Lubumbashi', // accents must not break the stamp
    privateKeyPem: keys.privateKey,
  });
  const record = {
    id: 'doc-row',
    documentId: '3f2a0c1e-1111-4222-8333-944455556666',
    title: 'Bachelor of Science',
    description: null,
    recipientName: 'Chanda Mwale',
    recipientEmail: null,
    batchId: null,
    fileHash: signed.fileHash,
    signature: signed.signature,
    institutionId: 'inst',
    signedByUserId: 'user',
    apiKeyId: null,
    keyPairId: 'key',
    qrCodeUrl: null,
    status: 'ACTIVE' as const,
    issuedAt: new Date(),
    expiresAt: null as Date | null,
    revokedAt: null as Date | null,
    revocationReason: null as string | null,
    institution: { id: 'inst', name: 'Université de Lubumbashi', emailDomain: 'unilu.ac.cd', verificationStatus: 'DOMAIN_VERIFIED' as const, createdByUserId: 'user', createdAt: new Date(), updatedAt: new Date() },
    keyPair: { id: 'key', institutionId: 'inst', publicKey: keys.publicKey, encryptedPrivateKey: '', algorithm: 'RSA-2048', status: 'ACTIVE' as const, createdAt: new Date(), rotatedAt: null, revokedAt: null },
  };
  return { record, bytes: signed.signedPdf, otherKey: generateKeyPair().publicKey };
}

let fixture: Awaited<ReturnType<typeof signedRecord>>;
beforeAll(async () => {
  fixture = await signedRecord();
}, 30_000);

describe('verification verdicts', () => {
  it('confirms an untouched document', () => {
    expect(assess(fixture.record)).toBe('VALID');
    expect(assess(fixture.record, hashBuffer(fixture.bytes))).toBe('VALID');
  });

  it('catches a file changed by even one byte', () => {
    const tampered = Buffer.from(fixture.bytes);
    tampered[tampered.length - 20] ^= 1;
    expect(assess(fixture.record, hashBuffer(tampered))).toBe('ALTERED');
  });

  it('calls a record whose signature does not match the key forged', () => {
    expect(assess({ ...fixture.record, keyPair: { ...fixture.record.keyPair, publicKey: fixture.otherKey } })).toBe('FORGED');
    expect(assess({ ...fixture.record, fileHash: 'a'.repeat(64) })).toBe('FORGED');
  });

  it('reports revoked and expired documents', () => {
    expect(assess({ ...fixture.record, status: 'REVOKED' })).toBe('REVOKED');
    expect(assess({ ...fixture.record, expiresAt: new Date(Date.now() - 1000) })).toBe('EXPIRED');
    expect(assess({ ...fixture.record, expiresAt: new Date(Date.now() + 86_400_000) })).toBe('VALID');
  });

  it('checks the file before anything else: an altered copy of a revoked document is still "altered"', () => {
    expect(assess({ ...fixture.record, status: 'REVOKED' }, 'b'.repeat(64))).toBe('ALTERED');
  });
});

describe('public answer', () => {
  it('says nothing about a document that does not exist', () => {
    const answer = present(null, 'NOT_FOUND', 'HASH');
    expect(answer).toMatchObject({ valid: false, outcome: 'NOT_FOUND', method: 'HASH' });
    expect(answer).not.toHaveProperty('title');
  });

  it('shows the recipient, issuer and key fingerprint, never internal ids or the signer', () => {
    const answer = present(fixture.record, 'VALID', 'ID') as Record<string, unknown>;
    expect(answer).toMatchObject({ valid: true, recipientName: 'Chanda Mwale', issuer: 'Université de Lubumbashi' });
    expect((answer.signature as { keyFingerprint: string }).keyFingerprint).toMatch(/^([0-9A-F]{2}:){15}[0-9A-F]{2}$/);
    expect(JSON.stringify(answer)).not.toContain('signedByUserId');
    expect(JSON.stringify(answer)).not.toContain('encryptedPrivateKey');
  });

  it('only gives the revocation reason for revoked documents', () => {
    const revoked = present({ ...fixture.record, status: 'REVOKED', revocationReason: 'Issued in error' }, 'REVOKED', 'ID') as Record<string, unknown>;
    expect(revoked.revocationReason).toBe('Issued in error');
  });
});
