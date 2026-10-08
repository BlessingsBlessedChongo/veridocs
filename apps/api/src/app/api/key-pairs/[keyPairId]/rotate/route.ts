import { NextRequest, NextResponse } from 'next/server';
import { InstitutionRole } from '@veridocs/shared';
import { prisma } from '@veridocs/database';
import { encryptPrivateKey, generateKeyPair } from '@veridocs/crypto';
import { requireAuth, requireInstitutionRole } from '../../../../../lib/auth/require-auth';
import { handleApiError, NotFoundError } from '../../../../../lib/errors';
import { logAudit } from '../../../../../lib/audit';

export async function POST(request: NextRequest, { params }: { params: { keyPairId: string } }) {
  try {
    const user = await requireAuth(request);
    const oldKey = await prisma.keyPair.findUnique({ where: { id: params.keyPairId } });
    if (!oldKey) throw new NotFoundError('Key pair not found');
    await requireInstitutionRole(user, oldKey.institutionId, [InstitutionRole.ADMIN]);
    const masterKey = process.env.MASTER_ENCRYPTION_KEY;
    if (!masterKey) throw new Error('MASTER_ENCRYPTION_KEY is not configured');
    const { publicKey, privateKey } = generateKeyPair();
    const newKey = await prisma.$transaction(async (transaction) => {
      await transaction.keyPair.update({ where: { id: oldKey.id }, data: { status: 'ROTATED', rotatedAt: new Date() } });
      return transaction.keyPair.create({ data: { institutionId: oldKey.institutionId, publicKey, encryptedPrivateKey: encryptPrivateKey(privateKey, masterKey), status: 'ACTIVE' } });
    });
    await logAudit({ action: 'KEY_ROTATED', entityType: 'KeyPair', entityId: newKey.id, actorUserId: user.id, institutionId: oldKey.institutionId, metadata: { previousKeyPairId: oldKey.id } });
    return NextResponse.json({ success: true, data: { id: newKey.id, publicKey: newKey.publicKey, status: newKey.status, createdAt: newKey.createdAt } });
  } catch (error) {
    return handleApiError(error);
  }
}