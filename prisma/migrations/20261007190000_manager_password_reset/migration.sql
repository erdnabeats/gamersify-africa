ALTER TABLE "codm_admin_users"
ADD COLUMN IF NOT EXISTS "passwordResetTokenHash" TEXT,
ADD COLUMN IF NOT EXISTS "passwordResetExpiresAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "codm_admin_users_passwordResetExpiresAt_idx"
ON "codm_admin_users" ("passwordResetExpiresAt");
