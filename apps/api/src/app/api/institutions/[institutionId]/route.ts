import { NextRequest } from 'next/server';
import { InstitutionRole, updateInstitutionSchema } from '@veridocs/shared';
import { prisma } from '@veridocs/database';
import { publicKeyFingerprint } from '@veridocs/crypto';
import { ALL_ROLES, requireInstitutionRole, requirePerson } from '../../../../lib/auth/require-auth';
import { NotFoundError } from '../../../../lib/errors';
import { ok, readJson, route } from '../../../../lib/http';
import { logAudit } from '../../../../lib/audit';

type Ctx = { params: { institutionId: string } };

export const GET = route<Ctx>(async (request: NextRequest, { params }) => {
  const user = await requirePerson(request);
  const membership = await requireInstitutionRole(user, params.institutionId, ALL_ROLES);
  const institution = await prisma.institution.findUnique({
    where: { id: params.institutionId },
    include: {
      keyPairs: { where: { status: 'ACTIVE' }, select: { id: true, algorithm: true, createdAt: true, publicKey: true } },
      _count: { select: { documents: true, members: { where: { status: 'ACTIVE' } } } },
    },
  });
  if (!institution) throw new NotFoundError('Institution not found');
  const key = institution.keyPairs[0];
  return ok({
    id: institution.id,
    name: institution.name,
    emailDomain: institution.emailDomain,
    verificationStatus: institution.verificationStatus,
    createdAt: institution.createdAt,
    role: membership.role,
    memberCount: institution._count.members,
    documentCount: institution._count.documents,
    activeKey: key ? { id: key.id, algorithm: key.algorithm, createdAt: key.createdAt, publicKey: key.publicKey, fingerprint: publicKeyFingerprint(key.publicKey) } : null,
  });
});

/** Rename the institution (administrators). */
export const PATCH = route<Ctx>(async (request: NextRequest, { params }) => {
  const user = await requirePerson(request);
  await requireInstitutionRole(user, params.institutionId, [InstitutionRole.ADMIN]);
  const { name } = await readJson(request, updateInstitutionSchema);
  const before = await prisma.institution.findUniqueOrThrow({ where: { id: params.institutionId } });
  const updated = await prisma.institution.update({ where: { id: params.institutionId }, data: { name } });
  await logAudit({ action: 'INSTITUTION_RENAMED', entityType: 'Institution', entityId: updated.id, actorUserId: user.id, institutionId: updated.id, metadata: { from: before.name, to: name } });
  return ok({ id: updated.id, name: updated.name });
});
