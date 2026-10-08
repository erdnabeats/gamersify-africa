import { prisma } from './prisma';

const modelMap: Record<string, any> = {
  codm_settings: prisma.setting,
  codm_tiers: prisma.tier,
  codm_teams: prisma.team,
  codm_players: prisma.player,
  codm_seasons: prisma.season,
  codm_tournaments: prisma.tournament,
  codm_tournament_registrations: prisma.tournamentRegistration,
  codm_matches: prisma.match,
  codm_point_events: prisma.pointEvent,
  codm_point_ledger: prisma.pointLedger,
  codm_admin_users: prisma.adminUser,
  codm_audit_logs: prisma.auditLog,
  codm_backup_manifests: prisma.backupManifest,
  codm_transfer_news: prisma.transferNews,
  codm_referees: prisma.referee,
  codm_referee_assignments: prisma.refereeAssignment,
  codm_disputes: prisma.dispute,
  codm_sanctions: prisma.sanction,
  codm_sponsors: prisma.sponsor,
  codm_prize_payouts: prisma.prizePayout,
  codm_notifications: prisma.notification,
};

function getModel(table: string): any {
  const model = modelMap[table];

  if (!model) {
    throw new Error(`Unknown database table: ${table}`);
  }

  return model;
}

export const db = {
  async list<T = any>(
    table: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<T[]> {
    const model = getModel(table);

    return model.findMany({
      take: options.limit ?? 500,
      skip: options.offset ?? 0,
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  async get<T = any>(
    table: string,
    id: string
  ): Promise<T | null> {
    return getModel(table).findUnique({
      where: { id },
    });
  },

  async add<T = any>(
    table: string,
    data: Record<string, any>
  ): Promise<T> {
    return getModel(table).create({
      data,
    });
  },

  async update<T = any>(
    table: string,
    id: string,
    data: Record<string, any>
  ): Promise<T> {
    return getModel(table).update({
      where: { id },
      data,
    });
  },

  async delete<T = any>(
    table: string,
    id: string
  ): Promise<T> {
    return getModel(table).delete({
      where: { id },
    });
  },
};