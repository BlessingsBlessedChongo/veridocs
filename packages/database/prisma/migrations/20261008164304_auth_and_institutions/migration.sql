/*
  Warnings:

  - The primary key for the `AuditLog` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `issuerId` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `performedBy` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `issuerId` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the `Issuer` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `actorUserId` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `institutionId` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `AuditLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `institutionId` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `keyPairId` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `signedByUserId` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "InstitutionVerificationStatus" AS ENUM ('PENDING', 'DOMAIN_VERIFIED', 'MANUALLY_VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InstitutionRole" AS ENUM ('ADMIN', 'ISSUER', 'AUDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "InstitutionMemberStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "KeyPairStatus" AS ENUM ('ACTIVE', 'ROTATED', 'REVOKED', 'COMPROMISED');

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_issuerId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_issuerId_fkey";

-- DropIndex
DROP INDEX "Document_issuerId_idx";

-- AlterTable
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_pkey",
DROP COLUMN "issuerId",
DROP COLUMN "performedBy",
ADD COLUMN     "actorUserId" UUID NOT NULL,
ADD COLUMN     "institutionId" UUID NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "issuerId",
ADD COLUMN     "institutionId" UUID NOT NULL,
ADD COLUMN     "keyPairId" UUID NOT NULL,
ADD COLUMN     "signedByUserId" UUID NOT NULL;

-- DropTable
DROP TABLE "Issuer";

-- DropEnum
DROP TYPE "IssuerStatus";

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "fullName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "emailDomain" TEXT NOT NULL,
    "verificationStatus" "InstitutionVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionMember" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "role" "InstitutionRole" NOT NULL,
    "invitedByUserId" UUID,
    "status" "InstitutionMemberStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstitutionMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeyPair" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "publicKey" TEXT NOT NULL,
    "encryptedPrivateKey" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'RSA-2048',
    "status" "KeyPairStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotatedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "KeyPair_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_emailDomain_key" ON "Institution"("emailDomain");

-- CreateIndex
CREATE INDEX "Institution_createdByUserId_idx" ON "Institution"("createdByUserId");

-- CreateIndex
CREATE INDEX "Institution_emailDomain_idx" ON "Institution"("emailDomain");

-- CreateIndex
CREATE INDEX "InstitutionMember_userId_idx" ON "InstitutionMember"("userId");

-- CreateIndex
CREATE INDEX "InstitutionMember_institutionId_idx" ON "InstitutionMember"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionMember_userId_institutionId_key" ON "InstitutionMember"("userId", "institutionId");

-- CreateIndex
CREATE INDEX "KeyPair_institutionId_idx" ON "KeyPair"("institutionId");

-- CreateIndex
CREATE INDEX "KeyPair_status_idx" ON "KeyPair"("status");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditLog_institutionId_idx" ON "AuditLog"("institutionId");

-- CreateIndex
CREATE INDEX "Document_institutionId_idx" ON "Document"("institutionId");

-- CreateIndex
CREATE INDEX "Document_signedByUserId_idx" ON "Document"("signedByUserId");

-- CreateIndex
CREATE INDEX "Document_keyPairId_idx" ON "Document"("keyPairId");

-- AddForeignKey
ALTER TABLE "Institution" ADD CONSTRAINT "Institution_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionMember" ADD CONSTRAINT "InstitutionMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionMember" ADD CONSTRAINT "InstitutionMember_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionMember" ADD CONSTRAINT "InstitutionMember_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeyPair" ADD CONSTRAINT "KeyPair_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_signedByUserId_fkey" FOREIGN KEY ("signedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_keyPairId_fkey" FOREIGN KEY ("keyPairId") REFERENCES "KeyPair"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
