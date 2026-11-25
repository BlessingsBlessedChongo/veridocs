/**
 * End-to-end check of the whole API against running servers and a real database.
 *
 *   npm run e2e --workspace=@veridocs/api      (with the API running on NEXT_PUBLIC_API_URL)
 *
 * It creates its own throwaway account and institution (on a random .test domain), walks every
 * main flow, and prints one line per check. Exits non-zero on the first failure.
 */
import { createHash, createHmac, randomUUID } from 'crypto';
import { createServer } from 'http';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { strFromU8, unzipSync } from 'fflate';
import { prisma } from '@veridocs/database';

const API = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');
const run = randomUUID().slice(0, 8);
const domain = `e2e-${run}.test`;
const email = `registrar@${domain}`;
const password = `Correct horse ${run} 9`;
let passed = 0;

function ok(condition: unknown, what: string): asserts condition {
  if (!condition) {
    console.error(`  ✗ ${what}`);
    throw new Error(`Failed: ${what}`);
  }
  passed++;
  console.log(`  ✓ ${what}`);
}

async function call(path: string, init: RequestInit & { token?: string; json?: unknown } = {}) {
  const headers = new Headers(init.headers);
  if (init.token) headers.set('Authorization', `Bearer ${init.token}`);
  if (init.json !== undefined) headers.set('Content-Type', 'application/json');
  const res = await fetch(`${API}${path}`, { ...init, headers, body: init.json !== undefined ? JSON.stringify(init.json) : init.body });
  const type = res.headers.get('content-type') || '';
  const body = type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the suite reads whatever JSON each route returns
  return { res, body: body as any };
}

async function samplePdf(text: string) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  page.drawText(text, { x: 60, y: 760, size: 18, font: await pdf.embedFont(StandardFonts.Helvetica) });
  return new Blob([await pdf.save()], { type: 'application/pdf' });
}

const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

async function main() {
  console.log(`VeriDocs end-to-end check against ${API} (run ${run})\n`);

  console.log('Health');
  const health = await call('/api/health');
  ok(health.res.status === 200 && health.body.status === 'healthy', `API is healthy (${JSON.stringify(health.body.services)})`);

  console.log('\nAccounts');
  const weak = await call('/api/auth/signup', { method: 'POST', json: { email, password: 'short', fullName: 'Test Registrar' } });
  ok(weak.res.status === 400, 'a weak password is refused');
  const signup = await call('/api/auth/signup', { method: 'POST', json: { email, password, fullName: 'Test Registrar' } });
  ok(signup.res.status === 201 && signup.body.data.token.startsWith('vds_'), 'sign-up returns a session');
  let token: string = signup.body.data.token;
  const again = await call('/api/auth/signup', { method: 'POST', json: { email, password, fullName: 'Someone Else' } });
  ok(again.res.status === 409, 'the same email cannot sign up twice');
  const wrong = await call('/api/auth/login', { method: 'POST', json: { email, password: 'Wrong password 1' } });
  ok(wrong.res.status === 401, 'a wrong password is refused');
  const login = await call('/api/auth/login', { method: 'POST', json: { email, password } });
  ok(login.res.status === 200, 'sign-in works');
  token = login.body.data.token;

  const early = await call('/api/institutions/register', { method: 'POST', token, json: { name: 'E2E University', emailDomain: domain } });
  ok(early.res.status === 403, 'an unconfirmed email cannot create an institution');

  // Click the emailed link: put a known one-time token in place, then use it twice.
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const linkSecret = `e2e-link-${run}-xxxxxxxxxxxx`;
  await prisma.authToken.updateMany({ where: { userId: user.id, type: 'EMAIL_VERIFY', usedAt: null }, data: { usedAt: new Date() } });
  await prisma.authToken.create({ data: { userId: user.id, type: 'EMAIL_VERIFY', tokenHash: createHash('sha256').update(linkSecret).digest('hex'), expiresAt: new Date(Date.now() + 3600_000) } });
  const verified = await call('/api/auth/verify-email', { method: 'POST', json: { token: linkSecret } });
  ok(verified.res.status === 200 && verified.body.data.user.emailVerified, 'the email link confirms the address');
  const reused = await call('/api/auth/verify-email', { method: 'POST', json: { token: linkSecret } });
  ok(reused.res.status === 400, 'an email link works only once');

  const me = await call('/api/me', { token });
  ok(me.res.status === 200 && me.body.data.user.email === email && me.body.data.institutions.length === 0, '/api/me shows the person and no institutions yet');

  console.log('\nInstitution');
  const reg = await call('/api/institutions/register', { method: 'POST', token, json: { name: 'E2E University', emailDomain: domain } });
  ok(reg.res.status === 201 && reg.body.data.verificationStatus === 'DOMAIN_VERIFIED', 'an institution on your own email domain is verified at once');
  const institutionId: string = reg.body.data.id;
  const dup = await call('/api/institutions/register', { method: 'POST', token, json: { name: 'Copycat', emailDomain: domain } });
  ok(dup.res.status === 409, 'a domain can be registered only once');
  const detail = await call(`/api/institutions/${institutionId}`, { token });
  ok(detail.body.data.role === 'ADMIN' && /^([0-9A-F]{2}:){15}[0-9A-F]{2}$/.test(detail.body.data.activeKey.fingerprint), 'the creator is administrator and the key has a fingerprint');

  console.log('\nSigning');
  const form = new FormData();
  form.append('file', await samplePdf(`Certificate for Chanda Mwale (${run})`), 'certificate.pdf');
  form.append('institutionId', institutionId);
  form.append('metadata', JSON.stringify({ title: 'Bachelor of Science', recipientName: 'Chanda Mwale', recipientEmail: 'chanda@example.com' }));
  const signed = await call('/api/documents/sign', { method: 'POST', token, body: form });
  ok(signed.res.status === 200 && signed.res.headers.get('content-type') === 'application/pdf', 'signing returns a PDF');
  const documentId = signed.res.headers.get('X-Document-Id')!;
  const signedPdf: Buffer = signed.body;
  ok(/^[0-9a-f-]{36}$/.test(documentId) && signedPdf.subarray(0, 5).toString() === '%PDF-', 'the signed PDF comes with its document ID');

  const notPdf = new FormData();
  notPdf.append('file', new Blob(['hello'], { type: 'application/pdf' }), 'fake.pdf');
  notPdf.append('institutionId', institutionId);
  notPdf.append('metadata', JSON.stringify({ title: 'Fake' }));
  ok((await call('/api/documents/sign', { method: 'POST', token, body: notPdf })).res.status === 400, 'a file that is not really a PDF is refused');

  const broken = new FormData();
  broken.append('file', new Blob(['%PDF-1.7 then nothing useful'], { type: 'application/pdf' }), 'broken.pdf');
  broken.append('institutionId', institutionId);
  broken.append('metadata', JSON.stringify({ title: 'Broken' }));
  const brokenReply = await call('/api/documents/sign', { method: 'POST', token, body: broken });
  ok(brokenReply.res.status === 400 && /could not be read/.test(brokenReply.body.error.message), 'a damaged PDF gets a clear 400, not a server error');

  const twice = new FormData();
  twice.append('file', new Blob([signedPdf], { type: 'application/pdf' }), 'signed.pdf');
  twice.append('institutionId', institutionId);
  twice.append('metadata', JSON.stringify({ title: 'Again' }));
  const twiceReply = await call('/api/documents/sign', { method: 'POST', token, body: twice });
  ok(twiceReply.res.status === 400 && /already been signed/.test(twiceReply.body.error.message), 'an already-signed PDF is not signed again (no stacked stamps)');

  console.log('\nVerification');
  const byId = await call(`/api/documents/verify/${documentId}`);
  ok(byId.body.data.outcome === 'VALID' && byId.body.data.recipientName === 'Chanda Mwale', 'checking by ID (the QR code) says genuine, with the recipient');
  ok(byId.body.data.fileHash === sha256(signedPdf), 'the published fingerprint is the SHA-256 of the signed file');
  const byHash = await call('/api/documents/verify-hash', { method: 'POST', json: { hash: sha256(signedPdf) } });
  ok(byHash.body.data.outcome === 'VALID' && byHash.body.data.documentId === documentId, 'checking by fingerprint finds it without sending the file');
  const upload = new FormData();
  upload.append('file', new Blob([signedPdf], { type: 'application/pdf' }), 'copy.pdf');
  ok((await call('/api/documents/verify-upload', { method: 'POST', body: upload })).body.data.outcome === 'VALID', 'uploading the signed file says genuine');

  const tampered = Buffer.from(signedPdf);
  tampered[Math.floor(tampered.length / 2)] ^= 1;
  const altered = await call('/api/documents/verify-hash', { method: 'POST', json: { hash: sha256(tampered), documentId } });
  ok(altered.body.data.outcome === 'ALTERED', 'a copy changed by one byte is reported as altered');
  const unknown = await call('/api/documents/verify-hash', { method: 'POST', json: { hash: sha256(tampered) } });
  ok(unknown.body.data.outcome === 'NOT_FOUND' && !unknown.body.data.title, 'an unknown file is "not found", revealing nothing');
  ok((await call(`/api/documents/verify/${randomUUID()}`)).body.data.outcome === 'NOT_FOUND', 'an unknown ID is "not found"');

  console.log('\nBatch signing');
  const batch = new FormData();
  batch.append('institutionId', institutionId);
  batch.append('files', await samplePdf('Graduate one'), 'one.pdf');
  batch.append('files', await samplePdf('Graduate two'), 'two.pdf');
  batch.append('files', new Blob(['not a pdf'], { type: 'application/pdf' }), 'broken.pdf');
  batch.append('documents', JSON.stringify([{ title: 'Diploma', recipientName: 'Graduate One' }, { title: 'Diploma', recipientName: 'Graduate Two' }, { title: 'Diploma', recipientName: 'Broken' }]));
  const zipped = await call('/api/documents/sign-batch', { method: 'POST', token, body: batch });
  ok(zipped.res.status === 200 && zipped.res.headers.get('X-Batch-Signed') === '2' && zipped.res.headers.get('X-Batch-Failed') === '1', 'a batch signs the good files and reports the bad one');
  const files = unzipSync(new Uint8Array(zipped.body));
  const manifest = strFromU8(files['manifest.csv']);
  ok(Object.keys(files).filter((f) => f.endsWith('.pdf')).length === 2 && manifest.includes('"failed"') && manifest.includes('Graduate Two'), 'the ZIP holds both PDFs and a manifest explaining the failure');

  console.log('\nAPI keys and webhooks');
  const received: Array<{ event: string; signature: string; body: string }> = [];
  const hook = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      received.push({ event: String(req.headers['x-veridocs-event']), signature: String(req.headers['x-veridocs-signature']), body });
      res.writeHead(200).end('ok');
    });
  });
  await new Promise<void>((r) => hook.listen(0, '127.0.0.1', r));
  const port = (hook.address() as { port: number }).port;
  const wh = await call(`/api/institutions/${institutionId}/webhooks`, { method: 'POST', token, json: { url: `http://127.0.0.1:${port}/hook`, events: ['document.signed', 'document.revoked'] } });
  ok(wh.res.status === 201 && wh.body.data.secret.startsWith('whsec_'), 'a webhook is created and its secret shown once');
  const webhookSecret: string = wh.body.data.secret;

  const key = await call(`/api/institutions/${institutionId}/api-keys`, { method: 'POST', token, json: { name: 'Student records system', role: 'ISSUER' } });
  ok(key.res.status === 201 && key.body.data.secret.startsWith('vd_live_'), 'an API key is created and shown once');
  const apiKey: string = key.body.data.secret;
  const viaKey = new FormData();
  viaKey.append('file', await samplePdf('Signed by a machine'), 'machine.pdf');
  viaKey.append('institutionId', institutionId);
  viaKey.append('metadata', JSON.stringify({ title: 'Transcript', recipientName: 'Automated' }));
  const keySigned = await call('/api/documents/sign', { method: 'POST', token: apiKey, body: viaKey });
  ok(keySigned.res.status === 200, 'another system can sign with the API key');
  ok((await call('/api/me', { token: apiKey })).res.status === 403, 'an API key cannot act as a person');
  ok((await call(`/api/institutions/${institutionId}/members`, { token: apiKey })).res.status === 403, 'an API key cannot manage members');

  await new Promise((r) => setTimeout(r, 1500));
  // A production API refuses private addresses (no SSRF) unless WEBHOOK_ALLOW_PRIVATE_NETWORKS=true.
  const hooks = await call(`/api/institutions/${institutionId}/webhooks`, { token });
  const firstDelivery = hooks.body.data[0]?.deliveries?.at(-1);
  const privateRefused = !received.length && /private network|https/.test(firstDelivery?.error ?? '');
  if (privateRefused) {
    ok(true, `production refuses webhooks to private addresses, and records why ("${firstDelivery.error}"); delivery checks skipped`);
  } else {
    const signedEvent = received.find((r) => r.event === 'document.signed');
    ok(signedEvent, 'the webhook heard about the signing');
    const [, t, v1] = /t=(\d+),v1=([0-9a-f]+)/.exec(signedEvent!.signature) ?? [];
    ok(createHmac('sha256', webhookSecret).update(`${t}.${signedEvent!.body}`).digest('hex') === v1, 'the webhook delivery is signed with the secret');
  }

  await call(`/api/api-keys/${key.body.data.id}`, { method: 'DELETE', token });
  ok((await call('/api/documents/sign', { method: 'POST', token: apiKey, body: viaKey })).res.status === 401, 'a revoked API key stops working at once');

  console.log('\nRevocation and the public registry');
  ok((await call(`/api/documents/${documentId}/revoke`, { method: 'POST', token, json: { reason: 'Issued in error' } })).res.status === 200, 'the document is revoked');
  const afterRevoke = await call(`/api/documents/verify/${documentId}`);
  ok(afterRevoke.body.data.outcome === 'REVOKED' && afterRevoke.body.data.revocationReason === 'Issued in error', 'checks now say revoked, with the reason');
  await new Promise((r) => setTimeout(r, 1000));
  if (!privateRefused) ok(received.some((r) => r.event === 'document.revoked'), 'the webhook heard about the revocation');
  hook.close();

  const registry = await call(`/api/public/institutions/${institutionId}`);
  ok(registry.body.data.revoked.some((d: { documentId: string }) => d.documentId === documentId) && registry.body.data.revokedSignature, 'the public registry lists the revocation, signed');

  console.log('\nMembers, records and analytics');
  const invite = await call(`/api/institutions/${institutionId}/members/invite`, { method: 'POST', token, json: { email: `auditor@${domain}`, role: 'AUDITOR' } });
  ok(invite.res.status === 201 && invite.body.data.status === 'PENDING', 'someone without an account can be invited');
  const members = await call(`/api/institutions/${institutionId}/members`, { token });
  ok(members.body.data.length === 2, 'the members list shows the admin and the invitation');
  const lastAdmin = await call(`/api/institutions/${institutionId}/members/${user.id}`, { method: 'PATCH', token, json: { role: 'VIEWER' } });
  ok(lastAdmin.res.status === 409, 'the last administrator cannot be demoted');

  const list = await call(`/api/institutions/${institutionId}/documents?search=Chanda`, { token });
  ok(list.body.data.total === 1 && list.body.data.items[0].status === 'REVOKED', 'documents can be searched by recipient');
  const csv = await call(`/api/institutions/${institutionId}/documents/export`, { token });
  ok(csv.res.headers.get('content-type')?.startsWith('text/csv') && String(csv.body).includes('Chanda Mwale'), 'the documents export as CSV');
  const stats = await call(`/api/institutions/${institutionId}/stats`, { token });
  ok(stats.body.data.documents.total === 4 && stats.body.data.verifications.last30Days >= 5, 'the overview counts documents and checks');
  const audit = await call(`/api/institutions/${institutionId}/audit-logs`, { token });
  const actions = audit.body.data.items.map((a: { action: string }) => a.action);
  ok(['DOCUMENT_SIGNED', 'DOCUMENT_REVOKED', 'API_KEY_CREATED', 'MEMBER_INVITED', 'WEBHOOK_CREATED'].every((a) => actions.includes(a)), 'the audit trail recorded every action');

  console.log('\nSessions');
  ok((await call('/api/auth/logout', { method: 'POST', token })).res.status === 200, 'signing out works');
  ok((await call('/api/me', { token })).res.status === 401, 'a signed-out session no longer works');

  console.log(`\nAll ${passed} checks passed.`);
}

main()
  .catch((error) => {
    console.error(`\n${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
