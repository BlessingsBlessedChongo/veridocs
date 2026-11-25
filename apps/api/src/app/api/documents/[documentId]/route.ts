import { NextRequest } from 'next/server';
import { prisma } from '@veridocs/database';
import { publicKeyFingerprint } from '@veridocs/crypto';
import { ALL_ROLES, requireAuth, requireInstitutionRole } from '../../../../lib/auth/require-auth';
import { NotFoundError } from '../../../../lib/errors';
import { ok, route } from '../../../../lib/http';
import { verificationUrl } from '../../../../lib/config';

type Ctx = { params: { documentId: string } };

/** One document, for its institution's members: details, who signed it, and how it has been checked. */
export const GET = route<Ctx>(async (request: NextRequest, { params }) => {
  const user = await requireAuth(request);
  const document = await prisma.document.findUnique({
    where: { documentId: params.documentId },
    include: {
      signedByUser: { select: { email: true, fullName: true } },
      apiKey: { select: { name: true, prefix: true } },
      keyPair: { select: { id: true, publicKey: true, status: true, algorithm: true } },
      verifications: { orderBy: { verifiedAt: 'desc' }, take: 25, select: { id: true, verifiedAt: true, result: true, method: true, failureReason: true } },
      _count: { select: { verifications: true } },
    },
  });
  if (!document) throw new NotFoundError('Document not found');
  await requireInstitutionRole(user, document.institutionId, ALL_ROLES);
  const byResult = await prisma.verification.groupBy({ by: ['result'], where: { documentId: document.id }, _count: true });
  const { keyPair, signedByUser, apiKey, _count, signature, ...rest } = document;
  return ok({
    ...rest,
    signedBy: apiKey ? `${apiKey.name} (API key ${apiKey.prefix}…)` : signedByUser.fullName || signedByUser.email,
    key: { id: keyPair.id, status: keyPair.status, algorithm: keyPair.algorithm, fingerprint: publicKeyFingerprint(keyPair.publicKey) },
    signature,
    verificationUrl: verificationUrl(document.documentId),
    verificationCount: _count.verifications,
    verificationsByResult: Object.fromEntries(byResult.map((r) => [r.result, r._count])),
  });
});
