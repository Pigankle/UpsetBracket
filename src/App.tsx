import { useState, useEffect } from 'react';
import BracketDisplay from './components/BracketDisplay';
import { createInitialBracket, Matchup, SavedBracket } from './utils/bracketTransform';
import tournamentData from './data/ncaa_2025_bracket.json';
import { supabase } from './lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MarchMadnessGame {
  game_code: string;
  top_team: string;
  bottom_team: string;
  winning_team: string | null;
  losing_team: string | null;
  top_team_seed: number;
  bottom_team_seed: number;
  winning_team_seed: number | null;
  losing_team_seed: number | null;
  winning_team_score: number | null;
  losing_team_score: number | null;
  top_team_score: number | null;
  bottom_team_score: number | null;
  game_status: string;
  game_region: string;
  top_team_char6: string;
  bottom_team_char6: string;
  winning_team_char6: string;
  losing_team_char6: string;
  points: number;
}

// BracketDisplay expects the old camelCase/spaced key format — adapt from Supabase snake_case
function adaptGame(g: MarchMadnessGame): Record<string, unknown> {
  return {
    'Top Team': g.top_team,
    'Bottom Team': g.bottom_team,
    'Winning Team': g.winning_team,
    'Losing Team': g.losing_team,
    'Top Team Seed': g.top_team_seed,
    'Bottom Team Seed': g.bottom_team_seed,
    'Winning Team Seed': g.winning_team_seed,
    'Losing Team Seed': g.losing_team_seed,
    'Winning Team Score': g.winning_team_score,
    'Losing Team Score': g.losing_team_score,
    'Top Team Score': g.top_team_score,
    'Bottom Team Score': g.bottom_team_score,
    'Game Status': g.game_status,
    'Game Region': g.game_region,
    'Top Team Char6': g.top_team_char6,
    'Bottom Team Char6': g.bottom_team_char6,
    'Winning Team Char6': g.winning_team_char6,
    'Losing Team Char6': g.losing_team_char6,
    points: g.points,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchupsToSavedBracket(matchups: Matchup[], name: string): SavedBracket {
  const picks: Record<string, string> = {};
  matchups.forEach(m => {
    if (m.gameCode && m.winner) {
      picks[m.gameCode] = m.winner === 'top' ? m.topTeam.name : m.bottomTeam.name;
    }
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function App() {
  const [bracketId, setBracketId] = useState<string | null>(null);
  const [bracketName, setBracketName] = useState('My Bracket');
  const [tiebreakerScore, setTiebreakerScore] = useState('');
  const [useTestData, setUseTestData] = useState(false);
  const [matchups, setMatchups] = useState<Matchup[]>(() => createInitialBracket(tournamentData));
  const [totalScore, setTotalScore] = useState(0);
  const [games, setGames] = useState<Record<string, Record<string, unknown>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  // Load results from Supabase on mount
  useEffect(() => {
    async function loadResults() {
      const { data, error } = await supabase.from('results').select('*');
      if (error) {
        console.error('Failed to load results:', error);
        setLoading(false);
        return;
      }
      const adapted: Record<string, Record<string, unknown>> = {};
      (data as MarchMadnessGame[]).forEach(g => {
        adapted[g.game_code] = adaptGame(g);
      });
      setGames(adapted);
      setLoading(false);
    }
    loadResults();
  }, []);

  // Recalculate score whenever matchups or games change
  useEffect(() => {
    setTotalScore(calculateScore(matchups, games));
  }, [matchups, games]);

  const handleUpdateBracket = (newMatchups: Matchup[]) => {
    setMatchups(newMatchups);
  };

  const handleSaveBracket = async () => {
    setSaving(true);
    setSaveStatus('idle');

    const saved = matchupsToSavedBracket(matchups, bracketName);
    const payload = {
      name: bracketName,
      picks: saved.picks,
      tiebreaker: tiebreakerScore ? parseInt(tiebreakerScore) : null,
    };

    let error;
    if (bracketId) {
      // Update existing bracket
      ({ error } = await supabase
        .from('brackets')
        .update(payload)
        .eq('id', bracketId));
    } else {
      // Insert new bracket
      const { data, error: insertError } = await supabase
        .from('brackets')
        .insert(payload)
        .select('id, total_score')
        .single();
      error = insertError;
      if (data) {
        setBracketId(data.id);
        setTotalScore(data.total_score);
      }
    }

    setSaving(false);
    setSaveStatus(error ? 'error' : 'saved');
    if (error) console.error('Save failed:', error);

    // Reset status after 3s
    setTimeout(() => setSaveStatus('idle'), 3000);
  };

  const handleLoadBracket = async () => {
    const name = prompt('Enter the bracket name to load:');
    if (!name) return;

    const { data, error } = await supabase
      .from('brackets')
      .select('*')
      .ilike('name', name)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      alert(`No bracket found with name "${name}"`);
      return;
    }

    const saved: SavedBracket = { name: data.name, picks: data.picks };
    const newMatchups = createInitialBracket(tournamentData, saved);
    setMatchups(newMatchups);
    setBracketName(data.name);
    setBracketId(data.id);
    setTiebreakerScore(data.tiebreaker?.toString() ?? '');
    setTotalScore(data.total_score);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'system-ui' }}>
        Loading results...
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <h1 style={{ textAlign: 'center', fontFamily: 'system-ui', margin: '16px 0', fontSize: 22 }}>
        2026 March Madness Bracket
      </h1>

      {/* Save / Load controls */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 12, fontFamily: 'system-ui' }}>
        <button
          onClick={handleSaveBracket}
          disabled={saving}
          style={{ padding: '6px 18px', borderRadius: 4, border: '1px solid #1a1a2e', background: '#1a1a2e', color: '#fff', cursor: saving ? 'default' : 'pointer', fontSize: 13 }}
        >
          {saving ? 'Saving...' : bracketId ? 'Update Bracket' : 'Save Bracket'}
        </button>
        <button
          onClick={handleLoadBracket}
          style={{ padding: '6px 18px', borderRadius: 4, border: '1px solid #1a1a2e', background: '#fff', color: '#1a1a2e', cursor: 'pointer', fontSize: 13 }}
        >
          Load Bracket
        </button>
        {saveStatus === 'saved' && <span style={{ color: '#2a7a2a', fontSize: 13, alignSelf: 'center' }}>✓ Saved</span>}
        {saveStatus === 'error' && <span style={{ color: '#b00000', fontSize: 13, alignSelf: 'center' }}>Save failed</span>}
      </div>

      <div style={{ width: '100%', overflowX: 'auto' }}>
        <BracketDisplay
          initialMatchups={matchups}
          onUpdateBracket={handleUpdateBracket}
          bracketName={bracketName}
          onUpdateBracketName={setBracketName}
          totalScore={totalScore}
          useTestData={useTestData}
          onUpdateUseTestData={setUseTestData}
          games={games}
          tiebreakerScore={tiebreakerScore}
          onUpdateTiebreakerScore={setTiebreakerScore}
        />
      </div>
    </div>
  );
}
