import { NextRequest } from 'next/server';
import { verifyDocumentSchema, VERIFY_DOCUMENT_RATE_LIMIT } from '@veridocs/shared';
import { clientIp, limit, ok, route } from '../../../../../lib/http';
import { ValidationError } from '../../../../../lib/errors';
import { assess, findById, present, record } from '../../../../../lib/verify';

type Ctx = { params: { documentId: string } };

/** Public: check a document by its ID (what the QR code opens). */
export const GET = route<Ctx>(async (request: NextRequest, { params }) => {
  const parsed = verifyDocumentSchema.safeParse(params);
  if (!parsed.success) throw new ValidationError('That is not a valid document ID');
  await limit(`verify-document:${clientIp(request)}`, VERIFY_DOCUMENT_RATE_LIMIT, '1m', 'Too many checks from this network. Wait a minute and try again.');

  const document = await findById(parsed.data.documentId);
  const outcome = document ? assess(document) : 'NOT_FOUND';
  await record(request, document, outcome, 'ID');
  return ok(present(document, outcome, 'ID'));
});
