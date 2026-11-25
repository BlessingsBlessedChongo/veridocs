import { NextRequest } from 'next/server';
import { prisma } from '@veridocs/database';
import { encryptPrivateKey } from '@veridocs/crypto';
import { createWebhookSchema, InstitutionRole } from '@veridocs/shared';
import { requirePerson, requireInstitutionRole } from '../../../../../lib/auth/require-auth';
import { ConflictError } from '../../../../../lib/errors';
import { ok, readJson, route } from '../../../../../lib/http';
import { newSecret } from '../../../../../lib/auth/tokens';
import { masterKey } from '../../../../../lib/config';
import { logAudit } from '../../../../../lib/audit';

type Ctx = { params: { institutionId: string } };

export const GET = route<Ctx>(async (request: NextRequest, { params }) => {
  const user = await requirePerson(request);
  await requireInstitutionRole(user, params.institutionId, [InstitutionRole.ADMIN]);
  const hooks = await prisma.webhook.findMany({
    where: { institutionId: params.institutionId },
    orderBy: { createdAt: 'desc' },
    include: { deliveries: { orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, event: true, ok: true, statusCode: true, error: true, durationMs: true, createdAt: true } } },
  });
  // Never the secret: it was shown once, when the webhook was created.
  return ok(hooks.map((h) => ({ id: h.id, url: h.url, events: h.events, active: h.active, createdAt: h.createdAt, deliveries: h.deliveries })));
});

/** Adds an endpoint. Its signing secret (whsec_…) is shown once, here. */
export const POST = route<Ctx>(async (request: NextRequest, { params }) => {
  const user = await requirePerson(request);
  await requireInstitutionRole(user, params.institutionId, [InstitutionRole.ADMIN]);
  const { url, events } = await readJson(request, createWebhookSchema);
  if ((await prisma.webhook.count({ where: { institutionId: params.institutionId } })) >= 10) throw new ConflictError('An institution can have at most 10 webhooks');
  const secret = `whsec_${newSecret(24)}`;
  const hook = await prisma.webhook.create({ data: { institutionId: params.institutionId, url, events, encryptedSecret: encryptPrivateKey(secret, masterKey()) } });
  await logAudit({ action: 'WEBHOOK_CREATED', entityType: 'Webhook', entityId: hook.id, actorUserId: user.id, institutionId: params.institutionId, metadata: { url, events } });
  return ok({ id: hook.id, url: hook.url, events: hook.events, active: hook.active, createdAt: hook.createdAt, secret }, 201);
});
