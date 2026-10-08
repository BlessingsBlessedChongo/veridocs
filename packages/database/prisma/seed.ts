import { PrismaClient, InstitutionRole, InstitutionVerificationStatus, KeyPairStatus, InstitutionMemberStatus } from '@prisma/client';
import { encryptPrivateKey, generateKeyPair } from '@veridocs/crypto';

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL },
  },
});

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'admin@unza.zm' },
    update: { emailVerified: true, fullName: 'VeriDocs Administrator' },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@unza.zm',
      emailVerified: true,
      fullName: 'VeriDocs Administrator',
    },
  });

  const institution = await prisma.institution.upsert({
    where: { emailDomain: 'unza.zm' },
    update: { name: 'University of Zambia', verificationStatus: InstitutionVerificationStatus.DOMAIN_VERIFIED },
    create: {
      name: 'University of Zambia',
      emailDomain: 'unza.zm',
      verificationStatus: InstitutionVerificationStatus.DOMAIN_VERIFIED,
      createdByUserId: user.id,
    },
  });

  await prisma.institutionMember.upsert({
    where: { userId_institutionId: { userId: user.id, institutionId: institution.id } },
    update: { role: InstitutionRole.ADMIN, status: InstitutionMemberStatus.ACTIVE },
    create: { userId: user.id, institutionId: institution.id, role: InstitutionRole.ADMIN, status: InstitutionMemberStatus.ACTIVE },
  });

  const masterKey = process.env.MASTER_ENCRYPTION_KEY;
  if (!masterKey) throw new Error('MASTER_ENCRYPTION_KEY is required to seed a key pair');

  const activeKey = await prisma.keyPair.findFirst({ where: { institutionId: institution.id, status: KeyPairStatus.ACTIVE } });
  if (!activeKey) {
    const { publicKey, privateKey } = generateKeyPair();
    await prisma.keyPair.create({
      data: {
        institutionId: institution.id,
        publicKey,
        encryptedPrivateKey: encryptPrivateKey(privateKey, masterKey),
        status: KeyPairStatus.ACTIVE,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());