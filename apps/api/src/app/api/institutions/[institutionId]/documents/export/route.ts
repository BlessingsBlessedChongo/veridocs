import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@veridocs/database';
import { READERS_OF_RECORDS, requirePerson, requireInstitutionRole } from '../../../../../../lib/auth/require-auth';
import { route } from '../../../../../../lib/http';
import { documentFilter, effectiveStatus } from '../../../../../../lib/document-query';
import { verificationUrl } from '../../../../../../lib/config';
import { logAudit } from '../../../../../../lib/audit';

type Ctx = { params: { institutionId: string } };

const LIMIT = 10_000;

function cell(value: unknown): string {
  const text = value instanceof Date ? value.toISOString() : value == null ? '' : String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text; // no spreadsheet formulas
  return `"${safe.replace(/"/g, '""')}"`;
}

/** The documents list (same filters) as a CSV file, for records and audits. */
export const GET = route<Ctx>(async (request: NextRequest, { params }) => {
  const user = await requirePerson(request);
  await requireInstitutionRole(user, params.institutionId, READERS_OF_RECORDS);
  const { where } = documentFilter(request, params.institutionId);
  const rows = await prisma.document.findMany({
    where,
    take: LIMIT,
    orderBy: { issuedAt: 'desc' },
    include: { signedByUser: { select: { email: true } }, _count: { select: { verifications: true } } },
  });
  const header = ['document_id', 'title', 'recipient_name', 'recipient_email', 'status', 'issued_at', 'expires_at', 'revoked_at', 'revocation_reason', 'signed_by', 'sha256', 'verifications', 'verification_url'];
  const lines = rows.map((d) =>
    [d.documentId, d.title, d.recipientName, d.recipientEmail, effectiveStatus(d), d.issuedAt, d.expiresAt, d.revokedAt, d.revocationReason, d.signedByUser.email, d.fileHash, d._count.verifications, verificationUrl(d.documentId)].map(cell).join(','),
  );
  await logAudit({ action: 'DOCUMENTS_EXPORTED', entityType: 'Institution', entityId: params.institutionId, actorUserId: user.id, institutionId: params.institutionId, metadata: { rows: rows.length } });
  return new NextResponse('﻿' + [header.join(','), ...lines].join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="veridocs-documents-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
});
