-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StudentDocument" ADD COLUMN     "deletedAt" TIMESTAMP(3);
