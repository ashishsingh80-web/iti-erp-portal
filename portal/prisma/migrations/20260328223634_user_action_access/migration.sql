-- AlterTable
ALTER TABLE "User" ADD COLUMN     "allowedActionKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "hasCustomActionAccess" BOOLEAN NOT NULL DEFAULT false;
