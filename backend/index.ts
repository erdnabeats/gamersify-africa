import argon2 from 'argon2';
import crypto from 'node:crypto';
import { router, json, error } from './lib/http';
import {
  requireAuth,
  requireAdminEmailAllowlist,
  createSession,
  getSessionUser,
  destroySession,
} from './lib/auth';
import { storage } from './lib/storage';
import { db } from './lib/prisma-db';
import { DEFAULT_SETTINGS, TABLES } from './schema';
import { notifySubscribers } from './realtime-subscribers';

const ADMIN_EMAILS = ['damiisaka@gmail.com', 'gamersifyaf@gmail.com'];
const SUPER_ADMIN_EMAILS = ADMIN_EMAILS;
const protectedAdmin = [requireAuth(), requireAdminEmailAllowlist(SUPER_ADMIN_EMAILS)];

const now = () => new Date().toISOString();

function hashResetToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function sendManagerPasswordResetEmail(email: string, resetUrl: string) {
  const apiKey = String(process.env.MAILGUN_API_KEY || '').trim();
  const domain = String(process.env.MAILGUN_DOMAIN || '').trim();
  const from = String(process.env.MAIL_FROM || `Gamersify Africa <postmaster@${domain}>`).trim();
  const baseUrl = String(process.env.MAILGUN_BASE_URL || '').trim() ||
    (String(process.env.MAILGUN_REGION || '').toLowerCase() === 'eu'
      ? 'https://api.eu.mailgun.net'
      : 'https://api.mailgun.net');

  if (!apiKey || !domain) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[AUTH] Mailgun is not configured. Password reset URL: ${resetUrl}`);
      return;
    }
    throw new Error('Password reset email service is not configured.');
  }

  const form = new URLSearchParams();
  form.set('from', from);
  form.set('to', email);
  form.set('subject', 'Reset your Gamersify Africa password');
  form.set('text', `You requested a password reset for your Gamersify Africa Team Manager account.\n\nReset your password here:\n${resetUrl}\n\nThis link expires in 30 minutes and can only be used once.\n\nIf you did not request this, you can ignore this email.`);
  form.set('html', `<p>You requested a password reset for your Gamersify Africa Team Manager account.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 30 minutes and can only be used once.</p><p>If you did not request this, you can ignore this email.</p>`);

  const response = await fetch(`${baseUrl}/v3/${domain}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Could not send password reset email.${detail ? ` ${detail.slice(0, 240)}` : ''}`);
  }
}

const requestBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(key: string, max = 60, windowMs = 60000) { const t = Date.now(); const b = requestBuckets.get(key); if (!b || t >= b.resetAt) { requestBuckets.set(key, { count: 1, resetAt: t + windowMs }); return true; } if (b.count >= max) return false; b.count += 1; return true; }
function rateKey(user: any, scope: string) { return scope + ':' + String(user?.userId || user?.email || 'anonymous'); }
async function createBackupSnapshot() { const tables = Object.values(TABLES); const snapshot: Record<string, any[]> = {}; for (const table of tables) { const { items } = await db.list<any>(table, { limit: 500 }); snapshot[table] = items; } const createdAt = now(); const path = 'backups/codm-' + createdAt.replace(/[:.]/g, '-') + '.json'; const [ok] = await storage.write([{ path, content: JSON.stringify({ version: 1, createdAt, tables: snapshot }), contentType: 'application/json' }]); if (!ok) throw new Error('Backup snapshot storage failed.'); const [id] = await db.add(TABLES.backupManifests, [{ path, createdAt, version: 1, tableCounts: Object.fromEntries(Object.entries(snapshot).map(([k,v]) => [k,v.length])), verified: true }]); return { id, path, createdAt }; }
export const dailyBackupHandler = async (_event: { type: 'cron'; name: string; invocationId: string; scheduledTime: string }) => { try { await createBackupSnapshot(); return { statusCode: 200 }; } catch { return { statusCode: 500 }; } };

async function freshTeamMedia(team: any) {
  const next = { ...team };

  if (team.logoPath) {
    const [item] = await storage.url([team.logoPath]);
    next.logoUrl = item?.url || '';
  }

  // Roster members are stored in codm_players, not codm_teams.
  // Build the API-level roster here so the frontend can keep using team.roster.
  const players = (await listAll<any>(TABLES.players))
    .filter((p: any) => p.teamId === team.id && !p.deletedAt);

  next.roster = await Promise.all(players.map(async (p: any) => {
    const player = { ...p };
    if (p.photoPath) {
      const [item] = await storage.url([p.photoPath]);
      player.photoUrl = item?.url || '';
    } else {
      player.photoUrl = player.photoUrl || '';
    }
    return player;
  }));

  return next;
}
async function freshTeams(teams: any[]) { return Promise.all(teams.map(freshTeamMedia)); }

async function listAll<T>(table: string, limit = 500) {
  const { items } = await db.list<T>(table, { limit });
  return items;
}

async function getById<T>(table: string, id: string) {
  const [record] = await db.get<T>(table, [id]);
  return record ? { ...record, id } : null;
}

async function settings() {
  const rows = await listAll<any>(TABLES.settings, 1);
  if (rows[0]) return rows[0];
  const [id] = await db.add(TABLES.settings, [DEFAULT_SETTINGS]);
  return { ...DEFAULT_SETTINGS, id };
}

async function audit(user: any, action: string, entity: string, entityId: string, reason = '') {
  await db.add(TABLES.auditLogs, [{
    action,
    entity,
    entityId,
    adminId: user?.userId || 'system',
    adminEmail: user?.email || 'system',
    reason,
    timestamp: now(),
  }]);
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function validateRoster(roster: any[]) {
  const people = Array.isArray(roster) ? roster : [];
  const count = (role: string) => people.filter(p => p.role === role).length;
  if (count('Captain') !== 1) throw new Error('Roster must contain exactly 1 Team Captain.');
  if (count('Manager') > 1) throw new Error('Roster can contain at most 1 Manager.');
  if (count('Coach') > 1) throw new Error('Roster can contain at most 1 Coach.');
  if (count('Player') < 4 || count('Player') > 5) throw new Error('Roster must contain 4 to 5 main players.');
  if (count('Substitute') > 2) throw new Error('Roster can contain at most 2 substitutes.');
  const allowed = ['Captain', 'Manager', 'Coach', 'Player', 'Substitute'];
  const seen = new Set<string>();
  return people.map(p => {
    const ign = String(p.inGameName || '').trim();
    if (!ign || !allowed.includes(p.role)) throw new Error('Every roster member needs a valid in-game name and role.');
    const key = ign.toLowerCase();
    if (seen.has(key)) throw new Error('In-game names must be unique within the team.');
    seen.add(key);
    return {
      inGameName: ign,
      playerId: p.playerId || '',
      realName: p.realName ? String(p.realName).trim() : '',
      role: p.role,
      photoPath: p.photoPath || '',
      photoUrl: p.photoUrl || '',
      country: p.country || '',
      status: p.status || 'active',
    };
  });
}

async function syncPlayersForTeam(team: any, rosterInput?: any[]) {
  if (!team || team.deletedAt) return;

  const roster = Array.isArray(rosterInput)
    ? rosterInput
    : Array.isArray(team.roster)
      ? team.roster
      : [];

  const existing = (await listAll<any>(TABLES.players))
    .filter(p => p.teamId === team.id && !p.deletedAt);

  const syncedRoster: any[] = [];

  for (const person of roster) {
    const match = existing.find(p =>
      p.playerId && person.playerId
        ? p.playerId === person.playerId
        : String(p.inGameName || '').toLowerCase() ===
          String(person.inGameName || '').toLowerCase()
    );

    const playerId =
      match?.playerId ||
      person.playerId ||
      ('GF-PLAYER-' +
        String(Date.now()).slice(-8) +
        '-' +
        Math.random().toString(36).slice(2, 6).toUpperCase());

    const record = {
      playerId,
      teamId: team.id,
      teamName: team.name,
      inGameName: person.inGameName,
      realName: person.realName || '',
      role: person.role,
      country: person.country || '',
      status: person.status || 'active',
      photoPath: person.photoPath || '',
      createdAt: match?.createdAt || now(),
      updatedAt: now(),
      deletedAt: null,
    };

    if (match) {
      await db.update(TABLES.players, [{
        id: match.id,
        record: {
          ...match,
          ...record,
        },
      }]);
    } else {
      await db.add(TABLES.players, [record]);
    }

    syncedRoster.push({
      ...person,
      playerId,
    });
  }

  const activeIds = new Set(
    syncedRoster.map(p => p.playerId)
  );

  for (const old of existing) {
    if (!activeIds.has(old.playerId)) {
      await db.update(TABLES.players, [{
        id: old.id,
        record: {
          ...old,
          teamId: null,
          teamName: 'Free Agent',
          status: 'inactive',
          updatedAt: now(),
        },
      }]);
    }
  }

  return syncedRoster;
}
async function hydratePlayerStats(player: any, teams: any[], matches: any[], tournaments: any[]) {
  const team = teams.find(t => t.id === player.teamId);
  const completed = matches.filter(m => !m.deletedAt && player.teamId && (m.teamAId === player.teamId || m.teamBId === player.teamId) && ['completed','forfeit','no-show','disqualified'].includes(m.status));
  const wins = completed.filter(m => m.winnerId === player.teamId).length;
  const tournamentsPlayed = new Set(completed.map(m => m.tournamentId)).size;
  return { ...player, teamName: team?.name || player.teamName || 'Free Agent', teamTier: team?.tierName || team?.tier || '', stats: { matchesPlayed: completed.length, wins, losses: Math.max(0, completed.length - wins), winRate: completed.length ? Math.round((wins / completed.length) * 1000) / 10 : 0, tournamentsPlayed } };
}
async function tierCount(tierId: string) {
  const teams = await listAll<any>(TABLES.teams);
  return teams.filter(t => t.tierId === tierId && !t.deletedAt).length;
}

function roundName(round: number, total: number) {
  const remaining = 2 ** (total - round);
  if (remaining === 2) return 'Final';
  if (remaining === 4) return 'Semifinal';
  if (remaining === 8) return 'Quarterfinal';
  if (remaining === 16) return 'Round of 16';
  return `Round of ${remaining}`;
}

function makeSingleBracket(tournamentId: string, ids: string[], size: number) {
  const seeded = [...ids];
  while (seeded.length < size) seeded.push('');
  const rounds = Math.log2(size);
  const rows: any[] = [];
  for (let round = 1; round <= rounds; round++) {
    const slots = size / 2 ** round;
    for (let slot = 0; slot < slots; slot++) {
      const teamAId = round === 1 ? seeded[slot * 2] || undefined : undefined;
      const teamBId = round === 1 ? seeded[slot * 2 + 1] || undefined : undefined;
      const isBye = round === 1 && Boolean(teamAId) !== Boolean(teamBId);
      rows.push({
        tournamentId,
        bracket: 'winners',
        round,
        roundName: roundName(round, rounds),
        slot,
        matchNumber: `${round}-${slot + 1}`,
        teamAId,
        teamBId,
        status: isBye ? 'bye' : 'scheduled',
        bestOf: round === rounds ? 5 : 3,
        createdAt: now(),
      });
    }
  }
  return rows;
}

async function resolveByes(tournamentId: string) {
  const matches = (await listAll<any>(TABLES.matches)).filter(m => m.tournamentId === tournamentId && !m.deletedAt);
  for (const match of matches.filter(m => m.bracket === 'winners' && m.round === 1 && m.status === 'bye')) {
    const winnerId = match.teamAId || match.teamBId;
    if (!winnerId) continue;
    const updated = { ...match, winnerId, status: 'completed', scoreA: match.teamAId ? 1 : 0, scoreB: match.teamBId ? 1 : 0, completedAt: now() };
    delete updated.id;
    await db.update(TABLES.matches, [{ id: match.id, record: updated }]);
    await advanceWinner(match, winnerId);
  }
}

function makeDoubleBracket(tournamentId: string, ids: string[], size: number) {
  const winners = makeSingleBracket(tournamentId, ids, size);
  const k = Math.log2(size);
  const losers: any[] = [];
  const loserRounds = Math.max(2, 2 * k - 2);

  for (let round = 1; round <= loserRounds; round++) {
    const exponent = Math.floor((round + 1) / 2) + 1;
    const slots = Math.max(1, Math.floor(size / 2 ** exponent));
    for (let slot = 0; slot < slots; slot++) {
      const key = `L-${round}-${slot}`;
      const isDropInRound = round % 2 === 0;
      const sourceRound = round / 2;
      const nextRound = round < loserRounds ? round + 1 : null;
      const nextSlot = nextRound ? Math.floor(slot / 2) : null;
      losers.push({
        tournamentId,
        bracket: 'losers',
        round,
        roundName: round === loserRounds ? 'Losers Final' : `Losers Round ${round}`,
        slot,
        matchKey: key,
        matchNumber: `L${round}-${slot + 1}`,
        status: 'scheduled',
        bestOf: 3,
        sourceType: isDropInRound ? 'winner-loss' : 'loser-survivor',
        sourceRound: isDropInRound ? sourceRound : null,
        winnerTargetKey: nextRound ? `L-${nextRound}-${nextSlot}` : 'GF-1',
        winnerTargetSlot: nextRound ? slot % 2 : 1,
        loserTargetKey: null,
      });
    }
  }

  for (const match of winners) {
    if (match.bracket !== 'winners') continue;
    match.matchKey = `W-${match.round}-${match.slot}`;
    match.winnerTargetKey = match.round < k ? `W-${match.round + 1}-${Math.floor(match.slot / 2)}` : 'GF-1';
    match.winnerTargetSlot = match.round < k ? match.slot % 2 : 0;
    match.loserTargetKey = match.round === 1
      ? `L-1-${Math.floor(match.slot / 2)}`
      : `L-${match.round * 2 - 2}-${match.slot}`;
    match.loserTargetSlot = match.round === 1 ? match.slot % 2 : 1;
  }

  const grand = [
    {
      tournamentId, bracket: 'grand', round: 1, roundName: 'Grand Final', slot: 0,
      matchKey: 'GF-1', matchNumber: 'GF-1', status: 'scheduled', bestOf: 5,
      sourceType: 'bracket-final', winnerTargetKey: null, loserTargetKey: 'GF-2',
    },
    {
      tournamentId, bracket: 'grand', round: 2, roundName: 'Grand Final Reset', slot: 0,
      matchKey: 'GF-2', matchNumber: 'GF-2', status: 'locked', bestOf: 5,
      sourceType: 'reset-if-needed', winnerTargetKey: null, loserTargetKey: null,
    },
  ];

  return winners.concat(losers, grand);
}

async function roleAllowed(user: any, roles: string[]) {
  const email = String(user?.email || '').toLowerCase();
  if (!SUPER_ADMIN_EMAILS.includes(email)) return false;
  const rows = await listAll<any>(TABLES.adminUsers);
  const saved = rows.find(r => String(r.email).toLowerCase() === email);
  return roles.includes(saved?.role || 'Super Admin');
}

function assertTournamentEditable(tournament: any, role: string, fields: string[]) {
  const locked = ['ongoing', 'completed', 'cancelled'];
  if (!locked.includes(tournament.status)) return null;
  if (role === 'Super Admin' && fields.every(field => ['notes', 'rules', 'prizePool', 'mapsModes'].includes(field))) return null;
  return error('This tournament is locked in its current lifecycle state. Super Admin can only change operational metadata after start.', 409);
}

function normalizeMatchStatus(value: unknown) {
  const allowed = ['scheduled', 'check-in', 'ready', 'live', 'pending-result', 'completed', 'forfeit', 'no-show', 'disqualified', 'cancelled', 'disputed', 'locked', 'bye'];
  return allowed.includes(String(value)) ? String(value) : 'completed';
}

async function writePointLedger(tournament: any, placements: Record<string, string>, user: any) {
  const s: any = await settings();
  const existing = (await listAll<any>(TABLES.pointLedger)).filter(e => e.tournamentId === tournament.id && !e.reversedAt);
  if (existing.length) return existing;
  const rows: any[] = [];
  for (const teamId of tournament.participants || []) {
    const team = await getById<any>(TABLES.teams, teamId);
    if (!team) continue;
    const placement = placements[teamId] || 'Participation';
    const basePoints = Number(s.points[placement] ?? s.points.Participation ?? 1);
    const multiplier = Number(tournament.multiplier || 1);
    rows.push({ tournamentId: tournament.id, seasonId: tournament.seasonId || null, teamId, teamName: team.name, placement, basePoints, multiplier, points: Math.round(basePoints * multiplier * 100) / 100, calculationVersion: Number(s.calculationVersion || 1), createdAt: now(), createdBy: user?.userId || 'system' });
  }
  for (let i = 0; i < rows.length; i += 100) await db.add(TABLES.pointLedger, rows.slice(i, i + 100));
  return rows;
}

async function recomputeTeamPoints(teamId: string) {
  const ledger = await listAll<any>(TABLES.pointLedger);
  const total = ledger.filter(e => e.teamId === teamId && !e.reversedAt).reduce((sum, e) => sum + Number(e.points || 0), 0);
  const team = await getById<any>(TABLES.teams, teamId);
  if (team) await db.update(TABLES.teams, [{ id: teamId, record: { ...team, points: Math.round(total * 100) / 100, updatedAt: now() } }]);
}

async function routeBracketResult(match: any, winnerId: string, loserId?: string) {
  const matches = await listAll<any>(TABLES.matches);
  const put = async (targetKey: string | null | undefined, teamId: string | undefined, preferredSlot?: number) => {
    if (!targetKey || !teamId) return;
    const target = matches.find(m => m.matchKey === targetKey && m.tournamentId === match.tournamentId && !m.deletedAt);
    if (!target) return;
    const field = preferredSlot === 0 ? 'teamAId' : preferredSlot === 1 ? 'teamBId' : !target.teamAId ? 'teamAId' : 'teamBId';
    const updated = { ...target, [field]: teamId };
    if (updated.teamAId && updated.teamBId && ['locked','bye'].includes(updated.status)) updated.status = 'scheduled';
    delete updated.id;
    await db.update(TABLES.matches, [{ id: target.id, record: updated }]);
  };
  await put(match.winnerTargetKey, winnerId, match.winnerTargetSlot);
  if (loserId) await put(match.loserTargetKey, loserId, match.loserTargetSlot);
}

async function advanceWinner(match: any, winnerId: string) {
  const loserId = match.teamAId === winnerId ? match.teamBId : match.teamAId;
  await routeBracketResult(match, winnerId, loserId);
}

async function finalizePoints(tournament: any, user: any) {
  const s: any = await settings();
  const matches = (await listAll<any>(TABLES.matches)).filter(m => m.tournamentId === tournament.id);
  const final = matches.find(m => ['Final','Grand Final','Grand Final Reset'].includes(m.roundName) && ['completed','forfeit','disqualified','no-show'].includes(m.status) && m.winnerId);
  const champion = final?.winnerId;
  const placement: Record<string, string> = {};
  for (const teamId of tournament.participants || []) placement[teamId] = 'Participation';

  for (const match of matches.filter(m => m.status === 'completed' && m.winnerId)) {
    const loser = match.teamAId === match.winnerId ? match.teamBId : match.teamAId;
    if (loser) placement[loser] = match.roundName;
  }
  if (champion) placement[champion] = 'Champion';

  const ledgerRows = await writePointLedger(tournament, placement, user);
  const events = await listAll<any>(TABLES.pointEvents);
  for (const teamId of tournament.participants || []) {
    const team = await getById<any>(TABLES.teams, teamId);
    if (!team) continue;
    const label = placement[teamId] || 'Participation';
    const base = Number(s.points[label] ?? s.points.Participation ?? 1);
    const multiplier = Number(tournament.multiplier || 1);
    const points = Math.round(base * multiplier * 100) / 100;
    const record = {
      tournamentId: tournament.id,
      teamId,
      teamName: team.name,
      placement: label,
      basePoints: base,
      multiplier,
      points,
      seasonId: tournament.seasonId || null,
      calculationVersion: Number(s.calculationVersion || 1),
      createdAt: now(),
    };
    void ledgerRows;
    const old = events.find(e => e.tournamentId === tournament.id && e.teamId === teamId);
    if (old) await db.update(TABLES.pointEvents, [{ id: old.id, record }]);
    else await db.add(TABLES.pointEvents, [record]);
  }

  const refreshedEvents = await listAll<any>(TABLES.pointEvents);
  for (const teamId of tournament.participants || []) {
    const team = await getById<any>(TABLES.teams, teamId);
    if (!team) continue;
    const total = refreshedEvents.filter(e => e.teamId === teamId).reduce((sum, e) => sum + Number(e.points || 0), 0);
    await db.update(TABLES.teams, [{ id: teamId, record: { ...team, points: Math.round(total * 100) / 100 } }]);
  }

  await db.update(TABLES.tournaments, [{
    id: tournament.id,
    record: { ...tournament, status: 'completed', pointsFinalized: true },
  }]);
  await audit(user, 'FINALIZE_POINTS', 'tournament', tournament.id);
}

export const handler = router({
    'POST /api/auth/login': [async ({ req, body }) => {
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');

    if (!email || !password) {
      return error('Email and password are required.', 400);
    }

    const users = await listAll<any>(TABLES.adminUsers);

    const user = users.find(
      (item: any) =>
        String(item.email || '').toLowerCase() === email &&
        !item.deletedAt &&
        item.active !== false
    );

    if (!user || !user.passwordHash) {
      return error('Invalid email or password.', 401);
    }

    const validPassword = await argon2.verify(
      user.passwordHash,
      password
    );

    if (!validPassword) {
      return error('Invalid email or password.', 401);
    }

    await createSession(req.res, {
      userId: user.id,
      email: user.email,
      name: user.name || undefined,
      role: user.role,
      teamId: user.teamId || undefined,
    });

    return json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        teamId: user.teamId,
      },
    });
  }],
    'GET /api/auth/me': [async ({ req }) => {
    const user = await getSessionUser(req);

    if (!user) {
      return json({
        user: null,
        authenticated: false,
      });
    }

    return json({
      user: {
        id: user.userId,
        email: user.email,
        name: user.name,
        role: user.role,
        teamId: user.teamId,
      },
      authenticated: true,
    });
  }],

  'POST /api/auth/logout': [async ({ req, res }) => {
    await destroySession(req, res);

    return json({
      success: true,
    });
  }],
  'POST /api/auth/forgot-password': [async ({ body }) => {
    const email = String((body as any)?.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) return error('A valid email address is required.', 400);

    const users: any[] = await listAll<any>(TABLES.adminUsers);
    const manager = users.find((item: any) =>
      String(item.email || '').toLowerCase() === email &&
      item.role === 'Team Manager' &&
      item.active !== false &&
      !item.deletedAt
    );

    if (!manager) {
      return json({ ok: true, message: 'If that email belongs to an active Team Manager account, a reset link has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const baseUrl = String(process.env.APP_BASE_URL || 'http://localhost').replace(/\/+$/, '');
    const resetUrl = `${baseUrl}/?resetPassword=${encodeURIComponent(token)}&email=${encodeURIComponent(manager.email)}`;

    const next = { ...manager, passwordResetTokenHash: tokenHash, passwordResetExpiresAt: expiresAt, updatedAt: now() };
    delete next.id;
    await db.update(TABLES.adminUsers, [{ id: manager.id, record: next }]);

    try {
      await sendManagerPasswordResetEmail(manager.email, resetUrl);
    } catch (e: any) {
      const rollback = { ...manager };
      delete rollback.id;
      await db.update(TABLES.adminUsers, [{ id: manager.id, record: rollback }]);
      return error(e?.message || 'Could not send password reset email.', 503);
    }

    const response: any = {
      ok: true,
      message: 'If that email belongs to an active Team Manager account, a reset link has been sent.',
    };
    if (process.env.NODE_ENV !== 'production') response.resetUrl = resetUrl;
    return json(response);
  }],

  'POST /api/auth/reset-password': [async ({ body }) => {
    const b: any = body || {};
    const token = String(b.token || '').trim();
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');
    const confirmPassword = String(b.confirmPassword || '');

    if (!token || !email) return error('Reset token and email are required.', 400);
    if (password.length < 8) return error('Password must be at least 8 characters.', 400);
    if (password !== confirmPassword) return error('Passwords do not match.', 400);

    const users: any[] = await listAll<any>(TABLES.adminUsers);
    const tokenHash = hashResetToken(token);
    const manager = users.find((item: any) =>
      String(item.email || '').toLowerCase() === email &&
      item.role === 'Team Manager' &&
      item.active !== false &&
      !item.deletedAt &&
      item.passwordResetTokenHash === tokenHash &&
      item.passwordResetExpiresAt &&
      new Date(item.passwordResetExpiresAt).getTime() > Date.now()
    );

    if (!manager) return error('This password reset link is invalid or has expired.', 400);

    const passwordHash = await argon2.hash(password);
    const next = {
      ...manager,
      passwordHash,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      updatedAt: now(),
    };
    delete next.id;
    await db.update(TABLES.adminUsers, [{ id: manager.id, record: next }]);

    return json({ ok: true, message: 'Password reset successfully. You can now sign in.' });
  }],

  'GET /api/_healthcheck': [async () => json({ message: 'Success' })],

  'GET /api/admin/backup/status': [...protectedAdmin, async ({ user }) => { if (!(await roleAllowed(user, ['Super Admin']))) return error('Forbidden', 403); const manifests = (await listAll<any>(TABLES.backupManifests)).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt))); const latest = manifests[0] || null; let storageVerified = false; if (latest?.path) { const [file] = await storage.read([latest.path]); storageVerified = Boolean(file?.content); } return json({ latest, storageVerified, snapshotCount: manifests.length }); }],
  'POST /api/admin/backup/create': [...protectedAdmin, async ({ user }) => { if (!(await roleAllowed(user, ['Super Admin']))) return error('Forbidden', 403); if (!rateLimit(rateKey(user, 'backup'), 2, 600000)) return error('Backup requests are temporarily rate limited.', 429); try { const backup = await createBackupSnapshot(); await audit(user, 'BACKUP_CREATE', 'backup', backup.id || backup.path); return json({ backup }); } catch (e) { return error(e instanceof Error ? e.message : 'Backup failed.', 500); } }],

  'GET /api/public/settings': [async () => json({ settings: await settings() })],
  'GET /api/public/players': [async ({ query }) => {
    const teams = await listAll<any>(TABLES.teams); const matches = await listAll<any>(TABLES.matches); const tournaments = await listAll<any>(TABLES.tournaments);
    for (const team of teams.filter(t => !t.deletedAt)) await syncPlayersForTeam(team);
    const players = await listAll<any>(TABLES.players); const search = String(query.search || '').toLowerCase();
    const result = await Promise.all(players.filter(p => !p.deletedAt && (!search || String(p.inGameName || '').toLowerCase().includes(search) || String(p.realName || '').toLowerCase().includes(search) || String(p.playerId || '').toLowerCase().includes(search))).map(p => hydratePlayerStats(p, teams, matches, tournaments)));
    return json({ players: result.sort((a,b) => Number(b.stats?.wins||0)-Number(a.stats?.wins||0) || Number(b.stats?.winRate||0)-Number(a.stats?.winRate||0) || String(a.inGameName).localeCompare(String(b.inGameName))) });
  }],
  'GET /api/public/players/:id': [async ({ params }) => {
    const teams = await listAll<any>(TABLES.teams); const matches = await listAll<any>(TABLES.matches); const tournaments = await listAll<any>(TABLES.tournaments);
    const all = await listAll<any>(TABLES.players); const player = (await getById<any>(TABLES.players, params.id)) || all.find(p => p.playerId === params.id);
    if (!player || player.deletedAt) return error('Player not found.', 404);
    const hydrated = await hydratePlayerStats(player, teams, matches, tournaments);
    const history = matches.filter(m => !m.deletedAt && player.teamId && (m.teamAId === player.teamId || m.teamBId === player.teamId)).sort((a,b) => String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))).slice(0,20);
    return json({ player: hydrated, matchHistory: history });
  }],


  'GET /api/referee/me': [requireAuth(), async ({ user }) => {
    const email=String(user?.email||'').toLowerCase(); const rows:any[]=await listAll<any>(TABLES.adminUsers);
    const saved=rows.find((r:any)=>String(r.email||'').toLowerCase()===email&&r.role==='Referee'&&r.active!==false);
    if(!saved)return error('No active Referee account is assigned to this email.',403);
    return json({user:{email:user?.email,name:saved.name||user?.name,role:'Referee'},referee:saved});
  }],
  'GET /api/referee/matches': [requireAuth(), async ({ user }) => {
    const email=String(user?.email||'').toLowerCase(); const rows:any[]=await listAll<any>(TABLES.adminUsers);
    const saved=rows.find((r:any)=>String(r.email||'').toLowerCase()===email&&r.role==='Referee'&&r.active!==false);
    if(!saved)return error('No active Referee account is assigned to this email.',403);
    const assignments:any[]=await listAll<any>(TABLES.refereeAssignments); const ids=new Set(assignments.filter(a=>a.refereeEmail===email&&!a.revokedAt).map(a=>a.matchId));
    const matches=await listAll<any>(TABLES.matches); return json({matches:matches.filter(m=>!m.deletedAt&&(ids.has(m.id)||saved.scope==='all'))});
  }],
  'PUT /api/referee/matches/:id/status': [requireAuth(), async ({ user, params, body }) => {
    const email=String(user?.email||'').toLowerCase(); const admins:any[]=await listAll<any>(TABLES.adminUsers);
    const saved=admins.find((r:any)=>String(r.email||'').toLowerCase()===email&&r.role==='Referee'&&r.active!==false);
    if(!saved)return error('Forbidden',403);
    const assignments:any[]=await listAll<any>(TABLES.refereeAssignments);
    if(!assignments.some((a:any)=>a.matchId===params.id&&a.refereeEmail===email&&!a.revokedAt)&&saved.scope!=='all')return error('You are not assigned to this match.',403);
    const match=await getById<any>(TABLES.matches,params.id); if(!match||match.deletedAt)return error('Match not found.',404);
    const b:any=body||{}; const status=normalizeMatchStatus(b.status); const next={...match,status,refereeEmail:email,refereeNotes:String(b.notes||match.refereeNotes||''),updatedAt:now()};
    if(['completed','forfeit','no-show','disqualified'].includes(status))next.completedAt=now(); delete next.id;
    await db.update(TABLES.matches,[{id:match.id,record:next}]); await audit(user,'REFEREE_MATCH_STATUS','match',match.id,status);
    return json({match:await getById<any>(TABLES.matches,match.id)});
  }],
  'PUT /api/referee/matches/:id/operations': [requireAuth(), async ({ user, params, body }) => {
    const email=String(user?.email||'').toLowerCase(); const admins:any[]=await listAll<any>(TABLES.adminUsers);
    const saved=admins.find((r:any)=>String(r.email||'').toLowerCase()===email&&r.role==='Referee'&&r.active!==false); if(!saved)return error('Forbidden',403);
    const assignments:any[]=await listAll<any>(TABLES.refereeAssignments);
    if(!assignments.some((a:any)=>a.matchId===params.id&&a.refereeEmail===email&&!a.revokedAt)&&saved.scope!=='all')return error('You are not assigned to this match.',403);
    const match:any=await getById<any>(TABLES.matches,params.id); if(!match||match.deletedAt)return error('Match not found.',404);
    const b:any=body||{}; const next:any={...match,updatedAt:now()};
    for(const key of ['roomId','roomPassword','serverRegion','scheduledAt','checkInDeadline','pauseReason','evidenceUrl']) if(b[key]!==undefined) next[key]=String(b[key]).slice(0,500);
    if(b.teamAReady!==undefined)next.teamAReady=Boolean(b.teamAReady); if(b.teamBReady!==undefined)next.teamBReady=Boolean(b.teamBReady);
    if(b.technicalPause!==undefined)next.technicalPause=Boolean(b.technicalPause); if(b.technicalPause===false)next.pauseReason='';
    delete next.id; await db.update(TABLES.matches,[{id:match.id,record:next}]); await audit(user,'REFEREE_MATCH_OPERATIONS','match',match.id);
    return json({match:await getById<any>(TABLES.matches,match.id)});
  }],
  'POST /api/manager/matches/:id/disputes': [requireAuth(), async ({ user, params, body }) => {
    const email=String(user?.email||'').toLowerCase(); const admins:any[]=await listAll<any>(TABLES.adminUsers);
    const saved=admins.find((r:any)=>String(r.email||'').toLowerCase()===email&&r.role==='Team Manager'&&r.active!==false);
    if(!saved?.teamId)return error('No active Team Manager account is assigned to this email.',403);
    const match=await getById<any>(TABLES.matches,params.id);
    if(!match||match.deletedAt||(match.teamAId!==saved.teamId&&match.teamBId!==saved.teamId))return error('Match not found or not assigned to your team.',404);
    const b:any=body||{}; const reason=String(b.reason||'').trim(); if(!reason)return error('A dispute reason is required.',400);
    if((await listAll<any>(TABLES.disputes)).some((d:any)=>d.matchId===match.id&&d.status==='open'))return error('This match already has an open dispute.',409);
    const [id]=await db.add(TABLES.disputes,[{matchId:match.id,tournamentId:match.tournamentId,teamId:saved.teamId,raisedBy:email,reason,evidenceUrl:String(b.evidenceUrl||'').trim(),status:'open',createdAt:now(),updatedAt:now()}]);
    await db.update(TABLES.matches,[{id:match.id,record:{...match,status:'disputed',updatedAt:now()}}]); await audit(user,'DISPUTE_CREATE','match',match.id,reason);
    return json({dispute:await getById<any>(TABLES.disputes,id)},201);
  }],
  'GET /api/public/teams': [async ({ query }) => {
    const search = String(query.search || '').toLowerCase();
    const rows = await listAll<any>(TABLES.teams);
    const teams = rows
      .filter(t => !t.deletedAt)
      .filter(t => !query.tier || t.tierName === query.tier)
      .filter(t => !query.region || t.region === query.region)
      .filter(t => !search || String(t.name).toLowerCase().includes(search))
      .sort((a, b) => Number(b.points || 0) - Number(a.points || 0));
    return json({ teams: await freshTeams(teams) });
  }],

  'GET /api/public/teams/:id': [async ({ params }) => {
    const team = await getById<any>(TABLES.teams, params.id);
    if (!team || team.deletedAt) return error('Team not found.', 404);
    const events = (await listAll<any>(TABLES.pointEvents)).filter(e => e.teamId === params.id);
    const tournaments = (await listAll<any>(TABLES.tournaments)).filter(t => !t.deletedAt && (t.participants || []).includes(params.id));
    const matches = (await listAll<any>(TABLES.matches)).filter(m => !m.deletedAt && (m.teamAId === params.id || m.teamBId === params.id));
    const completed = matches.filter(m => ['completed', 'forfeit', 'no-show', 'disqualified'].includes(m.status));
    const wins = completed.filter(m => m.winnerId === params.id).length;
    const losses = completed.filter(m => m.winnerId && m.winnerId !== params.id).length;
    const mapWinRates = ['Hardpoint', 'Search and Destroy', 'Control'].map(mode => {
      let wins = 0;
      let played = 0;
      completed.forEach(m => (Array.isArray(m.mapResults) ? m.mapResults : []).filter((x: any) => String(x.mode) === mode).forEach((x: any) => {
        const a = Math.max(0, Number(x.teamAWins || 0));
        const b = Math.max(0, Number(x.teamBWins || 0));
        const teamIsA = m.teamAId === params.id;
        const teamIsB = m.teamBId === params.id;
        if (!teamIsA && !teamIsB) return;
        wins += teamIsA ? a : b;
        played += a + b;
      }));
      return { mode, wins, mapsPlayed: played, winRate: played ? Math.round((wins / played) * 1000) / 10 : 0 };
    });
    const placements = events.map(e => e.placement).filter(Boolean);
    const placementRank: Record<string, number> = { Champion: 1, Final: 2, Semifinal: 3, Quarterfinal: 4, 'Round of 16': 5, Participation: 6 };
    const bestPlacement = placements.length ? placements.sort((a, b) => (placementRank[a] || 99) - (placementRank[b] || 99))[0] : 'Participation';
    const publicTeam = await freshTeamMedia(team);
    return json({
      team: publicTeam,
      stats: { tournamentsPlayed: tournaments.length, matchesPlayed: completed.length, wins, losses, winRate: completed.length ? Math.round((wins / completed.length) * 1000) / 10 : 0, bestPlacement, mapWinRates },
      tournamentHistory: tournaments.map(t => {
        const event = events.find(e => e.tournamentId === t.id);
        return { id: t.id, name: t.name, date: t.date, status: t.status, type: t.type, placement: event?.placement || 'Participation', points: Number(event?.points || 0) };
      }).sort((a, b) => String(b.date).localeCompare(String(a.date))),
      pointsBreakdown: events,
    });
  }],

  'GET /api/public/live': [async () => {
    const rows:any[]=await listAll<any>(TABLES.matches); const teams:any[]=await listAll<any>(TABLES.teams); const tournaments:any[]=await listAll<any>(TABLES.tournaments);
    const tm=new Map(teams.map((t:any)=>[t.id,t.name])); const tt=new Map(tournaments.map((t:any)=>[t.id,t.name]));
    const matches=rows.filter((m:any)=>!m.deletedAt&&!['completed','cancelled','bye','locked'].includes(m.status)).map((m:any)=>({...m,teamAName:tm.get(m.teamAId)||m.teamAName||'TBD',teamBName:tm.get(m.teamBId)||m.teamBName||'TBD',tournamentName:tt.get(m.tournamentId)||'Tournament'}));
    return json({matches:matches.slice(0,100)});
  }],

  'GET /api/public/tournaments': [async ({ query }) => {
    const rows = await listAll<any>(TABLES.tournaments);
    return json({ tournaments: rows.filter(t => !t.deletedAt && (!query.status || t.status === query.status)) });
  }],

  'GET /api/public/tournaments/:id': [async ({ params }) => {
    const tournament = await getById<any>(TABLES.tournaments, params.id);
    if (!tournament || tournament.deletedAt) return error('Tournament not found.', 404);
    const participants = [];
    for (const id of tournament.participants || []) {
      const team = await getById<any>(TABLES.teams, id);
      if (team && !team.deletedAt) participants.push(team);
    }
    const matches = (await listAll<any>(TABLES.matches)).filter(m => m.tournamentId === params.id && !m.deletedAt);
    const events = (await listAll<any>(TABLES.pointEvents)).filter(e => e.tournamentId === params.id);
    const completed = matches.filter(m => ['completed', 'forfeit', 'no-show', 'disqualified'].includes(m.status));
    const standings = participants.map((team: any) => {
      const played = completed.filter(m => m.teamAId === team.id || m.teamBId === team.id);
      const wins = played.filter(m => m.winnerId === team.id).length;
      const losses = played.filter(m => m.winnerId && m.winnerId !== team.id).length;
      const event = events.find(e => e.teamId === team.id);
      const lastLoss = played.filter(m => m.winnerId && m.winnerId !== team.id).sort((a,b) => Number(b.round || 0) - Number(a.round || 0))[0];
      const placement = event?.placement || (lastLoss ? lastLoss.roundName : (played.length ? 'In progress' : 'Registered'));
      return { teamId: team.id, teamName: team.name, logoUrl: team.logoUrl || '', tier: team.tierName || team.tier || '', played: played.length, wins, losses, points: Number(event?.points || 0), placement };
    }).sort((a,b) => b.points - a.points || b.wins - a.wins || a.losses - b.losses || a.teamName.localeCompare(b.teamName));
    const placements = standings.map((row, index) => ({ rank: index + 1, ...row }));
    const publicParticipants = await freshTeams(participants);
    return json({
      tournament,
      participants: publicParticipants,
      matches,
      standings: placements,
      placements: placements.filter(row => row.placement !== 'Registered'),
      prize: tournament.prizePool || '',
    });
  }],

  'GET /api/public/tournaments/:id/bracket': [async ({ params }) => {
    const tournament = await getById<any>(TABLES.tournaments, params.id);
    if (!tournament || tournament.deletedAt) return error('Tournament not found.', 404);
    const matches = (await listAll<any>(TABLES.matches)).filter(m => m.tournamentId === params.id && !m.deletedAt);
    return json({ matches });
  }],

  'GET /api/public/rankings': [async ({ query }) => {
    const teams = await listAll<any>(TABLES.teams); const ledger = await listAll<any>(TABLES.pointLedger); const players = await listAll<any>(TABLES.players); const tournaments = await listAll<any>(TABLES.tournaments);
    const seasonId = String(query.seasonId || ''); const totals = new Map<string, number>(); const events = new Map<string, any[]>();
    ledger.filter(e => !e.reversedAt && (!seasonId || e.seasonId === seasonId)).forEach(e => { totals.set(e.teamId, (totals.get(e.teamId)||0)+Number(e.points||0)); const list=events.get(e.teamId)||[]; list.push(e); events.set(e.teamId,list); });
    const ranked: any[] = teams.filter(t=>!t.deletedAt).filter(t=>!query.tier||t.tierName===query.tier).filter(t=>!query.region||t.region===query.region).map(t=>({ ...t, points: Math.round((totals.get(t.id) ?? (seasonId ? 0 : Number(t.points||0)))*100)/100, events: events.get(t.id)||[] })).sort((a:any,b:any)=>Number(b.points)-Number(a.points)||String(a.name).localeCompare(String(b.name))).map((t,i)=>({...t,rank:i+1}));
    const playersRanked: any[] = players.filter(p=>!p.deletedAt).map((p:any):any=>({ ...p, points: ranked.find((t: any)=>t.id===p.teamId)?.points || 0, teamName: (ranked.find((t: any)=>t.id===p.teamId) as any)?.name || p.teamName || 'Free Agent' })).sort((a:any,b:any)=>Number(b.points)-Number(a.points)||String(a.inGameName).localeCompare(String(b.inGameName))).map((p,i)=>({...p,rank:i+1}));
    const history = ranked.map((t: any)=>({teamId:t.id,teamName:t.name,tier:t.tierName,region:t.region,points:t.points,events:t.events.map((e: any)=>({tournamentId:e.tournamentId,tournamentName:tournaments.find((x: any)=>x.id===e.tournamentId)?.name||e.tournamentName,placement:e.placement,points:e.points,createdAt:e.createdAt}))}));
    return json({ teams: await freshTeams(ranked), players: playersRanked, history });
  }],

  'GET /api/public/transfer-news': [async ({ query }) => {
    const rows = await listAll<any>(TABLES.transferNews);
    const news = rows.filter(n => !n.deletedAt && n.status === 'published' && (!query.category || n.category === query.category)).sort((a,b) => String(b.publishedAt || b.createdAt).localeCompare(String(a.publishedAt || a.createdAt)));
    return json({ news });
  }],

  'GET /api/public/seasons': [async () => {
    const seasons = (await listAll<any>(TABLES.seasons)).filter(s => !s.deletedAt).sort((a,b) => String(b.startDate || '').localeCompare(String(a.startDate || '')));
    return json({ seasons });
  }],

  'GET /api/manager/me': [requireAuth(), async ({ user }) => {
    const email = String(user?.email || '').toLowerCase();
    const rows: any = await listAll<any>(TABLES.adminUsers);
    const saved = rows.find((r: any) => String(r.email).toLowerCase() === email && r.role === 'Team Manager' && r.active !== false);
    if (!saved?.teamId) return error('No active Team Manager account is assigned to this email.', 403);
    const team = await getById<any>(TABLES.teams, saved.teamId);
    if (!team || team.deletedAt) return error('Assigned team was not found.', 404);
    return json({ user: { email: user?.email, name: user?.name, role: 'Team Manager', teamId: team.id }, team: await freshTeamMedia(team) });
  }],

  'GET /api/manager/tournaments': [requireAuth(), async ({ user }) => {
    const email = String(user?.email || '').toLowerCase(); const rows: any = await listAll<any>(TABLES.adminUsers); const saved = rows.find((r: any) => String(r.email || '').toLowerCase() === email && r.role === 'Team Manager' && r.active !== false); if (!saved?.teamId) return error('No active Team Manager account is assigned to this email.', 403);
    const tournaments = (await listAll<any>(TABLES.tournaments)).filter((t: any) => !t.deletedAt && ['draft','registration','check-in','ongoing'].includes(t.status));
    return json({ tournaments: tournaments.map((t: any) => ({ ...t, registered: (t.participants || []).includes(saved.teamId) })) });
  }],

  'POST /api/manager/tournaments/:id/register': [requireAuth(), async ({ user, params }) => {
    if (!rateLimit(rateKey(user, 'manager-register'), 30, 60000)) return error('Registration requests are temporarily rate limited.', 429);
    const email = String(user?.email || '').toLowerCase(); const rows: any = await listAll<any>(TABLES.adminUsers); const saved = rows.find((r: any) => String(r.email || '').toLowerCase() === email && r.role === 'Team Manager' && r.active !== false); if (!saved?.teamId) return error('No active Team Manager account is assigned to this email.', 403);
    const tournament = await getById<any>(TABLES.tournaments, params.id); const team = await getById<any>(TABLES.teams, saved.teamId); if (!tournament || tournament.deletedAt || !team || team.deletedAt) return error('Tournament or team not found.', 404);
    if (!['draft','registration'].includes(tournament.status)) return error('Registration is closed for this tournament.', 400);
    if (tournament.type === 'Tier 2 Only' && team.tierName !== 'Tier 2') return error('This tournament accepts Tier 2 teams only.', 400);
    if (tournament.type === 'Tier 1 Only' && team.tierName !== 'Tier 1') return error('This tournament accepts Tier 1 teams only.', 400);
    if ((tournament.participants || []).length >= Number(tournament.maxTeams || tournament.bracketSize || 0) && !(tournament.participants || []).includes(team.id)) return error('Tournament capacity reached.', 409);
    if ((tournament.participants || []).includes(team.id)) return json({ tournament });
    const participants = [...(tournament.participants || []), team.id]; await db.update(TABLES.tournaments, [{ id: tournament.id, record: { ...tournament, participants, updatedAt: now() } }]); await audit(user, 'TEAM_MANAGER_REGISTER', 'tournament', tournament.id, team.id); return json({ tournament: await getById<any>(TABLES.tournaments, tournament.id) });
  }],

  'POST /api/manager/tournaments/:id/check-in': [requireAuth(), async ({ user, params, body }) => {
    const email=String(user?.email||'').toLowerCase(); const rows:any[]=await listAll<any>(TABLES.adminUsers); const saved=rows.find((r:any)=>String(r.email||'').toLowerCase()===email&&r.role==='Team Manager'&&r.active!==false); if(!saved?.teamId)return error('No active Team Manager account is assigned to this email.',403);
    const tournament:any=await getById<any>(TABLES.tournaments,params.id); if(!tournament||tournament.deletedAt)return error('Tournament not found.',404);
    if(!(tournament.participants||[]).includes(saved.teamId))return error('Your team is not registered for this tournament.',403);
    if(!['check-in','ongoing'].includes(tournament.status))return error('Check-in is not open for this tournament.',400);
    const payload:any=body||{}; const checked=payload.checkedIn!==false; const checkIns:any={...((tournament.checkIns as any)||{}),[saved.teamId]:{checkedIn:checked,at:now(),by:email}}; const next={...tournament,checkIns,updatedAt:now()}; delete next.id;
    await db.update(TABLES.tournaments,[{id:tournament.id,record:next}]); await audit(user,'TEAM_CHECK_IN','tournament',tournament.id,checked?'checked-in':'checked-out'); return json({tournament:await getById<any>(TABLES.tournaments,tournament.id)});
  }],
  'POST /api/manager/tournaments/:id/roster-lock': [requireAuth(), async ({ user, params }) => {
    const email=String(user?.email||'').toLowerCase(); const rows:any[]=await listAll<any>(TABLES.adminUsers); const saved=rows.find((r:any)=>String(r.email||'').toLowerCase()===email&&r.role==='Team Manager'&&r.active!==false); if(!saved?.teamId)return error('No active Team Manager account is assigned to this email.',403);
    const tournament:any=await getById<any>(TABLES.tournaments,params.id); if(!tournament||tournament.deletedAt)return error('Tournament not found.',404);
    if(!(tournament.participants||[]).includes(saved.teamId))return error('Your team is not registered for this tournament.',403); if(!['check-in','ongoing'].includes(tournament.status))return error('Roster lock is only available during check-in or ongoing play.',400);
    const locks={...(tournament.rosterLocks||{}),[saved.teamId]:{locked:true,lockedAt:now(),lockedBy:email}}; const next={...tournament,rosterLocks:locks,updatedAt:now()}; delete next.id;
    await db.update(TABLES.tournaments,[{id:tournament.id,record:next}]); await audit(user,'ROSTER_LOCK','tournament',tournament.id,saved.teamId); return json({tournament:await getById<any>(TABLES.tournaments,tournament.id)});
  }],

  'GET /api/manager/matches': [requireAuth(), async ({ user }) => {
    const email = String(user?.email || '').toLowerCase(); const rows: any = await listAll<any>(TABLES.adminUsers); const saved = rows.find((r: any) => String(r.email || '').toLowerCase() === email && r.role === 'Team Manager' && r.active !== false); if (!saved?.teamId) return error('No active Team Manager account is assigned to this email.', 403);
    const matches = (await listAll<any>(TABLES.matches)).filter((m: any) => !m.deletedAt && (m.teamAId === saved.teamId || m.teamBId === saved.teamId)); return json({ matches });
  }],

  'PUT /api/manager/matches/:id/ready': [requireAuth(), async ({ user, params, body }) => {
    const email=String(user?.email||'').toLowerCase(); const admins:any[]=await listAll<any>(TABLES.adminUsers);
    const saved=admins.find((r:any)=>String(r.email||'').toLowerCase()===email&&r.role==='Team Manager'&&r.active!==false); if(!saved?.teamId)return error('No active Team Manager account is assigned to this email.',403);
    const match:any=await getById<any>(TABLES.matches,params.id); if(!match||match.deletedAt||(match.teamAId!==saved.teamId&&match.teamBId!==saved.teamId))return error('Match not found or not assigned to your team.',404);
    const next:any={...match,updatedAt:now()}; const payload:any=body||{}; const readyState=payload.ready!==false; if(match.teamAId===saved.teamId)next.teamAReady=readyState; else next.teamBReady=readyState;
    delete next.id; await db.update(TABLES.matches,[{id:match.id,record:next}]); await audit(user,'TEAM_READY_STATUS','match',match.id,readyState?'ready':'not-ready'); return json({match:await getById<any>(TABLES.matches,match.id)});
  }],
  'PUT /api/manager/matches/:id': [requireAuth(), async ({ user, params, body }) => {
    if (!rateLimit(rateKey(user, 'manager-match-write'), 60, 60000)) return error('Score updates are temporarily rate limited.', 429);
    const email = String(user?.email || '').toLowerCase(); const rows: any = await listAll<any>(TABLES.adminUsers); const saved = rows.find((r: any) => String(r.email || '').toLowerCase() === email && r.role === 'Team Manager' && r.active !== false); if (!saved?.teamId) return error('No active Team Manager account is assigned to this email.', 403);
    const match = await getById<any>(TABLES.matches, params.id); if (!match || match.deletedAt || (match.teamAId !== saved.teamId && match.teamBId !== saved.teamId)) return error('Match not found or not assigned to your team.', 404);
    const tournament = await getById<any>(TABLES.tournaments, match.tournamentId); if (!tournament || tournament.deletedAt) return error('Tournament not found.', 404); if (tournament.status !== 'ongoing') return error('Scores can only be submitted while the tournament is ongoing.', 400); if (match.status === 'locked') return error('This match is locked.', 409);
    const b: any = body || {}; const scoreA = Math.max(0, Number(b.scoreA ?? match.scoreA ?? 0)); const scoreB = Math.max(0, Number(b.scoreB ?? match.scoreB ?? 0)); const status = ['completed','forfeit','no-show'].includes(String(b.status)) ? String(b.status) : 'completed'; if (status === 'completed' && scoreA === scoreB) return error('A completed match must have a winner.', 400);
    const winnerId = b.winnerId || (scoreA > scoreB ? match.teamAId : match.teamBId); if (winnerId !== saved.teamId) return error('Team Managers may only submit results where their team is the winner.', 403);
    const allowedMapModes = ['Hardpoint','Search and Destroy','Control']; const mapResults = Array.isArray(b.mapResults) ? b.mapResults.map((x: any) => ({ mode:String(x.mode), teamAWins:Math.max(0,Number(x.teamAWins||0)), teamBWins:Math.max(0,Number(x.teamBWins||0)) })).filter((x: any) => allowedMapModes.includes(x.mode) && x.teamAWins+x.teamBWins>0) : (Array.isArray(match.mapResults) ? match.mapResults : []); if (mapResults.some((x: any)=>x.teamAWins+x.teamBWins>5)) return error('A map mode cannot contain more than 5 maps.',400);
    const updated = { ...match, scoreA, scoreB, winnerId, status, mapResults, notes: String(b.notes || match.notes || ''), evidenceUrl: String(b.evidenceUrl || match.evidenceUrl || ''), completedAt: now(), updatedAt: now(), resultVersion:Number(match.resultVersion||0)+1 }; delete updated.id; await db.update(TABLES.matches,[{id:match.id,record:updated}]); await advanceWinner(match,winnerId); await audit(user,'TEAM_MANAGER_SCORE_UPDATE','match',match.id,`Team ${saved.teamId}`); return json({ match: await getById<any>(TABLES.matches,match.id) });
  }],

  'PUT /api/manager/team': [requireAuth(), async ({ user, body }) => {
    const email = String(user?.email || '').toLowerCase();
    const rows: any = await listAll<any>(TABLES.adminUsers);
    const saved = rows.find((r: any) => String(r.email).toLowerCase() === email && r.role === 'Team Manager' && r.active !== false);
    if (!saved?.teamId) return error('No active Team Manager account is assigned to this email.', 403);
    const locked = (await listAll<any>(TABLES.tournaments)).some((t:any)=>(t.participants||[]).includes(saved.teamId) && t.rosterLocks?.[saved.teamId]?.locked && ['check-in','ongoing'].includes(t.status));
    if (locked) return error('Your tournament roster is locked. Roster changes are not allowed until the tournament is released.', 409);
    const team = await getById<any>(TABLES.teams, saved.teamId);
    if (!team || team.deletedAt) return error('Assigned team was not found.', 404);
    const b: any = body || {};

    let roster: any[];
    try {
      const currentRoster = (await freshTeamMedia(team)).roster || [];
      roster = validateRoster(Array.isArray(b.roster) ? b.roster : currentRoster);
    } catch (e) {
      return error(e instanceof Error ? e.message : 'Invalid roster.', 400);
    }

    const updated = {
      name: team.name,
      slug: team.slug,
      tierId: team.tierId,
      tierName: team.tierName,
      logoPath: team.logoPath || '',
      logoUrl: team.logoUrl || '',
      region: b.region == null ? (team.region || '') : String(b.region).trim(),
      status: team.status,
      socialLinks: b.socialLinks == null ? (team.socialLinks || {}) : b.socialLinks,
      points: team.points || 0,
      verificationStatus: team.verificationStatus || 'unverified',
      verificationReason: team.verificationReason || null,
      verifiedAt: team.verifiedAt || null,
      createdAt: team.createdAt,
      updatedAt: now(),
      deletedAt: team.deletedAt || null,
    };

    await db.update(TABLES.teams, [{ id: team.id, record: updated }]);
    await syncPlayersForTeam({ ...team, ...updated, id: team.id }, roster);
    await audit(user, 'UPDATE', 'team_manager_team', team.id, 'Team Manager self-service update');
    return json({ team: await freshTeamMedia(await getById<any>(TABLES.teams, team.id)) });
  }],

  'POST /api/public/team-manager-applications': [async ({ body }) => {
    const b: any = body || {};
    const name = String(b.name || '').trim();
    const email = String(b.email || '').trim().toLowerCase();
    const teamId = String(b.teamId || '').trim();
    const message = String(b.message || '').trim();
    if (!name || !email || !email.includes('@') || !teamId) return error('Name, email and team are required.', 400);
    const team = await getById<any>(TABLES.teams, teamId);
    if (!team || team.deletedAt || team.status === 'inactive' || team.status === 'banned') return error('Selected team is not available.', 400);
    const rows: any[] = await listAll<any>(TABLES.adminUsers);
    const existing = rows.find((r: any) => String(r.email || '').toLowerCase() === email && (r.role === 'Team Manager' || r.role === 'Team Manager Applicant') && r.status !== 'rejected');
    if (existing?.role === 'Team Manager' && existing.active !== false) return error('This email already has an active Team Manager account.', 409);
    if (existing?.role === 'Team Manager Applicant' && existing.status === 'pending') return error('A pending application already exists for this email.', 409);
    const [id] = await db.add(TABLES.adminUsers, [{ name, email, teamId, requestedTeamName: team.name, role: 'Team Manager Applicant', status: 'pending', message, active: false, createdAt: now() }]);
    return json({ application: { id, name, email, teamId, teamName: team.name, status: 'pending' } }, 201);
  }],

  'GET /api/admin/referees': [...protectedAdmin, async ({ user }) => {
    if(!(await roleAllowed(user,['Super Admin','Tournament Admin'])))return error('Forbidden',403);
    const rows:any[]=await listAll<any>(TABLES.adminUsers); return json({referees:rows.filter((r:any)=>r.role==='Referee')});
  }],
  'POST /api/admin/referees': [...protectedAdmin, async ({ user, body }) => {
    if(!(await roleAllowed(user,['Super Admin'])))return error('Forbidden',403);
    const b:any=body||{}; const email=String(b.email||'').trim().toLowerCase(), name=String(b.name||'').trim();
    if(!email||!email.includes('@'))return error('Valid referee email is required.',400);
    const rows:any[]=await listAll<any>(TABLES.adminUsers); if(rows.some((r:any)=>String(r.email||'').toLowerCase()===email&&r.active!==false))return error('An active account already exists for this email.',409);
    const [id]=await db.add(TABLES.adminUsers,[{email,name,role:'Referee',active:true,scope:'all',createdAt:now()}]); await audit(user,'CREATE','referee',id);
    return json({referee:await getById<any>(TABLES.adminUsers,id)},201);
  }],
  'GET /api/admin/disputes': [...protectedAdmin, async ({ user }) => {
    if(!(await roleAllowed(user,['Super Admin','Tournament Admin'])))return error('Forbidden',403);
    return json({disputes:(await listAll<any>(TABLES.disputes)).filter((d:any)=>!d.deletedAt).sort((a:any,b:any)=>String(b.createdAt).localeCompare(String(a.createdAt)))});
  }],
  'PUT /api/admin/disputes/:id': [...protectedAdmin, async ({ user, params, body }) => {
    if(!(await roleAllowed(user,['Super Admin','Tournament Admin'])))return error('Forbidden',403);
    const d:any=await getById<any>(TABLES.disputes,params.id); if(!d||d.deletedAt)return error('Dispute not found.',404);
    const b:any=body||{}; const status=['open','resolved','rejected','escalated'].includes(String(b.status))?String(b.status):d.status;
    const next={...d,status,resolution:String(b.resolution||d.resolution||''),resolvedBy:user?.email||user?.userId||'admin',updatedAt:now()}; delete next.id;
    await db.update(TABLES.disputes,[{id:d.id,record:next}]); await audit(user,'DISPUTE_UPDATE','dispute',d.id,status);
    return json({dispute:await getById<any>(TABLES.disputes,d.id)});
  }],
  'GET /api/admin/transfer-news': [...protectedAdmin, async ({ user }) => {
    if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) return error('Forbidden', 403);
    const rows = await listAll<any>(TABLES.transferNews);
    const news = rows.filter(n => !n.deletedAt).sort((a,b) => String(b.publishedAt || b.createdAt).localeCompare(String(a.publishedAt || a.createdAt)));
    return json({ news });
  }],
  'POST /api/admin/transfer-news': [...protectedAdmin, async ({ user, body }) => {
    if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) return error('Forbidden', 403);
    const b:any = body || {};
    const title=String(b.title||'').trim(), category=String(b.category||'Transfer').trim()||'Transfer', playerName=String(b.playerName||'').trim(), fromTeam=String(b.fromTeam||'').trim(), toTeam=String(b.toTeam||'').trim(), summary=String(b.summary||'').trim(), storyBody=String(b.body||'').trim(), status=String(b.status||'draft').trim();
    if(!title||!summary||!storyBody) return error('Title, summary and story body are required.',400);
    if(!['draft','published'].includes(status)) return error('Invalid transfer story status.',400);
    const publishedAt=status==='published'?now():null;
    const [id]=await db.add(TABLES.transferNews,[{title,slug:slugify(title),category,playerName,fromTeam,toTeam,summary,body:storyBody,status,publishedAt,createdAt:now(),updatedAt:now(),deletedAt:null,createdBy:user?.email||user?.userId||'admin'}]);
    await audit(user,'CREATE','transfer_news',id);
    return json({news:await getById<any>(TABLES.transferNews,id)},201);
  }],
  'PUT /api/admin/transfer-news/:id': [...protectedAdmin, async ({ user, params, body }) => {
    if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) return error('Forbidden', 403);
    const item=await getById<any>(TABLES.transferNews,params.id); if(!item||item.deletedAt)return error('Transfer story not found.',404);
    const b:any=body||{}; const status=String(b.status??item.status??'draft');
    if(!['draft','published'].includes(status))return error('Invalid transfer story status.',400);
    const title=String(b.title??item.title).trim(), summary=String(b.summary??item.summary).trim(), storyBody=String(b.body??item.body).trim();
    if(!title||!summary||!storyBody)return error('Title, summary and story body are required.',400);
    const next={...item,title,slug:slugify(title),category:String(b.category??item.category??'Transfer').trim()||'Transfer',playerName:String(b.playerName??item.playerName??'').trim(),fromTeam:String(b.fromTeam??item.fromTeam??'').trim(),toTeam:String(b.toTeam??item.toTeam??'').trim(),summary,body:storyBody,status,publishedAt:status==='published'?(item.publishedAt||now()):null,updatedAt:now()}; delete next.id;
    await db.update(TABLES.transferNews,[{id:item.id,record:next}]); await audit(user,'UPDATE','transfer_news',item.id); return json({news:await getById<any>(TABLES.transferNews,item.id)});
  }],
  'DELETE /api/admin/transfer-news/:id': [...protectedAdmin, async ({ user, params }) => {
    if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) return error('Forbidden',403);
    const item=await getById<any>(TABLES.transferNews,params.id); if(!item||item.deletedAt)return error('Transfer story not found.',404);
    await db.update(TABLES.transferNews,[{id:item.id,record:{...item,deletedAt:now(),updatedAt:now()}}]); await audit(user,'SOFT_DELETE','transfer_news',item.id); return json({deleted:true});
  }],
  'GET /api/admin/team-manager-applications': [...protectedAdmin, async ({ user }) => {
    if (!(await roleAllowed(user, ['Super Admin']))) return error('Forbidden', 403);
    const rows: any[] = await listAll<any>(TABLES.adminUsers);
    const teams: any[] = await listAll<any>(TABLES.teams);
    const applications = rows.filter((r: any) => r.role === 'Team Manager Applicant' && r.status === 'pending').map((r: any) => ({ ...r, teamName: teams.find((t: any) => t.id === r.teamId)?.name || r.requestedTeamName || 'Unassigned' }));
    return json({ applications });
  }],

  'POST /api/admin/team-manager-applications/:id/approve': [...protectedAdmin, async ({ user, params }) => {
    if (!(await roleAllowed(user, ['Super Admin']))) return error('Forbidden', 403);
    const applicant = await getById<any>(TABLES.adminUsers, params.id);
    if (!applicant || applicant.role !== 'Team Manager Applicant' || applicant.status !== 'pending') return error('Pending application not found.', 404);
    const team = await getById<any>(TABLES.teams, applicant.teamId);
    if (!team || team.deletedAt) return error('Requested team no longer exists.', 404);
    const rows: any[] = await listAll<any>(TABLES.adminUsers);
    if (rows.some((r: any) => r.role === 'Team Manager' && r.teamId === team.id && r.active !== false)) return error('This team already has an active Team Manager.', 409);
    const setupToken = crypto.randomBytes(32).toString('hex');
    const setupTokenHash = hashResetToken(setupToken);
    const setupExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const baseUrl = String(process.env.APP_BASE_URL || 'http://localhost').replace(/\/+$/, '');
    const setupUrl = `${baseUrl}/?resetPassword=${encodeURIComponent(setupToken)}&email=${encodeURIComponent(applicant.email)}`;

    const next = {
      ...applicant,
      role: 'Team Manager',
      status: 'approved',
      active: true,
      approvedAt: now(),
      approvedBy: user?.email || user?.userId || 'Super Admin',
      passwordHash: null,
      passwordResetTokenHash: setupTokenHash,
      passwordResetExpiresAt: setupExpiresAt,
    };
    delete next.id;
    await db.update(TABLES.adminUsers, [{ id: applicant.id, record: next }]);

    try {
      await sendManagerPasswordResetEmail(applicant.email, setupUrl);
    } catch (e: any) {
      // Approval remains valid; the admin can resend a reset from the manager
      // login flow once email delivery is configured.
      console.warn(`[AUTH] Manager approval email could not be sent: ${e?.message || e}`);
    }

    await audit(user, 'APPROVE', 'team_manager_application', applicant.id, `Approved for ${team.name}`);
    const response: any = {
      ok: true,
      manager: { id: applicant.id, email: applicant.email, teamId: team.id, teamName: team.name, role: 'Team Manager', active: true },
    };
    if (process.env.NODE_ENV !== 'production') response.setupUrl = setupUrl;
    return json(response);
  }],

  'POST /api/admin/team-manager-applications/:id/reject': [...protectedAdmin, async ({ user, params }) => {
    if (!(await roleAllowed(user, ['Super Admin']))) return error('Forbidden', 403);
    const applicant = await getById<any>(TABLES.adminUsers, params.id);
    if (!applicant || applicant.role !== 'Team Manager Applicant' || applicant.status !== 'pending') return error('Pending application not found.', 404);
    const next = { ...applicant, status: 'rejected', active: false, rejectedAt: now(), rejectedBy: user?.email || user?.userId || 'Super Admin' }; delete next.id;
    await db.update(TABLES.adminUsers, [{ id: applicant.id, record: next }]);
    await audit(user, 'REJECT', 'team_manager_application', applicant.id);
    return json({ ok: true });
  }],

  'GET /api/admin/team-managers': [...protectedAdmin, async ({ user }) => {
    if (!(await roleAllowed(user, ['Super Admin']))) return error('Forbidden', 403);
    const rows: any[] = await listAll<any>(TABLES.adminUsers);
    const teams: any[] = await listAll<any>(TABLES.teams);
    const decorate = (r: any) => ({ ...r, teamName: teams.find((t: any) => t.id === r.teamId && !t.deletedAt)?.name || 'Unassigned' });
    const managers = rows.filter((r: any) => r.role === 'Team Manager' && r.active !== false && !r.deletedAt).map(decorate);
    const disabledManagers = rows.filter((r: any) => r.role === 'Team Manager' && r.active === false && !r.deletedAt).map(decorate);
    return json({ managers, disabledManagers });
  }],

  'POST /api/admin/team-managers': [...protectedAdmin, async ({ user, body }) => {
    if (!(await roleAllowed(user, ['Super Admin']))) return error('Forbidden', 403);
    const b: any = body || {};
    const email = String(b.email || '').trim().toLowerCase();
    const teamId = String(b.teamId || '').trim();
    const password = String(b.password || '');
    const confirmPassword = String(b.confirmPassword || '');

    if (!email || !email.includes('@') || !teamId) return error('Manager email and team are required.', 400);
    if (password.length < 8) return error('Initial password must be at least 8 characters.', 400);
    if (password !== confirmPassword) return error('Passwords do not match.', 400);

    const team = await getById<any>(TABLES.teams, teamId);
    if (!team || team.deletedAt) return error('Team not found.', 404);

    const rows: any[] = await listAll<any>(TABLES.adminUsers);
    if (rows.some((r: any) => String(r.email || '').toLowerCase() === email && r.role === 'Team Manager' && r.active !== false && !r.deletedAt)) {
      return error('An active account already exists for this email.', 409);
    }
    if (rows.some((r: any) => r.role === 'Team Manager' && r.teamId === teamId && r.active !== false && !r.deletedAt)) {
      return error('This team already has an active Team Manager.', 409);
    }

    const passwordHash = await argon2.hash(password);
    const disabled = rows.find((r: any) =>
    String(r.email || '').toLowerCase() === email &&
    r.role === 'Team Manager' &&
    r.active === false &&
    !r.deletedAt
);

if (disabled) {
  return error(
    'A disabled Team Manager account already exists for this email. Use Re-enable instead.',
    409
  );
}

    const [id] = await db.add(TABLES.adminUsers, [{
      email,
      passwordHash,
      role: 'Team Manager',
      teamId,
      active: true,
      status: 'active',
      createdAt: now(),
    }]);
    await audit(user, 'CREATE', 'team_manager', id);
    return json({ manager: { id, email, role: 'Team Manager', teamId, teamName: team.name, active: true } }, 201);
  }],

  'POST /api/admin/team-managers/:id/disable': [...protectedAdmin, async ({ user, params }) => {
    if (!(await roleAllowed(user, ['Super Admin']))) return error('Forbidden', 403);
    const manager = await getById<any>(TABLES.adminUsers, params.id);
    if (!manager || manager.role !== 'Team Manager' || manager.deletedAt) return error('Manager account not found.', 404);
    const next = { ...manager, active: false, status: 'disabled', passwordResetTokenHash: null, passwordResetExpiresAt: null, updatedAt: now() };
    delete next.id;
    await db.update(TABLES.adminUsers, [{ id: manager.id, record: next }]);
    const sessions = (await listAll<any>(TABLES.sessions)).filter((session: any) => session.userId === manager.id);
    if (sessions.length) await db.delete(TABLES.sessions, sessions.map((session: any) => session.id));
    await audit(user, 'DISABLE', 'team_manager', manager.id);
    return json({ ok: true });
  }],

  'POST /api/admin/team-managers/:id/enable': [...protectedAdmin, async ({ user, params }) => {
    if (!(await roleAllowed(user, ['Super Admin']))) return error('Forbidden', 403);
    const manager = await getById<any>(TABLES.adminUsers, params.id);
    if (!manager || manager.role !== 'Team Manager' || manager.deletedAt) return error('Manager account not found.', 404);
    if (manager.active !== false) return error('Manager account is already active.', 409);

    const rows: any[] = await listAll<any>(TABLES.adminUsers);
    if (rows.some((r: any) => r.id !== manager.id && r.role === 'Team Manager' && r.active !== false && !r.deletedAt && r.teamId === manager.teamId)) {
      return error('This team already has an active Team Manager.', 409);
    }

    const next = { ...manager, active: true, status: 'active', updatedAt: now() };
    delete next.id;
    await db.update(TABLES.adminUsers, [{ id: manager.id, record: next }]);
    await audit(user, 'RE_ENABLE', 'team_manager', manager.id);
    return json({ ok: true });
  }],

  'DELETE /api/admin/team-managers/:id': [...protectedAdmin, async ({ user, params }) => {
    if (!(await roleAllowed(user, ['Super Admin']))) return error('Forbidden', 403);
    const manager = await getById<any>(TABLES.adminUsers, params.id);
    if (!manager || manager.role !== 'Team Manager') return error('Manager account not found.', 404);
    const sessions = (await listAll<any>(TABLES.sessions)).filter((session: any) => session.userId === manager.id);
    if (sessions.length) await db.delete(TABLES.sessions, sessions.map((session: any) => session.id));
    await db.delete(TABLES.adminUsers, [manager.id]);
    await audit(user, 'DELETE', 'team_manager', manager.id);
    return json({ ok: true, deleted: true });
  }],

  'GET /api/admin/me': [...protectedAdmin, async ({ user }) => {
    const email = String(user?.email || '').toLowerCase();
    const rows = await listAll<any>(TABLES.adminUsers);
    const saved = rows.find(r => String(r.email).toLowerCase() === email);
    return json({ user: { email: user?.email, name: user?.name, role: saved?.role || 'Super Admin' } });
  }],

  'POST /api/admin/seed': [...protectedAdmin, async ({ user }) => {
    if (!(await roleAllowed(user, ['Super Admin']))) return error('Forbidden', 403);
    const tiers = await listAll<any>(TABLES.tiers);
    if (!tiers.length) {
      await db.add(TABLES.tiers, [
        { name: 'Tier 1', slug: 'tier-1', maxTeams: 10, description: 'Top competitive tier', active: true, createdAt: now(), deletedAt: null },
        { name: 'Tier 2', slug: 'tier-2', maxTeams: 15, description: 'Development tier', active: true, createdAt: now(), deletedAt: null },
      ]);
    }
    const s: any = await settings();
    const next = { ...s, multipliers: { General: 1.5, 'Tier 2 Only': 1 }, points: { Participation: 1, 'Round of 16': 1, Quarterfinal: 1, Semifinal: 1, Final: 2, Champion: 3 } };
    await db.update(TABLES.settings, [{ id: s.id, record: next }]);
    await audit(user, 'SEED', 'system', 'settings');
    return json({ seeded: true });
  }],

  'GET /api/admin/dashboard': [...protectedAdmin, async ({ user }) => {
    if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) return error('Forbidden', 403);
    const [teams, tournaments, matches, logs] = await Promise.all([
      listAll<any>(TABLES.teams), listAll<any>(TABLES.tournaments), listAll<any>(TABLES.matches), listAll<any>(TABLES.auditLogs),
    ]);
    const activeTeams = teams.filter(t => !t.deletedAt && t.status !== 'banned');
    const upcoming = tournaments.filter(t => !t.deletedAt && ['registration', 'check-in', 'ongoing'].includes(t.status)).sort((a,b) => String(a.date).localeCompare(String(b.date)));
    const openMatches = matches.filter(m => !m.deletedAt && ['scheduled', 'pending'].includes(m.status));
    const recentActivity = logs.sort((a,b) => String(b.timestamp).localeCompare(String(a.timestamp))).slice(0, 12);
    return json({ counts: { teams: activeTeams.length, tournaments: tournaments.filter(t => !t.deletedAt).length, matches: matches.filter(m => !m.deletedAt).length, openMatches: openMatches.length }, upcomingTournaments: upcoming.slice(0, 5), recentActivity });
  }],

  'GET /api/admin/tiers': [...protectedAdmin, async ({ user }) => {
    if (!(await roleAllowed(user, ['Super Admin']))) return error('Forbidden', 403);
    return json({ tiers: await listAll<any>(TABLES.tiers) });
  }],

  'PUT /api/admin/tiers/:id': [...protectedAdmin, async ({ user, params, body }) => {
    if (!(await roleAllowed(user, ['Super Admin']))) return error('Forbidden', 403);
    const tier = await getById<any>(TABLES.tiers, params.id);
    if (!tier || tier.deletedAt) return error('Tier not found.', 404);
    const b: any = body || {};
    const maxTeams = Number(b.maxTeams ?? tier.maxTeams);
    if (!String(b.name ?? tier.name).trim() || maxTeams < 1) return error('Tier name and capacity are required.', 400);
    if (maxTeams < await tierCount(tier.id)) return error('Tier capacity cannot be below the number of current teams.', 409);
    const updated = { ...tier, name: String(b.name ?? tier.name).trim(), slug: slugify(String(b.name ?? tier.name)), maxTeams, description: b.description ?? tier.description ?? '', active: b.active ?? tier.active, updatedAt: now() };
    delete updated.id;
    await db.update(TABLES.tiers, [{ id: tier.id, record: updated }]);
    await audit(user, 'UPDATE', 'tier', tier.id);
    return json({ tier: await getById<any>(TABLES.tiers, tier.id) });
  }],

  'DELETE /api/admin/tiers/:id': [...protectedAdmin, async ({ user, params }) => {
    if (!(await roleAllowed(user, ['Super Admin']))) return error('Forbidden', 403);
    const tier = await getById<any>(TABLES.tiers, params.id);
    if (!tier) return error('Tier not found.', 404);
    if (await tierCount(tier.id) > 0) return error('Move all teams out of this tier before deleting it.', 409);
    await db.update(TABLES.tiers, [{ id: tier.id, record: { ...tier, active: false, deletedAt: now() } }]);
    await audit(user, 'SOFT_DELETE', 'tier', tier.id);
    return json({ deleted: true });
  }],

  'POST /api/admin/tiers': [...protectedAdmin, async ({ user, body }) => {
    if (!(await roleAllowed(user, ['Super Admin']))) return error('Forbidden', 403);
    const b: any = body || {};
    if (!b.name || Number(b.maxTeams) < 1) return error('Tier name and capacity are required.', 400);
    const [id] = await db.add(TABLES.tiers, [{
      name: String(b.name).trim(),
      slug: slugify(String(b.name)),
      maxTeams: Number(b.maxTeams),
      description: b.description || '',
      active: b.active !== false,
      createdAt: now(),
      deletedAt: null,
    }]);
    if (!id) return error('Tier creation failed.', 500);
    await audit(user, 'CREATE', 'tier', id);
    return json({ tier: await getById<any>(TABLES.tiers, id) }, 201);
  }],

 'POST /api/admin/teams': [...protectedAdmin, async ({ user, body }) => {
  if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) {
    return error('Forbidden', 403);
  }

  const b: any = body || {};
  const name = String(b.name || '').trim();

  if (!name) {
    return error('Team name is required.', 400);
  }

  const tiers = await listAll<any>(TABLES.tiers);
  const tier = tiers.find(
    t => t.id === b.tierId && t.active && !t.deletedAt
  );

  if (!tier) {
    return error('Invalid active tier.', 400);
  }

  if (await tierCount(tier.id) >= Number(tier.maxTeams)) {
    return error(`${tier.name} is at capacity.`, 409);
  }

  const teams = await listAll<any>(TABLES.teams);
  const slug = String(b.slug || slugify(name));

  if (
    teams.some(
      t => !t.deletedAt &&
        String(t.name).toLowerCase() === name.toLowerCase()
    )
  ) {
    return error('Team name already exists.', 409);
  }

  if (
    teams.some(
      t => !t.deletedAt && t.slug === slug
    )
  ) {
    return error('Team slug already exists.', 409);
  }

  let roster: any[];

  try {
    roster = validateRoster(b.roster || []);
  } catch (e) {
    return error(
      e instanceof Error ? e.message : 'Invalid roster.',
      400
    );
  }

  // Create only the Team fields that actually exist
  // in the Prisma Team model.
  const [id] = await db.add(TABLES.teams, [{
    name,
    slug,
    tierId: tier.id,
    tierName: tier.name,
    logoPath: '',
    logoUrl: '',
    region: b.region || '',
    status: 'active',
    socialLinks: b.socialLinks || {},
    points: 0,
    createdAt: now(),
    deletedAt: null,
  }]);

  if (!id) {
    return error('Team creation failed.', 500);
  }

  // Store roster members in codm_players.
  const createdTeam = await getById<any>(TABLES.teams, id);

  if (createdTeam) {
    await syncPlayersForTeam(createdTeam, roster);
  }

  await audit(user, 'CREATE', 'team', id);

  const team = await getById<any>(TABLES.teams, id);
  const players = (await listAll<any>(TABLES.players))
    .filter(p => p.teamId === id && !p.deletedAt);

  return json({
    team: {
      ...team,
      roster: players,
    },
  }, 201);
}],

  'PUT /api/admin/teams/:id': [...protectedAdmin, async ({ user, params, body }) => {
    if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) return error('Forbidden', 403);
    const team = await getById<any>(TABLES.teams, params.id);
    if (!team || team.deletedAt) return error('Team not found.', 404);
    const b: any = body || {};
    const tiers = await listAll<any>(TABLES.tiers);
    const requestedTierId = String(b.tierId || team.tierId || '').trim();
    const requestedTierName = String(b.tier || '').trim().toLowerCase();
    const target = tiers.find(t => t.id === requestedTierId && t.active && !t.deletedAt) ||
      tiers.find(t => requestedTierName && String(t.name).toLowerCase() === requestedTierName && t.active && !t.deletedAt);
    if (!target) return error('Invalid target tier.', 400);
    if (target.id !== team.tierId && await tierCount(target.id) >= Number(target.maxTeams)) {
      return error(`${target.name} is at capacity.`, 409);
    }

    let roster: any[] | null = null;
    if (Array.isArray(b.roster)) {
      try {
        roster = validateRoster(b.roster);
      } catch (e) {
        return error(e instanceof Error ? e.message : 'Invalid roster.', 400);
      }
    }

    // Only send real Prisma Team fields to the database.
    const updated: any = {
      name: b.name == null ? team.name : String(b.name).trim(),
      slug: b.slug == null ? team.slug : String(b.slug).trim(),
      tierId: target.id,
      tierName: target.name,
      logoPath: b.logoPath == null ? team.logoPath : String(b.logoPath),
      logoUrl: b.logoUrl == null ? team.logoUrl : String(b.logoUrl),
      region: b.region == null ? (team.region || '') : String(b.region).trim(),
      status: b.status == null ? team.status : String(b.status),
      socialLinks: b.socialLinks == null ? (team.socialLinks || {}) : b.socialLinks,
      points: b.points == null ? (team.points || 0) : Number(b.points),
      verificationStatus: b.verificationStatus == null ? (team.verificationStatus || 'unverified') : String(b.verificationStatus),
      verificationReason: b.verificationReason == null ? (team.verificationReason || null) : b.verificationReason,
      verifiedAt: b.verifiedAt === undefined ? (team.verifiedAt || null) : b.verifiedAt,
      createdAt: team.createdAt,
      updatedAt: now(),
      deletedAt: team.deletedAt || null,
    };

    await db.update(TABLES.teams, [{ id: team.id, record: updated }]);

    if (roster) {
      const currentTeam = { ...team, ...updated, id: team.id };
      await syncPlayersForTeam(currentTeam, roster);
    }

    await audit(user, 'UPDATE', 'team', team.id);
    return json({ team: await freshTeamMedia(await getById<any>(TABLES.teams, team.id)) });
  }],

  'DELETE /api/admin/teams/:id': [...protectedAdmin, async ({ user, params }) => {
  if (!(await roleAllowed(user, ['Super Admin']))) {
    return error('Forbidden', 403);
  }

  const team = await getById<any>(TABLES.teams, params.id);

  if (!team) {
    return error('Team not found.', 404);
  }

  const teamId = team.id;
  const teamName = team.name;

  // Record the deletion before removing the team and its related data.
  await audit(
    user,
    'DELETE',
    'team',
    teamId,
    `Permanently deleted ${teamName}`
  );

  // Delete players belonging to the team.
  const players = (await listAll<any>(TABLES.players))
    .filter((p: any) => p.teamId === teamId);

  if (players.length) {
    await db.delete(
      TABLES.players,
      players.map((p: any) => p.id)
    );
  }

  // Delete tournament registrations.
  const registrations = (await listAll<any>(TABLES.tournamentRegistrations))
    .filter((r: any) => r.teamId === teamId);

  if (registrations.length) {
    await db.delete(
      TABLES.tournamentRegistrations,
      registrations.map((r: any) => r.id)
    );
  }

  // Delete point events.
  const pointEvents = (await listAll<any>(TABLES.pointEvents))
    .filter((r: any) => r.teamId === teamId);

  if (pointEvents.length) {
    await db.delete(
      TABLES.pointEvents,
      pointEvents.map((r: any) => r.id)
    );
  }

  // Delete point ledger entries.
  const pointLedger = (await listAll<any>(TABLES.pointLedger))
    .filter((r: any) => r.teamId === teamId);

  if (pointLedger.length) {
    await db.delete(
      TABLES.pointLedger,
      pointLedger.map((r: any) => r.id)
    );
  }

  // Delete sanctions belonging to the team.
  const sanctions = (await listAll<any>(TABLES.sanctions))
    .filter((r: any) => r.teamId === teamId);

  if (sanctions.length) {
    await db.delete(
      TABLES.sanctions,
      sanctions.map((r: any) => r.id)
    );
  }

  // Delete disputes raised by the team.
  const disputes = (await listAll<any>(TABLES.disputes))
    .filter((r: any) => r.teamId === teamId);

  if (disputes.length) {
    await db.delete(
      TABLES.disputes,
      disputes.map((r: any) => r.id)
    );
  }

  // Delete Team Manager accounts and invalidate their sessions.
  const managers = (await listAll<any>(TABLES.adminUsers))
    .filter(
      (r: any) =>
        r.role === 'Team Manager' &&
        r.teamId === teamId
    );

  if (managers.length) {
    const managerIds = managers.map((r: any) => r.id);

    const managerSessions = (await listAll<any>(TABLES.sessions))
      .filter((session: any) =>
        managerIds.includes(session.userId)
      );

    if (managerSessions.length) {
      await db.delete(
        TABLES.sessions,
        managerSessions.map((session: any) => session.id)
      );
    }

    await db.delete(
      TABLES.adminUsers,
      managerIds
    );
  }

  // Delete prize payouts associated with the team.
  const prizePayouts = (await listAll<any>(TABLES.prizePayouts))
    .filter((r: any) => r.teamId === teamId);

  if (prizePayouts.length) {
    await db.delete(
      TABLES.prizePayouts,
      prizePayouts.map((r: any) => r.id)
    );
  }

  // Remove the team from matches instead of deleting historical matches.
  const matches = (await listAll<any>(TABLES.matches))
    .filter(
      (m: any) =>
        m.teamAId === teamId ||
        m.teamBId === teamId ||
        m.winnerId === teamId
    );

  for (const match of matches) {
    const next = {
      ...match,
      teamAId: match.teamAId === teamId ? null : match.teamAId,
      teamBId: match.teamBId === teamId ? null : match.teamBId,
      winnerId: match.winnerId === teamId ? null : match.winnerId,
      teamAName:
        match.teamAId === teamId
          ? 'TBD'
          : match.teamAName,
      teamBName:
        match.teamBId === teamId
          ? 'TBD'
          : match.teamBName,
      updatedAt: now(),
    };

    delete next.id;

    await db.update(
      TABLES.matches,
      [{
        id: match.id,
        record: next,
      }]
    );
  }

  // Remove the team from tournament participant lists.
  const tournaments = await listAll<any>(
    TABLES.tournaments
  );

  for (const tournament of tournaments) {
    if (
      Array.isArray(tournament.participants) &&
      tournament.participants.includes(teamId)
    ) {
      const next = {
        ...tournament,
        participants: tournament.participants.filter(
          (id: string) => id !== teamId
        ),
        updatedAt: now(),
      };

      delete next.id;

      await db.update(
        TABLES.tournaments,
        [{
          id: tournament.id,
          record: next,
        }]
      );
    }
  }

  // Permanently delete the team.
  await db.delete(
    TABLES.teams,
    [teamId]
  );

  return json({
    deleted: true,
    teamId,
    teamName,
  });
}],
  'POST /api/admin/teams/:id/logo': [...protectedAdmin, async ({ user, params, body }) => {
    if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) return error('Forbidden', 403);
    const b: any = body || {};
    if (!b.base64 || !b.contentType) return error('Logo content is required.', 400);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(b.contentType)) return error('Logo must be JPG, PNG or WebP.', 400);
    const raw = String(b.base64).replace(/^data:[^;]+;base64,/, '');
    if (raw.length * 0.75 > 2 * 1024 * 1024) return error('Logo must be 2MB or smaller.', 400);
    const path = `teams/${params.id}/logo`;
    const ok = (await storage.write([{ path, content: raw, contentType: b.contentType }]))[0];
    if (!ok) return error('Logo upload failed.', 500);
    const [{ url }] = await storage.url([path]);
    const team = await getById<any>(TABLES.teams, params.id);
    if (!team) return error('Team not found.', 404);
    await db.update(TABLES.teams, [{ id: team.id, record: { ...team, logoPath: path, logoUrl: '' } }]);
    await audit(user, 'UPLOAD_LOGO', 'team', team.id);
    return json({ url });
  }],

  'POST /api/admin/teams/:id/roster/:index/photo': [...protectedAdmin, async ({ user, params, body }) => {
    if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) return error('Forbidden', 403);
    const team = await getById<any>(TABLES.teams, params.id);
    if (!team || team.deletedAt) return error('Team not found.', 404);
    const index = Number(params.index);
    const players = (await listAll<any>(TABLES.players))
      .filter((p: any) => p.teamId === team.id && !p.deletedAt);
    if (!Number.isInteger(index) || index < 0 || index >= players.length) return error('Roster member not found.', 404);
    const player = players[index];
    const b: any = body || {};
    if (!b.base64 || !b.contentType) return error('Player photo content is required.', 400);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(b.contentType)) return error('Player photo must be JPG, PNG or WebP.', 400);
    const raw = String(b.base64).replace(/^data:[^;]+;base64,/, '');
    if (raw.length * 0.75 > 2 * 1024 * 1024) return error('Player photo must be 2MB or smaller.', 400);
    const path = `teams/${params.id}/roster/${index}/photo`;
    const ok = (await storage.write([{ path, content: raw, contentType: b.contentType }]))[0];
    if (!ok) return error('Player photo upload failed.', 500);
    const [{ url }] = await storage.url([path]);
    await db.update(TABLES.players, [{
      id: player.id,
      record: {
        playerId: player.playerId,
        teamId: player.teamId,
        teamName: player.teamName || team.name,
        inGameName: player.inGameName,
        realName: player.realName || '',
        role: player.role,
        country: player.country || '',
        status: player.status || 'active',
        photoPath: path,
        createdAt: player.createdAt || now(),
        updatedAt: now(),
        deletedAt: player.deletedAt || null,
      },
    }]);
    await audit(user, 'UPLOAD_PLAYER_PHOTO', 'team', team.id, `roster:${index}`);
    const fresh = await freshTeamMedia(team);
    return json({ url, roster: fresh.roster || [] });
  }],

  'POST /api/admin/tournaments': [...protectedAdmin, async ({ user, body }) => {
    if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) return error('Forbidden', 403);
    const b: any = body || {};
    const s: any = await settings();
    const type = b.type || 'General';
    const format = b.format || 'Single Elimination';
    const size = Number(b.bracketSize || 16);
    if (![4, 8, 16, 32, 64].includes(size)) return error('Bracket size must be 4, 8, 16, 32 or 64.', 400);
    if (!['Single Elimination', 'Double Elimination', 'Round Robin'].includes(format)) return error('Unsupported format.', 400);
    const [id] = await db.add(TABLES.tournaments, [{
      name: String(b.name || '').trim(), type, format, bracketSize: size,
      date: b.date || '', timezone: b.timezone || 'Africa/Lagos',
      registrationDeadline: b.registrationDeadline || '', checkInWindow: b.checkInWindow || '',
      maxTeams: Number(b.maxTeams || size), status: b.status || 'draft',
      rules: b.rules || '', prizePool: b.prizePool || '', mapsModes: b.mapsModes || '',
      multiplier: Number(b.multiplier ?? s.multipliers[type] ?? 1),
      seeding: b.seeding || 'random', participants: [], seasonId: b.seasonId || null,
      pointsFinalized: false, createdAt: now(), deletedAt: null,
    }]);
    if (!id) return error('Tournament creation failed.', 500);
    await audit(user, 'CREATE', 'tournament', id);
    return json({ tournament: await getById<any>(TABLES.tournaments, id) }, 201);
  }],

  'PUT /api/admin/tournaments/:id': [...protectedAdmin, async ({ user, params, body }) => {
    if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) return error('Forbidden', 403);
    const tournament = await getById<any>(TABLES.tournaments, params.id);
    if (!tournament || tournament.deletedAt) return error('Tournament not found.', 404);
    const b: any = body || {};
    const requestedFields = Object.keys(b);
    const roleRows = await listAll<any>(TABLES.adminUsers);
    const role = roleRows.find(r => String(r.email).toLowerCase() === String(user?.email || '').toLowerCase())?.role || 'Super Admin';
    const lockError = assertTournamentEditable(tournament, role, requestedFields);
    if (lockError) return lockError;
    const allowedFormats = ['Single Elimination', 'Double Elimination', 'Round Robin'];
    if (b.format && !allowedFormats.includes(b.format)) return error('Unsupported format.', 400);
    const next = { ...tournament, ...b, bracketSize: b.bracketSize ? Number(b.bracketSize) : tournament.bracketSize, multiplier: b.multiplier == null ? tournament.multiplier : Number(b.multiplier), updatedAt: now() };
    delete next.id;
    await db.update(TABLES.tournaments, [{ id: tournament.id, record: next }]);
    await audit(user, 'UPDATE', 'tournament', tournament.id);
    return json({ tournament: await getById<any>(TABLES.tournaments, tournament.id) });
  }],

  'DELETE /api/admin/tournaments/:id': [...protectedAdmin, async ({ user, params }) => {
    if (!(await roleAllowed(user, ['Super Admin']))) return error('Forbidden', 403);
    const tournament = await getById<any>(TABLES.tournaments, params.id);
    if (!tournament) return error('Tournament not found.', 404);
    await db.update(TABLES.tournaments, [{ id: tournament.id, record: { ...tournament, deletedAt: now(), status: 'cancelled' } }]);
    await audit(user, 'SOFT_DELETE', 'tournament', tournament.id);
    return json({ deleted: true });
  }],

  'PUT /api/admin/tournaments/:id/register': [...protectedAdmin, async ({ user, params, body }) => { if (!rateLimit(rateKey(user, 'register'), 30, 60000)) return error('Registration requests are temporarily rate limited.', 429);
    if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) return error('Forbidden', 403);
    const tournament = await getById<any>(TABLES.tournaments, params.id);
    const team = await getById<any>(TABLES.teams, String((body as any)?.teamId || ''));
    if (!tournament || !team || team.deletedAt) return error('Tournament or team not found.', 404);
    if (!['draft', 'registration'].includes(tournament.status)) return error('Registration is closed. Check-in is now controlled separately.', 400);
    if (tournament.type === 'Tier 2 Only' && team.tierName !== 'Tier 2') return error('Tier 2 Only tournaments accept Tier 2 teams only.', 400);
    if (tournament.type === 'Tier 1 Only' && team.tierName !== 'Tier 1') return error('Tier 1 Only tournaments accept Tier 1 teams only.', 400);
    if ((tournament.participants || []).length >= tournament.maxTeams) return error('Tournament capacity reached.', 409);
    if ((tournament.participants || []).includes(team.id)) return json({ tournament });
    const participants = [...(tournament.participants || []), team.id];
    await db.update(TABLES.tournaments, [{ id: tournament.id, record: { ...tournament, participants } }]);
    await audit(user, 'REGISTER_TEAM', 'tournament', tournament.id, team.id);
    return json({ tournament: await getById<any>(TABLES.tournaments, tournament.id) });
  }],

  'POST /api/admin/tournaments/:id/generate-bracket': [...protectedAdmin, async ({ user, params }) => {
    if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) return error('Forbidden', 403);
    const tournament = await getById<any>(TABLES.tournaments, params.id);
    if (!tournament) return error('Tournament not found.', 404);
    const ids = [...new Set(tournament.participants || [])];
    if (ids.length < 2) return error('Register at least two teams.', 400);
    if (tournament.pointsFinalized) return error('This tournament is locked after points finalization.', 409);
    const size = Math.min(Number(tournament.bracketSize || 16), 2 ** Math.ceil(Math.log2(ids.length)));
    const teamRows = await Promise.all(ids.map((id: string) => getById<any>(TABLES.teams, id)));
    let seeded = teamRows.filter(Boolean).map((t: any) => t.id);
    if (tournament.seeding === 'ranking') seeded.sort((a: string, b: string) => Number(teamRows.find((t: any) => t?.id === b)?.points || 0) - Number(teamRows.find((t: any) => t?.id === a)?.points || 0));
    if (tournament.seeding === 'random') seeded.sort(() => Math.random() - 0.5);
    const existing = (await listAll<any>(TABLES.matches)).filter(m => m.tournamentId === tournament.id);
    if (existing.length) await db.delete(TABLES.matches, existing.map(m => m.id));
    const rows = tournament.format === 'Double Elimination'
      ? makeDoubleBracket(tournament.id, seeded, size)
      : makeSingleBracket(tournament.id, seeded, size);
    for (let i = 0; i < rows.length; i += 100) await db.add(TABLES.matches, rows.slice(i, i + 100));
    await resolveByes(tournament.id);
    await db.update(TABLES.tournaments, [{ id: tournament.id, record: { ...tournament, status: 'ongoing', bracketGeneratedAt: now(), bracketVersion: Number(tournament.bracketVersion || 0) + 1 } }]);
    await audit(user, 'GENERATE_BRACKET', 'tournament', tournament.id);
    return json({ matches: (await listAll<any>(TABLES.matches)).filter(m => m.tournamentId === tournament.id) });
  }],

  'PUT /api/admin/matches/:id': [...protectedAdmin, async ({ user, params, body }) => { if (!rateLimit(rateKey(user, 'match-write'), 120, 60000)) return error('Match update requests are temporarily rate limited.', 429);
    if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) return error('Forbidden', 403);
    const match = await getById<any>(TABLES.matches, params.id);
    if (!match) return error('Match not found.', 404);
    const tournament = await getById<any>(TABLES.tournaments, match.tournamentId);
    if (!tournament || tournament.deletedAt) return error('Tournament not found.', 404);
    if (['completed', 'cancelled'].includes(tournament.status) && !(await roleAllowed(user, ['Super Admin']))) return error('Completed tournaments are read-only.', 409);
    const b: any = body || {};
    const scoreA = b.scoreA == null ? match.scoreA : Number(b.scoreA);
    const scoreB = b.scoreB == null ? match.scoreB : Number(b.scoreB);
    const status = normalizeMatchStatus(b.status);
    if (['completed', 'forfeit', 'no-show', 'disqualified'].includes(status) && !match.teamAId && !match.teamBId) return error('A match needs at least one participating team.', 400);
    if (['completed', 'pending-result'].includes(status) && (!Number.isFinite(scoreA) || !Number.isFinite(scoreB) || scoreA === scoreB)) return error('Completed results require non-tied numeric scores.', 400);
    const winnerId = b.winnerId || (status === 'completed' ? (scoreA > scoreB ? match.teamAId : match.teamBId) : b.winnerId);
    if (match.status === 'locked') return error('This match is locked until the bracket makes it active.', 409);
    if (['completed', 'forfeit', 'disqualified'].includes(status) && (!match.teamAId || !match.teamBId) && status !== 'no-show') return error('A finalized match requires two participating teams.', 409);
    const allowedMapModes = ['Hardpoint', 'Search and Destroy', 'Control'];
    const mapResults = Array.isArray(b.mapResults) ? b.mapResults.map((x: any) => ({ mode: String(x.mode), teamAWins: Math.max(0, Number(x.teamAWins || 0)), teamBWins: Math.max(0, Number(x.teamBWins || 0)) })).filter((x: any) => allowedMapModes.includes(x.mode) && (x.teamAWins + x.teamBWins) > 0) : (Array.isArray(match.mapResults) ? match.mapResults : []);
    if (mapResults.some((x: any) => x.teamAWins + x.teamBWins > 5)) return error('A map mode cannot contain more than 5 maps.', 400);
    const updated = { ...match, scoreA, scoreB, winnerId, status, mapResults, notes: b.notes || match.notes || '', evidenceUrl: b.evidenceUrl || match.evidenceUrl || '', completedAt: ['completed','forfeit','no-show','disqualified'].includes(status) ? now() : match.completedAt || null, updatedAt: now(), resultVersion: Number(match.resultVersion || 0) + 1 };
    delete updated.id;
    await db.update(TABLES.matches, [{ id: match.id, record: updated }]);
    if (winnerId && ['completed','forfeit','no-show','disqualified'].includes(status)) await advanceWinner(match, winnerId);
    if (match.matchKey === 'GF-1' && winnerId && ['completed','forfeit','disqualified','no-show'].includes(status)) {
      const reset = (await listAll<any>(TABLES.matches)).find(m => m.matchKey === 'GF-2' && m.tournamentId === match.tournamentId && !m.deletedAt);
      if (reset) {
        const resetNeeded = winnerId === match.teamBId;
        const resetRecord = resetNeeded
          ? { ...reset, teamAId: match.teamAId, teamBId: match.teamBId, status: 'scheduled', resetTriggeredBy: winnerId, activatedAt: now() }
          : { ...reset, status: 'cancelled', cancelledReason: 'Winner of Grand Final 1 was the undefeated Winners Bracket champion.' };
        delete resetRecord.id;
        await db.update(TABLES.matches, [{ id: reset.id, record: resetRecord }]);
      }
    }
    await audit(user, 'UPDATE_RESULT', 'match', match.id, b.reason || '');
    await notifySubscribers('tournament', match.tournamentId, { matchId: match.id, winnerId, status });
    if (tournament && ['Grand Final','Grand Final Reset'].includes(match.roundName) && ['completed','forfeit','disqualified','no-show'].includes(status) && winnerId) await finalizePoints(tournament, user);
    return json({ match: await getById<any>(TABLES.matches, match.id) });
  }],

  'DELETE /api/admin/matches/:id': [...protectedAdmin, async ({ user, params }) => {
    if (!(await roleAllowed(user, ['Super Admin']))) return error('Forbidden', 403);
    const match = await getById<any>(TABLES.matches, params.id);
    if (!match) return error('Match not found.', 404);
    await db.update(TABLES.matches, [{ id: match.id, record: { ...match, deletedAt: now(), status: 'cancelled' } }]);
    await audit(user, 'SOFT_DELETE', 'match', match.id);
    return json({ deleted: true });
  }],

  'POST /api/admin/seasons': [...protectedAdmin, async ({ user, body }) => {
    if (!(await roleAllowed(user, ['Super Admin']))) return error('Forbidden', 403);
    const b: any = body || {};
    if (!String(b.name || '').trim()) return error('Season name is required.', 400);
    const [id] = await db.add(TABLES.seasons, [{ name: String(b.name).trim(), startDate: b.startDate || '', endDate: b.endDate || '', status: b.status || 'draft', createdAt: now(), deletedAt: null }]);
    if (!id) return error('Season creation failed.', 500);
    await audit(user, 'CREATE', 'season', id);
    return json({ season: await getById<any>(TABLES.seasons, id) }, 201);
  }],

  'PUT /api/admin/seasons/:id': [...protectedAdmin, async ({ user, params, body }) => {
    if (!(await roleAllowed(user, ['Super Admin']))) return error('Forbidden', 403);
    const season = await getById<any>(TABLES.seasons, params.id);
    if (!season || season.deletedAt) return error('Season not found.', 404);
    const next = { ...season, ...(body as any), updatedAt: now() }; delete next.id;
    await db.update(TABLES.seasons, [{ id: season.id, record: next }]);
    await audit(user, 'UPDATE', 'season', season.id);
    return json({ season: await getById<any>(TABLES.seasons, season.id) });
  }],

  'GET /api/admin/seasons': [...protectedAdmin, async ({ user }) => {
    if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) return error('Forbidden', 403);
    return json({ seasons: (await listAll<any>(TABLES.seasons)).filter(s => !s.deletedAt) });
  }],

  'POST /api/admin/tournaments/:id/reset-bracket': [...protectedAdmin, async ({ user, params }) => {
    if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) return error('Forbidden', 403);
    const tournament = await getById<any>(TABLES.tournaments, params.id);
    if (!tournament) return error('Tournament not found.', 404);
    if (['completed', 'cancelled'].includes(tournament.status)) return error('Completed or cancelled tournaments cannot be reset.', 400);
    const matches = (await listAll<any>(TABLES.matches)).filter(m => m.tournamentId === tournament.id && !m.deletedAt);
    if (matches.length) await db.delete(TABLES.matches, matches.map(m => m.id));
    await db.update(TABLES.tournaments, [{ id: tournament.id, record: { ...tournament, status: 'registration', bracketGeneratedAt: null, pointsFinalized: false } }]);
    await audit(user, 'RESET_BRACKET', 'tournament', tournament.id);
    return json({ reset: true });
  }],

  'GET /api/admin/health': [...protectedAdmin, async ({ user }) => {
    if (!(await roleAllowed(user, ['Super Admin']))) return error('Forbidden', 403);
    const [teams, tournaments, matches, ledger] = await Promise.all([listAll<any>(TABLES.teams), listAll<any>(TABLES.tournaments), listAll<any>(TABLES.matches), listAll<any>(TABLES.pointLedger)]);
    const orphanMatches = matches.filter(m => !m.deletedAt && m.tournamentId && !tournaments.some(t => t.id === m.tournamentId && !t.deletedAt)).length;
    const negativeScores = matches.filter(m => Number(m.scoreA) < 0 || Number(m.scoreB) < 0).length;
    const completedWithoutWinner = matches.filter(m => ['completed','forfeit','no-show','disqualified'].includes(m.status) && !m.winnerId).length;
    return json({ status: orphanMatches || negativeScores || completedWithoutWinner ? 'attention' : 'healthy', checks: { orphanMatches, negativeScores, completedWithoutWinner, ledgerEntries: ledger.length, teams: teams.filter(t => !t.deletedAt).length, tournaments: tournaments.filter(t => !t.deletedAt).length } });
  }],

  'POST /api/admin/tournaments/:id/recalculate-points': [...protectedAdmin, async ({ user, params }) => {
    if (!(await roleAllowed(user, ['Super Admin']))) return error('Forbidden', 403);
    const tournament = await getById<any>(TABLES.tournaments, params.id);
    if (!tournament || tournament.deletedAt) return error('Tournament not found.', 404);
    if (!tournament.pointsFinalized) return error('Finalize the tournament before recalculating points.', 409);
    const existing = (await listAll<any>(TABLES.pointLedger)).filter(e => e.tournamentId === tournament.id && !e.reversedAt);
    for (const row of existing) await db.update(TABLES.pointLedger, [{ id: row.id, record: { ...row, reversedAt: now(), reversalReason: 'Superseded by recalculation' } }]);
    await finalizePoints(tournament, user);
    await audit(user, 'RECALCULATE_POINTS', 'tournament', tournament.id, 'Recalculated ranking ledger');
    return json({ recalculated: true });
  }],

  'GET /api/public/sponsors': [async () => {
    const sponsors = (await listAll<any>(TABLES.sponsors))
      .filter(s => !s.deletedAt && s.active !== false)
      .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0) || String(a.name).localeCompare(String(b.name)));
    return json({ sponsors });
  }],

  'GET /api/admin/sponsors': [...protectedAdmin, async ({ user }) => {
    if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) return error('Forbidden', 403);
    const sponsors = (await listAll<any>(TABLES.sponsors)).filter(s => !s.deletedAt).sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));
    return json({ sponsors });
  }],

  'POST /api/admin/sponsors': [...protectedAdmin, async ({ user, body }) => {
    if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) return error('Forbidden', 403);
    const b: any = body || {};
    const name = String(b.name || '').trim();
    if (!name) return error('Sponsor name is required.', 400);
    const [id] = await db.add(TABLES.sponsors, [{
      name,
      tier: String(b.tier || 'Partner'),
      logoUrl: String(b.logoUrl || '').trim(),
      website: String(b.website || '').trim(),
      description: String(b.description || '').trim(),
      priority: Number(b.priority || 0),
      active: b.active !== false,
      createdAt: now(),
      deletedAt: null,
    }]);
    if (!id) return error('Sponsor creation failed.', 500);
    await audit(user, 'CREATE', 'sponsor', id);
    return json({ sponsor: await getById<any>(TABLES.sponsors, id) }, 201);
  }],

  'PUT /api/admin/sponsors/:id': [...protectedAdmin, async ({ user, params, body }) => {
    if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) return error('Forbidden', 403);
    const sponsor = await getById<any>(TABLES.sponsors, params.id);
    if (!sponsor || sponsor.deletedAt) return error('Sponsor not found.', 404);
    const next = { ...sponsor, ...(body as any), priority: Number((body as any)?.priority ?? sponsor.priority ?? 0), updatedAt: now() };
    delete next.id;
    await db.update(TABLES.sponsors, [{ id: sponsor.id, record: next }]);
    await audit(user, 'UPDATE', 'sponsor', sponsor.id);
    return json({ sponsor: await getById<any>(TABLES.sponsors, sponsor.id) });
  }],

  'DELETE /api/admin/sponsors/:id': [...protectedAdmin, async ({ user, params }) => {
    if (!(await roleAllowed(user, ['Super Admin']))) return error('Forbidden', 403);
    const sponsor = await getById<any>(TABLES.sponsors, params.id);
    if (!sponsor || sponsor.deletedAt) return error('Sponsor not found.', 404);
    await db.update(TABLES.sponsors, [{ id: sponsor.id, record: { ...sponsor, deletedAt: now(), active: false, updatedAt: now() } }]);
    await audit(user, 'SOFT_DELETE', 'sponsor', sponsor.id);
    return json({ deleted: true });
  }],

  'GET /api/admin/payouts': [...protectedAdmin, async ({ user, query }) => {
    if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) return error('Forbidden', 403);
    const payouts = (await listAll<any>(TABLES.prizePayouts))
      .filter(p => !p.deletedAt && (!query.tournamentId || p.tournamentId === query.tournamentId))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return json({ payouts });
  }],

  'POST /api/admin/payouts': [...protectedAdmin, async ({ user, body }) => {
    if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) return error('Forbidden', 403);
    const b: any = body || {};
    const tournamentId = String(b.tournamentId || '');
    const teamId = String(b.teamId || '');
    const amount = Number(b.amount);
    if (!tournamentId || !teamId || !Number.isFinite(amount) || amount < 0) return error('Tournament, team and a valid non-negative amount are required.', 400);
    const tournament = await getById<any>(TABLES.tournaments, tournamentId);
    const team = await getById<any>(TABLES.teams, teamId);
    if (!tournament || tournament.deletedAt || !team || team.deletedAt) return error('Tournament or team not found.', 404);
    const [id] = await db.add(TABLES.prizePayouts, [{
      tournamentId,
      tournamentName: tournament.name,
      teamId,
      teamName: team.name,
      placement: String(b.placement || ''),
      amount,
      currency: String(b.currency || 'NGN').toUpperCase(),
      status: String(b.status || 'pending'),
      method: String(b.method || 'bank_transfer'),
      reference: String(b.reference || '').trim(),
      notes: String(b.notes || '').trim(),
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
    }]);
    if (!id) return error('Payout creation failed.', 500);
    await audit(user, 'CREATE', 'payout', id, tournament.name);
    return json({ payout: await getById<any>(TABLES.prizePayouts, id) }, 201);
  }],

  'PUT /api/admin/payouts/:id': [...protectedAdmin, async ({ user, params, body }) => {
    if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) return error('Forbidden', 403);
    const payout = await getById<any>(TABLES.prizePayouts, params.id);
    if (!payout || payout.deletedAt) return error('Payout not found.', 404);
    const b: any = body || {};
    const allowed = ['pending', 'processing', 'paid', 'failed', 'cancelled'];
    if (b.status && !allowed.includes(String(b.status))) return error('Invalid payout status.', 400);
    const next = {
      ...payout,
      ...b,
      amount: b.amount == null ? payout.amount : Number(b.amount),
      currency: String(b.currency || payout.currency || 'NGN').toUpperCase(),
      updatedAt: now(),
    };
    delete next.id;
    await db.update(TABLES.prizePayouts, [{ id: payout.id, record: next }]);
    await audit(user, 'UPDATE', 'payout', payout.id, String(b.status || ''));
    return json({ payout: await getById<any>(TABLES.prizePayouts, payout.id) });
  }],

  'DELETE /api/admin/payouts/:id': [...protectedAdmin, async ({ user, params }) => {
    if (!(await roleAllowed(user, ['Super Admin']))) return error('Forbidden', 403);
    const payout = await getById<any>(TABLES.prizePayouts, params.id);
    if (!payout || payout.deletedAt) return error('Payout not found.', 404);
    await db.update(TABLES.prizePayouts, [{ id: payout.id, record: { ...payout, deletedAt: now(), status: 'cancelled', updatedAt: now() } }]);
    await audit(user, 'SOFT_DELETE', 'payout', payout.id);
    return json({ deleted: true });
  }],

  'GET /api/public/integrity/:teamId': [async ({ params }) => {
    const team = await getById<any>(TABLES.teams, params.teamId);
    if (!team || team.deletedAt) return error('Team not found.', 404);
    const sanctions = (await listAll<any>(TABLES.sanctions)).filter(s => !s.deletedAt && s.teamId === team.id);
    const verified = team.verificationStatus === 'verified';
    return json({ teamId: team.id, teamName: team.name, verificationStatus: team.verificationStatus || 'unverified', verified, sanctions: sanctions.map(s => ({ id:s.id, type:s.type, status:s.status, reason:s.reason, issuedAt:s.issuedAt, expiresAt:s.expiresAt })) });
  }],

  'GET /api/admin/integrity': [...protectedAdmin, async ({ user }) => {
    if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) return error('Forbidden', 403);
    const [teams, players, sanctions, matches] = await Promise.all([listAll<any>(TABLES.teams), listAll<any>(TABLES.players), listAll<any>(TABLES.sanctions), listAll<any>(TABLES.matches)]);
    return json({
      teams: teams.filter(t => !t.deletedAt).map(t => ({ id:t.id, name:t.name, tier:t.tierName, verificationStatus:t.verificationStatus || 'unverified', verifiedAt:t.verifiedAt || null })),
      players: players.filter(p => !p.deletedAt).map(p => ({ id:p.id, playerId:p.playerId, inGameName:p.inGameName, teamId:p.teamId, teamName:p.teamName, verificationStatus:p.verificationStatus || 'unverified', verifiedAt:p.verifiedAt || null })),
      sanctions: sanctions.filter(s => !s.deletedAt).sort((a,b)=>String(b.issuedAt||b.createdAt).localeCompare(String(a.issuedAt||a.createdAt))),
      evidenceRequiredMatches: matches.filter(m => !m.deletedAt && ['pending-result','disputed'].includes(m.status)).map(m => ({ id:m.id, tournamentId:m.tournamentId, teamAName:m.teamAName, teamBName:m.teamBName, status:m.status, evidenceUrl:m.evidenceUrl || '', roundName:m.roundName }))
    });
  }],

  'PUT /api/admin/integrity/team/:id': [...protectedAdmin, async ({ user, params, body }) => {
    if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) return error('Forbidden', 403);
    const team = await getById<any>(TABLES.teams, params.id);
    if (!team || team.deletedAt) return error('Team not found.', 404);
    const b:any = body || {};
    const status = ['unverified','pending','verified','rejected','suspended'].includes(String(b.verificationStatus)) ? String(b.verificationStatus) : 'unverified';
    const next = { ...team, verificationStatus: status, verificationReason: String(b.reason || team.verificationReason || ''), verifiedAt: status === 'verified' ? now() : team.verifiedAt || null, updatedAt: now() };
    delete next.id;
    await db.update(TABLES.teams,[{id:team.id,record:next}]);
    await audit(user,'UPDATE_VERIFICATION','team',team.id,status);
    return json({ team: await getById<any>(TABLES.teams,team.id) });
  }],

  'PUT /api/admin/integrity/player/:id': [...protectedAdmin, async ({ user, params, body }) => {
    if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) return error('Forbidden', 403);
    const player = await getById<any>(TABLES.players, params.id);
    if (!player || player.deletedAt) return error('Player not found.', 404);
    const b:any = body || {};
    const status = ['unverified','pending','verified','rejected','suspended'].includes(String(b.verificationStatus)) ? String(b.verificationStatus) : 'unverified';
    const next = { ...player, verificationStatus: status, verificationReason: String(b.reason || player.verificationReason || ''), verifiedAt: status === 'verified' ? now() : player.verifiedAt || null, updatedAt: now() };
    delete next.id;
    await db.update(TABLES.players,[{id:player.id,record:next}]);
    await audit(user,'UPDATE_VERIFICATION','player',player.id,status);
    return json({ player: await getById<any>(TABLES.players,player.id) });
  }],

  'POST /api/admin/integrity/sanctions': [...protectedAdmin, async ({ user, body }) => {
    if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) return error('Forbidden', 403);
    const b:any = body || {};
    const type=String(b.type||'warning');
    const status=String(b.status||'active');
    const subjectType=String(b.subjectType||'team');
    if (!['team','player'].includes(subjectType)) return error('Invalid sanction subject.',400);
    if (!String(b.subjectId||'').trim() || !String(b.reason||'').trim()) return error('Subject and reason are required.',400);
    const [id]=await db.add(TABLES.sanctions,[{subjectType,subjectId:String(b.subjectId),subjectName:String(b.subjectName||''),teamId:String(b.teamId||''),teamName:String(b.teamName||''),type,status,reason:String(b.reason),issuedAt:now(),expiresAt:b.expiresAt||null,createdAt:now(),deletedAt:null}]);
    if(!id)return error('Sanction creation failed.',500);
    await audit(user,'CREATE_SANCTION','sanction',id,String(b.reason));
    return json({sanction:await getById<any>(TABLES.sanctions,id)},201);
  }],

  'PUT /api/admin/integrity/sanctions/:id': [...protectedAdmin, async ({ user, params, body }) => {
    if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) return error('Forbidden',403);
    const sanction=await getById<any>(TABLES.sanctions,params.id);
    if(!sanction||sanction.deletedAt)return error('Sanction not found.',404);
    const b:any=body||{};
    const next={...sanction,...b,updatedAt:now()}; delete next.id;
    await db.update(TABLES.sanctions,[{id:sanction.id,record:next}]);
    await audit(user,'UPDATE_SANCTION','sanction',sanction.id,String(b.status||''));
    return json({sanction:await getById<any>(TABLES.sanctions,sanction.id)});
  }],

  'POST /api/admin/integrity/matches/:id/evidence': [...protectedAdmin, async ({ user, params, body }) => {
    if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) return error('Forbidden',403);
    const match=await getById<any>(TABLES.matches,params.id);
    if(!match)return error('Match not found.',404);
    const url=String((body as any)?.evidenceUrl||'').trim();
    if(!url)return error('Evidence URL is required.',400);
    const next={...match,evidenceUrl:url,evidenceAddedAt:now(),evidenceAddedBy:String(user?.email||user?.userId||'admin'),updatedAt:now()}; delete next.id;
    await db.update(TABLES.matches,[{id:match.id,record:next}]);
    await audit(user,'ADD_MATCH_EVIDENCE','match',match.id);
    return json({match:await getById<any>(TABLES.matches,match.id)});
  }],

  'GET /api/admin/settings': [...protectedAdmin, async ({ user }) => {
    if (!(await roleAllowed(user, ['Super Admin']))) return error('Forbidden', 403);
    return json({ settings: await settings() });
  }],

  'PUT /api/admin/settings': [...protectedAdmin, async ({ user, body }) => {
    if (!(await roleAllowed(user, ['Super Admin']))) return error('Forbidden', 403);
    const current: any = await settings();
    const next: any = { ...current, ...(body as any) };
    if (Number(next.multipliers.General) <= Number(next.multipliers['Tier 2 Only'])) return error('General multiplier must be greater than Tier 2 Only.', 400);
    await db.update(TABLES.settings, [{ id: current.id, record: next }]);
    await audit(user, 'UPDATE', 'settings', current.id);
    return json({ settings: next });
  }],

  'GET /api/admin/audit': [...protectedAdmin, async ({ user }) => {
    if (!(await roleAllowed(user, ['Super Admin']))) return error('Forbidden', 403);
    const logs = await listAll<any>(TABLES.auditLogs);
    logs.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
    return json({ logs: logs.slice(0, 200) });
  }],

  'GET /api/admin/export/teams': [...protectedAdmin, async ({ user }) => {
    if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) return error('Forbidden', 403);
    const teams = (await listAll<any>(TABLES.teams)).filter(t => !t.deletedAt);
    const players = (await listAll<any>(TABLES.players)).filter(p => !p.deletedAt);
    const rosterCounts = new Map<string, number>();
    for (const player of players) {
      if (player.teamId) rosterCounts.set(player.teamId, (rosterCounts.get(player.teamId) || 0) + 1);
    }
    const esc = (v: any) => JSON.stringify(String(v ?? ''));
    const csv = ['Team,Tier,Region,Status,Points,Roster Count', ...teams.map(t => [esc(t.name), esc(t.tierName), esc(t.region), esc(t.status), t.points || 0, rosterCounts.get(t.id) || 0].join(','))].join('\n');
    return json({ filename: 'codm-teams.csv', csv });
  }],

  'GET /api/admin/export/tournaments': [...protectedAdmin, async ({ user }) => {
    if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) return error('Forbidden', 403);
    const tournaments = (await listAll<any>(TABLES.tournaments)).filter(t => !t.deletedAt);
    const esc = (v: any) => JSON.stringify(String(v ?? ''));
    const csv = ['Tournament,Type,Format,Date,Status,Participants,Multiplier', ...tournaments.map(t => [esc(t.name), esc(t.type), esc(t.format), esc(t.date), esc(t.status), t.participants?.length || 0, t.multiplier || 1].join(','))].join('\n');
    return json({ filename: 'codm-tournaments.csv', csv });
  }],

  'GET /api/admin/export/matches': [...protectedAdmin, async ({ user }) => {
    if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) return error('Forbidden', 403);
    const matches = (await listAll<any>(TABLES.matches)).filter(m => !m.deletedAt);
    const esc = (v: any) => JSON.stringify(String(v ?? ''));
    const csv = ['Tournament,Round,Match,Team A,Score A,Team B,Score B,Winner,Status', ...matches.map(m => [esc(m.tournamentId), esc(m.roundName), esc(m.matchNumber), esc(m.teamAName || m.teamAId), m.scoreA ?? '', esc(m.teamBName || m.teamBId), m.scoreB ?? '', esc(m.winnerId), esc(m.status)].join(','))].join('\n');
    return json({ filename: 'codm-matches.csv', csv });
  }],

  'GET /api/admin/export/rankings': [...protectedAdmin, async ({ user }) => {
    if (!(await roleAllowed(user, ['Super Admin', 'Tournament Admin']))) return error('Forbidden', 403);
    const teams = (await listAll<any>(TABLES.teams)).filter(t => !t.deletedAt).sort((a, b) => Number(b.points || 0) - Number(a.points || 0));
    const csv = ['Rank,Team,Tier,Region,Points', ...teams.map((t, i) => `${i + 1},${JSON.stringify(t.name)},${t.tierName},${JSON.stringify(t.region || '')},${t.points || 0}`)].join('\n');
    return json({ filename: 'codm-rankings.csv', csv });
  }],
});