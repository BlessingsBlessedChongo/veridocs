import { NextRequest } from 'next/server';
import { hashBuffer } from '@veridocs/crypto';
import { VERIFY_UPLOAD_RATE_LIMIT } from '@veridocs/shared';
import { clientIp, limit, ok, route } from '../../../../lib/http';
import { readPdf } from '../../../../lib/signing';
import { assess, findById, findByHash, present, record } from '../../../../lib/verify';

/**
 * Public: check a PDF by uploading it (multipart/form-data: file; optional documentId to
 * check it against one specific document). The file is hashed in memory and never stored.
 */
export const POST = route(async (request: NextRequest) => {
  await limit(`verify-upload:${clientIp(request)}`, VERIFY_UPLOAD_RATE_LIMIT, '1m', 'Too many checks from this network. Wait a minute and try again.');
  const form = await request.formData();
  const fileHash = hashBuffer(await readPdf(form.get('file')));
  const documentId = form.get('documentId');

  const document = typeof documentId === 'string' && documentId ? await findById(documentId) : await findByHash(fileHash);
  const outcome = document ? assess(document, fileHash) : 'NOT_FOUND';
  await record(request, document, outcome, 'UPLOAD');
  return ok({ ...present(document, outcome, 'UPLOAD'), checkedHash: fileHash });
});
