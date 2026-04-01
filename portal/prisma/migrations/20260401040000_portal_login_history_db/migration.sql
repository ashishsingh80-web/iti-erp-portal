-- CreateEnum
CREATE TYPE "PortalLoginHistoryEventType" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT');

-- CreateEnum
CREATE TYPE "PortalLoginLockType" AS ENUM ('AUTO', 'MANUAL');

-- CreateTable
CREATE TABLE "portal_login_history" (
    "id" TEXT NOT NULL,
    "eventType" "PortalLoginHistoryEventType" NOT NULL,
    "userId" TEXT NOT NULL DEFAULT '',
    "userName" TEXT NOT NULL DEFAULT '',
    "userEmail" TEXT NOT NULL DEFAULT '',
    "userRole" TEXT NOT NULL DEFAULT '',
    "ipAddress" TEXT NOT NULL DEFAULT '',
    "userAgent" TEXT NOT NULL DEFAULT '',
    "deviceLabel" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_login_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_login_lockouts" (
    "userEmail" TEXT NOT NULL,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lockType" "PortalLoginLockType",
    "reason" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portal_login_lockouts_pkey" PRIMARY KEY ("userEmail")
);

-- CreateIndex
CREATE INDEX "portal_login_history_userEmail_idx" ON "portal_login_history"("userEmail");

-- CreateIndex
CREATE INDEX "portal_login_history_userId_idx" ON "portal_login_history"("userId");

-- CreateIndex
CREATE INDEX "portal_login_history_createdAt_idx" ON "portal_login_history"("createdAt" DESC);
