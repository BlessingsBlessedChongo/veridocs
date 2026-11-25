import { NextRequest } from 'next/server';
import { prisma } from '@veridocs/database';
import { InstitutionRole } from '@veridocs/shared';
import { z } from 'zod';
import { requirePerson, requireInstitutionRole } from '../../../../lib/auth/require-auth';
import { NotFoundError } from '../../../../lib/errors';
import { ok, readJson, route } from '../../../../lib/http';
import { logAudit } from '../../../../lib/audit';

type Ctx = { params: { webhookId: string } };

async function load(request: NextRequest, webhookId: string) {
  const user = await requirePerson(request);
  const hook = await prisma.webhook.findUnique({ where: { id: webhookId } });
  if (!hook) throw new NotFoundError('Webhook not found');
  await requireInstitutionRole(user, hook.institutionId, [InstitutionRole.ADMIN]);
  return { user, hook };
}

/** Pause or resume deliveries. */
export const PATCH = route<Ctx>(async (request: NextRequest, { params }) => {
  const { user, hook } = await load(request, params.webhookId);
  const { active } = await readJson(request, z.object({ active: z.boolean() }));
  const updated = await prisma.webhook.update({ where: { id: hook.id }, data: { active } });
  await logAudit({ action: active ? 'WEBHOOK_RESUMED' : 'WEBHOOK_PAUSED', entityType: 'Webhook', entityId: hook.id, actorUserId: user.id, institutionId: hook.institutionId, metadata: { url: hook.url } });
  return ok({ id: updated.id, active: updated.active });
});

export const DELETE = route<Ctx>(async (request: NextRequest, { params }) => {
  const { user, hook } = await load(request, params.webhookId);
  await prisma.webhook.delete({ where: { id: hook.id } });
  await logAudit({ action: 'WEBHOOK_DELETED', entityType: 'Webhook', entityId: hook.id, actorUserId: user.id, institutionId: hook.institutionId, metadata: { url: hook.url } });
  return ok({ deleted: true });
});
