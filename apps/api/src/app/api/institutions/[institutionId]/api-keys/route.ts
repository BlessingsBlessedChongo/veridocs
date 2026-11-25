import { NextRequest } from 'next/server';
import { prisma } from '@veridocs/database';
import { createApiKeySchema, InstitutionRole } from '@veridocs/shared';
import { requirePerson, requireInstitutionRole, requireVerifiedEmail } from '../../../../../lib/auth/require-auth';
import { ConflictError } from '../../../../../lib/errors';
import { ok, readJson, route } from '../../../../../lib/http';
import { API_KEY_PREFIX, newSecret, sha256 } from '../../../../../lib/auth/tokens';
import { logAudit } from '../../../../../lib/audit';

type Ctx = { params: { institutionId: string } };

const MAX_ACTIVE_KEYS = 20;

export const GET = route<Ctx>(async (request: NextRequest, { params }) => {
  const user = await requirePerson(request);
  await requireInstitutionRole(user, params.institutionId, [InstitutionRole.ADMIN]);
  const keys = await prisma.apiKey.findMany({
    where: { institutionId: params.institutionId },
    orderBy: [{ revokedAt: { sort: 'desc', nulls: 'first' } }, { createdAt: 'desc' }],
    include: { createdBy: { select: { email: true } }, _count: { select: { documents: true } } },
  });
  return ok(
    keys.map((k) => ({ id: k.id, name: k.name, prefix: k.prefix, role: k.role, createdBy: k.createdBy.email, createdAt: k.createdAt, lastUsedAt: k.lastUsedAt, revokedAt: k.revokedAt, documentCount: k._count.documents })),
  );
});

/** Creates a key for another system. The secret is shown once, here, and never again. */
export const POST = route<Ctx>(async (request: NextRequest, { params }) => {
  const user = await requirePerson(request);
  requireVerifiedEmail(user);
  await requireInstitutionRole(user, params.institutionId, [InstitutionRole.ADMIN]);
  const { name, role } = await readJson(request, createApiKeySchema);
  const active = await prisma.apiKey.count({ where: { institutionId: params.institutionId, revokedAt: null } });
  if (active >= MAX_ACTIVE_KEYS) throw new ConflictError(`An institution can have at most ${MAX_ACTIVE_KEYS} active API keys. Revoke one you no longer use.`);

  const secret = API_KEY_PREFIX + newSecret(24);
  const key = await prisma.apiKey.create({
    data: { institutionId: params.institutionId, name, role, prefix: secret.slice(0, 14), keyHash: sha256(secret), createdByUserId: user.id },
  });
  await logAudit({ action: 'API_KEY_CREATED', entityType: 'ApiKey', entityId: key.id, actorUserId: user.id, institutionId: params.institutionId, metadata: { name, role, prefix: key.prefix } });
  return ok({ id: key.id, name: key.name, role: key.role, prefix: key.prefix, createdAt: key.createdAt, secret }, 201);
});
