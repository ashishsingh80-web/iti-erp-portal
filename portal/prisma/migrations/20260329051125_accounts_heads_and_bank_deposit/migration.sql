-- AlterEnum
ALTER TYPE "AccountEntryType" ADD VALUE 'BANK_DEPOSIT';

-- AlterTable
ALTER TABLE "AccountEntry" ADD COLUMN     "head" TEXT,
ADD COLUMN     "partyName" TEXT,
ADD COLUMN     "subHead" TEXT;
