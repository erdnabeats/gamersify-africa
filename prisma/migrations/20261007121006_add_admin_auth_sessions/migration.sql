-- AlterTable
ALTER TABLE "codm_admin_users" ADD COLUMN     "passwordHash" TEXT;

-- CreateTable
CREATE TABLE "codm_sessions" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "codm_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "codm_sessions_token_key" ON "codm_sessions"("token");

-- CreateIndex
CREATE INDEX "codm_sessions_userId_idx" ON "codm_sessions"("userId");

-- CreateIndex
CREATE INDEX "codm_sessions_expiresAt_idx" ON "codm_sessions"("expiresAt");
