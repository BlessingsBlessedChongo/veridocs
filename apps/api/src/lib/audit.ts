import { prisma, Prisma } from '@veridocs/database';

export function logAudit(input: {
  action: string;
  entityType: string;
  entityId: string;
  actorUserId: string;
  institutionId: string;
  documentId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.auditLog.create({ data: input });
}