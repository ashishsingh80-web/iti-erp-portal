-- CreateTable
CREATE TABLE "UserSessionRevocation" (
    "userId" TEXT NOT NULL,
    "invalidBefore" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSessionRevocation_pkey" PRIMARY KEY ("userId")
);
