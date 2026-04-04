-- CreateTable
CREATE TABLE "NumberingConfigStore" (
    "id" TEXT NOT NULL,
    "configJson" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NumberingConfigStore_pkey" PRIMARY KEY ("id")
);
