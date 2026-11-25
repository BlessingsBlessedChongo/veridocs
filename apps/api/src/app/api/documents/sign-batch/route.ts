import { NextRequest, NextResponse } from 'next/server';
import { strToU8, zipSync } from 'fflate';
import { signDocumentSchema } from '@veridocs/shared';
import { requireAuth, requireInstitutionRole, requireVerifiedEmail, SIGNERS } from '../../../../lib/auth/require-auth';
import { AppError, ValidationError } from '../../../../lib/errors';
import { limit, route } from '../../../../lib/http';
import { fileNameFor, readPdf, signingKey, signOne } from '../../../../lib/signing';
import { verificationUrl } from '../../../../lib/config';

export const maxDuration = 60;

const MAX_BATCH = 50;

/**
 * Sign many PDFs at once (e.g. a graduating class). multipart/form-data:
 *   institutionId
 *   files      one PDF per entry, up to 50
 *   documents  JSON array, one entry per file in the same order: { title, recipientName?, recipientEmail?, description?, expiresAt? }
 *
 * Answers with a ZIP: every signed PDF, plus manifest.csv listing each document's ID,
 * recipient, verification link and fingerprint (or why that one could not be signed).
 */
export const POST = route(async (request: NextRequest) => {
  const user = await requireAuth(request);
  requireVerifiedEmail(user);
  const form = await request.formData();
  const institutionId = form.get('institutionId');
  if (typeof institutionId !== 'string' || !institutionId) throw new ValidationError('institutionId is required');
  await requireInstitutionRole(user, institutionId, SIGNERS);

  const files = form.getAll('files');
  if (files.length === 0) throw new ValidationError('Attach at least one PDF');
  if (files.length > MAX_BATCH) throw new ValidationError(`A batch can hold at most ${MAX_BATCH} PDFs`);
  await limit(`sign-batch:${user.apiKey?.id ?? user.id}`, 10, '1h', 'You have signed several batches in the last hour. Try again later.');

  let entries: unknown;
  try {
    entries = JSON.parse(String(form.get('documents') ?? '[]'));
  } catch {
    throw new ValidationError('documents must be a JSON array');
  }
  if (!Array.isArray(entries) || entries.length !== files.length) throw new ValidationError('Give one documents entry for each file, in the same order');
  const metas = entries.map((entry, i) => {
    const parsed = signDocumentSchema.safeParse(entry);
    if (!parsed.success) throw new ValidationError(`Document ${i + 1}: ${parsed.error.issues[0].message}`);
    return parsed.data;
  });

  const key = await signingKey(institutionId);
  const batchId = crypto.randomUUID();
  const zip: Record<string, Uint8Array> = {};
  const rows: string[][] = [['file', 'status', 'document_id', 'title', 'recipient', 'verification_url', 'sha256', 'problem']];
  let signed = 0;

  // One at a time: RSA signing is quick, and this keeps memory steady for large batches.
  for (let i = 0; i < files.length; i++) {
    const original = files[i] instanceof File ? (files[i] as File).name : `file-${i + 1}.pdf`;
    try {
      const pdf = await readPdf(files[i], original);
      const { document, signedPdf } = await signOne({ pdf, meta: metas[i], signer: user, key, batchId });
      let name = fileNameFor(document.title, document.documentId);
      if (zip[name]) name = `${i + 1}-${name}`;
      zip[name] = new Uint8Array(signedPdf);
      rows.push([original, 'signed', document.documentId, document.title, document.recipientName ?? '', verificationUrl(document.documentId), document.fileHash, '']);
      signed++;
    } catch (error) {
      // One bad file doesn't spoil the batch; the manifest says what went wrong.
      const problem = error instanceof AppError ? error.message : 'Could not be signed';
      rows.push([original, 'failed', '', metas[i].title, metas[i].recipientName ?? '', '', '', problem]);
    }
  }
  if (signed === 0) throw new ValidationError(`None of the files could be signed: ${rows[1]?.[7] ?? 'unknown problem'}`);

  zip['manifest.csv'] = strToU8(rows.map((row) => row.map(csvCell).join(',')).join('\r\n'));
  const archive = zipSync(zip, { level: 0 }); // PDFs are already compressed
  return new NextResponse(archive, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="veridocs-batch-${batchId.slice(0, 8)}.zip"`,
      'X-Batch-Id': batchId,
      'X-Batch-Signed': String(signed),
      'X-Batch-Failed': String(files.length - signed),
      'Cache-Control': 'no-store',
    },
  });
});

function csvCell(value: string): string {
  // Quote everything; also stop spreadsheet formula injection.
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
