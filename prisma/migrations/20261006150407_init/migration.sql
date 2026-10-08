-- CreateTable
CREATE TABLE "codm_settings" (
    "id" TEXT NOT NULL,
    "tiers" JSONB NOT NULL,
    "multipliers" JSONB NOT NULL,
    "points" JSONB NOT NULL,
    "calculationVersion" INTEGER NOT NULL DEFAULT 1,
    "rankingTieBreakers" JSONB NOT NULL,
    "maxPlayers" INTEGER NOT NULL DEFAULT 5,
    "roster" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "codm_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codm_tiers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "maxTeams" INTEGER NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "codm_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codm_teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "tierName" TEXT NOT NULL,
    "logoPath" TEXT,
    "logoUrl" TEXT,
    "region" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "socialLinks" JSONB,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "verificationStatus" TEXT NOT NULL DEFAULT 'unverified',
    "verificationReason" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "codm_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codm_players" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamId" TEXT,
    "teamName" TEXT,
    "inGameName" TEXT NOT NULL,
    "realName" TEXT,
    "role" TEXT NOT NULL,
    "country" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "photoPath" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'unverified',
    "verificationReason" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "codm_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codm_seasons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "codm_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codm_tournaments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "bracketSize" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Lagos',
    "registrationDeadline" TIMESTAMP(3),
    "checkInWindow" TEXT,
    "maxTeams" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "rules" TEXT,
    "prizePool" TEXT,
    "mapsModes" TEXT,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "seeding" TEXT NOT NULL DEFAULT 'random',
    "participants" TEXT[],
    "seasonId" TEXT,
    "pointsFinalized" BOOLEAN NOT NULL DEFAULT false,
    "bracketGeneratedAt" TIMESTAMP(3),
    "bracketVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "codm_tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codm_tournament_registrations" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'registered',
    "checkedIn" BOOLEAN NOT NULL DEFAULT false,
    "checkedInAt" TIMESTAMP(3),
    "seed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "codm_tournament_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codm_matches" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "bracket" TEXT NOT NULL DEFAULT 'winners',
    "round" INTEGER NOT NULL,
    "roundName" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "matchNumber" TEXT NOT NULL,
    "matchKey" TEXT,
    "teamAId" TEXT,
    "teamBId" TEXT,
    "teamAName" TEXT,
    "teamBName" TEXT,
    "scoreA" INTEGER NOT NULL DEFAULT 0,
    "scoreB" INTEGER NOT NULL DEFAULT 0,
    "winnerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "bestOf" INTEGER NOT NULL DEFAULT 3,
    "lobbyId" TEXT,
    "lobbyPassword" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "evidenceUrl" TEXT,
    "evidenceAddedAt" TIMESTAMP(3),
    "evidenceAddedBy" TEXT,
    "refereeId" TEXT,
    "winnerTargetKey" TEXT,
    "winnerTargetSlot" INTEGER,
    "loserTargetKey" TEXT,
    "loserTargetSlot" INTEGER,
    "sourceType" TEXT,
    "sourceRound" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "codm_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codm_point_events" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "placement" TEXT NOT NULL,
    "basePoints" DOUBLE PRECISION NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL,
    "points" DOUBLE PRECISION NOT NULL,
    "seasonId" TEXT,
    "calculationVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "codm_point_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codm_point_ledger" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "placement" TEXT NOT NULL,
    "basePoints" DOUBLE PRECISION NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL,
    "points" DOUBLE PRECISION NOT NULL,
    "seasonId" TEXT,
    "calculationVersion" INTEGER NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversedAt" TIMESTAMP(3),
    "reversalReason" TEXT,

    CONSTRAINT "codm_point_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codm_admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL,
    "teamId" TEXT,
    "requestedTeamName" TEXT,
    "status" TEXT,
    "message" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "scope" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "codm_admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codm_audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "reason" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "codm_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codm_backup_manifests" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "tableCounts" JSONB,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "codm_backup_manifests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codm_transfer_news" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "author" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "codm_transfer_news_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codm_referees" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "scope" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "codm_referees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codm_referee_assignments" (
    "id" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'referee',
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "codm_referee_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codm_disputes" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "raisedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidenceUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolution" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "codm_disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codm_sanctions" (
    "id" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "subjectName" TEXT,
    "teamId" TEXT,
    "teamName" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "reason" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "codm_sanctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codm_sponsors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'Partner',
    "logoUrl" TEXT,
    "website" TEXT,
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "codm_sponsors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codm_prize_payouts" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "tournamentName" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "placement" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "method" TEXT NOT NULL DEFAULT 'bank_transfer',
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "codm_prize_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codm_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "codm_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "codm_tiers_slug_key" ON "codm_tiers"("slug");

-- CreateIndex
CREATE INDEX "codm_tiers_active_idx" ON "codm_tiers"("active");

-- CreateIndex
CREATE UNIQUE INDEX "codm_teams_slug_key" ON "codm_teams"("slug");

-- CreateIndex
CREATE INDEX "codm_teams_tierId_idx" ON "codm_teams"("tierId");

-- CreateIndex
CREATE INDEX "codm_teams_region_idx" ON "codm_teams"("region");

-- CreateIndex
CREATE INDEX "codm_teams_status_idx" ON "codm_teams"("status");

-- CreateIndex
CREATE INDEX "codm_teams_deletedAt_idx" ON "codm_teams"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "codm_players_playerId_key" ON "codm_players"("playerId");

-- CreateIndex
CREATE INDEX "codm_players_teamId_idx" ON "codm_players"("teamId");

-- CreateIndex
CREATE INDEX "codm_players_inGameName_idx" ON "codm_players"("inGameName");

-- CreateIndex
CREATE INDEX "codm_players_status_idx" ON "codm_players"("status");

-- CreateIndex
CREATE INDEX "codm_seasons_status_idx" ON "codm_seasons"("status");

-- CreateIndex
CREATE INDEX "codm_tournaments_seasonId_idx" ON "codm_tournaments"("seasonId");

-- CreateIndex
CREATE INDEX "codm_tournaments_status_idx" ON "codm_tournaments"("status");

-- CreateIndex
CREATE INDEX "codm_tournaments_type_idx" ON "codm_tournaments"("type");

-- CreateIndex
CREATE INDEX "codm_tournaments_date_idx" ON "codm_tournaments"("date");

-- CreateIndex
CREATE INDEX "codm_tournament_registrations_teamId_idx" ON "codm_tournament_registrations"("teamId");

-- CreateIndex
CREATE INDEX "codm_tournament_registrations_status_idx" ON "codm_tournament_registrations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "codm_tournament_registrations_tournamentId_teamId_key" ON "codm_tournament_registrations"("tournamentId", "teamId");

-- CreateIndex
CREATE INDEX "codm_matches_tournamentId_idx" ON "codm_matches"("tournamentId");

-- CreateIndex
CREATE INDEX "codm_matches_teamAId_idx" ON "codm_matches"("teamAId");

-- CreateIndex
CREATE INDEX "codm_matches_teamBId_idx" ON "codm_matches"("teamBId");

-- CreateIndex
CREATE INDEX "codm_matches_winnerId_idx" ON "codm_matches"("winnerId");

-- CreateIndex
CREATE INDEX "codm_matches_status_idx" ON "codm_matches"("status");

-- CreateIndex
CREATE INDEX "codm_matches_matchKey_idx" ON "codm_matches"("matchKey");

-- CreateIndex
CREATE INDEX "codm_point_events_tournamentId_idx" ON "codm_point_events"("tournamentId");

-- CreateIndex
CREATE INDEX "codm_point_events_teamId_idx" ON "codm_point_events"("teamId");

-- CreateIndex
CREATE INDEX "codm_point_events_seasonId_idx" ON "codm_point_events"("seasonId");

-- CreateIndex
CREATE INDEX "codm_point_ledger_tournamentId_idx" ON "codm_point_ledger"("tournamentId");

-- CreateIndex
CREATE INDEX "codm_point_ledger_teamId_idx" ON "codm_point_ledger"("teamId");

-- CreateIndex
CREATE INDEX "codm_point_ledger_seasonId_idx" ON "codm_point_ledger"("seasonId");

-- CreateIndex
CREATE INDEX "codm_point_ledger_reversedAt_idx" ON "codm_point_ledger"("reversedAt");

-- CreateIndex
CREATE UNIQUE INDEX "codm_admin_users_email_key" ON "codm_admin_users"("email");

-- CreateIndex
CREATE INDEX "codm_admin_users_role_idx" ON "codm_admin_users"("role");

-- CreateIndex
CREATE INDEX "codm_admin_users_teamId_idx" ON "codm_admin_users"("teamId");

-- CreateIndex
CREATE INDEX "codm_admin_users_active_idx" ON "codm_admin_users"("active");

-- CreateIndex
CREATE INDEX "codm_audit_logs_entity_idx" ON "codm_audit_logs"("entity");

-- CreateIndex
CREATE INDEX "codm_audit_logs_entityId_idx" ON "codm_audit_logs"("entityId");

-- CreateIndex
CREATE INDEX "codm_audit_logs_adminId_idx" ON "codm_audit_logs"("adminId");

-- CreateIndex
CREATE INDEX "codm_audit_logs_timestamp_idx" ON "codm_audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "codm_backup_manifests_createdAt_idx" ON "codm_backup_manifests"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "codm_transfer_news_slug_key" ON "codm_transfer_news"("slug");

-- CreateIndex
CREATE INDEX "codm_transfer_news_status_idx" ON "codm_transfer_news"("status");

-- CreateIndex
CREATE INDEX "codm_transfer_news_publishedAt_idx" ON "codm_transfer_news"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "codm_referees_email_key" ON "codm_referees"("email");

-- CreateIndex
CREATE INDEX "codm_referees_status_idx" ON "codm_referees"("status");

-- CreateIndex
CREATE INDEX "codm_referee_assignments_matchId_idx" ON "codm_referee_assignments"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "codm_referee_assignments_refereeId_matchId_key" ON "codm_referee_assignments"("refereeId", "matchId");

-- CreateIndex
CREATE INDEX "codm_disputes_matchId_idx" ON "codm_disputes"("matchId");

-- CreateIndex
CREATE INDEX "codm_disputes_tournamentId_idx" ON "codm_disputes"("tournamentId");

-- CreateIndex
CREATE INDEX "codm_disputes_teamId_idx" ON "codm_disputes"("teamId");

-- CreateIndex
CREATE INDEX "codm_disputes_status_idx" ON "codm_disputes"("status");

-- CreateIndex
CREATE INDEX "codm_sanctions_subjectType_subjectId_idx" ON "codm_sanctions"("subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "codm_sanctions_teamId_idx" ON "codm_sanctions"("teamId");

-- CreateIndex
CREATE INDEX "codm_sanctions_status_idx" ON "codm_sanctions"("status");

-- CreateIndex
CREATE INDEX "codm_sponsors_active_idx" ON "codm_sponsors"("active");

-- CreateIndex
CREATE INDEX "codm_sponsors_priority_idx" ON "codm_sponsors"("priority");

-- CreateIndex
CREATE INDEX "codm_prize_payouts_tournamentId_idx" ON "codm_prize_payouts"("tournamentId");

-- CreateIndex
CREATE INDEX "codm_prize_payouts_teamId_idx" ON "codm_prize_payouts"("teamId");

-- CreateIndex
CREATE INDEX "codm_prize_payouts_status_idx" ON "codm_prize_payouts"("status");

-- CreateIndex
CREATE INDEX "codm_notifications_userId_idx" ON "codm_notifications"("userId");

-- CreateIndex
CREATE INDEX "codm_notifications_email_idx" ON "codm_notifications"("email");

-- CreateIndex
CREATE INDEX "codm_notifications_readAt_idx" ON "codm_notifications"("readAt");

-- AddForeignKey
ALTER TABLE "codm_teams" ADD CONSTRAINT "codm_teams_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "codm_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codm_players" ADD CONSTRAINT "codm_players_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "codm_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codm_tournaments" ADD CONSTRAINT "codm_tournaments_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "codm_seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codm_tournament_registrations" ADD CONSTRAINT "codm_tournament_registrations_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "codm_tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codm_tournament_registrations" ADD CONSTRAINT "codm_tournament_registrations_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "codm_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codm_matches" ADD CONSTRAINT "codm_matches_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "codm_tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codm_matches" ADD CONSTRAINT "codm_matches_teamAId_fkey" FOREIGN KEY ("teamAId") REFERENCES "codm_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codm_matches" ADD CONSTRAINT "codm_matches_teamBId_fkey" FOREIGN KEY ("teamBId") REFERENCES "codm_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codm_matches" ADD CONSTRAINT "codm_matches_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "codm_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codm_point_events" ADD CONSTRAINT "codm_point_events_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "codm_tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codm_point_events" ADD CONSTRAINT "codm_point_events_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "codm_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codm_point_events" ADD CONSTRAINT "codm_point_events_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "codm_seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codm_point_ledger" ADD CONSTRAINT "codm_point_ledger_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "codm_tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codm_point_ledger" ADD CONSTRAINT "codm_point_ledger_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "codm_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codm_point_ledger" ADD CONSTRAINT "codm_point_ledger_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "codm_seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codm_referee_assignments" ADD CONSTRAINT "codm_referee_assignments_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "codm_referees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codm_disputes" ADD CONSTRAINT "codm_disputes_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "codm_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codm_disputes" ADD CONSTRAINT "codm_disputes_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "codm_tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codm_sanctions" ADD CONSTRAINT "codm_sanctions_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "codm_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codm_prize_payouts" ADD CONSTRAINT "codm_prize_payouts_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "codm_tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
