-- AlterTable
ALTER TABLE "User" ADD COLUMN     "allowedModuleSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "hasCustomModuleAccess" BOOLEAN NOT NULL DEFAULT false;
