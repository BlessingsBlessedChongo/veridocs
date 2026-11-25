import { NextRequest } from 'next/server';
import { prisma } from '@veridocs/database';
import { InstitutionRole } from '@veridocs/shared';
import { requirePerson, requireInstitutionRole } from '../../../../../lib/auth/require-auth';
import { NotFoundError } from '../../../../../lib/errors';
import { limit, ok, route } from '../../../../../lib/http';
import { sendTest } from '../../../../../lib/webhooks';

type Ctx = { params: { webhookId: string } };

/** Sends a test delivery now and reports what the endpoint answered. */
export const POST = route<Ctx>(async (request: NextRequest, { params }) => {
  const user = await requirePerson(request);
  const hook = await prisma.webhook.findUnique({ where: { id: params.webhookId } });
  if (!hook) throw new NotFoundError('Webhook not found');
  await requireInstitutionRole(user, hook.institutionId, [InstitutionRole.ADMIN]);
  await limit(`webhook-test:${hook.id}`, 10, '1m');
  return ok(await sendTest(hook));
});
