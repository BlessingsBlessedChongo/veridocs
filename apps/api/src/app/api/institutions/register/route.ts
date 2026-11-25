import { NextRequest } from 'next/server';
import { prisma } from '@veridocs/database';
import { encryptPrivateKey, generateKeyPair, publicKeyFingerprint } from '@veridocs/crypto';
import { institutionRegistrationSchema, InstitutionRole, INSTITUTION_REGISTER_RATE_LIMIT } from '@veridocs/shared';
import { requirePerson, requireVerifiedEmail } from '../../../../lib/auth/require-auth';
import { ConflictError } from '../../../../lib/errors';
import { limit, ok, readJson, route } from '../../../../lib/http';
import { masterKey } from '../../../../lib/config';

export const POST = route(async (request: NextRequest) => {
  const user = await requirePerson(request);
  requireVerifiedEmail(user);
  await limit(`institution-register:${user.id}`, INSTITUTION_REGISTER_RATE_LIMIT, '1h', 'You have created several institutions in the last hour. Try again later.');
  const { name, emailDomain } = await readJson(request, institutionRegistrationSchema);

  if (await prisma.institution.findUnique({ where: { emailDomain } })) {
    throw new ConflictError('An institution with this email domain is already registered. Ask its administrator to invite you.');
  }
  const { publicKey, privateKey } = generateKeyPair();
  // Someone whose own email is on the domain has shown control of it; others wait for review.
  const ownsDomain = user.email.split('@')[1]?.toLowerCase() === emailDomain;
  const institution = await prisma.$transaction(async (tx) => {
    const created = await tx.institution.create({
      data: {
        name,
        emailDomain,
        verificationStatus: ownsDomain ? 'DOMAIN_VERIFIED' : 'PENDING',
        createdByUserId: user.id,
        members: { create: { userId: user.id, role: InstitutionRole.ADMIN, status: 'ACTIVE' } },
        keyPairs: { create: { publicKey, encryptedPrivateKey: encryptPrivateKey(privateKey, masterKey()), status: 'ACTIVE' } },
      },
      include: { keyPairs: true },
    });
    await tx.auditLog.create({ data: { action: 'INSTITUTION_REGISTERED', entityType: 'Institution', entityId: created.id, actorUserId: user.id, institutionId: created.id, metadata: { name, emailDomain } } });
    return created;
  });
  return ok(
    {
      id: institution.id,
      name: institution.name,
      emailDomain: institution.emailDomain,
      verificationStatus: institution.verificationStatus,
      publicKey: institution.keyPairs[0].publicKey,
      keyFingerprint: publicKeyFingerprint(institution.keyPairs[0].publicKey),
      createdAt: institution.createdAt,
    },
    201,
  );
});
