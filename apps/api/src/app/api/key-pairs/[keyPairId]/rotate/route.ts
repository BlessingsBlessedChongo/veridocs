import { NextRequest } from 'next/server';
import { InstitutionRole } from '@veridocs/shared';
import { prisma } from '@veridocs/database';
import { encryptPrivateKey, generateKeyPair, publicKeyFingerprint } from '@veridocs/crypto';
import { requirePerson, requireInstitutionRole } from '../../../../../lib/auth/require-auth';
import { ConflictError, NotFoundError } from '../../../../../lib/errors';
import { ok, route } from '../../../../../lib/http';
import { logAudit } from '../../../../../lib/audit';
import { masterKey } from '../../../../../lib/config';

type Ctx = { params: { keyPairId: string } };

/**
 * Replace the active key with a new one (administrators). Documents signed with the old key
 * stay valid: it is kept, marked ROTATED, and still used to check their signatures.
 */
export const POST = route<Ctx>(async (request: NextRequest, { params }) => {
  const user = await requirePerson(request);
  const oldKey = await prisma.keyPair.findUnique({ where: { id: params.keyPairId } });
  if (!oldKey) throw new NotFoundError('Key not found');
  await requireInstitutionRole(user, oldKey.institutionId, [InstitutionRole.ADMIN]);
  if (oldKey.status !== 'ACTIVE') throw new ConflictError('Only the active key can be rotated');

  const { publicKey, privateKey } = generateKeyPair();
  const newKey = await prisma.$transaction(async (tx) => {
    // Guard against two rotations at once: only one can move the old key off ACTIVE.
    const moved = await tx.keyPair.updateMany({ where: { id: oldKey.id, status: 'ACTIVE' }, data: { status: 'ROTATED', rotatedAt: new Date() } });
    if (moved.count !== 1) throw new ConflictError('This key was just rotated by someone else');
    return tx.keyPair.create({ data: { institutionId: oldKey.institutionId, publicKey, encryptedPrivateKey: encryptPrivateKey(privateKey, masterKey()), status: 'ACTIVE' } });
  });
  const fingerprint = publicKeyFingerprint(newKey.publicKey);
  await logAudit({ action: 'KEY_ROTATED', entityType: 'KeyPair', entityId: newKey.id, actorUserId: user.id, institutionId: oldKey.institutionId, metadata: { previousKeyPairId: oldKey.id, previousFingerprint: publicKeyFingerprint(oldKey.publicKey), fingerprint } });
  return ok({ id: newKey.id, publicKey: newKey.publicKey, fingerprint, status: newKey.status, createdAt: newKey.createdAt });
});
