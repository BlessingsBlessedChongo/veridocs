import { NextRequest } from 'next/server';
import { prisma } from '@veridocs/database';
import { publicKeyFingerprint } from '@veridocs/crypto';
import { ALL_ROLES, requirePerson, requireInstitutionRole } from '../../../../../lib/auth/require-auth';
import { ok, route } from '../../../../../lib/http';

type Ctx = { params: { institutionId: string } };

/** Every signing key the institution has had, newest first. Private keys never leave the server. */
export const GET = route<Ctx>(async (request: NextRequest, { params }) => {
  const user = await requirePerson(request);
  await requireInstitutionRole(user, params.institutionId, ALL_ROLES);
  const keys = await prisma.keyPair.findMany({
    where: { institutionId: params.institutionId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, publicKey: true, algorithm: true, status: true, createdAt: true, rotatedAt: true, revokedAt: true, _count: { select: { documents: true } } },
  });
  return ok(keys.map(({ _count, ...k }) => ({ ...k, fingerprint: publicKeyFingerprint(k.publicKey), documentCount: _count.documents })));
});
