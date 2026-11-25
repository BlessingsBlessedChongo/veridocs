import { NextRequest } from 'next/server';
import { prisma } from '@veridocs/database';
import { InstitutionRole } from '@veridocs/shared';
import { requirePerson, requireInstitutionRole } from '../../../../lib/auth/require-auth';
import { NotFoundError } from '../../../../lib/errors';
import { ok, route } from '../../../../lib/http';
import { logAudit } from '../../../../lib/audit';

type Ctx = { params: { apiKeyId: string } };

/** Revoke an API key. It stops working at once; documents it signed stay valid. */
export const DELETE = route<Ctx>(async (request: NextRequest, { params }) => {
  const user = await requirePerson(request);
  const key = await prisma.apiKey.findUnique({ where: { id: params.apiKeyId } });
  if (!key || key.revokedAt) throw new NotFoundError('API key not found');
  await requireInstitutionRole(user, key.institutionId, [InstitutionRole.ADMIN]);
  await prisma.apiKey.update({ where: { id: key.id }, data: { revokedAt: new Date() } });
  await logAudit({ action: 'API_KEY_REVOKED', entityType: 'ApiKey', entityId: key.id, actorUserId: user.id, institutionId: key.institutionId, metadata: { name: key.name, prefix: key.prefix } });
  return ok({ revoked: true });
});
