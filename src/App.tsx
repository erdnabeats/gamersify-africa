import { useEffect, useMemo, useState } from 'react';
import { api } from './lib/api';
import { auth } from './lib/auth';
import {
  CalendarDays,
  ChevronRight,
  Crown,
  LogOut,
  Plus,
  Settings,
  Shield,
  Swords,
  Trophy,
  Users,
  X,
  Edit3,
  Trash2,
  Download,
  ClipboardList,
  Layers,
  Search,
  RefreshCw,
  Newspaper,
} from 'lucide-react';

type Player = { id: string; playerId: string; inGameName: string; realName?: string; photoUrl?: string; country?: string; role: string; status?: string; teamId?: string; teamName?: string; teamTier?: string; stats?: { matchesPlayed: number; wins: number; losses: number; winRate: number; tournamentsPlayed: number } };
type Person = { playerId?: string; inGameName: string; role: string; realName?: string; photoUrl?: string; country?: string; status?: string };
type MapWinRate = { mode: string; wins: number; mapsPlayed: number; winRate: number };
type TeamDetailData = { team: Team; stats: { tournamentsPlayed: number; matchesPlayed: number; wins: number; losses: number; winRate: number; bestPlacement: string; mapWinRates: MapWinRate[] }; tournamentHistory: { id: string; name: string; date: string; status: string; type: string; placement: string; points: number }[]; pointsBreakdown: { tournamentId: string; tournamentName?: string; placement: string; basePoints: number; multiplier: number; points: number; createdAt: string }[] };
type TournamentStanding = { rank: number; teamId: string; teamName: string; logoUrl?: string; tier: string; played: number; wins: number; losses: number; points: number; placement: string };
type TournamentDetailData = { tournament: Tournament & { prizePool?: string; rules?: string; mapsModes?: string }; participants: Team[]; matches: Match[]; standings: TournamentStanding[]; placements: TournamentStanding[]; prize: string };
type Team = {
  id: string;
  name: string;
  logoUrl?: string;
  tier: string;
  tierId?: string;
  roster: Person[];
  points: number;
  region?: string;
  status?: string;
  updatedAt?: string;
};
type Tournament = {
  id: string;
  name: string;
  date: string;
  type: string;
  format: string;
  bracketSize: number;
  multiplier: number;
  status: string;
  participants: string[];
};
type Match = {
  id: string;
  tournamentName?: string;
  tournamentId: string;
  round: number;
  roundName: string;
  slot: number;
  bracket?: string;
  matchNumber?: string;
  teamAId?: string;
  teamBId?: string;
  teamAName?: string;
  teamBName?: string;
  scoreA?: number;
  scoreB?: number;
  winnerId?: string;
  status: string;
};
type Tier = { id: string; name: string; maxTeams: number; active: boolean };
type AdminSection = 'overview' | 'teams' | 'tournaments' | 'matches' | 'transfers' | 'seasons' | 'settings' | 'managers' | 'disputes' | 'commercial' | 'integrity' | 'audit';
type TransferNews = { id: string; title: string; slug: string; summary: string; body: string; category: string; status: string; playerName: string; fromTeam: string; toTeam: string; publishedAt: string; createdAt: string; };
type Dashboard = { counts: { teams: number; tournaments: number; matches: number; openMatches: number }; upcomingTournaments: Tournament[]; recentActivity: any[] };

const demoTeams: Team[] = [
  { id: 'demo-1', name: 'Nova Reapers', tier: 'Tier 1', roster: [{ inGameName: 'Vex', role: 'Captain' }, { inGameName: 'Rogue', role: 'Player' }, { inGameName: 'Kairo', role: 'Player' }, { inGameName: 'Mako', role: 'Player' }, { inGameName: 'Zed', role: 'Player' }], points: 860, region: 'Nigeria' },
  { id: 'demo-2', name: 'Lagos Legends', tier: 'Tier 1', roster: [{ inGameName: 'Flux', role: 'Captain' }, { inGameName: 'Ace', role: 'Player' }, { inGameName: 'Jinx', role: 'Player' }, { inGameName: 'Nox', role: 'Player' }], points: 720, region: 'Nigeria' },
  { id: 'demo-3', name: 'Raid Unit', tier: 'Tier 2', roster: [{ inGameName: 'Raze', role: 'Captain' }, { inGameName: 'Keen', role: 'Player' }, { inGameName: 'Mills', role: 'Player' }], points: 510, region: 'Nigeria' },
];

function BrandLogo() {
  return (
    <div className='flex items-center gap-3'>
      <div className='relative grid h-10 w-10 place-items-center'>
        <div className='absolute inset-0 rounded-full bg-[#5a2cff]/30 blur-md' />
        <svg viewBox='0 0 64 64' className='relative h-10 w-10' aria-label='Gamersify'>
          <path d='M10 32c0-9 7-16 16-16 7 0 11 4 15 8l8 8c4 4 8 8 15 8' fill='none' stroke='#fdfcfd' strokeWidth='5' strokeLinecap='round' />
          <path d='M10 32c0 9 7 16 16 16 7 0 11-4 15-8l8-8c4-4 8-8 15-8' fill='none' stroke='#fdfcfd' strokeWidth='5' strokeLinecap='round' />
        </svg>
      </div>
      <span className='brand-font text-lg tracking-[0.08em] text-white'>G<span className='text-[#e52a31]'>A</span>MERS<span className='text-[#e52a31]'>I</span>FY</span>
    </div>
  );
}

function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) { return <button type='button' onClick={onToggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'} className='grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.03] text-slate-300 transition hover:border-[#ff2d8d]/50 hover:text-[#ff2d8d]'>{dark ? <span aria-hidden='true' className='text-base'>☀</span> : <span aria-hidden='true' className='text-base'>☾</span>}</button>; }
function GamersifyLoader() {
  return (
    <div className="fixed inset-0 z-[9999] grid min-h-screen place-items-center overflow-hidden bg-[#130233]">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(90,44,255,.22),transparent_55%)]" />

      {/* Moving light */}
      <div className="gf-loader-sweep absolute inset-y-0 -left-1/2 w-1/2 rotate-12 bg-gradient-to-r from-transparent via-[#ff2d8d]/20 to-transparent blur-2xl" />

      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center px-6">
        {/* Africa map artwork */}
        <div className="relative w-full max-w-[620px]">
          <div className="absolute inset-0 animate-pulse rounded-full bg-[#ff2d8d]/10 blur-3xl" />

          <img
            src="/resources/gamersify-loading.png"
            alt="Gamersify Africa"
            className="relative w-full object-contain drop-shadow-[0_0_45px_rgba(255,45,141,.35)]"
          />

          {/* Animated scan line */}
          <div className="gf-loader-scan absolute left-[22%] right-[22%] top-[18%] h-px bg-gradient-to-r from-transparent via-[#ff2d8d] to-transparent" />
        </div>

        {/* Loading status */}
        <div className="mt-[-70px] w-full max-w-[520px] px-8 sm:mt-[-90px]">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="gf-loader-progress h-full rounded-full bg-gradient-to-r from-[#5a2cff] via-[#ff2d8d] to-[#e52a31]" />
          </div>

          <div className="mt-4 flex items-center justify-between text-[9px] font-bold uppercase tracking-[.28em] text-white/50">
            <span>Connecting Africa</span>
            <span className="text-[#ff2d8d]">Loading</span>
          </div>
        </div>
      </div>
    </div>
  );
}
function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('gamersify_theme') !== 'light');
  const [appLoading, setAppLoading] = useState(true);
  const [tab, setTab] = useState<
  | 'home'
  | 'rankings'
  | 'tournaments'
  | 'tournamentDetail'
  | 'teams'
  | 'teamDetail'
  | 'transferNews'
  | 'about'
  | 'contact'
  | 'admin'
  | 'manager'
  | 'live'
  | 'referee'
>('home');
  const [teamDetailId, setTeamDetailId] = useState('');
  const [tournamentDetailId, setTournamentDetailId] = useState('');
  const [teams, setTeams] = useState<Team[]>(demoTeams);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [transferNews, setTransferNews] = useState<TransferNews[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tier, setTier] = useState('All');
  const [signedIn, setSignedIn] = useState(false);
  const [managerSignedIn, setManagerSignedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginType, setLoginType] = useState<'admin' | 'manager'>('admin');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [passwordResetMode, setPasswordResetMode] = useState<'login' | 'forgot' | 'reset'>('login');
  const [passwordResetToken, setPasswordResetToken] = useState('');
  const [passwordResetEmail, setPasswordResetEmail] = useState('');
  const [passwordResetNew, setPasswordResetNew] = useState('');
  const [passwordResetConfirm, setPasswordResetConfirm] = useState('');
  const [managerSignupOpen, setManagerSignupOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');
  const [adminSection, setAdminSection] = useState<AdminSection>('overview');
  const [refereeSignedIn, setRefereeSignedIn] = useState(false);

  useEffect(() => { localStorage.setItem('gamersify_theme', darkMode ? 'dark' : 'light'); document.documentElement.classList.toggle('light', !darkMode); document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light'; }, [darkMode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('resetPassword');
    const email = params.get('email');
    if (token && email) {
      setPasswordResetToken(token);
      setPasswordResetEmail(email);
      setPasswordResetMode('reset');
      setLoginType('manager');
      setLoginOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);


  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      try {
        const user = await auth.getUser();
        if (!user || !active) return;
        const [adminResult, managerResult] = await Promise.allSettled([
          api.get('/api/admin/me'),
          api.get('/api/manager/me'),
        ]);
        if (!active) return;
        setSignedIn(adminResult.status === 'fulfilled' && Boolean(adminResult.value.data?.user));
        setManagerSignedIn(managerResult.status === 'fulfilled' && Boolean(managerResult.value.data?.user));
        const savedTab = localStorage.getItem('gamersify_active_tab');
        if (savedTab === 'admin' && adminResult.status === 'fulfilled') setTab('admin');
        else if (savedTab === 'manager' && managerResult.status === 'fulfilled') setTab('manager');
        // Duplicate declaration of savedTab removed
        if (active && (savedTab === 'admin' || savedTab === 'manager')) setTab(savedTab as any);
      } catch {}
    };
    restoreSession().finally(() => { if (active) setAuthReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!authReady || (!signedIn && !managerSignedIn)) return;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        setAdminMessage('Your session is still active. Continue using the app to keep working securely.');
      }, 45 * 60 * 1000);
    };
    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetIdleTimer, { passive: true }));
    resetIdleTimer();
    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      events.forEach(event => window.removeEventListener(event, resetIdleTimer));
    };
  }, [authReady, signedIn, managerSignedIn]);

  useEffect(() => {
    if (tab === 'admin' || tab === 'manager') localStorage.setItem('gamersify_active_tab', tab);
    else localStorage.removeItem('gamersify_active_tab');
  }, [tab]);

  useEffect(() => {
    Promise.all([
      api.get('/api/public/teams').then(r => setTeams(r.data.teams?.length ? r.data.teams : demoTeams)).catch(() => {}),
      api.get('/api/public/tournaments').then(r => setTournaments(r.data.tournaments || [])).catch(() => {}),
      api.get('/api/public/transfer-news').then(r => setTransferNews(r.data.news || [])).catch(() => {}),
    ]);
  }, []);

  const filteredTeams = useMemo(() => {
    return [...teams.filter(t => tier === 'All' || t.tier === tier)].sort((a, b) => b.points - a.points);
  }, [teams, tier]);

  const openTeam = (id: string) => { setTeamDetailId(id); setTab('teamDetail'); };
  const openTournament = (id: string) => { setTournamentDetailId(id); setTab('tournamentDetail'); };

  const refreshPublic = async () => {
    const [teamResult, tournamentResult] = await Promise.all([
      api.get('/api/public/teams').catch(() => null),
      api.get('/api/public/tournaments').catch(() => null),
    ]);
    if (teamResult?.data?.teams) setTeams(teamResult.data.teams);
    if (tournamentResult?.data?.tournaments) setTournaments(tournamentResult.data.tournaments);
  };

  const submitLogin = async () => {
    if (!loginEmail.trim() || !loginPassword) {
      setAdminMessage('Email and password are required.');
      return;
    }

    setLoginLoading(true);
    setAdminMessage('');

    try {
      await auth.login(loginEmail.trim(), loginPassword);

      if (loginType === 'admin') {
        const me = await api.get('/api/admin/me');

        if (!me.data?.user) {
          throw new Error('This account is not authorized as an administrator.');
        }

        setSignedIn(true);
        setAdminSection('overview');
        setTab('admin');
      } else {
        const me = await api.get('/api/manager/me');

        if (!me.data?.user) {
          throw new Error('This account is not authorized as a Team Manager.');
        }

        setManagerSignedIn(true);
        setTab('manager');
      }

      setLoginOpen(false);
      setLoginPassword('');
    } catch (e: any) {
      await auth.signOut().catch(() => {});

      setAdminMessage(
        e?.message ||
        (loginType === 'admin'
          ? 'Admin sign-in failed.'
          : 'Manager sign-in failed.')
      );
    } finally {
      setLoginLoading(false);
      setAppLoading(false);
    }
  };

  const signIn = () => {
    setLoginType('admin');
    setLoginEmail('');
    setLoginPassword('');
    setAdminMessage('');
    setPasswordResetMode('login');
    setLoginOpen(true);
  };

  const signInReferee = async () => { setAdminMessage(''); try { await auth.signIn({ scope: 'openid email profile offline_access' }); await api.get('/api/referee/me'); setRefereeSignedIn(true); setTab('referee'); } catch (e:any) { setAdminMessage(e?.message || 'Referee sign-in failed.'); } };

  const signInManager = () => {
    setLoginType('manager');
    setLoginEmail('');
    setLoginPassword('');
    setAdminMessage('');
    setPasswordResetMode('login');
    setLoginOpen(true);
  };
  const requestManagerPasswordReset = async () => {
    if (!loginEmail.trim()) {
      setAdminMessage('Enter your manager email first.');
      return;
    }
    setLoginLoading(true);
    setAdminMessage('');
    try {
      const response = await api.post('/api/auth/forgot-password', { email: loginEmail.trim() });
      setAdminMessage(response.data?.message || 'If the account exists, a reset link has been sent.');
      if (response.data?.resetUrl && import.meta.env.DEV) {
        setAdminMessage(`Reset link generated for local development. ${response.data.resetUrl}`);
      }
    } catch (e: any) {
      setAdminMessage(e?.message || 'Could not request a password reset.');
    } finally {
      setLoginLoading(false);
    }
  };

  const submitManagerPasswordReset = async () => {
    if (!passwordResetNew || !passwordResetConfirm) {
      setAdminMessage('Enter and confirm your new password.');
      return;
    }
    if (passwordResetNew.length < 8) {
      setAdminMessage('Password must be at least 8 characters.');
      return;
    }
    if (passwordResetNew !== passwordResetConfirm) {
      setAdminMessage('Passwords do not match.');
      return;
    }
    setLoginLoading(true);
    setAdminMessage('');
    try {
      const response = await api.post('/api/auth/reset-password', {
        token: passwordResetToken,
        email: passwordResetEmail,
        password: passwordResetNew,
        confirmPassword: passwordResetConfirm,
      });
      setAdminMessage(response.data?.message || 'Password reset successfully. You can now sign in.');
      setLoginEmail(passwordResetEmail);
      setLoginPassword('');
      setPasswordResetNew('');
      setPasswordResetConfirm('');
      setPasswordResetMode('login');
    } catch (e: any) {
      setAdminMessage(e?.message || 'Could not reset password.');
    } finally {
      setLoginLoading(false);
    }
  };

  const signOut = async () => {
    await auth.signOut();
    setSignedIn(false);
    setManagerSignedIn(false);
    localStorage.removeItem('gamersify_active_tab');
    setTab('home');
  };

  const loadBracket = async (id: string) => {
    try {
      const r = await api.get(`/api/public/tournaments/${id}/bracket`);
      setMatches(r.data.matches || []);
    } catch {
      setMatches([]);
    }
  };
 


  return (
    <div className='min-h-screen bg-[#09090b] text-slate-100 selection:bg-[#e52a31]/30 selection:text-white'>
      <style>{`
        body { background:#09090b; overflow-x:hidden; transition:background-color .2s ease,color .2s ease; } html.light body { background:#f7f7f8; color:#1b1a1e; } html.light .min-h-screen { background:#f7f7f8 !important; color:#1b1a1e !important; } html.light header { background:#ffffff !important; border-color:#e5e5e7 !important; } html.light main { color:#24202a; }
        html.light .gf-hero-bg { background:#ffffff !important; } html.light main section, html.light main article { background-color:#ffffff !important; border-color:#e5e5e7 !important; box-shadow:0 1px 3px rgba(20,18,24,.04); } html.light main [class*='bg-white/\[.03\]'], html.light main [class*='bg-white/\[.05\]'] { background-color:#ffffff !important; } html.light main [class*='bg-[#111113]'], html.light main [class*='bg-[#0c0a10]'], html.light main [class*='bg-[#0d0716]'], html.light main [class*='bg-[#0f0625]'] { background-color:#ffffff !important; } html.light main [class*='text-white'], html.light header [class*='text-white'] { color:#1b1a1e !important; } html.light main [class*='text-slate-100'], html.light main [class*='text-slate-200'], html.light main [class*='text-slate-300'] { color:#3b3940 !important; } html.light main [class*='text-slate-400'], html.light main [class*='text-slate-500'] { color:#68666d !important; } html.light main [class*='text-slate-600'], html.light main [class*='text-slate-700'] { color:#85828a !important; } html.light main [class*='border-white/10'], html.light main [class*='border-white/5'] { border-color:#e9e9eb !important; } html.light main input, html.light main select, html.light main textarea { background:#ffffff !important; color:#1b1a1e !important; border-color:#d8d8dc !important; box-shadow:none; } html.light main input::placeholder, html.light main textarea::placeholder { color:#8b8493 !important; } html.light .gf-match, html.light .gf-list, html.light .gf-bracket, html.light .gf-news-story { background:#ffffff !important; border-color:#ddd9e3 !important; } html.light .gf-event-head { background:#ffffff !important; border-color:#e5e5e7 !important; } html.light .gf-event-stats, html.light .gf-match-bar, html.light .gf-section-head { border-color:#e2dee7 !important; } html.light .gf-muted, html.light .gf-back, html.light .gf-empty { color:#625b6d !important; } html.light .gf-list-row { border-color:#eeeaf1 !important; } html.light .gf-bracket { background:#ffffff !important; } html.light footer { background:#ffffff !important; border-color:#e5e5e7 !important; color:#68666d !important; }
        main { min-height:calc(100vh - 150px); width:100%; max-width:100%; }
        main section, main article { box-shadow:none; transition:border-color .2s ease, background-color .2s ease; }
        main article:hover { border-color:rgba(229,42,49,.35); }
        main button:not([disabled]), header button:not([disabled]) { transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease, background-color .18s ease; }
        main button:not([disabled]):hover { filter:brightness(1.08); }
        main button:focus-visible, header button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline:2px solid rgba(255,45,141,.75); outline-offset:2px; }
        main input, main select, main textarea { border-color:rgba(126,82,214,.28); background:rgba(8,2,22,.72); color:#f8f7fb; box-shadow:inset 0 1px 0 rgba(255,255,255,.025); }
        main input::placeholder, main textarea::placeholder { color:#625b73; }
        main input:hover, main select:hover, main textarea:hover { border-color:rgba(126,82,214,.48); }
        main input:focus, main select:focus, main textarea:focus { border-color:rgba(255,45,141,.62); box-shadow:0 0 0 3px rgba(255,45,141,.08), 0 8px 30px rgba(90,44,255,.08); } html.light header button { color:#302b38; } html.light header button[class*='bg-white/5'] { background:#f5f3f7 !important; border-color:#cbc5d2 !important; } html.light header button[class*='border-white/10'] { border-color:#cbc5d2 !important; background:#ffffff !important; } html.light .gf-topline { background:#e52a31; }
        main h1, main h2, main h3 { text-wrap:balance; }
        main [class*="border-white/5"] { background:rgba(255,255,255,.025); }
        main [class*="border-[#7e52d6]/20"] { backdrop-filter:none; }
        .gf-topline { height:3px; background:#e52a31; }
        .gf-loader-sweep {
  animation: gfLoaderSweep 2.4s ease-in-out infinite;
}

.gf-loader-scan {
  animation: gfLoaderScan 1.8s ease-in-out infinite;
}

.gf-loader-progress {
  width: 35%;
  animation: gfLoaderProgress 2s ease-in-out infinite;
}

@keyframes gfLoaderSweep {
  0% {
    transform: translateX(-120%) rotate(12deg);
    opacity: 0;
  }

  25% {
    opacity: 1;
  }

  75% {
    opacity: 1;
  }

  100% {
    transform: translateX(420%) rotate(12deg);
    opacity: 0;
  }
}

@keyframes gfLoaderScan {
  0% {
    transform: translateY(-30px);
    opacity: 0;
  }

  30% {
    opacity: 1;
  }

  70% {
    opacity: 1;
  }

  100% {
    transform: translateY(280px);
    opacity: 0;
  }
}

@keyframes gfLoaderProgress {
  0% {
    width: 8%;
  }

  50% {
    width: 72%;
  }

  85% {
    width: 88%;
  }

  100% {
    width: 96%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .gf-loader-sweep,
  .gf-loader-scan,
  .gf-loader-progress {
    animation: none !important;
  }

  .gf-loader-progress {
    width: 70%;
  }
}
        @media (max-width:1023px) {
          html, body { max-width:100%; overflow-x:hidden; }
          header nav { scrollbar-width:none; }
          header nav::-webkit-scrollbar { display:none; }
          main { width:100%; max-width:100%; }
          .gf-shell { padding-inline:clamp(12px,3vw,24px); }
          .gf-page { width:100%; min-width:0; }
          .gf-page > * { min-width:0; }
          .gf-page [class*='grid-cols-'] { min-width:0; }
          .gf-page img { max-width:100%; height:auto; }
          .gf-page h1 { font-size:clamp(2rem,8vw,4rem); line-height:.94; }
          .gf-page h2 { font-size:clamp(1.25rem,5vw,2rem); }
          .gf-page p { overflow-wrap:anywhere; }
          .gf-page button, .gf-page a { min-width:0; }
        }
        @media (max-width:767px) {
          main { min-height:calc(100vh - 175px); }
          .gf-page { padding-bottom:2rem; }
          .gf-page section, .gf-page article { max-width:100%; }
          .gf-page .overflow-x-auto { width:100%; max-width:100%; overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:thin; }
          .gf-page [class*='grid-cols-'] { grid-template-columns:minmax(0,1fr) !important; }
          .gf-page [class*='grid-cols-3'] { grid-template-columns:repeat(2,minmax(0,1fr)) !important; }
          .gf-page [class*='grid-cols-2'] { grid-template-columns:minmax(0,1fr) !important; }
          .gf-page .sm\\:grid-cols-2 { grid-template-columns:minmax(0,1fr) !important; }
          .gf-page .sm\\:grid-cols-3 { grid-template-columns:minmax(0,1fr) !important; }
          .gf-page .sm\\:grid-cols-4 { grid-template-columns:repeat(2,minmax(0,1fr)) !important; }
          .gf-page [class*='min-w-['] { min-width:0 !important; }
          .gf-page .brand-font { letter-spacing:-.02em; }
        }
        @media (min-width:768px) and (max-width:1023px) {
          .gf-page [class*='lg\\:grid-cols-'] { grid-template-columns:minmax(0,1fr) !important; }
          .gf-page [class*='lg\\:min-w-'] { min-width:0 !important; }
        }
        .gf-event-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:28px;align-items:end;border-block:1px solid rgba(126,82,214,.3);background:#10051f;padding:32px 24px}.gf-event-title{font-size:clamp(2.4rem,6vw,5.5rem);line-height:.9;overflow-wrap:anywhere}.gf-event-stats{display:grid;grid-template-columns:repeat(3,minmax(70px,1fr));gap:20px;border-left:1px solid rgba(255,255,255,.1);padding-left:20px}.gf-event-stats b{font-size:20px}.gf-event-stats small{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.16em;color:#625b73}.gf-event-stats .accent{color:#ff3b43}.gf-match{border:1px solid rgba(255,255,255,.1);background:#0c0a10}.gf-match-bar{display:flex;justify-content:space-between;gap:12px;padding:11px 16px;border-bottom:1px solid rgba(255,255,255,.1);font-size:10px;text-transform:uppercase;letter-spacing:.18em}.gf-match-bar span{color:#ff3b43}.gf-match-body{display:grid;grid-template-columns:minmax(0,1fr) 170px minmax(0,1fr);gap:20px;align-items:center;padding:38px 28px}.gf-side{display:flex;align-items:center;justify-content:flex-end;gap:14px;min-width:0}.gf-side:last-child{justify-content:flex-start}.gf-side strong{font-size:clamp(1rem,2.5vw,1.6rem);overflow-wrap:anywhere}.gf-score{text-align:center}.gf-score small{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.2em;color:#625b73}.gf-score b{display:block;font-size:clamp(2rem,5vw,3.5rem);line-height:1.1}.gf-score i{font-style:normal;color:#625b73;padding:0 8px}.gf-two-col{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:28px}.gf-list,.gf-bracket{border-block:1px solid rgba(255,255,255,.1);min-width:0}.gf-section-head{padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.1)}.gf-section-head span,.gf-kicker{font-size:10px;font-weight:900;letter-spacing:.2em;color:#ff3b43}.gf-section-head h2{margin-top:3px;font-size:24px;text-transform:uppercase}.gf-list-row{display:grid;grid-template-columns:32px 40px minmax(0,1fr) auto;gap:10px;align-items:center;width:100%;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.05);text-align:left}.gf-list-row em{font-style:normal;font-size:11px;color:#625b73}.gf-list-row span{min-width:0}.gf-list-row span b,.gf-list-row span small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gf-list-row span small{margin-top:2px;font-size:9px;color:#625b73;text-transform:uppercase}.gf-list-row strong{color:#ff3b43}.gf-bracket{background:#111113}.gf-news-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:rgba(255,255,255,.08)}.gf-news-story{background:#111113;border:1px solid transparent}.gf-team-grid,.gf-player-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.gf-back{font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:#625b73}.gf-back:hover{color:#ff3b43}.gf-empty{border-block:1px solid rgba(255,255,255,.1);padding:40px;text-align:center;color:#625b73}.gf-muted{color:#8b849b;overflow-wrap:anywhere}@media(max-width:1023px){.gf-event-head{grid-template-columns:1fr}.gf-event-stats{border-left:0;border-top:1px solid rgba(255,255,255,.1);padding:14px 0 0}.gf-two-col{grid-template-columns:1fr}.gf-team-grid,.gf-player-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:767px){.gf-event-head{padding:24px 16px;gap:20px}.gf-event-stats{grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.gf-match-body{grid-template-columns:1fr;gap:18px;padding:24px 16px}.gf-side,.gf-side:last-child{justify-content:center}.gf-score{order:2}.gf-side:first-child{order:1}.gf-side:last-child{order:3}.gf-list-row{grid-template-columns:26px 36px minmax(0,1fr) auto;padding:11px 10px}.gf-section-head{padding-inline:12px}.gf-section-head h2{font-size:20px}.gf-team-grid,.gf-player-grid,.gf-news-grid{grid-template-columns:1fr}.gf-event-title{font-size:clamp(2.1rem,11vw,3.5rem)}.gf-bracket .min-w-\[720px\]{min-width:720px!important}.gf-tournament{width:100%;min-width:0;overflow:hidden}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
      `}</style>
      <div className='gf-topline relative z-50' />
      <AfricaMotion />
      <header className='sticky top-0 z-50 border-b border-white/10 bg-[#09090b]'>
        <div className='mx-auto flex max-w-[1440px] items-center px-3 py-3 sm:px-5 lg:px-8 lg:py-4'>

          {/* Logo */}
          <div className='flex shrink-0 items-center gap-2'>
            <button
              onClick={() => setTab('home')}
              aria-label='Go to homepage'
            >
              <BrandLogo />
            </button>

            <ThemeToggle
              dark={darkMode}
              onToggle={() => setDarkMode(v => !v)}
            />
          </div>

          {/* Desktop Navigation */}
          <nav className='hidden flex-1 items-center justify-center gap-5 lg:flex xl:gap-7'>
            {(['home', 'rankings', 'tournaments', 'teams', 'transferNews', 'about', 'contact'] as const).map(x => (
              <button
                key={x}
                onClick={() => setTab(x)}
                className={`whitespace-nowrap text-sm font-medium transition-colors ${
                  tab === x ||
                  (x === 'tournaments' && tab === 'tournamentDetail') ||
                  (x === 'teams' && tab === 'teamDetail')
                    ? 'font-semibold text-[#ff2d8d]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {x === 'transferNews'
                  ? 'Transfer News'
                  : x === 'about'
                    ? 'About Us'
                    : x === 'contact'
                      ? 'Contact Us'
                      : x[0].toUpperCase() + x.slice(1)}
              </button>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className='hidden shrink-0 items-center gap-2 lg:flex'>
            <button
              onClick={signedIn ? () => setTab('admin') : signIn}
              className='inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#7e52d6]/40 bg-white/5 px-3 py-2 text-sm font-semibold transition hover:border-[#ff2d8d]/60 hover:bg-[#31188f]/40'
            >
              {signedIn
                ? <Settings size={16} className='shrink-0' />
                : <Shield size={16} className='shrink-0' />}
              <span>{signedIn ? 'Admin' : 'Admin Login'}</span>
            </button>

            <button
              onClick={managerSignedIn ? () => setTab('manager') : signInManager}
              className='inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#7e52d6]/40 bg-white/5 px-3 py-2 text-sm font-semibold transition hover:border-[#ff2d8d]/60 hover:bg-[#31188f]/40'
            >
              <Users size={16} className='shrink-0' />
              <span>{managerSignedIn ? 'Manager' : 'Team Manager'}</span>
            </button>
          </div>

          {/* Mobile Controls */}
          <div className='ml-auto flex items-center gap-2 lg:hidden'>
            <button
              onClick={signedIn ? () => setTab('admin') : signIn}
              className='inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#7e52d6]/40 bg-white/5 px-2.5 py-2 text-xs font-semibold'
            >
              {signedIn
                ? <Settings size={16} />
                : <Shield size={16} />}
              <span>{signedIn ? 'Admin' : 'Admin Login'}</span>
            </button>

            <button
              onClick={managerSignedIn ? () => setTab('manager') : signInManager}
              className='inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#7e52d6]/40 bg-white/5 px-2.5 py-2 text-xs font-semibold'
            >
              <Users size={16} />
              <span>{managerSignedIn ? 'Manager' : 'Team Manager'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className='flex w-full items-center gap-1 overflow-x-auto border-t border-white/5 px-3 py-2 sm:px-5 lg:hidden'>
          {(['home', 'live', 'rankings', 'tournaments', 'teams', 'transferNews', 'about', 'contact'] as const).map(x => (
            <button
              key={x}
              onClick={() => setTab(x)}
              className={`min-h-10 shrink-0 rounded-lg px-3 text-sm font-semibold ${
                tab === x ||
                (x === 'tournaments' && tab === 'tournamentDetail') ||
                (x === 'teams' && tab === 'teamDetail')
                  ? 'bg-[#e52a31] text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {x === 'live'
                ? 'Live'
                : x === 'transferNews'
                  ? 'Transfer News'
                  : x === 'about'
                    ? 'About Us'
                    : x === 'contact'
                      ? 'Contact Us'
                      : x[0].toUpperCase() + x.slice(1)}
            </button>
          ))}
        </nav>
      </header>

      <main className='relative z-10 mx-auto w-full max-w-[1440px] overflow-x-clip px-3 py-5 sm:px-5 lg:px-8 lg:py-8'><div className='gf-shell gf-page'>
        {tab === 'home' && <Home tournaments={tournaments} teams={filteredTeams} transferNews={transferNews} matches={matches} onTournament={openTournament} onRankings={() => setTab('rankings')} onNavigate={setTab} />}
        {tab === 'live' && <LiveCenter />}
        {tab === 'referee' && <RefereePortal signedIn={refereeSignedIn} onSignIn={signInReferee} onSignOut={signOut} />}
        {tab === 'rankings' && <Rankings teams={filteredTeams} tier={tier} setTier={setTier} />}
        {tab === 'transferNews' && <TransferNewsPage news={transferNews} />}
        {tab === 'about' && <AboutUsPage onContact={() => setTab('contact')} />}
        {tab === 'contact' && <ContactUsPage />}
        {tab === 'teams' && <Teams teams={teams} onTeam={openTeam} />}
        {tab === 'teamDetail' && <TeamDetail teamId={teamDetailId} onBack={() => setTab('teams')} />}
        {tab === 'tournamentDetail' && <TournamentDetail tournamentId={tournamentDetailId} onBack={() => setTab('tournaments')} onTeam={openTeam} />}
        {tab === 'tournaments' && <Tournaments tournaments={tournaments} matches={matches} onBracket={loadBracket} onTournament={openTournament} />}
        {tab === 'manager' && <TeamManagerPortal signedIn={managerSignedIn} onSignIn={signInManager} onSignOut={signOut} onSignUp={() => setManagerSignupOpen(true)} />}
        {managerSignupOpen && <TeamManagerSignup onClose={() => setManagerSignupOpen(false)} />}
        {tab === 'admin' && <Admin signedIn={signedIn} onSignIn={signIn} onSignOut={signOut} section={adminSection} setSection={setAdminSection} teams={teams} tournaments={tournaments} matches={matches} busy={busy} setBusy={setBusy} message={adminMessage} setMessage={setAdminMessage} refresh={refreshPublic} />}
      </div></main>

      <footer className='border-t border-white/10 px-4 py-8 text-center text-[11px] uppercase tracking-[.16em] text-slate-600 sm:px-5'>
        Gamersify Africa · Call of Duty Mobile · African competition only
      </footer>

      {loginOpen && (
        <div className='fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm'>
          <div className='w-full max-w-md rounded-2xl border border-white/10 bg-[#130233] p-6 shadow-2xl'>
            <div className='mb-6 flex items-start justify-between'>
              <div>
                <h2 className='text-2xl font-bold text-white'>
                  {loginType === 'admin' ? 'Admin Login' : 'Team Manager Login'}
                </h2>
                <p className='mt-1 text-sm text-slate-400'>
                  Sign in to continue to Gamersify.
                </p>
              </div>

              <button
                type='button'
                onClick={() => {
                  setLoginOpen(false);
                  setAdminMessage('');
                  setLoginPassword('');
                }}
                className='rounded-lg px-3 py-2 text-slate-400 hover:bg-white/10 hover:text-white'
              >
                ✕
              </button>
            </div>

            {passwordResetMode === 'reset' ? (
              <div className='space-y-4'>
                <p className='text-sm leading-6 text-slate-400'>Set a new password for your Team Manager account.</p>
                <input type='email' value={passwordResetEmail} onChange={e=>setPasswordResetEmail(e.target.value)} placeholder='Email' className='w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-[#ff2d8d]' />
                <input type='password' value={passwordResetNew} onChange={e=>setPasswordResetNew(e.target.value)} placeholder='New password (8+ characters)' autoComplete='new-password' className='w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-[#ff2d8d]' />
                <input type='password' value={passwordResetConfirm} onChange={e=>setPasswordResetConfirm(e.target.value)} placeholder='Confirm new password' autoComplete='new-password' className='w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-[#ff2d8d]' />
                {adminMessage && <div className='rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300'>{adminMessage}</div>}
                <button type='button' onClick={submitManagerPasswordReset} disabled={loginLoading} className='w-full rounded-xl bg-[#ff2d8d] px-4 py-3 font-semibold text-white disabled:opacity-50'>{loginLoading?'Resetting...':'Set new password'}</button>
                <button type='button' onClick={()=>{setPasswordResetMode('login');setAdminMessage('');}} className='w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300'>Back to sign in</button>
              </div>
            ) : passwordResetMode === 'forgot' ? (
              <div className='space-y-4'>
                <p className='text-sm leading-6 text-slate-400'>Enter your Team Manager email and we’ll send a password reset link.</p>
                <input type='email' value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} placeholder='you@example.com' autoComplete='email' className='w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-[#ff2d8d]' />
                {adminMessage && <div className='rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300'>{adminMessage}</div>}
                <button type='button' onClick={requestManagerPasswordReset} disabled={loginLoading} className='w-full rounded-xl bg-[#ff2d8d] px-4 py-3 font-semibold text-white disabled:opacity-50'>{loginLoading?'Sending...':'Send reset link'}</button>
                <button type='button' onClick={()=>{setPasswordResetMode('login');setAdminMessage('');}} className='w-full rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300'>Back to sign in</button>
              </div>
            ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitLogin();
              }}
              className='space-y-4'
            >
              <div>
                <label className='mb-2 block text-sm font-medium text-slate-300'>Email</label>
                <input type='email' value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder='you@example.com' autoComplete='email' autoFocus className='w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-[#ff2d8d]' />
              </div>
              <div>
                <label className='mb-2 block text-sm font-medium text-slate-300'>Password</label>
                <input type='password' value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder='Enter your password' autoComplete='current-password' className='w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-[#ff2d8d]' />
              </div>
              {adminMessage && <div className='rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300'>{adminMessage}</div>}
              <button type='submit' disabled={loginLoading} className='w-full rounded-xl bg-[#ff2d8d] px-4 py-3 font-semibold text-white transition hover:bg-[#e52a31] disabled:cursor-not-allowed disabled:opacity-50'>{loginLoading ? 'Signing in...' : 'Sign In'}</button>
              {loginType === 'manager' && <button type='button' onClick={()=>{setPasswordResetMode('forgot');setAdminMessage('');}} className='w-full text-center text-sm font-semibold text-[#ff78b4] hover:text-white'>Forgot password?</button>}
            </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
function LiveCenter() {
  const [matches,setMatches]=useState<any[]>([]); const [loading,setLoading]=useState(true);
  const load=async()=>{try{const r=await api.get('/api/public/live');setMatches(r.data.matches||[]);}catch{}finally{setLoading(false);}};
  useEffect(()=>{load();const timer=setInterval(load,15000);return()=>clearInterval(timer);},[]);
  return <div className='space-y-6'><PageHead title='Live Match Center' subtitle='Follow active Gamersify matches, readiness and live scores.'/><div className='rounded-3xl border border-[#ff2d8d]/20 bg-[#130233] p-5'><div className='flex items-center gap-3'><span className='h-3 w-3 animate-pulse rounded-full bg-[#ff2d8d]'/><b>LIVE OPERATIONS</b><span className='text-xs text-slate-500'>Auto-refreshes every 15 seconds</span></div></div>{loading?<div className='rounded-2xl border border-white/10 p-8 text-center text-slate-500'>Loading live matches...</div>:<div className='grid gap-4 lg:grid-cols-2'>{matches.map(m=><article key={m.id} className='rounded-3xl border border-[#7e52d6]/25 bg-white/[.03] p-5'><div className='flex justify-between text-xs'><span className='rounded-full bg-[#ff2d8d]/10 px-3 py-1 font-black uppercase text-[#ff78b4]'>{m.status}</span><span className='text-slate-500'>{m.tournamentName}</span></div><div className='mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center'><b className='truncate'>{m.teamAName}</b><div><div className='text-3xl font-black'>{m.scoreA??0}:{m.scoreB??0}</div><span className='text-[10px] uppercase tracking-widest text-slate-600'>{m.roundName||'Match'}</span></div><b className='truncate'>{m.teamBName}</b></div><div className='mt-5 grid grid-cols-2 gap-2 text-xs'><div className={'rounded-xl border p-3 text-center '+(m.teamAReady?'border-emerald-400/30 text-emerald-300':'border-white/10 text-slate-500')}>A • {m.teamAReady?'READY':'NOT READY'}</div><div className={'rounded-xl border p-3 text-center '+(m.teamBReady?'border-emerald-400/30 text-emerald-300':'border-white/10 text-slate-500')}>B • {m.teamBReady?'READY':'NOT READY'}</div></div>{m.technicalPause&&<div className='mt-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-200'>Technical pause {m.pauseReason?'• '+m.pauseReason:''}</div>}</article>)}{!matches.length&&<Empty text='No live matches right now.'/>}</div>}</div>;
}

function RefereePortal({ signedIn, onSignIn, onSignOut }: { signedIn:boolean; onSignIn:()=>void; onSignOut:()=>void }) {
  const [matches,setMatches]=useState<any[]>([]); const [ref,setRef]=useState<any>(null); const [busy,setBusy]=useState(false); const [message,setMessage]=useState('');
  const load=async()=>{try{const [a,b]=await Promise.all([api.get('/api/referee/me'),api.get('/api/referee/matches')]);setRef(a.data.referee);setMatches(b.data.matches||[]);}catch(e:any){setMessage(e?.message||'Could not load referee workspace.');}};
  useEffect(()=>{if(signedIn)load();},[signedIn]);
  const update=async(id:string,p:any)=>{setBusy(true);try{await api.put('/api/referee/matches/'+id+'/operations',p);setMessage('Match operations updated.');await load();}catch(e:any){setMessage(e?.message||'Update failed.');}finally{setBusy(false);}};
  const status=async(id:string,s:string)=>{setBusy(true);try{await api.put('/api/referee/matches/'+id+'/status',{status:s});await load();}catch(e:any){setMessage(e?.message||'Status update failed.');}finally{setBusy(false);}};
  if(!signedIn)return <div className='mx-auto max-w-lg rounded-3xl border border-[#7e52d6]/25 bg-white/[.03] p-8 text-center'><Swords className='mx-auto mb-4 text-[#ff2d8d]' size={42}/><h2 className='brand-font text-2xl'>Referee Control Room</h2><p className='mt-3 text-slate-400'>Authorized match officials can manage lobbies, readiness, pauses and match status.</p><button onClick={onSignIn} className='mt-6 rounded-xl bg-[#e52a31] px-6 py-3 font-bold'>Referee sign in</button></div>;
  return <div className='space-y-5'><div className='rounded-3xl border border-[#7e52d6]/25 bg-[#130233] p-6'><p className='text-xs font-black uppercase tracking-[.2em] text-[#ff2d8d]'>Match Official</p><h1 className='brand-font mt-2 text-3xl font-black'>{ref?.name||'Referee'}</h1><p className='mt-1 text-sm text-slate-400'>Live tournament operations control.</p></div>{message&&<div className='rounded-xl border border-[#ff2d8d]/30 bg-[#ff2d8d]/10 p-3 text-sm'>{message}</div>}<div className='grid gap-4 xl:grid-cols-2'>{matches.map(m=><article key={m.id} className='rounded-3xl border border-[#7e52d6]/20 bg-white/[.03] p-5'><div className='flex justify-between'><span className='rounded-full bg-[#5a2cff]/20 px-3 py-1 text-xs font-black uppercase'>{m.status}</span><span className='text-xs text-slate-500'>{m.roundName}</span></div><div className='mt-5 text-center text-xl font-black'>{m.teamAName||'TBD'} <span className='mx-2 text-slate-600'>VS</span> {m.teamBName||'TBD'}<div className='mt-2 text-3xl'>{m.scoreA??0} : {m.scoreB??0}</div></div><div className='mt-4 grid gap-2 sm:grid-cols-3'><input placeholder='Lobby ID' value={m.roomId||''} onChange={e=>setMatches(x=>x.map(v=>v.id===m.id?{...v,roomId:e.target.value}:v))} className='rounded-xl border px-3 py-2 text-sm'/><input placeholder='Password' value={m.roomPassword||''} onChange={e=>setMatches(x=>x.map(v=>v.id===m.id?{...v,roomPassword:e.target.value}:v))} className='rounded-xl border px-3 py-2 text-sm'/><button disabled={busy} onClick={()=>update(m.id,{roomId:m.roomId,roomPassword:m.roomPassword})} className='rounded-xl bg-[#5a2cff] px-3 py-2 text-sm font-bold'>Save lobby</button></div><div className='mt-3 grid grid-cols-2 gap-2'><button disabled={busy} onClick={()=>update(m.id,{teamAReady:!m.teamAReady})} className='rounded-xl border border-white/10 p-3 text-xs'>{m.teamAName}: {m.teamAReady?'READY':'NOT READY'}</button><button disabled={busy} onClick={()=>update(m.id,{teamBReady:!m.teamBReady})} className='rounded-xl border border-white/10 p-3 text-xs'>{m.teamBName}: {m.teamBReady?'READY':'NOT READY'}</button></div><div className='mt-3 flex items-center justify-between rounded-xl border border-amber-400/20 p-3'><span className='text-xs'>{m.technicalPause?'Technical pause active':'Match running normally'}</span><button disabled={busy} onClick={()=>update(m.id,{technicalPause:!m.technicalPause,pauseReason:m.technicalPause?'':(window.prompt('Pause reason')||'')})} className='rounded-lg border border-white/10 px-3 py-2 text-xs font-bold'>{m.technicalPause?'Resume':'Pause'}</button></div><div className='mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5'>{[['check-in','Check-in'],['ready','Ready'],['live','Live'],['completed','Complete'],['no-show','No-show']].map(([s,l])=><button key={s} disabled={busy} onClick={()=>status(m.id,s)} className='rounded-xl border border-white/10 px-2 py-2 text-xs font-bold'>{l}</button>)}</div></article>)}{!matches.length&&<Empty text='No active matches assigned.'/>}</div><button onClick={onSignOut} className='rounded-xl border border-white/10 px-4 py-2 text-sm'>Sign out</button></div>;
}

}

function AboutUsPage({ onContact }: { onContact: () => void }) {
  const services=[['01','Talent Representation','Comprehensive representation for African gamers, helping them showcase their skills, negotiate contracts and secure opportunities with teams, sponsors and brands.'],['02','Career Development','Personalized guidance, coaching and skill-development support designed to turn competitive talent into sustainable esports careers.'],['03','Brand Partnerships','Strategic connections between talent, brands, sponsors and organizations, creating partnerships that are authentic, valuable and mutually beneficial.'],['04','Content Creation Support','Support for creators building engaging content, growing their personal brands and connecting with fans across the gaming ecosystem.']];
  return <div className='space-y-7'><section className='relative overflow-hidden rounded-[2rem] border border-[#7e52d6]/30 bg-[#130233] p-6 sm:p-9 lg:p-14'><div className='relative max-w-4xl'><span className='inline-flex rounded-full border border-[#ff2d8d]/30 bg-[#ff2d8d]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.25em] text-[#ff78b4]'>About Gamersify</span><h1 className='brand-font mt-5 text-4xl font-black uppercase leading-none sm:text-6xl'>Built for <span className='text-[#ff2d8d]'>African</span> esports.</h1><p className='mt-6 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg'>Gamersify is a cutting-edge talent agency organization established in 2023, exclusively dedicated to empowering and elevating the African eSports community. We cultivate the immense potential of gamers across the continent and create opportunities for them to shine on the global stage.</p></div></section><section className='grid gap-5 lg:grid-cols-2'><div className='rounded-3xl border border-[#7e52d6]/20 bg-white/[.03] p-6 sm:p-8'><h2 className='text-2xl font-black'>Our Mission</h2><p className='mt-4 leading-7 text-slate-400'>To revolutionize the African eSports landscape by nurturing talent, fostering growth and building a vibrant gaming ecosystem. We are committed to unlocking the untapped potential of African gamers and empowering them to become world-class eSports athletes, content creators and influential personalities.</p></div><div className='rounded-3xl border border-[#7e52d6]/20 bg-white/[.03] p-6 sm:p-8'><h2 className='text-2xl font-black'>Our Vision</h2><p className='mt-4 leading-7 text-slate-400'>A future where African gamers command global recognition, the African eSports community thrives and talent is celebrated regardless of geographic boundaries. Gamersify strives to create an inclusive environment that encourages diversity, drives innovation and fosters belonging within gaming.</p></div></section><section><PageHead title='What we do' subtitle='Four ways Gamersify helps talent move from potential to opportunity.'/><div className='mt-5 grid gap-4 sm:grid-cols-2'>{services.map(([num,title,body])=><article key={num} className='group rounded-3xl border border-[#7e52d6]/20 bg-white/[.03] p-6'><span className='brand-font text-4xl font-black text-[#5a2cff]/60'>{num}</span><h3 className='mt-4 text-xl font-black'>{title}</h3><p className='mt-3 text-sm leading-6 text-slate-400'>{body}</p><div className='mt-6 h-1 w-14 rounded-full bg-[#ff2d8d] group-hover:w-24'/></article>)}</div></section><section className='rounded-[2rem] border border-[#ff2d8d]/20 bg-[#130233] p-7 sm:p-10'><div className='flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between'><div><p className='text-xs font-black uppercase tracking-[.22em] text-[#ff78b4]'>The next level starts here</p><h2 className='brand-font mt-2 text-3xl font-black'>Let's build Africa's esports future.</h2><p className='mt-2 text-sm text-slate-300'>Whether you're a player, creator, team or brand, connect with Gamersify.</p></div><button onClick={onContact} className='rounded-xl bg-[#e52a31] px-5 py-3 font-bold'>Contact Gamersify</button></div></section></div>;
}

function ContactUsPage() {
  const channels=[['Instagram','@Gamersify','Follow our latest talent, events and community updates.'],['X / Twitter','GamersifyAF','Follow the conversation and esports updates.'],['Telegram / Email','gamersifyaf@gmail.com','Reach the Gamersify team directly for enquiries and partnerships.']];
  return <div className='space-y-7'><section className='relative overflow-hidden rounded-[2rem] border border-[#7e52d6]/30 bg-[#130233] p-6 sm:p-10 lg:p-14'><div className='relative grid gap-8 lg:grid-cols-[1.15fr_.85fr]'><div><span className='inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.25em] text-[#ff78b4]'>Get in touch</span><h1 className='brand-font mt-5 text-4xl font-black uppercase sm:text-6xl'>Let's <span className='text-[#ff2d8d]'>connect.</span></h1><p className='mt-5 max-w-2xl text-base leading-7 text-slate-300'>Have a player, partnership, sponsorship, media or community enquiry? Reach out to Gamersify and let's start the conversation.</p></div><div className='rounded-3xl border border-white/10 bg-black/20 p-6'><p className='text-xs font-black uppercase tracking-[.2em] text-[#ff2d8d]'>General enquiries</p><a href='mailto:gamersifyaf@gmail.com' className='mt-3 block break-all text-lg font-black text-white'>gamersifyaf@gmail.com</a><p className='mt-2 text-sm text-slate-500'>Talent, partnerships, sponsorships and media.</p></div></div></section><section><PageHead title='Connect with Gamersify' subtitle='Choose the channel that works best for you.'/><div className='mt-5 grid gap-4 md:grid-cols-3'>{channels.map(([title,handle,body])=><article key={title} className='rounded-3xl border border-[#7e52d6]/20 bg-white/[.03] p-6'><div className='grid h-12 w-12 place-items-center rounded-2xl bg-[#5a2cff]/20 font-black text-[#ff78b4]'>{title[0]}</div><h2 className='mt-5 text-lg font-black'>{title}</h2><p className='mt-1 break-words font-bold text-[#ff2d8d]'>{handle}</p><p className='mt-3 text-sm leading-6 text-slate-500'>{body}</p></article>)}</div></section><section className='rounded-3xl border border-[#7e52d6]/20 bg-white/[.03] p-6 sm:p-8'><p className='text-xs font-black uppercase tracking-[.2em] text-[#ff2d8d]'>Work with us</p><h2 className='brand-font mt-2 text-3xl font-black'>Talent. Brands. Teams.</h2><p className='mt-3 max-w-3xl text-sm leading-6 text-slate-400'>We welcome conversations around talent representation, career development, brand partnerships and content creation.</p><div className='mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>{['Talent representation','Career development','Brand partnerships','Content & media'].map((x,i)=><div key={x} className='rounded-2xl border border-white/5 bg-black/15 p-4'><span className='text-xs font-black text-[#ff2d8d]'>0{i+1}</span><p className='mt-2 text-sm font-bold'>{x}</p></div>)}</div></section></div>;
}

function Home({ tournaments, teams, transferNews, matches, onTournament, onRankings, onNavigate }: { tournaments: Tournament[]; teams: Team[]; transferNews: TransferNews[]; matches: Match[]; onTournament: (id: string) => void; onRankings: () => void; onNavigate: (tab: 'home' | 'rankings' | 'tournaments' | 'teams' | 'transferNews' | 'admin') => void }) {
  const live = matches.filter(m => ['live','pending-result','ready'].includes(m.status)).slice(0,4);
  const upcoming = matches.filter(m => m.status === 'scheduled').slice(0,4);
  const leaders = teams.slice(0,5);
  return <div className='gf-editorial space-y-8'>
    <section className='gf-lead relative overflow-hidden border-y border-white/10'>
      <div className='absolute inset-0 opacity-35' style={{backgroundImage:"url('/resources/gamersify-brand.jpeg')",backgroundSize:'cover',backgroundPosition:'center'}}/>
      <div className='gf-hero-bg absolute inset-0 bg-[#09090b]'/>
      <div className='relative grid min-h-[430px] items-end gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[1.35fr_.65fr] lg:px-10 lg:py-12'>
        <div>
          <div className='flex items-center gap-3 text-[11px] font-black uppercase tracking-[.24em] text-[#ff3b43]'><span className='h-2 w-2 rounded-full bg-[#ff3b43]'/> Gamersify Africa • CODM</div>
          <h1 className='brand-font mt-4 max-w-4xl text-5xl font-black uppercase leading-[.9] tracking-tight sm:text-7xl lg:text-8xl'>Africa's<br/><span className='text-[#ff3b43]'>home of competition.</span></h1>
          <p className='mt-6 max-w-2xl text-base leading-7 text-slate-300'>Matches, rankings, teams and tournament history for the African Call of Duty Mobile scene.</p>
          <div className='mt-7 flex flex-wrap gap-3'><button onClick={()=>onNavigate('tournaments')} className='rounded-none bg-[#e52a31] px-5 py-3 text-sm font-black uppercase tracking-wide'>Find a tournament</button><button onClick={onRankings} className='rounded-none border border-white/25 bg-black/20 px-5 py-3 text-sm font-black uppercase tracking-wide'>Africa rankings</button></div>
        </div>
        <div className='border-l border-white/15 pl-5 lg:pb-2'>
          <div className='text-[10px] font-black uppercase tracking-[.22em] text-slate-500'>Season snapshot</div>
          <div className='mt-5 grid grid-cols-2 gap-x-5 gap-y-6'>
            <div><strong className='block text-3xl font-black text-white'>{teams.length}</strong><span className='text-xs uppercase tracking-wider text-slate-500'>Teams</span></div>
            <div><strong className='block text-3xl font-black text-white'>{tournaments.length}</strong><span className='text-xs uppercase tracking-wider text-slate-500'>Events</span></div>
            <div><strong className='block text-3xl font-black text-white'>{matches.length}</strong><span className='text-xs uppercase tracking-wider text-slate-500'>Matches</span></div>
            <div><strong className='block text-3xl font-black text-[#ff3b43]'>{teams[0]?.points||0}</strong><span className='text-xs uppercase tracking-wider text-slate-500'>Top points</span></div>
          </div>
        </div>
      </div>
    </section>

    <section className='border-y border-white/10 bg-[#111113]'>
      <div className='flex items-center justify-between border-b border-white/10 px-4 py-3'><div className='flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em]'><span className='h-2 w-2 bg-[#e52a31]'/> Match desk</div><button onClick={()=>onNavigate('tournaments')} className='text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-white'>Full schedule →</button></div>
      <div className='divide-y divide-white/10'>
        {(live.length ? live : upcoming).map(m=><button key={m.id} onClick={()=>onTournament(m.tournamentId)} className='grid w-full grid-cols-[70px_1fr_auto_1fr_70px] items-center gap-3 px-4 py-4 text-left hover:bg-white/[.03] sm:grid-cols-[90px_1fr_90px_1fr_110px]'>
          <span className='text-[10px] font-black uppercase tracking-wider text-slate-500'>{m.status==='live'?'LIVE':m.roundName||'Match'}</span>
          <b className='truncate text-right'>{m.teamAName||'TBD'}</b>
          <strong className='text-center text-lg'>{m.scoreA??'-'} : {m.scoreB??'-'}</strong>
          <b className='truncate'>{m.teamBName||'TBD'}</b>
          <span className='truncate text-right text-[10px] uppercase text-slate-600'>{m.tournamentName||'Gamersify'}</span>
        </button>)}
        {!live.length&&!upcoming.length&&<div className='px-4 py-8 text-center text-sm text-slate-600'>No scheduled matches. Tournament results will appear here.</div>}
      </div>
    </section>

    <div className='grid gap-8 lg:grid-cols-[1.55fr_.75fr]'>
      <section>
        <div className='mb-4 flex items-end justify-between border-b border-white/10 pb-3'><div><p className='text-[10px] font-black uppercase tracking-[.22em] text-[#ff3b43]'>The leaderboard</p><h2 className='brand-font mt-1 text-3xl font-black uppercase'>Africa ranking</h2></div><button onClick={onRankings} className='text-xs font-bold text-slate-400 hover:text-white'>View all →</button></div>
        <div className='overflow-hidden border border-white/10 bg-[#111113]'>
          <div className='grid grid-cols-[44px_1fr_90px] border-b border-white/10 px-4 py-2 text-[9px] font-black uppercase tracking-[.2em] text-slate-600'><span>#</span><span>Team</span><span className='text-right'>Points</span></div>
          {leaders.map((t,i)=><button key={t.id} onClick={()=>onNavigate('teams')} className='grid w-full grid-cols-[44px_1fr_90px] items-center border-b border-white/5 px-4 py-4 text-left last:border-0 hover:bg-white/[.03]'><span className={'font-black '+(i===0?'text-[#e52a31]':'text-slate-600')}>{String(i+1).padStart(2,'0')}</span><span><b className='block'>{t.name}</b><small className='text-[10px] uppercase tracking-wider text-slate-600'>{t.region||'Africa'} • {t.tier}</small></span><strong className='text-right text-[#ff3b43]'>{t.points}</strong></button>)}
          {!leaders.length&&<div className='p-8 text-center text-sm text-slate-600'>No ranked teams yet.</div>}
        </div>
      </section>

      <section>
        <div className='mb-4 border-b border-white/10 pb-3'><p className='text-[10px] font-black uppercase tracking-[.22em] text-[#ff3b43]'>On the calendar</p><h2 className='brand-font mt-1 text-3xl font-black uppercase'>Events</h2></div>
        <div className='divide-y divide-white/10 border-y border-white/10'>
          {tournaments.slice(0,5).map(t=><button key={t.id} onClick={()=>onTournament(t.id)} className='grid w-full grid-cols-[58px_1fr] gap-4 py-4 text-left hover:bg-white/[.025]'><span className='border-r border-white/10 pr-3 text-center text-[10px] font-black uppercase text-slate-500'>{t.status}</span><span><b className='block leading-tight'>{t.name}</b><small className='mt-1 block text-[10px] uppercase tracking-wider text-slate-600'>{t.type} • {t.format} • {t.bracketSize} teams</small></span></button>)}
          {!tournaments.length&&<div className='p-8 text-center text-sm text-slate-600'>No events published yet.</div>}
        </div>
      </section>
    </div>

    <section>
      <div className='mb-4 flex items-end justify-between border-b border-white/10 pb-3'><div><p className='text-[10px] font-black uppercase tracking-[.22em] text-[#ff3b43]'>Latest</p><h2 className='brand-font mt-1 text-3xl font-black uppercase'>Transfer desk</h2></div><button onClick={()=>onNavigate('transferNews')} className='text-xs font-bold text-slate-400 hover:text-white'>All news →</button></div>
      <div className='grid gap-px border border-white/10 bg-white/10 md:grid-cols-3'>
        {transferNews.slice(0,3).map((item)=><article key={item.id} className='bg-[#111113] p-5 hover:bg-[#151517]'><div className='flex items-center justify-between text-[9px] font-black uppercase tracking-wider'><span className='text-[#e52a31]'>{item.category||'Transfer'}</span><span className='text-slate-600'>{item.publishedAt?new Date(item.publishedAt).toLocaleDateString():'Latest'}</span></div><h3 className='mt-4 text-lg font-black leading-tight'>{item.title}</h3><p className='mt-3 text-xs leading-5 text-slate-500'>{item.summary}</p></article>)}
        {!transferNews.length&&<div className='col-span-full bg-[#111113] p-8 text-center text-sm text-slate-600'>No transfer stories published yet.</div>}
      </div>
    </section>
  </div>;
}


function TransferNewsPage({ news }: { news: TransferNews[] }) {
  const [filter, setFilter] = useState('All');
  const categories = ['All', ...Array.from(new Set(news.map(n => n.category).filter(Boolean)))];
  const visible = news.filter(n => filter === 'All' || n.category === filter);
  return <div className='space-y-6'>
    <PageHead title='Transfer News' subtitle='The latest player moves, signings and roster changes across Gamersify.' />
    <div className='flex gap-2 overflow-x-auto pb-1'>{categories.map(c => <button key={c} type='button' onClick={() => setFilter(c)} className={filter === c ? 'shrink-0 rounded-xl bg-[#e52a31] px-4 py-2 text-xs font-bold text-white' : 'shrink-0 rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-400'}>{c}</button>)}</div>
    {visible.length ? <div className='grid gap-5 lg:grid-cols-2'>{visible.map(item => <article key={item.id} className='rounded-3xl border border-[#7e52d6]/20 bg-white/[.03] p-5 sm:p-6'><div className='flex items-center justify-between gap-3'><span className='rounded-full bg-[#ff2d8d]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#ff78b4]'>{item.category || 'Transfer'}</span><span className='text-xs text-slate-600'>{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : ''}</span></div><h2 className='mt-4 text-xl font-black leading-tight text-white sm:text-2xl'>{item.title}</h2>{item.playerName && <p className='mt-2 text-sm font-semibold text-[#ff2d8d]'>{item.playerName}</p>}<div className='mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2'><div className='rounded-xl border border-white/5 p-3'><span className='text-[10px] uppercase tracking-wider text-slate-600'>From</span><b className='mt-1 block text-sm'>{item.fromTeam || 'Free agent'}</b></div><span className='text-[#ff2d8d]'>→</span><div className='rounded-xl border border-white/5 p-3'><span className='text-[10px] uppercase tracking-wider text-slate-600'>To</span><b className='mt-1 block text-sm'>{item.toTeam || 'Free agent'}</b></div></div><p className='mt-4 text-sm leading-6 text-slate-400'>{item.summary}</p>{item.body && <div className='mt-4 whitespace-pre-line border-t border-white/5 pt-4 text-sm leading-6 text-slate-300'>{item.body}</div>}</article>)}</div> : <div className='rounded-2xl border border-dashed border-[#7e52d6]/30 p-10 text-center'><Newspaper className='mx-auto text-[#ff2d8d]' size={28}/><h2 className='mt-3 font-bold text-white'>No transfer news yet</h2><p className='mt-1 text-sm text-slate-500'>Published transfer stories will appear here.</p></div>}
  </div>;
}

function Rankings({tier, setTier }: { teams: Team[]; tier: string; setTier: (x: string) => void }) {
  return (
    <div className='space-y-6'>
      <PageHead title='Africa Rankings' subtitle='The competitive record across the Gamersify African CODM circuit.' />
      <RankingsPanel tier={tier} setTier={setTier} />
    </div>
  );
}

function RankingsPanel({ tier, setTier }: { tier:string; setTier:(x:string)=>void }) {
  const [seasons,setSeasons]=useState<any[]>([]); const [seasonId,setSeasonId]=useState(''); const [mode,setMode]=useState('teams'); const [data,setData]=useState<any>({teams:[],players:[],history:[]}); const [loading,setLoading]=useState(true);
  useEffect(()=>{api.get('/api/public/seasons').then(r=>{const list=r.data.seasons||[];setSeasons(list);const active=list.find((s:any)=>s.status==='active');if(active)setSeasonId(active.id)}).catch(()=>{})},[]);
  useEffect(()=>{setLoading(true);const q=new URLSearchParams();if(seasonId)q.set('seasonId',seasonId);if(tier!=='All')q.set('tier',tier);api.get('/api/public/rankings?'+q.toString()).then(r=>setData(r.data||{teams:[],players:[],history:[]})).catch(()=>{}).finally(()=>setLoading(false))},[seasonId,tier]);
  return <div className='space-y-5'>
    <div className='flex flex-col gap-3 rounded-3xl border border-[#7e52d6]/20 bg-white/[.03] p-4 sm:flex-row sm:flex-wrap sm:items-center'>
      <div className='flex gap-2 overflow-x-auto'>{['All','Tier 1','Tier 2'].map(x=><button key={x} onClick={()=>setTier(x)} className={tier===x?'rounded-xl bg-[#e52a31] px-4 py-2 text-xs font-bold':'rounded-xl border border-white/10 px-4 py-2 text-xs text-slate-400'}>{x}</button>)}</div>
      <select value={seasonId} onChange={e=>setSeasonId(e.target.value)} className='rounded-xl border border-white/10 bg-[#130233] px-3 py-2 text-sm text-white'><option value=''>All-time ranking</option>{seasons.map(s=><option key={s.id} value={s.id}>{s.name}{s.status==='active'?' • Live':''}</option>)}</select>
      <div className='ml-auto flex gap-2'>{[['teams','Teams'],['players','Players'],['history','History']].map(([k,v])=><button key={k} onClick={()=>setMode(k)} className={mode===k?'rounded-xl bg-[#5a2cff] px-4 py-2 text-xs font-bold':'rounded-xl border border-white/10 px-4 py-2 text-xs text-slate-400'}>{v}</button>)}</div>
    </div>
    {loading?<div className='rounded-3xl border border-white/10 p-10 text-center text-slate-500'>Calculating rankings...</div>:mode==='teams'?<div className='overflow-hidden rounded-3xl border border-[#7e52d6]/20 bg-white/[.02]'>{data.teams.map((t:any,i:number)=><div key={t.id} className='grid grid-cols-[45px_1fr_auto] gap-3 border-t border-white/5 px-4 py-4 sm:grid-cols-[70px_1fr_120px_130px] sm:px-5'><b className={i<3?'text-[#ff2d8d]':''}>#{i+1}</b><div><b>{t.name}</b><p className='text-xs text-slate-500'>{t.region||'Africa'} • {t.tierName}</p></div><span className='hidden self-center text-xs text-slate-500 sm:block'>{t.tierName}</span><strong className='self-center text-[#ff2d8d]'>{t.points}</strong></div>)}{!data.teams.length&&<Empty text='No ranking data for this selection yet.'/>}</div>:mode==='players'?<div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>{data.players.map((p:any,i:number)=><div key={p.id} className='rounded-3xl border border-[#7e52d6]/20 bg-white/[.03] p-5'><div className='flex items-center gap-3'><b className='w-7 text-[#ff2d8d]'>#{i+1}</b><PlayerAvatar player={p}/><div className='min-w-0'><h3 className='truncate font-black'>{p.inGameName}</h3><p className='truncate text-xs text-slate-500'>{p.teamName||'Free Agent'}</p></div></div><div className='mt-4 flex justify-between'><span className='text-[10px] uppercase tracking-widest text-slate-600'>Ranking points</span><strong className='text-xl text-[#ff2d8d]'>{p.points}</strong></div></div>)}{!data.players.length&&<Empty text='No player rankings available yet.'/>}</div>:<div className='space-y-3'>{data.history.flatMap((h:any)=>h.events.map((e:any)=><div key={h.teamId+e.tournamentId+e.createdAt} className='flex flex-col gap-2 rounded-2xl border border-white/5 bg-white/[.02] p-4 sm:flex-row sm:items-center sm:justify-between'><div><b>{h.teamName}</b><p className='text-xs text-slate-500'>{e.tournamentName||'Tournament'} • {e.placement}</p></div><strong className='text-[#ff2d8d]'>+{e.points} pts</strong></div>))}{!data.history.some((h:any)=>h.events.length)&&<Empty text='Ranking history will appear after tournaments are finalized.'/>}</div>}
  </div>;
}

type TeamHoverStats = { matchesPlayed: number; wins: number; losses: number; winRate: number; bestPlacement: string; mapWinRates: MapWinRate[] };

function Teams({ teams, onTeam }: { teams: Team[]; onTeam: (id: string) => void }) {
  const [stats, setStats] = useState<Record<string, TeamHoverStats>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const loadStats = async (teamId: string) => {
    if (stats[teamId] || loading[teamId]) return;
    setLoading(prev => ({ ...prev, [teamId]: true }));
    try {
      const r = await api.get(`/api/public/teams/${teamId}`);
      if (r.data?.stats) setStats(prev => ({ ...prev, [teamId]: r.data.stats }));
    } catch {
      // The full team profile remains available if the compact hover stats cannot be loaded.
    } finally {
      setLoading(prev => ({ ...prev, [teamId]: false }));
    }
  };
  return <div><PageHead title='Teams' subtitle='Registered competitive rosters. Hover or focus a team for a quick performance snapshot.' /><div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>{teams.map(t => <button key={t.id} onClick={() => onTeam(t.id)} onMouseEnter={() => loadStats(t.id)} onFocus={() => loadStats(t.id)} className='group relative text-left'><TeamCard team={t} stats={stats[t.id]} statsLoading={loading[t.id]} /></button>)}{!teams.length && <Empty text='No teams published yet.' />}</div></div>;
}

function TeamDetail({ teamId, onBack }: { teamId: string; onBack: () => void }) {
  const [data, setData] = useState<TeamDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  useEffect(() => {
    if (!teamId) return;
    setLoading(true); setErrorMessage('');
    api.get(`/api/public/teams/${teamId}`).then(r => setData(r.data)).catch((e: any) => setErrorMessage(e?.message || 'Could not load team profile.')).finally(() => setLoading(false));
  }, [teamId]);
  if (loading) return <div className='rounded-2xl border border-[#7e52d6]/20 p-10 text-center text-slate-500'>Loading team profile...</div>;
  if (errorMessage || !data) return <div className='space-y-4'><button onClick={onBack} className='text-sm text-[#ff2d8d]'>← Back to teams</button><Empty text={errorMessage || 'Team not found.'} /></div>;
  const { team, stats, tournamentHistory, pointsBreakdown } = data;
  return <div className='space-y-6'>
    <button onClick={onBack} className='text-sm font-semibold text-[#ff2d8d] hover:text-white'>← Back to teams</button>
    <section className='overflow-hidden rounded-3xl border border-[#7e52d6]/25 bg-[#130233] p-6 md:p-8'>
      <div className='flex flex-col gap-5 md:flex-row md:items-center'><TeamAvatar team={team} large /><div className='min-w-0 flex-1'><div className='flex flex-wrap items-center gap-2'><h1 className='brand-font text-3xl uppercase md:text-4xl'>{team.name}</h1><span className='rounded-full bg-[#5a2cff]/30 px-3 py-1 text-xs font-bold'>{team.tier}</span></div><p className='mt-2 text-slate-400'>{team.region || 'Nigeria'} • {team.status || 'active'}</p></div><div className='text-left md:text-right'><span className='text-xs uppercase tracking-widest text-slate-500'>Season points</span><div className='text-4xl font-black text-[#ff2d8d]'>{team.points}</div></div></div>
    </section>
    <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-5'>{[['Tournaments',stats.tournamentsPlayed],['Matches',stats.matchesPlayed],['Wins',stats.wins],['Losses',stats.losses],['Win rate',`${stats.winRate}%`]].map(([label,value]) => <div key={String(label)} className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-4'><span className='text-xs uppercase tracking-widest text-slate-600'>{label}</span><strong className='mt-2 block text-2xl text-white'>{value}</strong></div>)}</div>
    <section className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-5 sm:p-6'><div className='flex items-center justify-between'><h2 className='brand-font text-xl uppercase'>Map win rate</h2><span className='text-xs text-slate-600'>Completed maps</span></div><div className='mt-4 grid gap-3 sm:grid-cols-3'>{stats.mapWinRates.map(item => <div key={item.mode} className='rounded-xl border border-white/5 p-4'><span className='text-xs uppercase tracking-wider text-slate-500'>{item.mode}</span><div className='mt-2 flex items-end justify-between gap-2'><b className='text-2xl text-[#ff2d8d]'>{item.winRate}%</b><span className='text-xs text-slate-600'>{item.wins}/{item.mapsPlayed} maps</span></div><div className='mt-3 h-1.5 overflow-hidden rounded-full bg-white/10'><div className='h-full rounded-full bg-[#ff2d8d]' style={{ width: `${Math.min(100, item.winRate)}%` }}/></div></div>)}</div></section>
    <div className='grid gap-5 lg:grid-cols-[1.05fr_.95fr]'>
      <div className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-6'><h2 className='brand-font text-xl uppercase'>Roster</h2><div className='mt-4 space-y-2'>{team.roster?.map((p,i) => <div key={`${p.inGameName}-${i}`} className='flex items-center gap-3 rounded-xl border border-white/5 p-3'><PlayerAvatar player={p} /><div className='min-w-0 flex-1'><b className='block truncate'>{p.inGameName}</b><span className='text-xs text-slate-500'>{p.role}{p.country ? ` • ${p.country}` : ''}</span>{p.realName && <span className='block text-xs text-slate-600'>{p.realName}</span>}</div><span className='text-xs text-slate-600'>{p.status || 'active'}</span></div>)}</div></div>
      <div className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-6'><h2 className='brand-font text-xl uppercase'>Performance</h2><div className='mt-4 rounded-xl border border-white/5 p-4'><span className='text-xs uppercase tracking-widest text-slate-600'>Best placement</span><b className='mt-2 block text-lg text-[#ff2d8d]'>{stats.bestPlacement}</b></div><div className='mt-3 rounded-xl border border-white/5 p-4'><span className='text-xs uppercase tracking-widest text-slate-600'>Total points</span><b className='mt-2 block text-2xl'>{team.points}</b></div></div>
    </div>
    <div className='grid gap-5 lg:grid-cols-[1.1fr_.9fr]'>
      <div className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-6'><h2 className='brand-font text-xl uppercase'>Tournament history</h2><div className='mt-4 space-y-2'>{tournamentHistory.map(t => <div key={t.id} className='flex flex-col gap-2 rounded-xl border border-white/5 p-4 sm:flex-row sm:items-center'><div className='flex-1'><b>{t.name}</b><div className='text-xs text-slate-500'>{t.date || 'Date TBA'} • {t.type} • {t.status}</div></div><span className='text-sm font-bold text-[#ff2d8d]'>{t.placement}</span><span className='text-sm text-slate-300'>+{t.points} pts</span></div>)}{!tournamentHistory.length && <Empty text='No tournament history yet.'/>}</div></div>
      <div className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-6'><h2 className='brand-font text-xl uppercase'>Points breakdown</h2><div className='mt-4 space-y-2'>{pointsBreakdown.map((p,i) => <div key={`${p.tournamentId}-${i}`} className='rounded-xl border border-white/5 p-3'><div className='flex justify-between gap-3'><b>{p.placement}</b><strong className='text-[#ff2d8d]'>+{p.points}</strong></div><div className='mt-1 text-xs text-slate-500'>Base {p.basePoints} × {p.multiplier}</div></div>)}{!pointsBreakdown.length && <Empty text='No points events yet.'/>}</div></div>
    </div>
  </div>;
}

function PlayersDirectory({ onPlayer }: { onPlayer: (id:string)=>void }) {
  const [players,setPlayers]=useState<Player[]>([]); const [search,setSearch]=useState(''); const [loading,setLoading]=useState(true);
  useEffect(()=>{let live=true;api.get('/api/public/players').then(r=>{if(live)setPlayers(r.data.players||[])}).catch(()=>{}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[]);
  const visible=players.filter(p=>!search||p.inGameName.toLowerCase().includes(search.toLowerCase())||String(p.realName||'').toLowerCase().includes(search.toLowerCase())||p.playerId.toLowerCase().includes(search.toLowerCase()));
  return <div className='space-y-6'><PageHead title='Players' subtitle='Discover the competitors building Gamersify history.'/><div className='relative max-w-xl'><Search className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-500' size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Search IGN, player ID or real name' className='w-full rounded-2xl border border-[#7e52d6]/25 bg-white/[.04] py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-[#ff2d8d]'/></div>{loading?<div className='rounded-3xl border border-white/10 p-10 text-center text-slate-500'>Loading player database...</div>:<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>{visible.map(p=><button key={p.id} onClick={()=>onPlayer(p.id)} className='group rounded-3xl border border-[#7e52d6]/20 bg-white/[.03] p-5 text-left transition hover:-translate-y-1 hover:border-[#ff2d8d]/50'><div className='flex items-center gap-4'><PlayerAvatar player={p as any}/><div className='min-w-0'><span className='text-[10px] font-black uppercase tracking-widest text-[#ff2d8d]'>{p.playerId}</span><h2 className='mt-1 truncate text-lg font-black'>{p.inGameName}</h2><p className='text-xs text-slate-500'>{p.teamName||'Free Agent'} • {p.teamTier||'Unranked'}</p></div></div><div className='mt-5 grid grid-cols-3 gap-2'><div className='rounded-xl border border-white/5 p-3'><span className='text-[9px] uppercase text-slate-600'>Matches</span><b className='mt-1 block'>{p.stats?.matchesPlayed||0}</b></div><div className='rounded-xl border border-white/5 p-3'><span className='text-[9px] uppercase text-slate-600'>Wins</span><b className='mt-1 block text-[#ff2d8d]'>{p.stats?.wins||0}</b></div><div className='rounded-xl border border-white/5 p-3'><span className='text-[9px] uppercase text-slate-600'>Win rate</span><b className='mt-1 block'>{p.stats?.winRate||0}%</b></div></div></button>)}{!visible.length&&<Empty text='No players match your search.'/>}</div>}</div>;
}
function PlayerDetail({ playerId, onBack }: { playerId:string; onBack:()=>void }) {
  const [player,setPlayer]=useState<any>(null); const [history,setHistory]=useState<any[]>([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{setLoading(true);api.get('/api/public/players/'+playerId).then(r=>{setPlayer(r.data.player);setHistory(r.data.matchHistory||[])}).catch(()=>setPlayer(null)).finally(()=>setLoading(false))},[playerId]);
  if(loading)return <div className='rounded-3xl border border-white/10 p-10 text-center text-slate-500'>Loading player profile...</div>;
  if(!player)return <div className='space-y-4'><button onClick={onBack} className='text-sm text-[#ff78b4]'>← Back to players</button><Empty text='Player profile not found.'/></div>;
  const st=player.stats||{}; const countryLine=player.country ? ' • '+player.country : '';
  return <div className='space-y-6'><button onClick={onBack} className='text-sm font-bold text-[#ff78b4]'>← Players</button><section className='overflow-hidden rounded-[2rem] border border-[#7e52d6]/30 bg-[#130233] p-6 sm:p-9'><div className='flex flex-col gap-5 sm:flex-row sm:items-center'><PlayerAvatar player={player} large/><div className='min-w-0 flex-1'><span className='text-[10px] font-black uppercase tracking-[.2em] text-[#ff2d8d]'>{player.playerId}</span><h1 className='brand-font mt-2 text-4xl uppercase'>{player.inGameName}</h1><p className='mt-2 text-slate-400'>{player.teamName||'Free Agent'} • {player.teamTier||'Unranked'}{countryLine}</p><p className='mt-1 text-xs text-slate-600'>{player.realName||'Competitive profile'} • {player.role}</p></div></div></section><div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-5'>{[['Matches',st.matchesPlayed],['Wins',st.wins],['Losses',st.losses],['Win rate',String(st.winRate)+'%'],['Tournaments',st.tournamentsPlayed]].map(([k,v])=><div key={String(k)} className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-4'><span className='text-xs uppercase tracking-widest text-slate-600'>{k}</span><b className='mt-2 block text-2xl'>{v}</b></div>)}</div><section className='rounded-3xl border border-[#7e52d6]/20 bg-white/[.03] p-5 sm:p-6'><h2 className='brand-font text-xl uppercase'>Recent competitive record</h2><div className='mt-4 space-y-2'>{history.map(m=><div key={m.id} className='flex items-center justify-between gap-3 rounded-xl border border-white/5 p-3'><div><b>{m.teamAName||m.teamAId} <span className='text-slate-600'>vs</span> {m.teamBName||m.teamBId}</b><p className='text-xs text-slate-500'>{m.roundName||'Match'} • {m.status}</p></div><span className={m.winnerId===player.teamId?'text-emerald-300':'text-slate-400'}>{m.scoreA??0} - {m.scoreB??0}</span></div>)}{!history.length&&<Empty text='No completed matches recorded yet.'/>}</div></section></div>;
}

function Tournaments({ tournaments, matches, onBracket, onTournament }: { tournaments: Tournament[]; matches: Match[]; onBracket: (id: string) => void; onTournament: (id: string) => void }) {
  return <div><PageHead title='Tournaments' subtitle='Competition formats, participants and brackets.' /><div className='grid gap-5 lg:grid-cols-[.82fr_1.18fr]'><div className='space-y-3'>{tournaments.map(t => <button key={t.id} onClick={() => onTournament(t.id)} className='w-full text-left'><TournamentCard t={t} /></button>)}{!tournaments.length && <Empty text='No tournaments yet.' />}</div><Bracket matches={matches} /></div></div>;
}

function TournamentDetail({ tournamentId, onBack, onTeam }: { tournamentId: string; onBack: () => void; onTeam: (id: string) => void }) { const [data,setData]=useState<TournamentDetailData|null>(null); const [loading,setLoading]=useState(true); const [err,setErr]=useState(''); useEffect(()=>{api.get('/api/public/tournaments/'+tournamentId).then(r=>setData(r.data)).catch((e:any)=>setErr(e?.message||'Could not load tournament.')).finally(()=>setLoading(false))},[tournamentId]); if(loading)return <div className='gf-empty'>Loading tournament...</div>; if(err||!data)return <div className='space-y-4'><button onClick={onBack} className='gf-back'>← Africa tournaments</button><Empty text={err||'Tournament not found.'}/></div>; const {tournament,participants,matches,standings}=data; const live=matches.filter(m=>['live','ready','pending-result'].includes(m.status)); const featured=live[0]||matches.find(m=>m.status==='scheduled')||matches[0]; const team=(id?:string,name?:string)=>participants.find(t=>t.id===id)||({id:id||'',name:name||'TBD',tier:'',roster:[],points:0,region:'Africa'} as Team); return <div className='gf-tournament space-y-6 sm:space-y-8'><button onClick={onBack} className='gf-back'>← Africa tournaments</button><header className='gf-event-head'><div><span className='gf-kicker'>AFRICA CIRCUIT · {tournament.type}</span><h1 className='brand-font gf-event-title'>{tournament.name}</h1><p className='gf-muted'>{tournament.date||'Date TBA'} · {participants.length}/{tournament.bracketSize} African teams · {tournament.format}</p></div><div className='gf-event-stats'><b>{matches.length}<small>Matches</small></b><b>{participants.length}<small>Teams</small></b><b className='accent'>{live.length}<small>Live</small></b></div></header>{featured&&<section className='gf-match'><div className='gf-match-bar'><span>{live.length?'● LIVE':'MATCH DESK'}</span><b>{featured.roundName||'Match'} · {featured.status}</b></div><div className='gf-match-body'><div className='gf-side'><TeamAvatar team={team(featured.teamAId,featured.teamAName)} large/><strong>{featured.teamAName||'TBD'}</strong></div><div className='gf-score'><small>{featured.status==='live'?'IN PLAY':featured.status}</small><b>{featured.scoreA??0}<i>:</i>{featured.scoreB??0}</b><small>GAMERSIFY AFRICA</small></div><div className='gf-side'><TeamAvatar team={team(featured.teamBId,featured.teamBName)} large/><strong>{featured.teamBName||'TBD'}</strong></div></div></section>}<div className='gf-two-col'><section className='gf-list'><div className='gf-section-head'><span>ENTRANTS</span><h2>African Teams</h2></div>{participants.map((t,i)=><button key={t.id} onClick={()=>onTeam(t.id)} className='gf-list-row'><em>{String(i+1).padStart(2,'0')}</em><TeamAvatar team={t}/><span><b>{t.name}</b><small>{t.region||'Africa'} · {t.tier}</small></span><strong>→</strong></button>)}</section><section className='gf-list'><div className='gf-section-head'><span>TABLE</span><h2>Africa Standings</h2></div>{standings.map(r=><div key={r.teamId} className='gf-list-row'><em>#{r.rank}</em><span><b>{r.teamName}</b><small>W {r.wins} · L {r.losses}</small></span><strong>{r.points}</strong></div>)}</section></div><section className='gf-bracket'><div className='gf-section-head'><span>COMPETITION TREE</span><h2>Bracket</h2></div><div className='overflow-x-auto'><div className='min-w-[720px] p-3 sm:p-5'><Bracket matches={matches}/></div></div></section></div>; }

function InfoRow({ label, value }: { label: string; value: string }) { return <div className='rounded-xl border border-white/5 p-3'><span className='block text-xs uppercase tracking-wider text-slate-600'>{label}</span><span className='mt-1 block break-words text-slate-300'>{value}</span></div>; }

function DisputeManagerPro({ busy, setBusy, setMessage }: { busy:boolean; setBusy:(x:boolean)=>void; setMessage:(x:string)=>void }) {
  const [items,setItems]=useState<any[]>([]); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState('');
  const [drafts,setDrafts]=useState<Record<string,{status:string;resolution:string}>>({});
  const load=async()=>{setLoading(true);try{const r=await api.get('/api/admin/disputes');const list=r.data.disputes||[];setItems(list);setDrafts(Object.fromEntries(list.map((d:any)=>[d.id,{status:d.status||'open',resolution:d.resolution||''}])));}catch(e:any){setMessage(e?.message||'Could not load disputes.');}finally{setLoading(false);}};
  useEffect(()=>{load();},[]);
  const update=async(d:any)=>{const v=drafts[d.id]||{status:d.status||'open',resolution:d.resolution||''};if(!v.resolution.trim()&&v.status!=='open')return setMessage('Add a resolution note before closing or escalating a dispute.');setSaving(d.id);setBusy(true);try{await api.put('/api/admin/disputes/'+d.id,v);setMessage('Dispute updated.');await load();}catch(e:any){setMessage(e?.message||'Could not update dispute.');}finally{setSaving('');setBusy(false);}};
  return <div className='space-y-5'><div className='border-b border-white/10 pb-4'><p className='text-[10px] font-black uppercase tracking-[.22em] text-[#ff2d8d]'>Match integrity</p><h3 className='mt-1 text-2xl font-black'>Dispute desk</h3><p className='mt-1 text-sm text-slate-500'>Review match disputes raised by African team managers and record the decision.</p></div>{loading?<div className='rounded-2xl border border-white/10 p-10 text-center text-slate-500'>Loading disputes...</div>:!items.length?<div className='rounded-2xl border border-dashed border-[#7e52d6]/30 p-12 text-center'><Swords className='mx-auto text-[#ff2d8d]' size={30}/><h4 className='mt-3 font-bold'>No disputes</h4><p className='mt-1 text-sm text-slate-500'>Open match disputes will appear here.</p></div>:<div className='space-y-3'>{items.map((d:any)=><article key={d.id} className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-4 sm:p-5'><div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'><div className='min-w-0'><span className='text-[10px] font-black uppercase tracking-widest text-[#ff3b43]'>DISPUTE · {d.status||'open'}</span><h4 className='mt-1 break-words text-lg font-black'>Match {d.matchId}</h4><p className='mt-1 text-sm text-slate-400'>{d.reason||'No reason supplied.'}</p><p className='mt-2 text-xs text-slate-600'>{d.raisedBy||'Team Manager'} · {d.createdAt?new Date(d.createdAt).toLocaleString():''}</p>{d.evidenceUrl&&<a href={d.evidenceUrl} target='_blank' rel='noreferrer' className='mt-2 inline-block text-xs font-bold text-[#ff2d8d]'>View evidence ↗</a>}</div><span className='shrink-0 rounded-full border border-[#ff3b43]/30 px-3 py-1 text-[10px] font-bold uppercase text-[#ff6b70]'>{d.status||'open'}</span></div><div className='mt-4 grid gap-3 lg:grid-cols-[180px_1fr_auto] lg:items-end'><Select label='Decision' value={drafts[d.id]?.status||d.status||'open'} onChange={v=>setDrafts(x=>({...x,[d.id]:{...(x[d.id]||{}),status:v}}))} options={['open','resolved','rejected','escalated'].map(x=>[x,x])}/><Input label='Resolution / admin note' value={drafts[d.id]?.resolution||''} onChange={v=>setDrafts(x=>({...x,[d.id]:{...(x[d.id]||{}),resolution:v}}))}/><button disabled={busy||saving===d.id} onClick={()=>update(d)} className='rounded-xl bg-[#e52a31] px-4 py-3 text-sm font-bold'>{saving===d.id?'Saving...':'Save decision'}</button></div></article>)}</div>}</div>;
}

function Admin({ signedIn, onSignIn, onSignOut, section, setSection, teams, tournaments, matches, busy, setBusy, message, setMessage, refresh }: {
  signedIn: boolean; onSignIn: () => void; onSignOut: () => void; section: AdminSection; setSection: (x: AdminSection) => void; teams: Team[]; tournaments: Tournament[]; matches: Match[]; busy: boolean; setBusy: (x: boolean) => void; message: string; setMessage: (x: string) => void; refresh: () => Promise<void>;
}) {
  if (!signedIn) return <div className='mx-auto max-w-lg rounded-3xl border border-[#7e52d6]/25 bg-white/[.03] p-8 text-center'><Shield className='mx-auto mb-4 text-[#ff2d8d]' size={42} /><h2 className='brand-font text-2xl'>Admin control room</h2><p className='mt-3 text-slate-400'>Sign in with your authorized Gamersify administrator account.</p><button onClick={onSignIn} className='mt-6 rounded-xl bg-[#e52a31] px-6 py-3 font-bold text-white hover:bg-[#ff3b43]'>Sign in securely</button></div>;
  const nav: [AdminSection, string][] = [['overview','Overview'],['teams','Teams'],['tournaments','Tournaments'],['matches','Matches'],['transfers','Transfers'],['seasons','Seasons'],['settings','Settings'],['managers','Managers'],['disputes','Disputes'],['commercial','Commercial'],['integrity','Integrity'],['audit','Audit & exports']];
  const icons: Record<AdminSection, React.ReactNode> = { overview: <ClipboardList size={18}/>, teams: <Users size={18}/>, tournaments: <Trophy size={18}/>, matches: <Swords size={18}/>, transfers: <Newspaper size={18}/>, seasons: <CalendarDays size={18}/>, settings: <Settings size={18}/>, managers: <Shield size={18}/>, disputes: <Swords size={18}/>, commercial: <Trophy size={18}/>, integrity: <Shield size={18}/>, audit: <Shield size={18}/> };
  const go = (id: AdminSection) => { setSection(id); setMessage(''); };
  const currentLabel = nav.find(([id]) => id === section)?.[1] || 'Overview';
  const content = <>{message && <div className='mb-5 flex items-start gap-3 rounded-2xl border border-[#ff2d8d]/30 bg-[#ff2d8d]/10 px-4 py-3 text-sm text-pink-100'><div className='mt-1 h-2 w-2 shrink-0 rounded-full bg-[#ff2d8d]'/><span className='min-w-0 flex-1'>{message}</span><button aria-label='Dismiss message' onClick={() => setMessage('')} className='shrink-0 rounded-lg p-1 hover:bg-white/10'><X size={16}/></button></div>}
  {section === 'overview' && <AdminOverviewPro teams={teams} tournaments={tournaments} matches={matches} setSection={setSection} setMessage={setMessage} />}
  {section === 'teams' && <TeamManagerPro teams={teams} busy={busy} setBusy={setBusy} setMessage={setMessage} refresh={refresh} />}
  {section === 'tournaments' && <TournamentManagerPro teams={teams} tournaments={tournaments} busy={busy} setBusy={setBusy} setMessage={setMessage} refresh={refresh} />}
  {section === 'matches' && <MatchManagerPro tournaments={tournaments} matches={matches} busy={busy} setBusy={setBusy} setMessage={setMessage} refresh={refresh} />}
  {section === 'transfers' && <TransferManagerPro teams={teams} busy={busy} setBusy={setBusy} setMessage={setMessage} />}
  {section === 'seasons' && <SeasonManagerPro busy={busy} setBusy={setBusy} setMessage={setMessage} />}
  {section === 'settings' && <SettingsManagerPro busy={busy} setBusy={setBusy} setMessage={setMessage} />}
  {section === 'managers' && <ManagerAccountsPro teams={teams} busy={busy} setBusy={setBusy} setMessage={setMessage} />}
  {section === 'disputes' && <DisputeManagerPro busy={busy} setBusy={setBusy} setMessage={setMessage} />}
  {section === 'commercial' && <CommercialManagerPro teams={teams} tournaments={tournaments} busy={busy} setBusy={setBusy} setMessage={setMessage} />}
  {section === 'integrity' && <IntegrityManagerPro teams={teams} busy={busy} setBusy={setBusy} setMessage={setMessage} />}
  {section === 'audit' && <AuditManagerPro busy={busy} setBusy={setBusy} setMessage={setMessage} />}</>;
  return <div className='min-w-0 space-y-4 lg:space-y-5'>
    <div className='rounded-2xl border border-[#7e52d6]/25 bg-[#17063a]/95 shadow-2xl shadow-black/20 backdrop-blur-xl lg:rounded-3xl'>
      <div className='flex items-center justify-between gap-3 px-4 py-4 sm:px-5 lg:px-6 lg:py-5'>
        <div className='min-w-0'><p className='text-[10px] font-bold uppercase tracking-[.24em] text-[#ff3b43]'>Gamersify Africa / Operations</p><h1 className='mt-1 truncate text-xl font-black text-white sm:text-2xl'>{currentLabel}</h1><p className='mt-1 hidden text-xs text-slate-500 sm:block'>Africa circuit operations, competition control and competitive data</p></div>
        <button onClick={onSignOut} className='inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-sm font-semibold text-slate-300 hover:border-[#ff2d8d]/50 hover:text-white'><LogOut size={16}/><span className='hidden sm:inline'>Sign out</span></button>
      </div>
      <div className='hidden border-t border-white/5 lg:block'><div className='grid grid-cols-9 gap-1 p-2'>{nav.map(([id,label]) => <button key={id} onClick={() => go(id)} className={`group flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 text-xs font-bold ${section===id ? 'bg-[#e52a31] text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>{icons[id]}<span>{label}</span></button>)}</div></div>
    </div>
    <div className='rounded-2xl border border-[#7e52d6]/20 bg-[#17063a]/95 p-2 shadow-xl shadow-black/10 lg:hidden'><div className='flex snap-x gap-1 overflow-x-auto'>{nav.map(([id,label]) => <button key={id} onClick={() => go(id)} className={`flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-xl px-3.5 text-xs font-bold ${section===id ? 'bg-[#e52a31] text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>{icons[id]}<span>{label}</span></button>)}</div></div>
    <div className='min-w-0'>{content}</div>
  </div>;
}

function AdminOverview({ teams, tournaments, matches, setSection }: { teams: Team[]; tournaments: Tournament[]; matches: Match[]; setSection: (x: AdminSection) => void }) {
  const cards: [AdminSection, string, string, string][] = [
    ['teams', 'Teams', 'CRUD, tiers and rosters', String(teams.length)],
    ['tournaments', 'Tournaments', 'Create and seed events', String(tournaments.length)],
    ['matches', 'Matches', 'Scores and winners', String(matches.length)],
    ['settings', 'Settings', 'Points, tiers and multipliers', 'Configure'],
  ];
  return <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>{cards.map(([id, title, text, value], i) => <button key={id} onClick={() => setSection(id)} className='group rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-5 text-left hover:-translate-y-0.5 hover:border-[#ff2d8d]/50 hover:bg-[#31188f]/25'><div className='flex items-center justify-between'><span className='grid h-10 w-10 place-items-center rounded-xl bg-[#5a2cff]/20 text-[#ff2d8d]'>{i === 0 ? <Users size={20} /> : i === 1 ? <Trophy size={20} /> : i === 2 ? <Swords size={20} /> : <Settings size={20} />}</span><ChevronRight size={17} className='text-slate-600 group-hover:text-white' /></div><b className='mt-4 block text-lg'>{title}</b><small className='text-slate-500'>{text}</small><strong className='mt-3 block text-[#ff2d8d]'>{value}</strong></button>)}</div>;
}

function TeamManager({ teams, busy, setBusy, setMessage, refresh }: { teams: Team[]; busy: boolean; setBusy: (x: boolean) => void; setMessage: (x: string) => void; refresh: () => Promise<void> }) {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [name, setName] = useState('');
  const [tierId, setTierId] = useState('');
  const [captain, setCaptain] = useState('');
  const [players, setPlayers] = useState(['', '', '', '']);
  useEffect(() => { api.get('/api/admin/tiers').then(r => { const next = r.data.tiers || []; setTiers(next); if (next[0]) setTierId(next[0].id); }).catch(() => {}); }, []);
  const create = async () => {
    if (!name.trim() || !captain.trim() || players.some(p => !p.trim()) || !tierId) { setMessage('Team name, tier, captain and four main players are required.'); return; }
    setBusy(true);
    try {
      await api.post('/api/admin/teams', { name, tierId, roster: [{ inGameName: captain, role: 'Captain' }, ...players.map(p => ({ inGameName: p, role: 'Player' }))] });
      setMessage(`Team ${name} created successfully.`);
      setName(''); setCaptain(''); setPlayers(['', '', '', '']); await refresh();
    } catch (e: any) { setMessage(e?.message || 'Could not create team.'); } finally { setBusy(false); }
  };
  return <div className='grid gap-5 lg:grid-cols-[.85fr_1.15fr]'><div className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-6'><h3 className='text-xl font-bold'>Create team</h3><p className='mt-1 text-sm text-slate-500'>Tier capacity and roster rules are enforced by the API.</p><div className='mt-5 space-y-3'><Input label='Team name' value={name} onChange={setName} /><Select label='Tier' value={tierId} onChange={setTierId} options={tiers.map(t => [t.id, `${t.name} • max ${t.maxTeams}`])} /><Input label='Captain IGN' value={captain} onChange={setCaptain} />{players.map((p, i) => <Input key={i} label={`Player ${i + 1} IGN`} value={p} onChange={v => setPlayers(players.map((x, j) => j === i ? v : x))} />)}<button disabled={busy} onClick={create} className='mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#e52a31] px-4 py-3 font-bold text-white disabled:opacity-50'><Plus size={17} /> {busy ? 'Creating...' : 'Create team'}</button></div></div><div className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-6'><h3 className='text-xl font-bold'>Registered teams</h3><div className='mt-4 space-y-2'>{teams.map(t => <div key={t.id} className='flex items-center justify-between rounded-xl border border-white/5 bg-white/[.02] p-3'><div><b>{t.name}</b><div className='text-xs text-slate-500'>{t.tier} • {t.roster?.length || 0} roster members</div></div><strong className='text-[#ff2d8d]'>{t.points} pts</strong></div>)}</div></div></div>;
}

function TournamentManager({ teams, tournaments, busy, setBusy, setMessage, refresh }: { teams: Team[]; tournaments: Tournament[]; busy: boolean; setBusy: (x: boolean) => void; setMessage: (x: string) => void; refresh: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('General');
  const [format, setFormat] = useState('Single Elimination');
  const [size, setSize] = useState('8');
  const [date, setDate] = useState('');
  const [selected, setSelected] = useState('');
  const create = async () => {
    if (!name.trim()) { setMessage('Tournament name is required.'); return; }
    setBusy(true);
    try { await api.post('/api/admin/tournaments', { name, type, format, bracketSize: Number(size), date, status: 'registration' }); setMessage(`Tournament ${name} created.`); setName(''); await refresh(); } catch (e: any) { setMessage(e?.message || 'Could not create tournament.'); } finally { setBusy(false); }
  };
  const register = async () => {
    if (!selected) return;
    const t = tournaments[0];
    if (!t) return;
    setBusy(true);
    try { await api.put(`/api/admin/tournaments/${t.id}/register`, { teamId: selected }); setMessage(`${teams.find(x => x.id === selected)?.name || 'Team'} registered.`); await refresh(); } catch (e: any) { setMessage(e?.message || 'Registration failed.'); } finally { setBusy(false); }
  };
  const generate = async (id: string) => {
    setBusy(true);
    try { await api.post(`/api/admin/tournaments/${id}/generate-bracket`); setMessage('Bracket generated successfully.'); await refresh(); } catch (e: any) { setMessage(e?.message || 'Bracket generation failed.'); } finally { setBusy(false); }
  };
  return <div className='space-y-5'><div className='grid gap-5 lg:grid-cols-[.8fr_1.2fr]'><div className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-6'><h3 className='text-xl font-bold'>Create tournament</h3><div className='mt-5 space-y-3'><Input label='Tournament name' value={name} onChange={setName} /><Select label='Type' value={type} onChange={setType} options={['General', 'Tier 2 Only', 'Tier 1 Only'].map(x => [x, x])} /><Select label='Format' value={format} onChange={setFormat} options={['Single Elimination', 'Double Elimination', 'Round Robin'].map(x => [x, x])} /><Select label='Bracket size' value={size} onChange={setSize} options={['4', '8', '16', '32', '64'].map(x => [x, x])} /><Input label='Date / time' value={date} onChange={setDate} type='datetime-local' /><button disabled={busy} onClick={create} className='w-full rounded-xl bg-[#e52a31] px-4 py-3 font-bold text-white disabled:opacity-50'>{busy ? 'Saving...' : 'Create tournament'}</button></div></div><div className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-6'><h3 className='text-xl font-bold'>Tournament operations</h3><div className='mt-4 space-y-3'>{tournaments.map(t => <div key={t.id} className='rounded-xl border border-white/5 p-4'><div className='flex items-start justify-between gap-3'><div><b>{t.name}</b><div className='text-xs text-slate-500'>{t.type} • {t.format} • {t.participants?.length || 0}/{t.bracketSize}</div></div><span className='rounded-full bg-[#5a2cff]/20 px-2 py-1 text-xs text-[#d6c8ff]'>{t.status}</span></div><div className='mt-3 flex flex-wrap gap-2'><button onClick={() => generate(t.id)} className='rounded-lg bg-[#31188f] px-3 py-2 text-xs font-bold'>Generate bracket</button><select value={selected} onChange={e => setSelected(e.target.value)} className='rounded-lg border border-white/10 bg-[#130233] px-3 py-2 text-xs'><option value=''>Select team</option>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select><button disabled={!selected || busy} onClick={register} className='rounded-lg border border-[#ff2d8d]/40 px-3 py-2 text-xs font-bold text-[#ff2d8d]'>Register</button></div></div>)}{!tournaments.length && <Empty text='Create your first tournament.' />}</div></div></div></div>;
}

function MatchManager({ tournaments, matches, busy, setBusy, setMessage, refresh }: { tournaments: Tournament[]; matches: Match[]; busy: boolean; setBusy: (x: boolean) => void; setMessage: (x: string) => void; refresh: () => Promise<void> }) {
  const [scores, setScores] = useState<Record<string, [string, string]>>({});
  const save = async (m: Match) => {
    const pair = scores[m.id] || ['', ''];
    setBusy(true);
    try { await api.put(`/api/admin/matches/${m.id}`, { scoreA: Number(pair[0]), scoreB: Number(pair[1]), reason: 'Admin score update' }); setMessage(`Result saved for ${m.roundName} match.`); await refresh(); } catch (e: any) { setMessage(e?.message || 'Could not save match result.'); } finally { setBusy(false); }
  };
  return <div className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-6'><h3 className='text-xl font-bold'>Match scoring</h3><p className='mt-1 text-sm text-slate-500'>Enter non-tied scores to advance winners.</p><div className='mt-5 space-y-3'>{matches.map(m => { const pair = scores[m.id] || [String(m.scoreA ?? ''), String(m.scoreB ?? '')]; return <div key={m.id} className='grid gap-3 rounded-xl border border-white/5 p-4 md:grid-cols-[1fr_auto_auto_auto] md:items-center'><div><b>{m.teamAName || m.teamAId || 'TBD'} <span className='text-slate-600'>vs</span> {m.teamBName || m.teamBId || 'TBD'}</b><div className='text-xs text-slate-500'>{m.roundName} • {m.status}</div></div><input value={pair[0]} onChange={e => setScores({ ...scores, [m.id]: [e.target.value, pair[1]] })} type='number' min='0' className='w-20 rounded-lg border border-white/10 bg-black/20 px-3 py-2' placeholder='A' /><input value={pair[1]} onChange={e => setScores({ ...scores, [m.id]: [pair[0], e.target.value] })} type='number' min='0' className='w-20 rounded-lg border border-white/10 bg-black/20 px-3 py-2' placeholder='B' /><button disabled={busy} onClick={() => save(m)} className='rounded-lg bg-[#e52a31] px-3 py-2 text-xs font-bold disabled:opacity-50'>Save</button></div>; })}{!matches.length && <Empty text='Generate a tournament bracket first, then matches will appear here.' />}</div><div className='mt-5 text-xs text-slate-600'>{tournaments.length} tournament(s) available</div></div>;
}

function SettingsManager({ busy, setBusy, setMessage }: { busy: boolean; setBusy: (x: boolean) => void; setMessage: (x: string) => void }) {
  const [general, setGeneral] = useState('1.5');
  const [tier2, setTier2] = useState('1');
  const [champion, setChampion] = useState('3');
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { api.get('/api/admin/settings').then(r => { const s = r.data.settings; setGeneral(String(s.multipliers?.General ?? 1.5)); setTier2(String(s.multipliers?.['Tier 2 Only'] ?? 1)); setChampion(String(s.points?.Champion ?? 3)); setLoaded(true); }).catch(() => setLoaded(true)); }, []);
  const save = async () => { setBusy(true); try { await api.put('/api/admin/settings', { multipliers: { General: Number(general), 'Tier 2 Only': Number(tier2) }, points: { Participation: 1, 'Round of 16': 1, Quarterfinal: 1, Semifinal: 1, Final: 2, Champion: Number(champion) } }); setMessage('Ranking settings saved.'); } catch (e: any) { setMessage(e?.message || 'Could not save settings.'); } finally { setBusy(false); } };
  if (!loaded) return <div className='rounded-2xl border border-[#7e52d6]/20 p-6 text-slate-400'>Loading settings...</div>;
  return <div className='max-w-2xl rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-6'><h3 className='text-xl font-bold'>Ranking configuration</h3><p className='mt-1 text-sm text-slate-500'>General must remain higher than Tier 2 Only.</p><div className='mt-5 grid gap-4 sm:grid-cols-3'><Input label='General multiplier' value={general} onChange={setGeneral} type='number' step='0.1' /><Input label='Tier 2 multiplier' value={tier2} onChange={setTier2} type='number' step='0.1' /><Input label='Champion base points' value={champion} onChange={setChampion} type='number' /></div><button disabled={busy} onClick={save} className='mt-5 rounded-xl bg-[#e52a31] px-5 py-3 font-bold text-white disabled:opacity-50'>{busy ? 'Saving...' : 'Save settings'}</button></div>;
}

function AdminOverviewPro({ teams, tournaments, matches, setSection, setMessage }: { teams: Team[]; tournaments: Tournament[]; matches: Match[]; setSection: (x: AdminSection) => void; setMessage: (x: string) => void }) {
  const [d, setD] = useState<Dashboard | null>(null);
  const load = async () => { try { const r = await api.get('/api/admin/dashboard'); setD(r.data); } catch (e: any) { setMessage(e?.message || 'Could not load dashboard.'); } };
  useEffect(() => { load(); }, []);
  const c = d?.counts || { teams: teams.length, tournaments: tournaments.length, matches: matches.length, openMatches: matches.filter(m => m.status === 'scheduled').length };
  const cards: [AdminSection,string,string,number,React.ReactNode][] = [['teams','Teams','Active teams',c.teams,<Users size={19}/>],['tournaments','Tournaments','Tournament records',c.tournaments,<Trophy size={19}/>],['matches','Matches','Stored match records',c.matches,<Swords size={19}/>],['matches','Open matches','Scheduled or pending',c.openMatches,<ClipboardList size={19}/>]];
  return <div className='space-y-5'><div className='flex items-center justify-between'><div><h3 className='text-xl font-bold'>League overview</h3><p className='text-sm text-slate-500'>Live counts, upcoming events and administrator activity.</p></div><button onClick={load} aria-label='refreshLeagueOverview' title='refreshLeagueOverview' className='grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-slate-400 transition hover:border-[#ff2d8d]/50 hover:text-[#ff2d8d]'><RefreshCw size={15}/></button></div><div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>{cards.map(([id,title,sub,value,icon]) => <button key={title} onClick={() => setSection(id)} className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-5 text-left hover:border-[#ff2d8d]/50'><span className='grid h-10 w-10 place-items-center rounded-xl bg-[#5a2cff]/20 text-[#ff2d8d]'>{icon}</span><b className='mt-4 block'>{title}</b><span className='text-xs text-slate-500'>{sub}</span><strong className='mt-2 block text-2xl text-[#ff2d8d]'>{value}</strong></button>)}</div><div className='grid gap-5 lg:grid-cols-2'><div className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-5'><div className='flex items-center justify-between'><h3 className='font-bold'>Upcoming tournaments</h3><button onClick={() => setSection('tournaments')} className='text-sm text-[#ff2d8d]'>Manage</button></div><div className='mt-4 space-y-2'>{(d?.upcomingTournaments || tournaments.slice(0,5)).map(t => <div key={t.id} className='flex items-center justify-between rounded-xl border border-white/5 p-3'><div><b>{t.name}</b><div className='text-xs text-slate-500'>{t.date || 'Date TBA'} • {t.status}</div></div><span className='text-xs text-slate-400'>{t.participants?.length || 0}/{t.bracketSize}</span></div>)}{!(d?.upcomingTournaments || tournaments).length && <Empty text='No upcoming tournaments.'/>}</div></div><div className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-5'><div className='flex items-center justify-between'><h3 className='font-bold'>Recent activity</h3><button onClick={() => setSection('audit')} className='text-sm text-[#ff2d8d]'>Audit log</button></div><div className='mt-4 space-y-2'>{(d?.recentActivity || []).slice(0,8).map((a,i) => <div key={a.id || i} className='rounded-xl border border-white/5 p-3'><div className='flex justify-between gap-3'><b className='text-sm'>{a.action}</b><span className='text-xs text-slate-600'>{a.timestamp ? new Date(a.timestamp).toLocaleString() : ''}</span></div><div className='mt-1 text-xs text-slate-500'>{a.entity} • {a.entityId} {a.reason ? `• ${a.reason}` : ''}</div></div>)}{!(d?.recentActivity || []).length && <Empty text='No audit activity yet.'/>}</div></div></div></div>;
}

function TeamManagerPortal({ signedIn, onSignIn, onSignOut, onSignUp }: { signedIn: boolean; onSignIn: () => void; onSignOut: () => void; onSignUp: () => void }) {
  const [team, setTeam] = useState<Team | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false); const [section,setSection]=useState<'team'|'tournaments'|'matches'>('team'); const [tournaments,setTournaments]=useState<any[]>([]); const [matches,setMatches]=useState<any[]>([]); const [saving,setSaving]=useState(false); const [readyBusy,setReadyBusy]=useState<Record<string,boolean>>({});
  const load = async () => { setLoading(true); try { const r = await api.get('/api/manager/me'); setTeam(r.data.team); const [tr,ma]=await Promise.all([api.get('/api/manager/tournaments'),api.get('/api/manager/matches')]); setTournaments(tr.data.tournaments||[]); setMatches(ma.data.matches||[]); } catch (e: any) { setMessage(e?.message || 'Could not load your team.'); } finally { setLoading(false); } };
  const register = async (id:string) => { setSaving(true); try { await api.post(`/api/manager/tournaments/${id}/register`); setMessage('Team registered for tournament.'); await load(); } catch(e:any){setMessage(e?.message||'Could not register team.');} finally{setSaving(false);} };
  const setReady = async (m:any) => { setReadyBusy(x=>({...x,[m.id]:true})); try { await api.put('/api/manager/matches/'+m.id+'/ready',{ready:!(m.teamAId===team?.id?m.teamAReady:m.teamBReady)}); setMessage('Match readiness updated.'); await load(); } catch(e:any){setMessage(e?.message||'Could not update readiness.');} finally{setReadyBusy(x=>({...x,[m.id]:false}));} };
  const saveScore = async (m:any, scoreA:string, scoreB:string, mapResults:any[]) => { setSaving(true); try { await api.put(`/api/manager/matches/${m.id}`,{scoreA:Number(scoreA),scoreB:Number(scoreB),winnerId:Number(scoreA)>Number(scoreB)?m.teamAId:m.teamBId,status:'completed',mapResults}); setMessage('Match score saved.'); await load(); } catch(e:any){setMessage(e?.message||'Could not save score.');} finally{setSaving(false);} };
  useEffect(() => { if (signedIn) load(); }, [signedIn]);
  if (!signedIn) return <div className='mx-auto max-w-lg rounded-3xl border border-[#7e52d6]/25 bg-white/[.03] p-8 text-center'><Users className='mx-auto mb-4 text-[#ff2d8d]' size={42}/><h2 className='brand-font text-2xl'>Team Manager Portal</h2><p className='mt-3 text-slate-400'>Already approved? Sign in. New here? Submit a manager application for your team.</p><div className='mt-6 grid gap-3 sm:grid-cols-2'><button onClick={onSignIn} className='rounded-xl bg-[#e52a31] px-6 py-3 font-bold'>Sign in</button><button onClick={onSignUp} className='rounded-xl border border-[#7e52d6]/40 bg-white/5 px-6 py-3 font-bold'>Sign up</button></div></div>;
  if (loading) return <div className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-6 text-slate-400'>Loading team portal...</div>;
  if (loading) return <div className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-6 text-slate-400'>Loading team portal...</div>;
  return <div className='mx-auto w-full max-w-7xl min-w-0 space-y-4 overflow-x-hidden sm:space-y-5'><div className='flex min-w-0 flex-col gap-3 rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-5'><div className='min-w-0 max-w-full'><p className='text-[10px] font-bold uppercase tracking-[.2em] text-[#ff2d8d]'>Gamersify / Team Manager</p><h1 className='mt-1 break-words text-lg font-black leading-tight sm:text-2xl'>{team?.name || 'Team portal'}</h1><p className='mt-1 max-w-full break-words text-[11px] leading-4 text-slate-500 sm:text-sm'>Manage roster, tournament registrations and match results.</p></div><button onClick={onSignOut} className='self-start rounded-xl border border-white/10 px-3 py-2 text-sm sm:self-auto'><LogOut size={15}/></button></div>{message&&<div className='rounded-xl border border-[#ff2d8d]/30 bg-[#ff2d8d]/10 p-3 text-sm'>{message}</div>}<div className='flex gap-2 overflow-x-auto'>{[['team','My Team'],['tournaments','Tournaments'],['matches','Matches']].map(([id,label])=><button key={id} onClick={()=>setSection(id as any)} className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold ${section===id?'bg-[#e52a31] text-white':'border border-white/10 text-slate-400'}`}>{label}</button>)}</div>
  {section==='team'&&<TeamManagerRoster team={team} saving={saving} onSave={async(roster)=>{setSaving(true);try{const r=await api.put('/api/manager/team',{roster});setTeam(r.data.team);setMessage('Roster updated.');}catch(e:any){setMessage(e?.message||'Could not update roster.');}finally{setSaving(false);}}}/>} 
  {section==='tournaments'&&<div className='grid gap-3'>{tournaments.map(t=><div key={t.id} className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-5'><div className='flex items-start justify-between gap-3'><div><b>{t.name}</b><p className='mt-1 text-xs text-slate-500'>{t.type} • {t.status} • {t.participants?.length||0}/{t.maxTeams||t.bracketSize} teams</p></div>{t.registered?<span className='rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300'>Registered</span>:<button disabled={saving||!['draft','registration'].includes(t.status)} onClick={()=>register(t.id)} className='rounded-xl bg-[#e52a31] px-3 py-2 text-xs font-bold disabled:opacity-40'>Register team</button>} {t.registered&&['check-in','ongoing'].includes(t.status)&&<div className='mt-3 flex flex-wrap gap-2'><button disabled={saving} onClick={async()=>{setSaving(true);try{await api.post('/api/manager/tournaments/'+t.id+'/check-in',{checkedIn:true});setMessage('Team checked in.');await load();}catch(e:any){setMessage(e?.message||'Check-in failed.');}finally{setSaving(false);}}} className='rounded-xl border border-emerald-400/30 px-3 py-2 text-xs font-bold text-emerald-300'>{t.checkIns?.[team?.id || '']?.checkedIn?'Checked in':'Check in'}</button><button disabled={saving||Boolean(t.rosterLocks?.[team?.id || '']?.locked)} onClick={async()=>{setSaving(true);try{await api.post('/api/manager/tournaments/'+t.id+'/roster-lock');setMessage('Roster locked for this tournament.');await load();}catch(e:any){setMessage(e?.message||'Could not lock roster.');}finally{setSaving(false);}}} className='rounded-xl border border-[#ff2d8d]/30 px-3 py-2 text-xs font-bold text-[#ff78b4]'>{t.rosterLocks?.[team?.id || '']?.locked?'Roster locked':'Lock roster'}</button></div>}</div><p className='mt-3 text-xs text-slate-500'>{t.date||'Date TBA'} • {t.format}</p></div>)}{!tournaments.length&&<Empty text='No open tournaments.'/>}</div>}
  {section==='matches'&&<div className='grid gap-3'>{matches.map(m=><ManagerMatchCard key={m.id} match={m} teamId={team?.id||''} saving={saving} readyBusy={Boolean(readyBusy[m.id])} onReady={setReady} onSave={saveScore}/>)}{!matches.length&&<Empty text='No matches assigned to your team yet.'/>}</div>}
  </div>;
}

function TeamManagerRoster({ team, saving, onSave }: { team: Team|null; saving:boolean; onSave:(roster:Person[])=>Promise<void> }) { const [roster,setRoster]=useState<Person[]>(team?.roster||[]); useEffect(()=>setRoster(team?.roster||[]),[team?.id,team?.updatedAt]); const update=(i:number,k:keyof Person,v:string)=>setRoster(r=>r.map((p,idx)=>idx===i?{...p,[k]:v}:p)); return <div className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-5'><div className='flex items-center justify-between gap-3'><div><h2 className='font-bold text-xl'>Roster</h2><p className='text-xs text-slate-500'>Edit IGN, real name, country, role and status.</p></div><button disabled={saving} onClick={()=>onSave(roster)} className='rounded-xl bg-[#e52a31] px-4 py-2.5 text-sm font-bold'>{saving?'Saving...':'Save roster'}</button></div><div className='mt-4 space-y-3'>{roster.map((p,i)=><div key={i} className='grid gap-2 rounded-xl border border-white/5 p-3 sm:grid-cols-2 lg:grid-cols-4'><Input label='IGN' value={p.inGameName||''} onChange={v=>update(i,'inGameName',v)}/><Input label='Real name' value={p.realName||''} onChange={v=>update(i,'realName',v)}/><Input label='Country' value={p.country||''} onChange={v=>update(i,'country',v)}/><Select label='Role' value={p.role||'Player'} onChange={v=>update(i,'role',v)} options={['Captain','Player','Sub','Manager','Coach'].map(x=>[x,x] as [string,string])}/></div>)}</div></div>; }

function ManagerMatchCard({ match, teamId, saving, readyBusy, onReady, onSave }: { match:any; teamId:string; saving:boolean; readyBusy:boolean; onReady:(m:any)=>Promise<void>; onSave:(m:any,a:string,b:string,maps:any[])=>Promise<void> }) { const [a,setA]=useState(String(match.scoreA??'')); const [b,setB]=useState(String(match.scoreB??'')); const [maps,setMaps]=useState<Record<string,[string,string]>>({}); const setMap=(mode:string,side:0|1,v:string)=>setMaps(x=>({...x,[mode]:[...(x[mode]||['',''])].map((n,i)=>i===side?v:n) as [string,string]})); const modes=['Hardpoint','Search and Destroy','Control']; return <div className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-5'><div className='flex items-center justify-between gap-3'><div><b>{match.teamAName||match.teamAId} vs {match.teamBName||match.teamBId}</b><p className='mt-1 text-xs text-slate-500'>{match.roundName||'Match'} • {match.status}</p></div><span className='text-xs text-slate-500'>{match.tournamentId}</span></div><div className='mt-4 grid grid-cols-2 gap-3'><Input label='Team A score' value={a} onChange={setA} type='number'/><Input label='Team B score' value={b} onChange={setB} type='number'/></div><div className='mt-4 grid gap-2 sm:grid-cols-3'>{modes.map(mode=><div key={mode} className='rounded-xl border border-white/5 p-3'><span className='text-xs font-bold text-slate-400'>{mode}</span><div className='mt-2 grid grid-cols-2 gap-2'><Input label='A' value={maps[mode]?.[0]||''} onChange={v=>setMap(mode,0,v)} type='number'/><Input label='B' value={maps[mode]?.[1]||''} onChange={v=>setMap(mode,1,v)} type='number'/></div></div>)}</div><div className='mt-4 flex flex-wrap gap-2'><button disabled={readyBusy} onClick={()=>onReady(match)} className='rounded-xl border border-[#ff2d8d]/40 px-4 py-2.5 text-sm font-bold text-[#ff78b4]'>{readyBusy?'Updating...':((match.teamAId===teamId&&match.teamAReady)||(match.teamBId===teamId&&match.teamBReady)?'Ready confirmed':'Mark ready')}</button><button disabled={saving} onClick={()=>onSave(match,a,b,modes.map(mode=>({mode,teamAWins:Number(maps[mode]?.[0]||0),teamBWins:Number(maps[mode]?.[1]||0)})).filter(x=>x.teamAWins+x.teamBWins>0))} className='rounded-xl bg-[#e52a31] px-4 py-2.5 text-sm font-bold'>{saving?'Saving...':'Submit result'}</button></div></div>; }

function TeamManagerSignup({ onClose }: { onClose: () => void }) {
  const [teams,setTeams]=useState<Team[]>([]); const [name,setName]=useState(''); const [email,setEmail]=useState(''); const [teamId,setTeamId]=useState(''); const [message,setMessage]=useState(''); const [done,setDone]=useState(false); const [busy,setBusy]=useState(false);
  useEffect(()=>{api.get('/api/public/teams').then(r=>setTeams(r.data.teams||[])).catch(()=>setMessage('Could not load teams.'));},[]);
  const submit=async()=>{if(!name.trim()||!email.trim()||!teamId)return setMessage('Name, email and team are required.');setBusy(true);try{await api.post('/api/public/team-manager-applications',{name,email,teamId});setDone(true);}catch(e:any){setMessage(e?.message||'Could not submit application.');}finally{setBusy(false);}};
  return <div className='fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4 backdrop-blur-sm'><div className='w-full max-w-lg rounded-3xl border border-[#7e52d6]/30 bg-[#17063a] p-6 shadow-2xl sm:p-8'><div className='flex items-start justify-between gap-4'><div><p className='text-[10px] font-bold uppercase tracking-[.24em] text-[#ff2d8d]'>Team Manager</p><h2 className='mt-1 text-2xl font-black'>Apply for access</h2></div><button onClick={onClose} className='rounded-lg p-2 text-slate-400 hover:bg-white/5'><X size={18}/></button></div>{done?<div className='mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5'><h3 className='font-bold text-emerald-200'>Application submitted</h3><p className='mt-2 text-sm leading-6 text-slate-300'>Your application is now pending Super Admin approval. Once approved, sign in with the same email to access your team portal.</p></div>:<><div className='mt-6 space-y-4'><Input label='Full name' value={name} onChange={setName}/><Input label='Email address' value={email} onChange={setEmail}/><Select label='Team' value={teamId} onChange={setTeamId} options={[['','Select your team'],...teams.filter(t=>t.status!=='banned').map(t=>[t.id,t.name]) as [string,string][]]}/>{message&&<p className='text-sm text-pink-200'>{message}</p>}</div><button disabled={busy} onClick={submit} className='mt-6 w-full rounded-xl bg-[#e52a31] px-5 py-3 font-bold disabled:opacity-50'>{busy?'Submitting...':'Submit application'}</button></>}</div></div>;
}

function ManagerAccountsPro({ teams, busy, setBusy, setMessage }: { teams: Team[]; busy: boolean; setBusy: (x: boolean) => void; setMessage: (x: string) => void }) {
  const [email,setEmail]=useState('');
  const [teamId,setTeamId]=useState('');
  const [password,setPassword]=useState('');
  const [confirmPassword,setConfirmPassword]=useState('');
  const [managers,setManagers]=useState<any[]>([]);
  const [disabledManagers,setDisabledManagers]=useState<any[]>([]);

  const load=async()=>{
    try {
      const r=await api.get('/api/admin/team-managers');
      setManagers(r.data.managers||[]);
      setDisabledManagers(r.data.disabledManagers||[]);
    } catch(e:any) {
      setMessage(e?.message||'Could not load manager accounts.');
    }
  };
  useEffect(()=>{load();},[]);

  const create=async()=>{
    if(!email.trim()||!teamId)return setMessage('Manager email and team are required.');
    if(password.length<8)return setMessage('Initial password must be at least 8 characters.');
    if(password!==confirmPassword)return setMessage('Passwords do not match.');
    setBusy(true);
    try {
      await api.post('/api/admin/team-managers',{email,teamId,password,confirmPassword});
      setEmail('');setTeamId('');setPassword('');setConfirmPassword('');
      setMessage('Team Manager account created with the initial password.');
      await load();
    } catch(e:any) {
      setMessage(e?.message||'Could not create manager account.');
    } finally {setBusy(false);}
  };

  const disable=async(id:string)=>{
    if(!confirm('Disable this Team Manager account?'))return;
    setBusy(true);
    try {await api.post(`/api/admin/team-managers/${id}/disable`);setMessage('Manager account disabled.');await load();}
    catch(e:any){setMessage(e?.message||'Could not disable manager.');}
    finally{setBusy(false);}
  };

  const enable=async(id:string)=>{
    if(!confirm('Re-enable this Team Manager account?'))return;
    setBusy(true);
    try {await api.post(`/api/admin/team-managers/${id}/enable`);setMessage('Manager account re-enabled.');await load();}
    catch(e:any){setMessage(e?.message||'Could not re-enable manager.');}
    finally{setBusy(false);}
  };

  const remove=async(id:string)=>{
    if(!confirm('Permanently delete this Team Manager account? This cannot be undone.'))return;
    setBusy(true);
    try {await api.delete(`/api/admin/team-managers/${id}`);setMessage('Manager account permanently deleted.');await load();}
    catch(e:any){setMessage(e?.message||'Could not delete manager.');}
    finally{setBusy(false);}
  };

  const row=(m:any, actions:any)=><div key={m.id} className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 p-3'>
    <div><b>{m.email}</b><p className='text-xs text-slate-500'>{m.teamName}</p></div>
    <div className='flex flex-wrap gap-2'>{actions}</div>
  </div>;

  return <div className='space-y-5'>
    <div><h3 className='text-xl font-bold'>Team Manager accounts</h3><p className='mt-1 text-sm text-slate-500'>Create manager accounts with an initial password. Disabled accounts are separated below and can be re-enabled.</p></div>
    <div className='grid gap-4 rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-5 md:grid-cols-2'>
      <Input label='Manager email' value={email} onChange={setEmail}/>
      <Select label='Team' value={teamId} onChange={setTeamId} options={[['','Select a team'],...teams.map(t=>[t.id,t.name] as [string,string]) as [string,string][]]}/>
      <Input label='Initial password' value={password} onChange={setPassword} type='password'/>
      <Input label='Confirm password' value={confirmPassword} onChange={setConfirmPassword} type='password'/>
      <button disabled={busy} onClick={create} className='md:col-span-2 rounded-xl bg-[#e52a31] px-5 py-3 font-bold disabled:opacity-50'>{busy?'Saving...':'Create manager account'}</button>
    </div>
    <div className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-5'>
      <h4 className='font-bold'>Active manager accounts</h4>
      <div className='mt-4 space-y-2'>
        {managers.map(m=>row(m,<><button onClick={()=>disable(m.id)} className='rounded-lg border border-amber-400/20 px-3 py-2 text-xs text-amber-300'>Disable</button><button onClick={()=>remove(m.id)} className='rounded-lg border border-red-400/20 px-3 py-2 text-xs text-red-300'>Delete</button></>))}
        {!managers.length&&<Empty text='No active Team Manager accounts.'/>}
      </div>
    </div>
    <div className='rounded-2xl border border-white/10 bg-white/[.02] p-5'>
      <h4 className='font-bold'>Disabled manager accounts</h4>
      <div className='mt-4 space-y-2'>
        {disabledManagers.map(m=>row(m,<><button onClick={()=>enable(m.id)} className='rounded-lg border border-emerald-400/20 px-3 py-2 text-xs text-emerald-300'>Re-enable</button><button onClick={()=>remove(m.id)} className='rounded-lg border border-red-400/20 px-3 py-2 text-xs text-red-300'>Delete</button></>))}
        {!disabledManagers.length&&<Empty text='No disabled Team Manager accounts.'/>}
      </div>
    </div>
  </div>;
}

function TeamManagerPro({ teams, busy, setBusy, setMessage, refresh }: { teams: Team[]; busy: boolean; setBusy: (x: boolean) => void; setMessage: (x: string) => void; refresh: () => Promise<void> }) {
  const [tiers,setTiers]=useState<Tier[]>([]); const [editing,setEditing]=useState<Team|null>(null); const [name,setName]=useState(''); const [tierId,setTierId]=useState(''); const [region,setRegion]=useState('Nigeria'); const [status,setStatus]=useState('active'); const [roster,setRoster]=useState<Person[]>([]); const [logoPreview,setLogoPreview]=useState(''); const [logoFile,setLogoFile]=useState<File|null>(null); const [playerFiles,setPlayerFiles]=useState<Record<number,File>>({}); const [playerPreviews,setPlayerPreviews]=useState<Record<number,string>>({});
  const loadTiers=async()=>{try{const r=await api.get('/api/admin/tiers');const x=(r.data.tiers||[]).filter((t:Tier)=>t.active);setTiers(x);if(!tierId&&x[0])setTierId(x[0].id);}catch{}}; useEffect(()=>{loadTiers();},[]);
  const reset=()=>{setEditing(null);setName('');setTierId(tiers[0]?.id||'');setRegion('Nigeria');setStatus('active');setRoster([{inGameName:'',role:'Captain'},{inGameName:'',role:'Player'},{inGameName:'',role:'Player'},{inGameName:'',role:'Player'},{inGameName:'',role:'Player'}]);setLogoPreview('');setLogoFile(null);setPlayerFiles({});setPlayerPreviews({});};
  useEffect(()=>{if(!editing&&tiers.length&&!roster.length)reset();},[tiers.length]);
  const edit=(t:Team)=>{setEditing(t);setName(t.name);setTierId(t.tierId||tiers.find(x=>x.name===t.tier)?.id||'');setRegion(t.region||'Nigeria');setStatus(t.status||'active');setRoster(t.roster?.map(p=>({...p}))||[]);setLogoPreview(t.logoUrl||'');setLogoFile(null);setPlayerFiles({});setPlayerPreviews(Object.fromEntries((t.roster||[]).map((p,i)=>p.photoUrl?[i,p.photoUrl]:null).filter(Boolean) as [string,string][]));};
  const updatePerson=(i:number,key:keyof Person,value:string)=>setRoster(roster.map((p,j)=>j===i?{...p,[key]:value}:p));
  const save=async()=>{const resolvedTierId=tierId||editing?.tierId||tiers.find(t=>t.name===editing?.tier)?.id||'';const valid=roster.filter(p=>p.inGameName.trim());if(!name.trim()||!resolvedTierId)return setMessage('Team name and tier are required. Please select a tier.');if(valid.filter(p=>p.role==='Captain').length!==1||valid.filter(p=>p.role==='Player').length<4||valid.filter(p=>p.role==='Player').length>5)return setMessage('Roster requires exactly 1 captain and 4 to 5 main players.');setBusy(true);try{const payload={name:name.trim(),tierId:resolvedTierId,tier:tiers.find(t=>t.id===resolvedTierId)?.name||editing?.tier||'',region,status,roster:valid};let saved=editing?.id;if(editing){await api.put(`/api/admin/teams/${editing.id}`,payload);}else{const r=await api.post('/api/admin/teams',payload);saved=r.data.team?.id;}if(logoFile&&saved){const reader=new FileReader();const base64=await new Promise<string>((resolve,reject)=>{reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(logoFile);});await api.post(`/api/admin/teams/${saved}/logo`,{base64,contentType:logoFile.type});}if(saved&&editing){for(const [idx,file] of Object.entries(playerFiles)){const reader=new FileReader();const base64=await new Promise<string>((resolve,reject)=>{reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(file);});await api.post(`/api/admin/teams/${saved}/roster/${idx}/photo`,{base64,contentType:file.type});}}setMessage(editing?`${name} updated.`:`${name} created.`);reset();await refresh();}catch(e:any){setMessage(e?.message||'Could not save team.');}finally{setBusy(false);}};
  const remove=async(t:Team)=>{if(!confirm(`Permanently delete ${t.name}? This removes the team, roster, manager accounts and related team records. This cannot be undone.`))return;setBusy(true);try{await api.delete(`/api/admin/teams/${t.id}`);setMessage(`${t.name} deleted.`);await refresh();}catch(e:any){setMessage(e?.message||'Could not delete team.');}finally{setBusy(false);}};
  return (
    <div className='team-admin-workspace space-y-5'>
      <div className='team-admin-layout grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,.75fr)]'>
        <div className='team-editor rounded-3xl border border-[#7e52d6]/25 bg-[#17063a]/95 p-4 shadow-2xl shadow-black/20 sm:p-6 lg:p-7'>
          <div className='flex flex-col gap-3 border-b border-white/5 pb-5 sm:flex-row sm:items-start sm:justify-between'><div><p className='text-[10px] font-bold uppercase tracking-[.24em] text-[#ff2d8d]'>Team management</p><h3 className='mt-1 text-2xl font-black text-white'>{editing?'Edit team':'New team'}</h3><p className='mt-1 max-w-xl text-sm leading-6 text-slate-500'>Build the team identity first, then complete every player profile in a dedicated roster card.</p></div>{editing&&<button onClick={reset} className='self-start rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:border-[#ff2d8d]/50 hover:text-white'>Cancel edit</button>}</div>
          <section className='team-identity-panel mt-6'><div className='team-section-heading'><div><span className='team-section-kicker'>01</span><div><h4>Team identity</h4><p>Name, tier, region, status and team branding.</p></div></div></div><div className='team-identity-grid'><div className='team-logo-card'><div className='team-logo-card-title'><div><b>Team logo</b><span>Square crop recommended</span></div><span className='team-media-status'>{logoPreview?'Ready':'Optional'}</span></div><ImageDropzone label='Team logo' hint='JPG, PNG or WebP • max 2MB' preview={logoPreview} onChange={(file,url)=>{setLogoFile(file);setLogoPreview(url);}} cropShape='square'/></div><div className='team-identity-fields'><Input label='Team name' value={name} onChange={setName}/><Select label='Tier' value={tierId} onChange={setTierId} options={tiers.map(t=>[t.id,`${t.name} • ${teams.filter(x=>x.tierId===t.id||x.tier===t.name).length}/${t.maxTeams}`])}/><Input label='Region' value={region} onChange={setRegion}/><Select label='Status' value={status} onChange={setStatus} options={['active','inactive','banned'].map(x=>[x,x])}/></div></div></section>
          <section className='roster-editor mt-7'><div className='team-section-heading'><div><span className='team-section-kicker'>02</span><div><h4>Roster & player details</h4><p>One clear profile card per player. Keep IGN and role visible at the top.</p></div></div><button onClick={()=>roster.length<8&&setRoster([...roster,{inGameName:'',role:'Player'}])} disabled={roster.length>=8} className='add-roster-button'><Plus size={15}/> Add member</button></div><div className='roster-summary-bar'><span><Users size={15}/> {roster.length} roster {roster.length===1?'member':'members'}</span><span>Required: 1 Captain + 4–5 Players</span></div><div className='player-card-list'>{roster.map((p,i)=><article key={i} className='player-editor-card'><div className='player-card-topline'><div className='player-number'>{String(i+1).padStart(2,'0')}</div><div className='player-card-heading'><span>Roster member {i+1}</span><strong>{p.inGameName||'New player'}</strong></div><div className='player-card-actions'><span className={`player-role-badge role-${p.role.toLowerCase()}`}>{p.role}</span><button type='button' onClick={()=>setRoster(roster.filter((_,j)=>j!==i))} className='remove-player-button'><Trash2 size={14}/> Remove</button></div></div><div className='player-card-body'><div className='player-photo-column'><ImageDropzone label='Profile photo' hint='JPG, PNG or WebP • max 2MB' preview={playerPreviews[i]||p.photoUrl||''} onChange={(file,url)=>{setPlayerFiles(prev=>({...prev,[i]:file}));setPlayerPreviews(prev=>({...prev,[i]:url}));}} cropShape='circle'/></div><div className='player-details-grid'><Input label='In-game name (IGN)' value={p.inGameName} onChange={v=>updatePerson(i,'inGameName',v)}/><Select label='Role' value={p.role} onChange={v=>updatePerson(i,'role',v)} options={['Captain','Manager','Coach','Player','Substitute'].map(x=>[x,x])}/><Input label='Real name' value={p.realName||''} onChange={v=>updatePerson(i,'realName',v)}/><Input label='Country' value={p.country||''} onChange={v=>updatePerson(i,'country',v)}/><Select label='Player status' value={p.status||'active'} onChange={v=>updatePerson(i,'status',v)} options={['active','inactive'].map(x=>[x,x])}/></div></div></article>)}</div></section>
          <div className='team-save-bar'><div><span>Ready to publish</span><small>Check the roster rules before saving.</small></div><button disabled={busy} onClick={save} className='team-save-button'>{busy?'Saving team...':editing?'Save team changes':'Create team'}</button></div>
        </div>
        <aside className='team-directory rounded-3xl border border-[#7e52d6]/25 bg-[#17063a]/95 p-4 shadow-2xl shadow-black/20 sm:p-5 lg:p-6'><div className='sticky top-24'><p className='text-[10px] font-bold uppercase tracking-[.24em] text-[#ff2d8d]'>Directory</p><h3 className='mt-1 text-xl font-black'>Registered teams</h3><p className='mt-1 text-sm leading-6 text-slate-500'>Edit or permanently delete teams without leaving the admin workspace.</p><div className='mt-5 space-y-2.5'>{teams.map(t=><div key={t.id} className='team-directory-row'><TeamAvatar team={t}/><div className='min-w-0 flex-1'><b className='block truncate'>{t.name}</b><div className='mt-0.5 text-xs text-slate-500'>{t.tier} • {t.roster?.length||0} members • {t.points} pts</div></div><div className='flex shrink-0 gap-1.5'><button aria-label={`Edit ${t.name}`} onClick={()=>edit(t)} className='directory-icon-button'><Edit3 size={14}/></button><button aria-label={`Delete ${t.name}`} onClick={()=>remove(t)} className='directory-icon-button danger'><Trash2 size={14}/></button></div></div>)}{!teams.length&&<Empty text='No teams registered yet.'/>}</div></div></aside>
      </div>
      <TierManagerPro tiers={tiers} teams={teams} busy={busy} setBusy={setBusy} setMessage={setMessage} refresh={async()=>{await loadTiers();await refresh();}}/>
    </div>
  );
}
function TierManagerPro({ tiers, teams, busy, setBusy, setMessage, refresh }: { tiers: Tier[]; teams: Team[]; busy: boolean; setBusy: (x: boolean) => void; setMessage: (x: string) => void; refresh: () => Promise<void> }) { const [name,setName]=useState('');const [max,setMax]=useState('10');const [editing,setEditing]=useState<Tier|null>(null);const save=async()=>{if(!name.trim()||Number(max)<1)return setMessage('Tier name and capacity are required.');setBusy(true);try{if(editing)await api.put(`/api/admin/tiers/${editing.id}`,{name,maxTeams:Number(max)});else await api.post('/api/admin/tiers',{name,maxTeams:Number(max),active:true});setMessage(editing?`${name} updated.`:`${name} created.`);setEditing(null);setName('');setMax('10');await refresh();}catch(e:any){setMessage(e?.message||'Could not save tier.');}finally{setBusy(false);}};const remove=async(t:Tier)=>{if(!confirm(`Delete ${t.name}?`))return;setBusy(true);try{await api.delete(`/api/admin/tiers/${t.id}`);setMessage(`${t.name} deleted.`);await refresh();}catch(e:any){setMessage(e?.message||'Could not delete tier.');}finally{setBusy(false);}};return <div className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-6'><div className='flex items-center gap-2'><Layers className='text-[#ff2d8d]' size={19}/><h3 className='text-xl font-bold'>Tier management</h3></div><div className='mt-4 grid gap-3 md:grid-cols-[1fr_150px_auto]'><Input label='Tier name' value={name} onChange={setName}/><Input label='Max teams' value={max} onChange={setMax} type='number'/><button onClick={save} disabled={busy} className='self-end rounded-xl bg-[#e52a31] px-4 py-2.5 font-bold'>{editing?'Save tier':'Add tier'}</button></div><div className='mt-5 grid gap-2 md:grid-cols-2'>{tiers.filter(t=>t.active).map(t=><div key={t.id} className='flex items-center gap-3 rounded-xl border border-white/5 p-3'><div className='flex-1'><b>{t.name}</b><div className='text-xs text-slate-500'>{teams.filter(x=>x.tierId===t.id||x.tier===t.name).length}/{t.maxTeams} teams</div></div><button onClick={()=>{setEditing(t);setName(t.name);setMax(String(t.maxTeams));}} className='rounded-lg border border-white/10 p-2'><Edit3 size={14}/></button><button onClick={()=>remove(t)} className='rounded-lg border border-white/10 p-2 text-red-300'><Trash2 size={14}/></button></div>)}</div></div>; }

function TournamentManagerPro({ teams, tournaments, busy, setBusy, setMessage, refresh }: { teams: Team[]; tournaments: Tournament[]; busy: boolean; setBusy: (x: boolean) => void; setMessage: (x: string) => void; refresh: () => Promise<void> }) { const [editing,setEditing]=useState<Tournament|null>(null);const [name,setName]=useState('');const [type,setType]=useState('General');const [format,setFormat]=useState('Single Elimination');const [size,setSize]=useState('8');const [date,setDate]=useState('');const [status,setStatus]=useState('registration');const [multiplier,setMultiplier]=useState('1.5');const [selected,setSelected]=useState<Record<string,string>>({});const reset=()=>{setEditing(null);setName('');setType('General');setFormat('Single Elimination');setSize('8');setDate('');setStatus('registration');setMultiplier('1.5');};const edit=(t:Tournament)=>{setEditing(t);setName(t.name);setType(t.type);setFormat(t.format);setSize(String(t.bracketSize));setDate(t.date||'');setStatus(t.status);setMultiplier(String(t.multiplier??1));};const save=async()=>{if(!name.trim())return setMessage('Tournament name is required.');setBusy(true);try{const p={name:name.trim(),type,format,bracketSize:Number(size),date,status,multiplier:Number(multiplier)};if(editing)await api.put(`/api/admin/tournaments/${editing.id}`,p);else await api.post('/api/admin/tournaments',p);setMessage(editing?`${name} updated.`:`${name} created.`);reset();await refresh();}catch(e:any){setMessage(e?.message||'Could not save tournament.');}finally{setBusy(false);}};const register=async(t:Tournament)=>{const teamId=selected[t.id];if(!teamId)return setMessage('Select a team first.');setBusy(true);try{await api.put(`/api/admin/tournaments/${t.id}/register`,{teamId});setMessage(`${teams.find(x=>x.id===teamId)?.name||'Team'} registered.`);setSelected({...selected,[t.id]:''});await refresh();}catch(e:any){setMessage(e?.message||'Registration failed.');}finally{setBusy(false);}};const generate=async(id:string)=>{setBusy(true);try{await api.post(`/api/admin/tournaments/${id}/generate-bracket`);setMessage('Bracket generated.');await refresh();}catch(e:any){setMessage(e?.message||'Bracket generation failed.');}finally{setBusy(false);}};const resetBracket=async(id:string)=>{if(!confirm('Reset this bracket? Match records will be cleared.'))return;setBusy(true);try{await api.post(`/api/admin/tournaments/${id}/reset-bracket`);setMessage('Bracket reset.');await refresh();}catch(e:any){setMessage(e?.message||'Could not reset bracket.');}finally{setBusy(false);}};const remove=async(t:Tournament)=>{if(!confirm(`Cancel ${t.name}?`))return;setBusy(true);try{await api.delete(`/api/admin/tournaments/${t.id}`);setMessage(`${t.name} cancelled.`);await refresh();}catch(e:any){setMessage(e?.message||'Could not cancel tournament.');}finally{setBusy(false);}};return <div className='space-y-5'><div className='grid gap-5 lg:grid-cols-[.8fr_1.2fr]'><div className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-6'><div className='flex items-center justify-between'><h3 className='text-xl font-bold'>{editing?'Edit tournament':'Create tournament'}</h3>{editing&&<button onClick={reset} className='text-sm text-[#ff2d8d]'>Cancel</button>}</div><div className='mt-5 space-y-3'><Input label='Name' value={name} onChange={setName}/><Select label='Type' value={type} onChange={setType} options={['General','Tier 2 Only','Tier 1 Only','Invitational','Custom'].map(x=>[x,x])}/><Select label='Format' value={format} onChange={setFormat} options={['Single Elimination','Double Elimination','Round Robin'].map(x=>[x,x])}/><Select label='Bracket size' value={size} onChange={setSize} options={['4','8','16','32','64'].map(x=>[x,x])}/><Input label='Date / time' value={date} onChange={setDate} type='datetime-local'/><Select label='Status' value={status} onChange={setStatus} options={['draft','registration','check-in','ongoing','completed','cancelled'].map(x=>[x,x])}/><Input label='Points multiplier' value={multiplier} onChange={setMultiplier} type='number' step='0.1'/><button disabled={busy} onClick={save} className='w-full rounded-xl bg-[#e52a31] px-4 py-3 font-bold'>{busy?'Saving...':editing?'Save changes':'Create tournament'}</button></div></div><div className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-6'><h3 className='text-xl font-bold'>Tournament directory</h3><div className='mt-4 space-y-3'>{tournaments.map(t=><div key={t.id} className='rounded-xl border border-white/5 p-4'><div className='flex items-start justify-between gap-3'><div className='min-w-0'><b className='block truncate'>{t.name}</b><div className='text-xs text-slate-500'>{t.type} • {t.format} • {t.participants?.length||0}/{t.bracketSize}</div></div><span className='rounded-full bg-[#5a2cff]/20 px-2 py-1 text-xs'>{t.status}</span></div><div className='mt-3 flex flex-wrap gap-2'><button onClick={()=>edit(t)} className='inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs'><Edit3 size={13}/> Edit</button><button onClick={()=>generate(t.id)} disabled={busy} className='rounded-lg bg-[#31188f] px-3 py-2 text-xs font-bold'>Generate</button><button onClick={()=>resetBracket(t.id)} disabled={busy} className='rounded-lg border border-white/10 px-3 py-2 text-xs'>Reset</button><button onClick={()=>remove(t)} disabled={busy} className='rounded-lg border border-white/10 px-3 py-2 text-xs text-red-300'><Trash2 size={13}/></button><select value={selected[t.id]||''} onChange={e=>setSelected({...selected,[t.id]:e.target.value})} className='rounded-lg border border-white/10 bg-[#130233] px-3 py-2 text-xs'><option value=''>Register team...</option>{teams.filter(team=>!(t.participants||[]).includes(team.id)).map(team=><option key={team.id} value={team.id}>{team.name}</option>)}</select><button disabled={busy||!selected[t.id]} onClick={()=>register(t)} className='rounded-lg border border-[#ff2d8d]/40 px-3 py-2 text-xs font-bold text-[#ff2d8d]'>Register</button></div></div>)}</div>{!tournaments.length&&<Empty text='Create your first tournament.'/>}</div></div></div>; }

function MatchManagerPro({ tournaments, matches, busy, setBusy, setMessage, refresh }: { tournaments: Tournament[]; matches: Match[]; busy: boolean; setBusy: (x: boolean) => void; setMessage: (x: string) => void; refresh: () => Promise<void> }) { const [selected,setSelected]=useState('');const [local,setLocal]=useState<Match[]>(matches);const [scores,setScores]=useState<Record<string,[string,string]>>({});const [statuses,setStatuses]=useState<Record<string,string>>({});const [maps,setMaps]=useState<Record<string,Record<string,[string,string]>>>({});const load=async(id:string)=>{setSelected(id);if(!id)return setLocal([]);try{const r=await api.get(`/api/public/tournaments/${id}/bracket`);setLocal(r.data.matches||[]);}catch(e:any){setMessage(e?.message||'Could not load matches.');}};useEffect(()=>setLocal(matches),[matches]);const save=async(m:Match)=>{const p=scores[m.id]||[String(m.scoreA??''),String(m.scoreB??'')];const modeNames=['Hardpoint','Search and Destroy','Control'];const mapResults=modeNames.map(mode=>{const row=maps[m.id]?.[mode]||['',''] as [string,string];return {mode,teamAWins:Number(row[0]||0),teamBWins:Number(row[1]||0)}}).filter(x=>x.teamAWins+x.teamBWins>0);if(!window.confirm(`Finalize ${m.teamAName||m.teamAId||'Team A'} ${p[0]} - ${p[1]} ${m.teamBName||m.teamBId||'Team B'} as ${statuses[m.id]||'completed'}? This will advance the bracket and may finalize ranking points.`))return;setBusy(true);try{await api.put(`/api/admin/matches/${m.id}`,{scoreA:Number(p[0]),scoreB:Number(p[1]),status:statuses[m.id]||'completed',mapResults,reason:'Admin score update'});setMessage('Match result and map results saved.');await load(selected);await refresh();}catch(e:any){setMessage(e?.message||'Could not save match.');}finally{setBusy(false);}};const remove=async(m:Match)=>{if(!confirm('Cancel this match record?'))return;setBusy(true);try{await api.delete(`/api/admin/matches/${m.id}`);setMessage('Match record cancelled.');await load(selected);}catch(e:any){setMessage(e?.message||'Could not cancel match.');}finally{setBusy(false);}};return <div className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-6'><div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'><div><h3 className='text-xl font-bold'>Match management</h3><p className='text-sm text-slate-500'>Update scores, forfeit/no-show status and cancel stale records.</p></div><div className='w-full sm:w-80'><Select label='Tournament' value={selected} onChange={load} options={[['','Select tournament'],...tournaments.map(t=>[t.id,t.name] as [string,string])]}/></div></div><div className='mt-5 space-y-3'>{local.map(m=>{const p=scores[m.id]||[String(m.scoreA??''),String(m.scoreB??'')];return <div key={m.id} className='rounded-xl border border-white/5 p-4'><div className='grid gap-3 lg:grid-cols-[1fr_auto_auto_150px_auto] lg:items-center'><div><b>{m.teamAName||m.teamAId||'TBD'} <span className='text-slate-600'>vs</span> {m.teamBName||m.teamBId||'TBD'}</b><div className='text-xs text-slate-500'>{m.roundName} • {m.status}</div></div><input value={p[0]} onChange={e=>setScores({...scores,[m.id]:[e.target.value,p[1]]})} type='number' min='0' className='w-20 rounded-lg border border-white/10 bg-black/20 px-3 py-2'/><input value={p[1]} onChange={e=>setScores({...scores,[m.id]:[p[0],e.target.value]})} type='number' min='0' className='w-20 rounded-lg border border-white/10 bg-black/20 px-3 py-2'/><select value={statuses[m.id]||m.status||'completed'} onChange={e=>setStatuses({...statuses,[m.id]:e.target.value})} className='rounded-lg border border-white/10 bg-[#0f0625] px-3 py-2 text-sm'><option value='scheduled'>Scheduled</option><option value='check-in'>Check-in</option><option value='ready'>Ready</option><option value='live'>Live</option><option value='pending-result'>Pending result</option><option value='completed'>Completed</option><option value='forfeit'>Forfeit</option><option value='no-show'>No-show</option><option value='disqualified'>Disqualified</option><option value='disputed'>Disputed</option></select><div className='flex gap-2'><button disabled={busy} onClick={()=>save(m)} className='rounded-lg bg-[#e52a31] px-3 py-2 text-xs font-bold'>Save</button><button onClick={()=>remove(m)} className='rounded-lg border border-white/10 p-2 text-red-300'><Trash2 size={14}/></button></div></div></div>})}{!local.length&&<Empty text='Select a tournament with a generated bracket.'/>}</div></div>; }

function TransferManagerPro({ teams, busy, setBusy, setMessage }: { teams: Team[]; busy: boolean; setBusy: (x: boolean) => void; setMessage: (x: string) => void }) {
  const [news,setNews]=useState<TransferNews[]>([]); const [editing,setEditing]=useState<TransferNews|null>(null); const [title,setTitle]=useState(''); const [category,setCategory]=useState('Transfer'); const [playerName,setPlayerName]=useState(''); const [fromTeam,setFromTeam]=useState(''); const [toTeam,setToTeam]=useState(''); const [summary,setSummary]=useState(''); const [body,setBody]=useState(''); const [status,setStatus]=useState('published');
  const load=async()=>{try{const r=await api.get('/api/admin/transfer-news');setNews(r.data.news||[]);}catch(e:any){setMessage(e?.message||'Could not load transfer news.');}};
  useEffect(()=>{load();},[]);
  const reset=()=>{setEditing(null);setTitle('');setCategory('Transfer');setPlayerName('');setFromTeam('');setToTeam('');setSummary('');setBody('');setStatus('published');};
  const edit=(n:TransferNews)=>{setEditing(n);setTitle(n.title);setCategory(n.category||'Transfer');setPlayerName(n.playerName||'');setFromTeam(n.fromTeam||'');setToTeam(n.toTeam||'');setSummary(n.summary||'');setBody(n.body||'');setStatus(n.status||'draft');};
  const save=async()=>{if(!title.trim()||!summary.trim()||!body.trim())return setMessage('Title, summary and story body are required.');setBusy(true);try{const p={title:title.trim(),category:category.trim()||'Transfer',playerName:playerName.trim(),fromTeam:fromTeam.trim(),toTeam:toTeam.trim(),summary:summary.trim(),body:body.trim(),status};if(editing)await api.put(`/api/admin/transfer-news/${editing.id}`,p);else await api.post('/api/admin/transfer-news',p);setMessage(editing?'Transfer story updated.':'Transfer story published.');reset();await load();}catch(e:any){setMessage(e?.message||'Could not save transfer story.');}finally{setBusy(false);}};
  const remove=async(n:TransferNews)=>{if(!confirm(`Delete "${n.title}"?`))return;setBusy(true);try{await api.delete(`/api/admin/transfer-news/${n.id}`);setMessage('Transfer story deleted.');await load();}catch(e:any){setMessage(e?.message||'Could not delete transfer story.');}finally{setBusy(false);}};
  return <div className='space-y-5'><div className='grid gap-5 lg:grid-cols-[.85fr_1.15fr]'><div className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-5 sm:p-6'><div className='flex items-center justify-between gap-3'><div><h3 className='text-xl font-bold'>{editing?'Edit transfer story':'Create transfer story'}</h3><p className='mt-1 text-sm text-slate-500'>Publish player moves, signings and roster changes.</p></div>{editing&&<button onClick={reset} className='text-sm text-[#ff2d8d]'>Cancel</button>}</div><div className='mt-5 space-y-3'><Input label='Headline' value={title} onChange={setTitle}/><Input label='Category' value={category} onChange={setCategory}/><Input label='Player name' value={playerName} onChange={setPlayerName}/><div className='grid gap-3 sm:grid-cols-2'><Input label='From team' value={fromTeam} onChange={setFromTeam}/><Input label='To team' value={toTeam} onChange={setToTeam}/></div><Input label='Summary' value={summary} onChange={setSummary}/><label className='block text-sm'><span className='mb-1.5 block font-semibold text-slate-300'>Story body</span><textarea value={body} onChange={e=>setBody(e.target.value)} rows={7} className='w-full resize-y rounded-xl border border-white/10 bg-[#0f0625] px-3 py-2.5 text-white outline-none focus:border-[#ff2d8d]'/></label><Select label='Status' value={status} onChange={setStatus} options={['draft','published'].map(x=>[x,x])}/><button disabled={busy} onClick={save} className='w-full rounded-xl bg-[#e52a31] px-4 py-3 font-bold'>{busy?'Saving...':editing?'Save changes':status==='published'?'Publish transfer':'Save draft'}</button></div></div><div className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-5 sm:p-6'><h3 className='text-xl font-bold'>Transfer stories</h3><div className='mt-4 space-y-3'>{news.map(n=><article key={n.id} className='rounded-xl border border-white/5 p-4'><div className='flex items-start justify-between gap-3'><div className='min-w-0'><span className='text-[10px] font-bold uppercase tracking-wider text-[#ff2d8d]'>{n.category||'Transfer'} • {n.status}</span><h4 className='mt-1 font-bold text-white'>{n.title}</h4><p className='mt-1 text-xs text-slate-500'>{n.playerName||'Player'} • {n.fromTeam||'Free agent'} → {n.toTeam||'Free agent'}</p></div><div className='flex shrink-0 gap-1.5'><button onClick={()=>edit(n)} className='rounded-lg border border-white/10 p-2'><Edit3 size={14}/></button><button onClick={()=>remove(n)} className='rounded-lg border border-white/10 p-2 text-red-300'><Trash2 size={14}/></button></div></div><p className='mt-3 text-sm text-slate-400'>{n.summary}</p></article>)}{!news.length&&<Empty text='No transfer stories yet.'/>}</div></div></div></div>;
}
function SeasonManagerPro({ busy, setBusy, setMessage }: { busy: boolean; setBusy: (x: boolean) => void; setMessage: (x: string) => void }) {
  const [seasons,setSeasons]=useState<any[]>([]); const [name,setName]=useState(''); const [startDate,setStartDate]=useState(''); const [endDate,setEndDate]=useState('');
  const load=async()=>{try{const r=await api.get('/api/admin/seasons');setSeasons(r.data.seasons||[]);}catch(e:any){setMessage(e?.message||'Could not load seasons.');}};
  useEffect(()=>{load();},[]);
  const create=async()=>{if(!name.trim())return setMessage('Season name is required.');setBusy(true);try{await api.post('/api/admin/seasons',{name:name.trim(),startDate,endDate,status:'active'});setName('');setStartDate('');setEndDate('');setMessage('Season created.');await load();}catch(e:any){setMessage(e?.message||'Could not create season.');}finally{setBusy(false);}};
  return <div className='grid gap-5 lg:grid-cols-[.8fr_1.2fr]'><div className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-6'><h3 className='text-xl font-bold'>Create season</h3><div className='mt-5 space-y-3'><Input label='Season name' value={name} onChange={setName}/><Input label='Start date' value={startDate} onChange={setStartDate} type='date'/><Input label='End date' value={endDate} onChange={setEndDate} type='date'/><button disabled={busy} onClick={create} className='w-full rounded-xl bg-[#e52a31] px-4 py-3 font-bold'>{busy?'Saving...':'Create season'}</button></div></div><div className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-6'><h3 className='text-xl font-bold'>Seasons</h3><div className='mt-4 space-y-2'>{seasons.map(s=><div key={s.id} className='rounded-xl border border-white/5 p-4'><div className='flex items-center justify-between'><b>{s.name}</b><span className='text-xs text-slate-500'>{s.status}</span></div><p className='mt-1 text-xs text-slate-500'>{s.startDate||'TBA'} → {s.endDate||'TBA'}</p></div>)}{!seasons.length&&<Empty text='No seasons yet.'/>}</div></div></div>;
}

function SettingsManagerPro({ busy, setBusy, setMessage }: { busy: boolean; setBusy: (x: boolean) => void; setMessage: (x: string) => void }) { const [s,setS]=useState<any>(null);const [general,setGeneral]=useState('1.5');const [tier2,setTier2]=useState('1');const [points,setPoints]=useState<Record<string,string>>({Participation:'1','Round of 16':'1',Quarterfinal:'1',Semifinal:'1',Final:'2',Champion:'3'});useEffect(()=>{api.get('/api/admin/settings').then(r=>{const x=r.data.settings;setS(x);setGeneral(String(x.multipliers?.General??1.5));setTier2(String(x.multipliers?.['Tier 2 Only']??1));setPoints(Object.fromEntries(Object.entries(x.points||{}).map(([k,v])=>[k,String(v)])));}).catch(()=>{});},[]);const save=async()=>{setBusy(true);try{await api.put('/api/admin/settings',{multipliers:{...(s?.multipliers||{}),General:Number(general),'Tier 2 Only':Number(tier2)},points:Object.fromEntries(Object.entries(points).map(([k,v])=>[k,Number(v)]))});setMessage('Ranking settings saved.');}catch(e:any){setMessage(e?.message||'Could not save settings.');}finally{setBusy(false);}};return <div className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-6'><h3 className='text-xl font-bold'>Ranking configuration</h3><p className='mt-1 text-sm text-slate-500'>General must remain higher than Tier 2 Only.</p><div className='mt-5 grid gap-4 sm:grid-cols-2'><Input label='General multiplier' value={general} onChange={setGeneral} type='number' step='0.1'/><Input label='Tier 2 multiplier' value={tier2} onChange={setTier2} type='number' step='0.1'/></div><div className='mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>{Object.keys(points).map(k=><Input key={k} label={`${k} points`} value={points[k]} onChange={v=>setPoints({...points,[k]:v})} type='number'/>)}</div><button disabled={busy} onClick={save} className='mt-5 rounded-xl bg-[#e52a31] px-5 py-3 font-bold'>Save settings</button></div>; }

function AuditManagerPro({ busy, setBusy, setMessage }: { busy: boolean; setBusy: (x: boolean) => void; setMessage: (x: string) => void }) { const [logs,setLogs]=useState<any[]>([]);const [loading,setLoading]=useState(false);const load=async()=>{setLoading(true);try{const r=await api.get('/api/admin/audit');setLogs(r.data.logs||[]);}catch(e:any){setMessage(e?.message||'Could not load audit log.');}finally{setLoading(false);}};useEffect(()=>{load();},[]);const download=async(kind:string)=>{setBusy(true);try{const r=await api.get(`/api/admin/export/${kind}`);const blob=new Blob([r.data.csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=r.data.filename;a.click();URL.revokeObjectURL(url);setMessage(`${r.data.filename} exported.`);}catch(e:any){setMessage(e?.message||'Export failed.');}finally{setBusy(false);}};return <div className='space-y-5'><div className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-6'><div className='flex items-center gap-2'><Download className='text-[#ff2d8d]' size={19}/><h3 className='text-xl font-bold'>CSV exports</h3></div><div className='mt-4 flex flex-wrap gap-2'>{['rankings','teams','tournaments','matches'].map(k=><button key={k} disabled={busy} onClick={()=>download(k)} className='rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold hover:border-[#ff2d8d]/50'>{k}.csv</button>)}</div></div><div className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-6'><div className='flex items-center justify-between'><div><h3 className='text-xl font-bold'>Audit log</h3><p className='text-sm text-slate-500'>Admin actions with actor, entity, timestamp and reason.</p></div><button onClick={load} className='rounded-xl border border-white/10 p-2'><RefreshCw size={16}/></button></div><div className='mt-4 overflow-x-auto'><table className='w-full text-left text-sm'><thead className='text-xs uppercase tracking-wider text-slate-600'><tr><th className='p-3'>Time</th><th className='p-3'>Action</th><th className='p-3'>Entity</th><th className='p-3'>Admin</th><th className='p-3'>Reason</th></tr></thead><tbody>{logs.map((l,i)=><tr key={l.id||i} className='border-t border-white/5'><td className='p-3 whitespace-nowrap'>{l.timestamp?new Date(l.timestamp).toLocaleString():''}</td><td className='p-3 font-bold text-[#ff2d8d]'>{l.action}</td><td className='p-3'>{l.entity}</td><td className='p-3 text-slate-400'>{l.adminEmail}</td><td className='p-3 text-slate-500'>{l.reason||'-'}</td></tr>)}</tbody></table>{loading&&<p className='p-5 text-center text-slate-500'>Loading...</p>}{!loading&&!logs.length&&<Empty text='No audit entries yet.'/>}</div></div></div>; }

function ImageDropzone({ label, hint, preview, onChange, cropShape = 'square' }: { label: string; hint: string; preview: string; onChange: (file: File, url: string) => void; cropShape?: 'square' | 'circle' }) { const [drag,setDrag]=useState(false); const [source,setSource]=useState(''); const [cropOpen,setCropOpen]=useState(false); const [zoom,setZoom]=useState(1); const [x,setX]=useState(0); const [y,setY]=useState(0); const inputId=useMemo(()=>`image-upload-${Math.random().toString(36).slice(2)}`,[]); const acceptFile=(file:File|null)=>{if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)){return;}if(file.size>2*1024*1024){return;}const reader=new FileReader();reader.onload=()=>{setSource(String(reader.result));setZoom(1);setX(0);setY(0);setCropOpen(true);};reader.readAsDataURL(file);}; const finish=()=>{const img=new Image();img.onload=()=>{const size=800;const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;const ctx=canvas.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,size,size);ctx.save();if(cropShape==='circle'){ctx.beginPath();ctx.arc(size/2,size/2,size/2,0,Math.PI*2);ctx.clip();}const scale=Math.max(size/img.width,size/img.height)*zoom;const w=img.width*scale;const h=img.height*scale;ctx.drawImage(img,(size-w)/2+x,(size-h)/2+y,w,h);ctx.restore();canvas.toBlob(blob=>{if(!blob)return;const file=new File([blob],`${label.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.webp`,{type:'image/webp'});onChange(file,URL.createObjectURL(blob));setCropOpen(false);},'image/webp',0.9);};img.src=source;}; return <div className='rounded-xl border border-white/5 bg-white/[.02] p-4'><div className='mb-2 flex items-center justify-between'><div><b>{label}</b><p className='text-xs text-slate-500'>{hint}</p></div>{preview&&<span className='text-[10px] uppercase tracking-wider text-emerald-300'>Ready</span>}</div><label htmlFor={inputId} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);acceptFile(e.dataTransfer.files?.[0]||null)}} className={`flex min-h-28 cursor-pointer items-center gap-4 rounded-xl border border-dashed px-4 py-4 transition ${drag?'border-[#ff2d8d] bg-[#5a2cff]/20':'border-[#7e52d6]/40 bg-[#130233] hover:border-[#ff2d8d]/60 hover:bg-[#31188f]/20'}`}><div className={`${cropShape==='circle'?'rounded-full':'rounded-xl'} grid h-20 w-20 shrink-0 place-items-center overflow-hidden bg-[#5a2cff]/20`}>{preview?<img src={preview} alt='' className='h-full w-full object-cover'/>:<span className='text-2xl'>📷</span>}</div><div className='min-w-0'><b className='block text-sm'>{drag?'Drop image here':'Click to upload or drag image here'}</b><span className='text-xs text-slate-500'>Image opens in the crop editor before it is applied.</span></div><input id={inputId} type='file' accept='image/jpeg,image/png,image/webp' className='hidden' onChange={e=>acceptFile(e.target.files?.[0]||null)}/></label>{cropOpen&&<div className='mt-4 rounded-xl border border-[#7e52d6]/30 bg-[#0f0625] p-4'><div className='mb-3 flex items-center justify-between'><b>Crop {label}</b><button type='button' onClick={()=>setCropOpen(false)} className='text-xs text-slate-400 hover:text-white'>Cancel</button></div><div className='mx-auto h-64 w-64 overflow-hidden rounded-xl border border-white/10 bg-black/40'><img src={source} alt='' className='h-full w-full object-contain' style={{transform:`translate(${x}px, ${y}px) scale(${zoom})`}}/></div><div className='mt-4 grid gap-2 sm:grid-cols-3'><label className='text-xs text-slate-400'>Zoom<input type='range' min='1' max='3' step='0.05' value={zoom} onChange={e=>setZoom(Number(e.target.value))} className='w-full'/></label><label className='text-xs text-slate-400'>Horizontal<input type='range' min='-120' max='120' step='1' value={x} onChange={e=>setX(Number(e.target.value))} className='w-full'/></label><label className='text-xs text-slate-400'>Vertical<input type='range' min='-120' max='120' step='1' value={y} onChange={e=>setY(Number(e.target.value))} className='w-full'/></label></div><button type='button' onClick={finish} className='mt-4 w-full rounded-xl bg-[#e52a31] px-4 py-2.5 text-sm font-bold'>Apply crop</button></div>}</div>; }

function Input({ label, value, onChange, type = 'text', step }: { label: string; value: string; onChange: (v: string) => void; type?: string; step?: string }) {
  return <label className='block text-sm'><span className='mb-1.5 block font-semibold text-slate-300'>{label}</span><input type={type} step={step} value={value} onChange={e => onChange(e.target.value)} className='w-full rounded-xl border border-white/10 bg-[#0f0625] px-3 py-2.5 text-white outline-none focus:border-[#ff2d8d]' /></label>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return <label className='block text-sm'><span className='mb-1.5 block font-semibold text-slate-300'>{label}</span><select value={value} onChange={e => onChange(e.target.value)} className='w-full rounded-xl border border-white/10 bg-[#0f0625] px-3 py-2.5 text-white outline-none focus:border-[#ff2d8d]'>{options.map(([v, optionLabel]) => <option key={v} value={v}>{optionLabel}</option>)}</select></label>;
}

function TeamRow({ team }: { team: Team }) {
  return <div className='flex items-center justify-between rounded-xl border border-white/5 bg-white/[.02] p-3'><div className='flex items-center gap-3'><TeamAvatar team={team} /><div><b>{team.name}</b><div className='text-xs text-slate-500'>{team.tier} • {team.region || 'Nigeria'}</div></div></div><strong className='text-[#ff2d8d]'>{team.points}</strong></div>;
}

function TeamCard({ team, rank, stats, statsLoading }: { team: Team; rank?: number; stats?: TeamHoverStats; statsLoading?: boolean }) {
  const rosterPreview = (team.roster || []).slice(0, 5);
  return <div className='group relative min-h-[250px] overflow-hidden rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#ff2d8d]/60 focus-within:border-[#ff2d8d]/60'>
    <div className='transition duration-200 group-hover:opacity-15 group-focus-within:opacity-15 group-hover:blur-sm group-focus-within:blur-sm'>
      <div className='flex items-center gap-3'><TeamAvatar team={team} /><div className='min-w-0'><b className='block truncate'>{team.name}</b><span className='text-xs text-slate-500'>{team.tier} • {team.region || 'Nigeria'}</span></div>{rank && <span className='ml-auto text-sm text-slate-500'>#{rank}</span>}</div>
      <div className='mt-5 flex items-end justify-between'><div><small className='block text-xs uppercase tracking-wider text-slate-600'>Roster</small><b>{team.roster?.length || 0} members</b></div><div className='text-right'><small className='block text-xs uppercase tracking-wider text-slate-600'>Points</small><b className='text-xl text-[#ff2d8d]'>{team.points}</b></div></div>
    </div>
    <div className='pointer-events-none absolute inset-0 flex translate-y-2 flex-col overflow-y-auto rounded-2xl bg-[#130233]/98 p-4 opacity-0 transition duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100'>
      <div className='flex items-center justify-between gap-2'><div><p className='text-[10px] font-bold uppercase tracking-[.18em] text-[#ff2d8d]'>Quick stats</p><h3 className='mt-1 truncate text-sm font-black text-white'>{team.name}</h3></div><span className='rounded-full border border-white/10 px-2 py-1 text-[10px] text-slate-400'>View team →</span></div>
      {statsLoading && <div className='flex flex-1 items-center justify-center text-xs text-slate-500'>Loading performance...</div>}
      {!statsLoading && stats && <><div className='mt-3 grid grid-cols-3 gap-1.5'><div className='rounded-xl border border-white/5 bg-white/[.03] p-2'><span className='block text-[8px] uppercase tracking-wider text-slate-600'>Wins</span><b className='mt-1 block text-base text-white'>{stats.wins}</b></div><div className='rounded-xl border border-white/5 bg-white/[.03] p-2'><span className='block text-[8px] uppercase tracking-wider text-slate-600'>Win rate</span><b className='mt-1 block text-base text-[#ff2d8d]'>{stats.winRate}%</b></div><div className='rounded-xl border border-white/5 bg-white/[.03] p-2'><span className='block text-[8px] uppercase tracking-wider text-slate-600'>Matches</span><b className='mt-1 block text-base text-white'>{stats.matchesPlayed}</b></div></div><div className='mt-2 grid grid-cols-3 gap-1.5'>{stats.mapWinRates.map(item => <span key={item.mode} className='rounded-lg border border-white/5 bg-white/[.02] px-1.5 py-1.5 text-center'><small className='block truncate text-[8px] uppercase tracking-wider text-slate-600'>{item.mode === 'Search and Destroy' ? 'S&D' : item.mode}</small><b className='text-[11px] text-[#ff2d8d]'>{item.winRate}%</b></span>)}</div><div className='mt-2 flex min-w-0 items-center gap-2'><span className='shrink-0 text-[9px] uppercase tracking-wider text-slate-600'>Best</span><span className='truncate text-xs font-semibold text-slate-300'>{stats.bestPlacement}</span><span className='ml-auto shrink-0 text-xs text-[#ff2d8d]'>{team.points} pts</span></div></>}
      {!statsLoading && !stats && <div className='flex flex-1 items-center justify-center text-xs text-slate-500'>Performance stats unavailable</div>}
      <div className='mt-3 flex flex-wrap gap-1.5'>{rosterPreview.map((player, i) => <span key={`${player.inGameName}-${i}`} className='max-w-[48%] truncate rounded-full border border-white/10 bg-white/[.03] px-2 py-1 text-[10px] text-slate-400'>{player.role === 'Captain' ? 'C • ' : ''}{player.inGameName}</span>)}</div>
    </div>
  </div>;
}

function PodiumCard({ team, rank }: { team: Team; rank: number }) {
  return <div className={`relative overflow-hidden rounded-2xl border p-5 ${rank === 1 ? 'border-[#ff2d8d]/50 bg-[#130233]' : 'border-[#7e52d6]/20 bg-white/[.03]'}`}><div className='flex items-center justify-between'><span className='grid h-9 w-9 place-items-center rounded-full bg-[#5a2cff]/30 font-bold'>{rank === 1 ? <Crown size={17} /> : rank}</span><span className='text-xs uppercase tracking-widest text-slate-500'>{team.tier}</span></div><div className='mt-6 flex items-center gap-3'><TeamAvatar team={team} large /><div><h3 className='font-bold'>{team.name}</h3><p className='text-sm text-slate-500'>{team.region || 'Nigeria'}</p></div></div><div className='mt-6 text-3xl font-black text-[#ff2d8d]'>{team.points}<span className='ml-1 text-sm font-medium text-slate-500'>pts</span></div></div>;
}

function TeamAvatar({ team, large = false }: { team: Team; large?: boolean }) {
  return team.logoUrl ? <img src={team.logoUrl} alt='' className={`rounded-xl object-cover ${large ? 'h-14 w-14' : 'h-10 w-10'}`} /> : <div className={`grid place-items-center rounded-xl bg-[#5a2cff] font-black text-white ${large ? 'h-14 w-14 text-xl' : 'h-10 w-10'}`}>{team.name.slice(0, 1).toUpperCase()}</div>;
}

function TournamentCard({ t }: { t: Tournament }) {
  return <div className='rounded-2xl border border-[#7e52d6]/20 bg-white/[.03] p-5 transition hover:-translate-y-0.5 hover:border-[#ff2d8d]/40'><div className='flex items-start justify-between gap-3'><span className='rounded-full bg-[#5a2cff]/20 px-2.5 py-1 text-xs font-semibold text-[#d6c8ff]'>{t.type}</span><span className='text-xs text-slate-500'>{t.status}</span></div><h3 className='mt-5 text-lg font-bold'>{t.name}</h3><div className='mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500'><span className='inline-flex items-center gap-1'><CalendarDays size={14} /> {t.date || 'Date TBA'}</span><span>{t.format}</span><span>{t.bracketSize} teams</span><span>×{t.multiplier} points</span></div><div className='mt-5 flex items-center justify-between border-t border-white/5 pt-4 text-sm'><span>{t.participants?.length || 0} registered</span><ChevronRight size={16} className='text-[#ff2d8d]' /></div></div>;
}

function PlayerAvatar({ player, size = 'h-10 w-10', large = false }: { player: Person | Player; size?: string; large?: boolean }) {
  return player.photoUrl ? <img src={player.photoUrl} alt={`${player.inGameName} profile`} className={`${size} shrink-0 rounded-full border border-white/10 object-cover`} /> : <div className={`${size} shrink-0 grid place-items-center rounded-full border border-white/10 bg-[#e52a31] text-sm font-black`}>{player.inGameName.slice(0,1).toUpperCase()}</div>;
}

function AfricaMotion() {
  return <div aria-hidden='true' className='pointer-events-none fixed inset-0 z-0 overflow-hidden'><div className='africa-dust africa-dust-a'/><div className='africa-dust africa-dust-b'/><div className='africa-ring'/></div>;
}

function CommercialManagerPro({ teams, tournaments, busy, setBusy, setMessage }: { teams: Team[]; tournaments: Tournament[]; busy: boolean; setBusy: (x: boolean) => void; setMessage: (x: string) => void }) {
  const [sponsors,setSponsors]=useState<any[]>([]);
  const [payouts,setPayouts]=useState<any[]>([]);
  const [name,setName]=useState('');
  const [tier,setTier]=useState('Partner');
  const [logoUrl,setLogoUrl]=useState('');
  const [website,setWebsite]=useState('');
  const [tournamentId,setTournamentId]=useState('');
  const [teamId,setTeamId]=useState('');
  const [amount,setAmount]=useState('');
  const [currency,setCurrency]=useState('NGN');
  const [placement,setPlacement]=useState('');
  const [payoutStatus,setPayoutStatus]=useState('pending');
  const load=async()=>{try{const [s,p]=await Promise.all([api.get('/api/admin/sponsors'),api.get('/api/admin/payouts')]);setSponsors(s.data.sponsors||[]);setPayouts(p.data.payouts||[]);}catch(e:any){setMessage(e?.message||'Could not load commercial records.');}};
  useEffect(()=>{load();},[]);
  const addSponsor=async()=>{if(!name.trim())return setMessage('Sponsor name is required.');setBusy(true);try{await api.post('/api/admin/sponsors',{name:name.trim(),tier,logoUrl,website});setMessage('Sponsor added.');setName('');setLogoUrl('');setWebsite('');await load();}catch(e:any){setMessage(e?.message||'Could not add sponsor.');}finally{setBusy(false);}};
  const addPayout=async()=>{if(!tournamentId||!teamId||!amount)return setMessage('Tournament, team and amount are required.');setBusy(true);try{await api.post('/api/admin/payouts',{tournamentId,teamId,amount:Number(amount),currency,placement,status:payoutStatus});setMessage('Prize payout recorded.');setAmount('');setPlacement('');await load();}catch(e:any){setMessage(e?.message||'Could not record payout.');}finally{setBusy(false);}};
  const updatePayout=async(id:string,status:string)=>{setBusy(true);try{await api.put('/api/admin/payouts/'+id,{status});await load();}catch(e:any){setMessage(e?.message||'Could not update payout.');}finally{setBusy(false);}};
  return <div className='space-y-5'>
    <div className='grid gap-5 lg:grid-cols-2'>
      <section className='rounded-3xl border border-[#7e52d6]/20 bg-white/[.03] p-6'>
        <div><p className='text-xs font-black uppercase tracking-[.2em] text-[#ff2d8d]'>Partners</p><h3 className='mt-1 text-2xl font-black'>Sponsor management</h3><p className='mt-1 text-sm text-slate-500'>Maintain the commercial partners displayed across Gamersify.</p></div>
        <div className='mt-5 space-y-3'><Input label='Sponsor name' value={name} onChange={setName}/><Select label='Tier' value={tier} onChange={setTier} options={['Title Sponsor','Gold','Silver','Partner'].map(x=>[x,x])}/><Input label='Logo URL' value={logoUrl} onChange={setLogoUrl}/><Input label='Website' value={website} onChange={setWebsite}/><button disabled={busy} onClick={addSponsor} className='w-full rounded-xl bg-[#e52a31] px-4 py-3 font-bold'>Add sponsor</button></div>
        <div className='mt-5 space-y-2'>{sponsors.map(s=><div key={s.id} className='flex items-center justify-between rounded-xl border border-white/5 p-3'><div className='min-w-0'><b className='block truncate'>{s.name}</b><span className='text-xs text-slate-500'>{s.tier} {s.website?'• '+s.website:''}</span></div><span className={s.active===false?'text-xs text-slate-600':'text-xs text-emerald-300'}>{s.active===false?'Inactive':'Active'}</span></div>)}{!sponsors.length&&<Empty text='No sponsors added yet.'/>}</div>
      </section>
      <section className='rounded-3xl border border-[#7e52d6]/20 bg-white/[.03] p-6'>
        <div><p className='text-xs font-black uppercase tracking-[.2em] text-[#ff2d8d]'>Prize operations</p><h3 className='mt-1 text-2xl font-black'>Payout ledger</h3><p className='mt-1 text-sm text-slate-500'>Track tournament prize awards from pending to paid.</p></div>
        <div className='mt-5 space-y-3'><Select label='Tournament' value={tournamentId} onChange={setTournamentId} options={[['','Select tournament'],...tournaments.map(t=>[t.id,t.name] as [string,string])]}/><Select label='Team' value={teamId} onChange={setTeamId} options={[['','Select team'],...teams.map(t=>[t.id,t.name] as [string,string])]}/><div className='grid grid-cols-2 gap-3'><Input label='Amount' value={amount} onChange={setAmount} type='number'/><Select label='Currency' value={currency} onChange={setCurrency} options={['NGN','USD','EUR','GBP'].map(x=>[x,x])}/></div><div className='grid grid-cols-2 gap-3'><Input label='Placement' value={placement} onChange={setPlacement}/><Select label='Status' value={payoutStatus} onChange={setPayoutStatus} options={['pending','processing','paid','failed','cancelled'].map(x=>[x,x])}/></div><button disabled={busy} onClick={addPayout} className='w-full rounded-xl bg-[#e52a31] px-4 py-3 font-bold'>Record payout</button></div>
        <div className='mt-5 space-y-2'>{payouts.map(p=><div key={p.id} className='rounded-xl border border-white/5 p-3'><div className='flex items-start justify-between gap-3'><div className='min-w-0'><b className='block truncate'>{p.teamName}</b><span className='text-xs text-slate-500'>{p.tournamentName} • {p.placement||'Prize'}</span></div><strong className='shrink-0 text-[#ff2d8d]'>{p.currency} {Number(p.amount||0).toLocaleString()}</strong></div><div className='mt-2 flex items-center justify-between'><span className='text-xs uppercase text-slate-600'>{p.status}</span><div className='flex gap-1'>{['processing','paid','failed'].map(s=><button key={s} onClick={()=>updatePayout(p.id,s)} disabled={busy||p.status===s} className='rounded-lg border border-white/10 px-2 py-1 text-[10px]'>{s}</button>)}</div></div></div>)}{!payouts.length&&<Empty text='No payout records yet.'/>}</div>
      </section>
    </div>
  </div>;
}

function IntegrityManagerPro({ busy, setBusy, setMessage }: { teams: Team[]; busy: boolean; setBusy: (x:boolean)=>void; setMessage:(x:string)=>void }) {
  const [data,setData]=useState<any>({teams:[],players:[],sanctions:[],evidenceRequiredMatches:[]});
  const [subject,setSubject]=useState('');
  const [subjectType,setSubjectType]=useState('team');
  const [reason,setReason]=useState('');
  const [sanctionType,setSanctionType]=useState('warning');
  const load=async()=>{try{const r=await api.get('/api/admin/integrity');setData(r.data);}catch(e:any){setMessage(e?.message||'Could not load integrity records.');}};
  useEffect(()=>{load();},[]);
  const setTeamVerification=async(id:string,status:string)=>{setBusy(true);try{await api.put('/api/admin/integrity/team/'+id,{verificationStatus:status});await load();}catch(e:any){setMessage(e?.message||'Could not update team verification.');}finally{setBusy(false);}};
  const setPlayerVerification=async(id:string,status:string)=>{setBusy(true);try{await api.put('/api/admin/integrity/player/'+id,{verificationStatus:status});await load();}catch(e:any){setMessage(e?.message||'Could not update player verification.');}finally{setBusy(false);}};
  const addSanction=async()=>{if(!subject||!reason.trim())return setMessage('Select a subject and enter a reason.');const t=data.teams.find((x:any)=>x.id===subject);const p=data.players.find((x:any)=>x.id===subject);setBusy(true);try{await api.post('/api/admin/integrity/sanctions',{subjectType,subjectId:subject,subjectName:subjectType==='team'?t?.name:p?.inGameName,teamId:p?.teamId||t?.id||'',teamName:p?.teamName||t?.name||'',type:sanctionType,status:'active',reason:reason.trim()});setReason('');await load();}catch(e:any){setMessage(e?.message||'Could not create sanction.');}finally{setBusy(false);}};
  const addEvidence=async(id:string)=>{const url=window.prompt('Paste evidence URL (match recording, screenshot or cloud file):');if(!url)return;setBusy(true);try{await api.post('/api/admin/integrity/matches/'+id+'/evidence',{evidenceUrl:url});await load();}catch(e:any){setMessage(e?.message||'Could not save evidence.');}finally{setBusy(false);}};
  return <div className='space-y-5'>
    <section className='rounded-3xl border border-[#7e52d6]/20 bg-white/[.03] p-6'><p className='text-xs font-black uppercase tracking-[.2em] text-[#ff2d8d]'>Competitive integrity</p><h3 className='mt-1 text-2xl font-black'>Verification & sanctions</h3><p className='mt-1 text-sm text-slate-500'>Verify teams and players, document disciplinary actions and preserve match evidence.</p>
      <div className='mt-5 grid gap-5 lg:grid-cols-2'>
        <div className='rounded-2xl border border-white/5 p-4'><h4 className='font-bold'>Team verification</h4><div className='mt-3 space-y-2'>{data.teams.map((t:any)=><div key={t.id} className='flex items-center gap-3 rounded-xl border border-white/5 p-3'><div className='min-w-0 flex-1'><b className='block truncate'>{t.name}</b><span className='text-xs text-slate-500'>{t.tier||'Unranked'} • {t.verificationStatus}</span></div><select value={t.verificationStatus} onChange={e=>setTeamVerification(t.id,e.target.value)} disabled={busy} className='rounded-lg border border-white/10 bg-[#130233] px-2 py-2 text-xs'><option>unverified</option><option>pending</option><option>verified</option><option>rejected</option><option>suspended</option></select></div>)}</div></div>
        <div className='rounded-2xl border border-white/5 p-4'><h4 className='font-bold'>Player verification</h4><div className='mt-3 max-h-[420px] space-y-2 overflow-auto'>{data.players.map((p:any)=><div key={p.id} className='flex items-center gap-3 rounded-xl border border-white/5 p-3'><div className='min-w-0 flex-1'><b className='block truncate'>{p.inGameName}</b><span className='text-xs text-slate-500'>{p.playerId} • {p.teamName||'Free Agent'} • {p.verificationStatus}</span></div><select value={p.verificationStatus} onChange={e=>setPlayerVerification(p.id,e.target.value)} disabled={busy} className='rounded-lg border border-white/10 bg-[#130233] px-2 py-2 text-xs'><option>unverified</option><option>pending</option><option>verified</option><option>rejected</option><option>suspended</option></select></div>)}</div></div>
      </div>
    </section>
    <section className='grid gap-5 lg:grid-cols-2'>
      <div className='rounded-3xl border border-[#7e52d6]/20 bg-white/[.03] p-6'><h3 className='text-xl font-black'>Sanctions</h3><div className='mt-4 space-y-3'><div className='grid gap-2 sm:grid-cols-2'><Select label='Subject type' value={subjectType} onChange={setSubjectType} options={['team','player'].map(x=>[x,x])}/><Select label='Subject' value={subject} onChange={setSubject} options={[['','Select subject'],...(subjectType==='team'?data.teams.map((x:any)=>[x.id,x.name]):data.players.map((x:any)=>[x.id,x.inGameName]))]}/></div><div className='grid gap-2 sm:grid-cols-2'><Select label='Sanction' value={sanctionType} onChange={setSanctionType} options={['warning','yellow_card','suspension','disqualification','ban'].map(x=>[x,x])}/><Input label='Reason' value={reason} onChange={setReason}/></div><button disabled={busy} onClick={addSanction} className='w-full rounded-xl bg-[#e52a31] px-4 py-3 font-bold'>Issue sanction</button></div><div className='mt-4 space-y-2'>{data.sanctions.map((s:any)=><div key={s.id} className='rounded-xl border border-white/5 p-3'><div className='flex items-center justify-between'><b>{s.subjectName}</b><span className='text-xs uppercase text-[#ff2d8d]'>{s.type}</span></div><p className='mt-1 text-xs text-slate-500'>{s.reason}</p><div className='mt-2 flex items-center justify-between text-[10px] uppercase text-slate-600'><span>{s.status}</span><span>{s.issuedAt?new Date(s.issuedAt).toLocaleDateString():''}</span></div></div>)}{!data.sanctions.length&&<Empty text='No sanctions recorded.'/ >}</div></div>
      <div className='rounded-3xl border border-[#7e52d6]/20 bg-white/[.03] p-6'><h3 className='text-xl font-black'>Evidence queue</h3><p className='mt-1 text-sm text-slate-500'>Matches awaiting a result review or dispute evidence.</p><div className='mt-4 space-y-2'>{data.evidenceRequiredMatches.map((m:any)=><div key={m.id} className='rounded-xl border border-white/5 p-3'><div className='flex justify-between gap-3'><b>{m.teamAName||'TBD'} vs {m.teamBName||'TBD'}</b><span className='text-xs text-[#ff2d8d]'>{m.status}</span></div><p className='mt-1 text-xs text-slate-500'>{m.roundName}</p><div className='mt-2 flex items-center justify-between'><span className='max-w-[70%] truncate text-[10px] text-slate-600'>{m.evidenceUrl||'No evidence attached'}</span><button onClick={()=>addEvidence(m.id)} disabled={busy} className='rounded-lg border border-white/10 px-3 py-2 text-xs font-bold'>Attach</button></div></div>)}{!data.evidenceRequiredMatches.length&&<Empty text='No matches awaiting evidence.'/ >}</div></div>
    </section>
  </div>;
}

function BracketMatch({ m }: { m: Match }) {
  return <div className='rounded-xl border border-white/10 bg-[#130233]/80 p-3 text-xs'><div className='flex items-center justify-between gap-2'><span className='min-w-0 truncate'>{m.teamAName || m.teamAId || 'TBD'}</span><b>{m.scoreA ?? '-'}</b></div><div className='my-2 border-t border-white/5'/><div className='flex items-center justify-between gap-2'><span className='min-w-0 truncate'>{m.teamBName || m.teamBId || 'TBD'}</span><b>{m.scoreB ?? '-'}</b></div><div className='mt-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-600'><span>{m.status}</span><span>Match {m.matchNumber || `${m.round}-${m.slot + 1}`}</span></div></div>;
}

function Bracket({ matches }: { matches: Match[] }) {
  const [selected, setSelected] = useState('');
  if (!matches.length) return <div className='rounded-2xl border border-[#7e52d6]/20 p-6 text-center text-slate-500'>No bracket matches yet.</div>;
  const groupMap = new Map<string, { bracket: string; round: number; name: string }>();
  matches.forEach(m => {
    const bracket = m.bracket || 'winners';
    const key = `${bracket}-${m.round}`;
    if (!groupMap.has(key)) groupMap.set(key, { bracket, round: m.round, name: m.roundName });
  });
  const groups = Array.from(groupMap.values()).sort((a, b) => a.bracket.localeCompare(b.bracket) || a.round - b.round);
  const activeKey = selected || `${groups[0].bracket}-${groups[0].round}`;
  const active = groups.find(g => `${g.bracket}-${g.round}` === activeKey) || groups[0];
  return (
    <div className='overflow-hidden rounded-2xl border border-[#7e52d6]/20 bg-white/[.02] p-3 sm:p-5'>
      <div className='mb-4 flex snap-x gap-2 overflow-x-auto pb-2 sm:hidden' role='tablist' aria-label='Bracket rounds'>
        {groups.map(g => { const key=`${g.bracket}-${g.round}`; return <button key={key} type='button' onClick={()=>setSelected(key)} className={`min-h-11 shrink-0 snap-start rounded-xl px-3.5 text-[11px] font-bold uppercase tracking-wider ${activeKey===key ? 'bg-[#e52a31] text-white' : 'border border-white/10 text-slate-400'}`}>{g.name}</button>; })}
      </div>
      <div className='sm:hidden'>
        <div className='mb-3 flex items-center justify-between gap-2'><p className='truncate text-xs font-bold uppercase tracking-widest text-[#ff2d8d]'>{active.name}</p><span className='shrink-0 text-[10px] uppercase text-slate-600'>{active.bracket}</span></div>
        <div className='space-y-2'>{matches.filter(m => (m.bracket || 'winners') === active.bracket && m.round === active.round).map(m => <BracketMatch key={m.id} m={m}/>)}</div>
      </div>
      <div className='hidden gap-4 overflow-x-auto pb-2 sm:flex'>
        {groups.map(group => {
          const groupMatches = matches.filter(m => (m.bracket || 'winners') === group.bracket && m.round === group.round);
          return (
            <div key={`${group.bracket}-${group.round}`} className='min-w-[235px] shrink-0 lg:min-w-[250px]'>
              <div className='mb-2 flex items-center justify-between gap-2'>
                <p className='truncate text-xs font-bold uppercase tracking-widest text-[#ff2d8d]'>{group.name}</p>
                <span className='shrink-0 text-[10px] uppercase text-slate-600'>{group.bracket}</span>
              </div>
              <div className='space-y-2'>
                {groupMatches.map(m => <BracketMatch key={m.id} m={m}/>)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, suffix = '' }: { label: string; value: string | number; suffix?: string }) {
  return <div className='rounded-2xl border border-white/10 bg-black/20 p-5'><span className='text-xs uppercase tracking-widest text-slate-500'>{label}</span><div className='mt-2 text-3xl font-black text-white'>{value}<span className='text-sm text-slate-500'>{suffix}</span></div></div>;
}

function PageHead({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className='mb-5 sm:mb-6'><h1 className='brand-font break-words text-xl uppercase tracking-tight sm:text-2xl md:text-3xl'>{title}</h1><p className='mt-1 text-sm leading-6 text-slate-500 sm:text-base'>{subtitle}</p></div>;
}

function SectionTitle({ title, action, onClick }: { title: string; action?: string; onClick?: () => void }) {
  return <div className='flex flex-wrap items-center justify-between gap-2'><h2 className='brand-font text-base uppercase sm:text-xl'>{title}</h2>{action && onClick && <button onClick={onClick} className='inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-[#ff2d8d] hover:text-white sm:text-sm'>{action}<ChevronRight size={15} /></button>}</div>;
}

function Empty({ text }: { text: string }) {
  return <div className='rounded-2xl border border-dashed border-[#7e52d6]/30 p-8 text-center text-slate-500'>{text}</div>;
}

export default App;
