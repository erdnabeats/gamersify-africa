import { db } from './prisma-db';

const tables = [
  'codm_settings',
  'codm_tiers',
  'codm_teams',
  'codm_players',
  'codm_seasons',
  'codm_tournaments',
  'codm_tournament_registrations',
  'codm_matches',
  'codm_point_events',
  'codm_point_ledger',
  'codm_admin_users',
  'codm_audit_logs',
  'codm_backup_manifests',
  'codm_transfer_news',
  'codm_referees',
  'codm_referee_assignments',
  'codm_disputes',
  'codm_sanctions',
  'codm_sponsors',
  'codm_prize_payouts',
  'codm_notifications',
];

for (const table of tables) {
  try {
    const result = await db.list(table);
    console.log(`✓ ${table}: ${result.items.length} records`);
  } catch (error) {
    console.error(`✗ ${table}:`, error);
  }
}

process.exit(0);