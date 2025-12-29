/*
  Warnings:

  - Added the required column `purpose` to the `OtpCode` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('REGISTER', 'LOGIN');

-- DropIndex
DROP INDEX "OtpCode_phone_idx";

-- AlterTable
ALTER TABLE "OtpCode" ADD COLUMN     "pendingFullName" TEXT,
ADD COLUMN     "purpose" "OtpPurpose" NOT NULL;

-- CreateIndex
CREATE INDEX "OtpCode_phone_purpose_idx" ON "OtpCode"("phone", "purpose");
