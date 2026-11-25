import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@veridocs/database';
import { decryptPrivateKey, publicKeyFingerprint, signData } from '@veridocs/crypto';
import { NotFoundError } from '../../../../../lib/errors';
import { clientIp, limit, route } from '../../../../../lib/http';
import { masterKey } from '../../../../../lib/config';

type Ctx = { params: { institutionId: string } };

/**
 * Public registry entry for an institution: its identity, every public key it has used, and
 * its revocation list. Download this once and documents can be checked offline:
 *
 *   1. SHA-256 the PDF.
 *   2. Verify the document's signature (RSA-SHA256 over the hex hash) with one of these keys.
 *   3. Make sure its ID is not in `revoked`.
 *
 * The revocation list is itself signed with the active key (`revokedSignature`, over the
 * JSON of `revoked`), so a cached copy can't be quietly edited.
 */
export const GET = route<Ctx>(async (request: NextRequest, { params }) => {
  await limit(`public-institution:${clientIp(request)}`, 120, '1m');
  const institution = await prisma.institution.findUnique({
    where: { id: params.institutionId },
    include: { keyPairs: { orderBy: { createdAt: 'asc' } } },
  });
  if (!institution) throw new NotFoundError('Institution not found');

  const revokedDocs = await prisma.document.findMany({
    where: { institutionId: institution.id, status: 'REVOKED' },
    select: { documentId: true, revokedAt: true },
    orderBy: { revokedAt: 'asc' },
  });
  const revoked = revokedDocs.map((d) => ({ documentId: d.documentId, revokedAt: d.revokedAt?.toISOString() ?? null }));
  const active = institution.keyPairs.find((k) => k.status === 'ACTIVE');
  const revokedSignature = active ? signData(JSON.stringify(revoked), decryptPrivateKey(active.encryptedPrivateKey, masterKey())) : null;

  const body = {
    id: institution.id,
    name: institution.name,
    emailDomain: institution.emailDomain,
    verificationStatus: institution.verificationStatus,
    keys: institution.keyPairs.map((k) => ({
      id: k.id,
      algorithm: k.algorithm,
      status: k.status,
      fingerprint: publicKeyFingerprint(k.publicKey),
      publicKey: k.publicKey,
      validFrom: k.createdAt.toISOString(),
      validUntil: (k.rotatedAt ?? k.revokedAt)?.toISOString() ?? null,
    })),
    revoked,
    revokedSignature,
    revokedSignedWith: active ? publicKeyFingerprint(active.publicKey) : null,
    generatedAt: new Date().toISOString(),
  };
  return NextResponse.json({ success: true, data: body }, { headers: { 'Cache-Control': 'public, max-age=300' } });
});
