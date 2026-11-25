/**
 * Demo data for local development:
 *   - admin@unza.zm (confirmed email), administrator of the University of Zambia
 *   - the university's encrypted signing key
 *   - three signed sample certificates (valid, revoked, expired), saved to demo-documents/
 *
 * The admin's password comes from SEED_ADMIN_PASSWORD, or is generated and printed once.
 * Run with: npm run db:seed
 */
import { randomBytes, randomUUID, scryptSync } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PrismaClient, InstitutionRole, InstitutionVerificationStatus, KeyPairStatus, InstitutionMemberStatus } from '@prisma/client';
import { decryptPrivateKey, encryptPrivateKey, generateKeyPair, signDocument } from '@veridocs/crypto';

const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } } });

/** Same format as the API's password hashing (apps/api/src/lib/auth/password.ts). */
function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password.normalize('NFKC'), salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return ['scrypt', 16384, 8, 1, salt.toString('base64'), hash.toString('base64')].join('$');
}

async function certificatePdf(name: string, degree: string) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]); // A4 landscape
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const centre = (text: string, y: number, size: number, font = serif, color = rgb(0.1, 0.1, 0.2)) =>
    page.drawText(text, { x: (842 - font.widthOfTextAtSize(text, size)) / 2, y, size, font, color });
  page.drawRectangle({ x: 24, y: 24, width: 794, height: 547, borderColor: rgb(0.55, 0.45, 0.2), borderWidth: 3 });
  centre('THE UNIVERSITY OF ZAMBIA', 480, 26, bold, rgb(0.2, 0.18, 0.45));
  centre('This is to certify that', 410, 16);
  centre(name, 360, 34, bold);
  centre('has been admitted to the degree of', 315, 16);
  centre(degree, 270, 24, bold);
  centre('Given at Lusaka', 200, 14);
  page.drawLine({ start: { x: 120, y: 120 }, end: { x: 300, y: 120 }, thickness: 1, color: rgb(0.3, 0.3, 0.3) });
  page.drawText('Registrar', { x: 180, y: 102, size: 12, font: serif });
  return Buffer.from(await pdf.save());
}

async function main() {
  const masterKey = process.env.MASTER_ENCRYPTION_KEY;
  if (!masterKey) throw new Error('MASTER_ENCRYPTION_KEY is required to seed a signing key');
  const generated = !process.env.SEED_ADMIN_PASSWORD;
  const password = process.env.SEED_ADMIN_PASSWORD || `Demo-${randomBytes(6).toString('base64url')}-1`;

  const user = await prisma.user.upsert({
    where: { email: 'admin@unza.zm' },
    update: { emailVerified: true, fullName: 'VeriDocs Administrator', passwordHash: hashPassword(password) },
    create: { email: 'admin@unza.zm', emailVerified: true, fullName: 'VeriDocs Administrator', passwordHash: hashPassword(password) },
  });

  const institution = await prisma.institution.upsert({
    where: { emailDomain: 'unza.zm' },
    update: { name: 'University of Zambia', verificationStatus: InstitutionVerificationStatus.DOMAIN_VERIFIED },
    create: { name: 'University of Zambia', emailDomain: 'unza.zm', verificationStatus: InstitutionVerificationStatus.DOMAIN_VERIFIED, createdByUserId: user.id },
  });

  await prisma.institutionMember.upsert({
    where: { userId_institutionId: { userId: user.id, institutionId: institution.id } },
    update: { role: InstitutionRole.ADMIN, status: InstitutionMemberStatus.ACTIVE },
    create: { userId: user.id, institutionId: institution.id, role: InstitutionRole.ADMIN, status: InstitutionMemberStatus.ACTIVE },
  });

  if ((await prisma.auditLog.count({ where: { institutionId: institution.id } })) === 0) {
    await prisma.auditLog.create({ data: { action: 'INSTITUTION_REGISTERED', entityType: 'Institution', entityId: institution.id, actorUserId: user.id, institutionId: institution.id, metadata: { name: institution.name, emailDomain: institution.emailDomain } } });
  }

  let key = await prisma.keyPair.findFirst({ where: { institutionId: institution.id, status: KeyPairStatus.ACTIVE } });
  if (!key) {
    const { publicKey, privateKey } = generateKeyPair();
    key = await prisma.keyPair.create({ data: { institutionId: institution.id, publicKey, encryptedPrivateKey: encryptPrivateKey(privateKey, masterKey), status: KeyPairStatus.ACTIVE } });
  }

  // Sample documents, only once.
  const existing = await prisma.document.count({ where: { institutionId: institution.id } });
  const saved: string[] = [];
  if (existing === 0) {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const privateKeyPem = decryptPrivateKey(key.encryptedPrivateKey, masterKey);
    const outDir = join(__dirname, '..', '..', '..', 'demo-documents');
    mkdirSync(outDir, { recursive: true });
    const samples = [
      { name: 'Chanda Mwale', degree: 'Bachelor of Science in Computer Science', state: 'valid' },
      { name: 'Mutale Banda', degree: 'Bachelor of Laws', state: 'revoked' },
      { name: 'Natasha Phiri', degree: 'Diploma in Nursing', state: 'expired' },
    ] as const;
    for (const s of samples) {
      const documentId = randomUUID();
      const signed = await signDocument({ pdfBuffer: await certificatePdf(s.name, s.degree), documentId, verificationUrl: `${appUrl}/verify/${documentId}`, issuerName: institution.name, privateKeyPem });
      await prisma.document.create({
        data: {
          documentId,
          title: s.degree,
          recipientName: s.name,
          description: 'Sample certificate created by the seed script',
          fileHash: signed.fileHash,
          signature: signed.signature,
          qrCodeUrl: signed.qrCodeDataUrl,
          institutionId: institution.id,
          signedByUserId: user.id,
          keyPairId: key.id,
          ...(s.state === 'revoked' ? { status: 'REVOKED', revokedAt: new Date(), revocationReason: 'Issued in error; replaced by a corrected certificate' } : {}),
          ...(s.state === 'expired' ? { issuedAt: new Date(Date.now() - 400 * 86400_000), expiresAt: new Date(Date.now() - 30 * 86400_000) } : {}),
        },
      });
      const created = await prisma.document.findUniqueOrThrow({ where: { documentId } });
      await prisma.auditLog.create({ data: { action: 'DOCUMENT_SIGNED', entityType: 'Document', entityId: created.id, actorUserId: user.id, institutionId: institution.id, documentId: created.id, metadata: { title: s.degree, fileHash: signed.fileHash } } });
      if (s.state === 'revoked') {
        await prisma.auditLog.create({ data: { action: 'DOCUMENT_REVOKED', entityType: 'Document', entityId: created.id, actorUserId: user.id, institutionId: institution.id, documentId: created.id, metadata: { title: s.degree, reason: 'Issued in error; replaced by a corrected certificate' } } });
      }
      const file = join(outDir, `${s.state}-${s.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      writeFileSync(file, signed.signedPdf);
      saved.push(file);
    }
  }

  console.log('\nSeeded the University of Zambia.');
  console.log(`  Sign in as admin@unza.zm with ${generated ? `this generated password: ${password}` : 'SEED_ADMIN_PASSWORD'}`);
  if (saved.length) console.log(`  Sample signed PDFs (valid, revoked, expired):\n    ${saved.join('\n    ')}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
