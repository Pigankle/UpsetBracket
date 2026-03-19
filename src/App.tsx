import { useState, useEffect } from 'react';
import BracketDisplay from './components/BracketDisplay';
import Leaderboard from './components/Leaderboard';
import AdminBracket from './components/AdminBracket';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import { createInitialBracket, Matchup, SavedBracket } from './utils/bracketTransform';
import tournamentData from './data/ncaa_2025_bracket.json';
import { supabase } from './lib/supabase';
import { getProfile, signOut, type Profile } from './lib/auth';
import { printBracket } from './lib/printBracket';
import { isLocked, deadlineLabel } from './lib/deadline';

import type { User } from '@supabase/supabase-js';

interface MarchMadnessGame {
  game_code: string;
  top_team: string; bottom_team: string;
  winning_team: string | null; losing_team: string | null;
  top_team_seed: number; bottom_team_seed: number;
  winning_team_seed: number | null; losing_team_seed: number | null;
  winning_team_score: number | null; losing_team_score: number | null;
  top_team_score: number | null; bottom_team_score: number | null;
  game_status: string; game_region: string;
  top_team_char6: string; bottom_team_char6: string;
  winning_team_char6: string; losing_team_char6: string;
  points: number;
}

type View = 'dashboard' | 'bracket' | 'leaderboard' | 'view-bracket' | 'admin';

function adaptGame(g: MarchMadnessGame): Record<string, unknown> {
  return {
    'Top Team': g.top_team, 'Bottom Team': g.bottom_team,
    'Winning Team': g.winning_team, 'Losing Team': g.losing_team,
    'Top Team Seed': g.top_team_seed, 'Bottom Team Seed': g.bottom_team_seed,
    'Winning Team Seed': g.winning_team_seed, 'Losing Team Seed': g.losing_team_seed,
    'Winning Team Score': g.winning_team_score, 'Losing Team Score': g.losing_team_score,
    'Top Team Score': g.top_team_score, 'Bottom Team Score': g.bottom_team_score,
    'Game Status': g.game_status, 'Game Region': g.game_region,
    'Top Team Char6': g.top_team_char6, 'Bottom Team Char6': g.bottom_team_char6,
    'Winning Team Char6': g.winning_team_char6, 'Losing Team Char6': g.losing_team_char6,
    points: g.points,
  };
}

function matchupsToSavedBracket(matchups: Matchup[], name: string): SavedBracket {
  const picks: Record<string, string> = {};
  matchups.forEach(m => {
    if (m.gameCode && m.winner)
      picks[m.gameCode] = m.winner === 'top' ? m.topTeam.name : m.bottomTeam.name;
  });
  return { name, picks };
}

function calculateScore(matchups: Matchup[], games: Record<string, Record<string, unknown>>): number {
  let score = 0;
  matchups.forEach(m => {
    if (!m.gameCode || !m.winner) return;
    const g = games[m.gameCode];
    if (!g) return;
    const picked = m.winner === 'top' ? m.topTeam.name : m.bottomTeam.name;
    if (picked === g['Winning Team']) score += (g.points as number);
  });
  return score;
}

const C = { header: '#1a1a2e', border: '#d0d0d0', seed: '#666' };

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [view, setView] = useState<View>('dashboard');
  const [bracketId, setBracketId] = useState<string | null>(null);
  const [bracketName, setBracketName] = useState('');
  const [tiebreakerScore, setTiebreakerScore] = useState('');
  const [useTestData, setUseTestData] = useState(false);
  const [matchups, setMatchups] = useState<Matchup[]>(() => createInitialBracket(tournamentData));
  const [viewMatchups, setViewMatchups] = useState<Matchup[]>(() => createInitialBracket(tournamentData));
  const [viewingBracketName, setViewingBracketName] = useState('');
  const [totalScore, setTotalScore] = useState(0);
  const [games, setGames] = useState<Record<string, Record<string, unknown>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const locked = isLocked();

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const p = await getProfile(session.user.id);
        setProfile(p);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const p = await getProfile(session.user.id);
        setProfile(p);
      } else {
        setProfile(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadResults = async () => {
    const { data, error } = await supabase.from('results').select('*');
    if (error) { console.error('Failed to load results:', error); return; }
    const adapted: Record<string, Record<string, unknown>> = {};
    (data as MarchMadnessGame[]).forEach(g => { adapted[g.game_code] = adaptGame(g); });
    setGames(adapted);
  };

  useEffect(() => {
    loadResults().then(() => setLoading(false));
  }, []);

  useEffect(() => {
    setTotalScore(calculateScore(matchups, games));
  }, [matchups, games]);

  const handleUpdateBracket = (newMatchups: Matchup[]) => setMatchups(newMatchups);

  const handleNewBracket = () => {
    setBracketId(null);
    setMatchups(createInitialBracket(tournamentData));
    setBracketName('New Bracket');
    setTiebreakerScore('');
    setTotalScore(0);
    setView('bracket');
  };

  const handleOpenBracket = async (id: string) => {
    const { data, error } = await supabase.from('brackets').select('*').eq('id', id).single();
    if (error || !data) { alert('Failed to load bracket.'); return; }
    const saved: SavedBracket = { name: data.bracket_name, picks: data.picks };
    setMatchups(createInitialBracket(tournamentData, saved));
    setBracketName(data.bracket_name);
    setBracketId(data.id);
    setTiebreakerScore(data.tiebreaker?.toString() ?? '');
    setTotalScore(data.total_score);
    setView('bracket');
  };

  const handleViewBracket = async (id: string) => {
    const { data, error } = await supabase.from('brackets').select('*').eq('id', id).single();
    if (error || !data) { alert('Failed to load bracket.'); return; }
    const saved: SavedBracket = { name: data.bracket_name, picks: data.picks };
    setViewMatchups(createInitialBracket(tournamentData, saved));
    setViewingBracketName(`${data.person_name} — ${data.bracket_name}`);
    setView('view-bracket');
  };

  const handleSaveBracket = async () => {
    if (!user || !profile) return;
    setSaving(true);
    setSaveStatus('idle');
    const saved = matchupsToSavedBracket(matchups, bracketName);
    const payload = {
      person_name: profile.display_name,
      bracket_name: bracketName,
      picks: saved.picks,
      tiebreaker: tiebreakerScore ? parseInt(tiebreakerScore) : null,
      user_id: user.id,
    };
    let error;
    if (bracketId) {
      ({ error } = await supabase.from('brackets').update(payload).eq('id', bracketId));
    } else {
      const { data, error: ie } = await supabase.from('brackets').insert(payload).select('id, total_score').single();
      error = ie;
      if (data) { setBracketId(data.id); setTotalScore(data.total_score); }
    }
    setSaving(false);
    setSaveStatus(error ? 'error' : 'saved');
    if (error) console.error('Save failed:', error);
    setTimeout(() => setSaveStatus('idle'), 3000);
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'system-ui' }}>
      Loading...
    </div>
  );

  if (!user || !profile) return <AuthPage />;

  // ── Nav ──────────────────────────────────────────────────────────────────

  const Nav = () => (
    <div style={{ background: C.header, color: '#fff', display: 'flex', alignItems: 'center', padding: '0 16px', height: 48, gap: 8, fontFamily: 'system-ui', fontSize: 13 }}>
      <span style={{ fontWeight: 700, fontSize: 15, marginRight: 16 }}>🏀 2026 Bracket Pool</span>
      <NavBtn label='My Brackets' active={view === 'dashboard'} onClick={() => setView('dashboard')} />
      <NavBtn label='Leaderboard' active={view === 'leaderboard' || view === 'view-bracket'} onClick={() => setView('leaderboard')} />
      {profile.is_admin && <NavBtn label='⚙ Results' active={view === 'admin'} onClick={() => setView('admin')} />}
      <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.8 }}>{profile.display_name}</span>
      <button onClick={() => { signOut(); setView('dashboard'); }} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 3, color: '#fff', fontSize: 11, padding: '2px 8px', cursor: 'pointer' }}>
        Sign out
      </button>
    </div>
  );

  // ── Views ─────────────────────────────────────────────────────────────────

  if (view === 'dashboard') return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'system-ui' }}>
      <Nav />
      <Dashboard profile={profile} onOpenBracket={handleOpenBracket} onNewBracket={handleNewBracket} />
    </div>
  );

  if (view === 'leaderboard') return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'system-ui' }}>
      <Nav />
      <div style={{ padding: '24px 16px' }}>
        <h2 style={{ textAlign: 'center', margin: '0 0 20px', fontSize: 18, color: C.header }}>Leaderboard</h2>
        <Leaderboard currentBracketId={bracketId} onViewBracket={handleViewBracket} />
      </div>
    </div>
  );

  if (view === 'view-bracket') return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'system-ui' }}>
      <Nav />
      <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 13, color: C.seed, display: 'flex', justifyContent: 'center', gap: 16, alignItems: 'center' }}>
        <span>Viewing: <strong>{viewingBracketName}</strong></span>
        <button onClick={() => setView('leaderboard')} style={{ fontSize: 13, color: C.header, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
          Back to leaderboard
        </button>
        <button
          onClick={() => printBracket(viewMatchups, games, viewingBracketName, '', calculateScore(viewMatchups, games))}
          style={{ padding: '4px 12px', borderRadius: 4, background: '#fff', color: C.header, border: `1px solid ${C.border}`, fontSize: 12, cursor: 'pointer' }}
        >
          🖨 Print
        </button>
      </div>
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <BracketDisplay
          initialMatchups={viewMatchups} onUpdateBracket={() => {}}
          bracketName={viewingBracketName} onUpdateBracketName={() => {}}
          totalScore={calculateScore(viewMatchups, games)}
          useTestData={false} onUpdateUseTestData={() => {}}
          games={games} tiebreakerScore='' onUpdateTiebreakerScore={() => {}}
          readOnly
        />
      </div>
    </div>
  );

  if (view === 'admin') return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'system-ui' }}>
      <Nav />
      <AdminBracket matchups={matchups} games={games} onResultsChanged={loadResults} />
    </div>
  );

  // ── Bracket view ──────────────────────────────────────────────────────────

  const canEdit = !locked || profile.is_admin;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'system-ui' }}>
      <Nav />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '10px 16px', background: '#fff', borderBottom: `1px solid ${C.border}` }}>
        <button onClick={() => setView('dashboard')} style={{ fontSize: 12, color: C.seed, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
          ← My Brackets
        </button>
        <button
          onClick={() => printBracket(matchups, games, bracketName, profile.display_name, totalScore)}
          style={{ padding: '6px 14px', borderRadius: 4, background: '#fff', color: C.header, border: `1px solid ${C.border}`, fontSize: 13, cursor: 'pointer' }}
        >
          🖨 Print
        </button>
        {canEdit ? (
          <>
            <button
              onClick={handleSaveBracket}
              disabled={saving || !bracketName.trim()}
              style={{ padding: '6px 18px', borderRadius: 4, background: C.header, color: '#fff', border: 'none', cursor: saving || !bracketName.trim() ? 'default' : 'pointer', fontSize: 13, opacity: saving || !bracketName.trim() ? 0.6 : 1 }}
            >
              {saving ? 'Saving...' : bracketId ? 'Update' : 'Save Bracket'}
            </button>
            {saveStatus === 'saved' && <span style={{ color: '#2a7a2a', fontSize: 13 }}>✓ Saved</span>}
            {saveStatus === 'error' && <span style={{ color: '#b00000', fontSize: 13 }}>Save failed</span>}
            {!bracketName.trim() && <span style={{ fontSize: 12, color: '#b00000' }}>Enter a bracket name to save</span>}
          </>
        ) : (
          <span style={{ fontSize: 13, color: C.seed }}>🔒 Submissions closed — {deadlineLabel}</span>
        )}
      </div>
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <BracketDisplay
          initialMatchups={matchups} onUpdateBracket={handleUpdateBracket}
          bracketName={bracketName} onUpdateBracketName={setBracketName}
          totalScore={totalScore} useTestData={useTestData} onUpdateUseTestData={setUseTestData}
          games={games} tiebreakerScore={tiebreakerScore} onUpdateTiebreakerScore={setTiebreakerScore}
          readOnly={!canEdit}
        />
      </div>
    </div>
  );
}

function NavBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ background: active ? 'rgba(255,255,255,0.15)' : 'transparent', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', fontSize: 13, cursor: 'pointer', fontWeight: active ? 700 : 400 }}>
      {label}
    </button>
  );
}
