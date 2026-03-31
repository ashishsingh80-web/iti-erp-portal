-- CreateEnum
CREATE TYPE "FeeCollectionMode" AS ENUM ('DIRECT', 'AGENT');

-- CreateEnum
CREATE TYPE "FeePayerType" AS ENUM ('STUDENT', 'AGENT');

-- CreateEnum
CREATE TYPE "FeeCollectionScope" AS ENUM ('STUDENT_WISE', 'BULK');

-- AlterTable
ALTER TABLE "FeeProfile" ADD COLUMN     "agentCommittedFee" DECIMAL(10,2),
ADD COLUMN     "collectionMode" "FeeCollectionMode" NOT NULL DEFAULT 'DIRECT',
ADD COLUMN     "conversionDate" TIMESTAMP(3),
ADD COLUMN     "conversionReason" TEXT,
ADD COLUMN     "convertedFromAgent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "instituteDecidedFee" DECIMAL(10,2),
ADD COLUMN     "lastReminderDate" TIMESTAMP(3),
ADD COLUMN     "reminderCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scholarshipApplied" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "FeeTransaction" ADD COLUMN     "agentId" TEXT,
ADD COLUMN     "allocationGroup" TEXT,
ADD COLUMN     "collectionScope" "FeeCollectionScope" NOT NULL DEFAULT 'STUDENT_WISE',
ADD COLUMN     "payerType" "FeePayerType" NOT NULL DEFAULT 'STUDENT';

-- AddForeignKey
ALTER TABLE "FeeTransaction" ADD CONSTRAINT "FeeTransaction_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
