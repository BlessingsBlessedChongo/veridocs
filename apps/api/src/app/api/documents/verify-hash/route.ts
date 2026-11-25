import { NextRequest } from 'next/server';
import { verifyHashSchema, VERIFY_UPLOAD_RATE_LIMIT } from '@veridocs/shared';
import { z } from 'zod';
import { clientIp, limit, ok, readJson, route } from '../../../../lib/http';
import { assess, findById, findByHash, present, record } from '../../../../lib/verify';

const body = verifyHashSchema.extend({ documentId: z.string().uuid().optional() });

/**
 * Public: check a document by its SHA-256 fingerprint, computed on the verifier's own device.
 * The PDF itself is never sent anywhere. JSON: { hash, documentId? }.
 */
export const POST = route(async (request: NextRequest) => {
  await limit(`verify-hash:${clientIp(request)}`, VERIFY_UPLOAD_RATE_LIMIT, '1m', 'Too many checks from this network. Wait a minute and try again.');
  const { hash, documentId } = await readJson(request, body);
  const document = documentId ? await findById(documentId) : await findByHash(hash);
  const outcome = document ? assess(document, hash) : 'NOT_FOUND';
  await record(request, document, outcome, 'HASH');
  return ok({ ...present(document, outcome, 'HASH'), checkedHash: hash });
});
