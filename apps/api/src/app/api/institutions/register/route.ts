import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@veridocs/database';
import { generateKeyPair, encryptPrivateKey } from '@veridocs/crypto';
import { institutionRegistrationSchema, InstitutionRole, INSTITUTION_REGISTER_RATE_LIMIT } from '@veridocs/shared';
import { requireAuth } from '../../../../lib/auth/require-auth';
import { ConflictError, ValidationError, handleApiError } from '../../../../lib/errors';
import { rateLimit } from '../../../../lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const rate = await rateLimit(`institution-register:${user.id}`, INSTITUTION_REGISTER_RATE_LIMIT, '1h');
    if (!rate.success) throw new ConflictError('Institution registration rate limit exceeded');

    const validation = institutionRegistrationSchema.safeParse(await request.json());
    if (!validation.success) throw new ValidationError(validation.error.errors[0].message);
    const { name, emailDomain } = validation.data;
    if (user.email.split('@')[1]?.toLowerCase() === emailDomain) {
      // Domain verification is intentionally based on the verified Supabase email identity.
    }

    const existing = await prisma.institution.findUnique({ where: { emailDomain } });
    if (existing) throw new ConflictError('An institution with this email domain already exists');
    const masterKey = process.env.MASTER_ENCRYPTION_KEY;
    if (!masterKey) throw new Error('MASTER_ENCRYPTION_KEY is not configured');
    const { publicKey, privateKey } = generateKeyPair();
    const institution = await prisma.$transaction(async (transaction) => {
      const created = await transaction.institution.create({
        data: {
          name,
          emailDomain,
          verificationStatus: user.email.split('@')[1]?.toLowerCase() === emailDomain ? 'DOMAIN_VERIFIED' : 'PENDING',
          createdByUserId: user.id,
          members: { create: { userId: user.id, role: InstitutionRole.ADMIN, status: 'ACTIVE' } },
          keyPairs: { create: { publicKey, encryptedPrivateKey: encryptPrivateKey(privateKey, masterKey), status: 'ACTIVE' } },
        },
        include: { keyPairs: true },
      });
      await transaction.auditLog.create({ data: { action: 'INSTITUTION_REGISTERED', entityType: 'Institution', entityId: created.id, actorUserId: user.id, institutionId: created.id } });
      return created;
    });
    return NextResponse.json({ success: true, data: { id: institution.id, name: institution.name, emailDomain: institution.emailDomain, publicKey: institution.keyPairs[0].publicKey, createdAt: institution.createdAt } }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}