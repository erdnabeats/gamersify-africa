import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const adapter = new PrismaPg({
  connectionString,
});

export const prisma = new PrismaClient({
  adapter,
});

const MODEL_MAP: Record<string, string> = {
  codm_settings: 'setting',
  codm_tiers: 'tier',
  codm_teams: 'team',
  codm_players: 'player',
  codm_seasons: 'season',
  codm_tournaments: 'tournament',
  codm_tournament_registrations: 'tournamentRegistration',
  codm_matches: 'match',
  codm_point_events: 'pointEvent',
  codm_point_ledger: 'pointLedger',
  codm_admin_users: 'adminUser',
  codm_audit_logs: 'auditLog',
  codm_backup_manifests: 'backupManifest',
  codm_sessions: 'session',
  codm_transfer_news: 'transferNews',
  codm_referees: 'referee',
  codm_referee_assignments: 'refereeAssignment',
  codm_disputes: 'dispute',
  codm_sanctions: 'sanction',
  codm_sponsors: 'sponsor',
  codm_prize_payouts: 'prizePayout',
  codm_notifications: 'notification',
};

function model(table: string): any {
  const modelName = MODEL_MAP[table];

  if (!modelName) {
    throw new Error(`Unknown database table: ${table}`);
  }

  return (prisma as any)[modelName];
}

export const db = {
  async list<T = any>(
    table: string,
    options: { limit?: number } = {}
  ): Promise<{ items: T[] }> {
    const delegate = model(table);

    const ORDER_FIELD_MAP: Record<string, string> = {
  codm_audit_logs: 'timestamp',
  codm_referee_assignments: 'assignedAt',
};

const orderField = ORDER_FIELD_MAP[table] ?? 'createdAt';

const items = await delegate.findMany({
  take: options.limit ?? 500,
  orderBy: { [orderField]: 'desc' },
});

    return { items };
  },

  async get<T = any>(
    table: string,
    ids: string[]
  ): Promise<T[]> {
    const delegate = model(table);

    if (!ids.length) {
      return [];
    }

    return delegate.findMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  },

  async add<T = any>(
    table: string,
    records: T[]
  ): Promise<string[]> {
    const delegate = model(table);
    const ids: string[] = [];

    for (const record of records as any[]) {
      const created = await delegate.create({
        data: record,
      });

      ids.push(created.id);
    }

    return ids;
  },

  async update<T = any>(
    table: string,
    updates: Array<{ id: string; record: T }>
  ): Promise<void> {
    const delegate = model(table);

    for (const update of updates as any[]) {
      await delegate.update({
        where: {
          id: update.id,
        },
        data: update.record,
      });
    }
  },

  async delete(
    table: string,
    ids: string[]
  ): Promise<void> {
    const delegate = model(table);

    if (!ids.length) {
      return;
    }

    await delegate.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  },
};