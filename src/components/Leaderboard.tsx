import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isLocked } from '../lib/deadline';

interface BracketRow {
  id: string;
  person_name: string;
  bracket_name: string;
  total_score: number;
  tiebreaker: number | null;
  picks: Record<string, string>;
  created_at: string;
  updated_at: string;
}

interface ResultRow {
  game_code: string;
  winning_team: string | null;
  losing_team: string | null;
  top_team: string | null;
  bottom_team: string | null;
  top_team_seed: number | null;
  bottom_team_seed: number | null;
  winning_team_seed: number | null;
  losing_team_seed: number | null;
  game_status: string;
  points: number;
}

interface LeaderboardProps {
  currentBracketId: string | null;
  onViewBracket: (id: string) => void;
}

const C = {
  header: '#1a1a2e',
  headerText: '#ffffff',
  border: '#d0d0d0',
  text: '#1a1a1a',
  seed: '#666666',
  points: '#2a7a2a',
  ceiling: '#1a4a8a',
};

const MEDAL = ['🥇', '🥈', '🥉'];

function calcCeiling(picks: Record<string, string>, results: ResultRow[]): number {
  const resultMap = Object.fromEntries(results.map(r => [r.game_code, r]));

  // Build eliminated set from final games
  const eliminated = new Set<string>();
  for (const r of results) {
    if (r.game_status === 'Final' && r.losing_team) eliminated.add(r.losing_team);
  }

  let ceiling = 0;
  for (const [gameCode, pickedWinner] of Object.entries(picks)) {
    const result = resultMap[gameCode];
    if (!result) continue;
    // If picked team already eliminated, they can't score in this or any future game
    if (eliminated.has(pickedWinner)) continue;
    if (result.winning_team === null) {
      // Game not yet played and pick still alive
      const pickedSeed = result.top_team === pickedWinner ? result.top_team_seed : result.bottom_team_seed;
      const opponentSeed = result.top_team === pickedWinner ? result.bottom_team_seed : result.top_team_seed;
      const multiplier = Math.max(1, (pickedSeed ?? 0) - (opponentSeed ?? 0));
      ceiling += result.points * multiplier;
    } else if (result.winning_team === pickedWinner) {
      // Already won
      const multiplier = Math.max(1, (result.winning_team_seed ?? 0) - (result.losing_team_seed ?? 0));
      ceiling += result.points * multiplier;
    }
  }
  return ceiling;
}

export default function Leaderboard({ currentBracketId, onViewBracket }: LeaderboardProps) {
  const [brackets, setBrackets] = useState<BracketRow[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const locked = isLocked();

  useEffect(() => {
    async function load() {
      const [{ data: bracketData }, { data: resultData }] = await Promise.all([
        supabase
          .from('brackets')
          .select('id, person_name, bracket_name, total_score, tiebreaker, picks, created_at, updated_at')
          .order('total_score', { ascending: false })
          .order('tiebreaker', { ascending: true, nullsFirst: false }),
        supabase
          .from('results')
          .select('game_code, winning_team, losing_team, top_team, bottom_team, top_team_seed, bottom_team_seed, winning_team_seed, losing_team_seed, game_status, points'),
      ]);
      setBrackets((bracketData ?? []) as BracketRow[]);
      setResults((resultData ?? []) as ResultRow[]);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 40, fontFamily: 'system-ui', color: C.seed }}>
      Loading leaderboard...
    </div>
  );

  if (brackets.length === 0) return (
    <div style={{ textAlign: 'center', padding: 40, fontFamily: 'system-ui', color: C.seed }}>
      No brackets submitted yet.
    </div>
  );

  const canView = locked;

  return (
    <div style={{ maxWidth: 750, margin: '0 auto', padding: '0 16px', fontFamily: 'system-ui' }}>
      {!locked && (
        <div style={{ background: '#fff8e1', border: '1px solid #f0c040', borderRadius: 6, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#7a5c00' }}>
          🔒 Brackets are hidden until the submission deadline has passed. Only your own bracket is visible until then.
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: C.header, color: C.headerText }}>
            <th style={{ padding: '8px 10px', textAlign: 'left', width: 36 }}>#</th>
            <th style={{ padding: '8px 10px', textAlign: 'left' }}>Bracket</th>
            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Score</th>
            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Ceiling</th>
            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Tiebreaker</th>
            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Submitted</th>
            {canView && <th style={{ padding: '8px 10px' }} />}
          </tr>
        </thead>
        <tbody>
          {brackets.map((b, i) => {
            const isOwn = b.id === currentBracketId;
            const visible = canView || isOwn;
            const ceiling = visible ? calcCeiling(b.picks, results) : null;
            return (
              <tr key={b.id} style={{ background: isOwn ? '#eef2ff' : i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: `1px solid ${C.border}`, fontWeight: isOwn ? 700 : 400 }}>
                <td style={{ padding: '8px 10px', color: C.seed }}>{i < 3 ? MEDAL[i] : i + 1}</td>
                <td style={{ padding: '8px 10px', color: C.text }}>
                  {visible ? `${b.person_name} — ${b.bracket_name}` : '—'}
                  {isOwn && <span style={{ fontSize: 10, color: C.seed, marginLeft: 6 }}>(you)</span>}
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: C.points, fontWeight: 600 }}>
                  {visible ? b.total_score : '—'}
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: C.ceiling }}>
                  {ceiling !== null ? ceiling : '—'}
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'right', color: C.seed, fontVariantNumeric: 'tabular-nums' }}>
                  {visible ? (b.tiebreaker ?? '—') : '—'}
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'right', color: C.seed, fontSize: 11 }}>
                  {new Date(b.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </td>
                {canView && (
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <button onClick={() => onViewBracket(b.id)} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 3, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer', color: C.header }}>
                      View
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ fontSize: 11, color: C.seed, textAlign: 'right', marginTop: 8, fontStyle: 'italic' }}>
        Note: "Ceiling assumes your remaining picks all win, using current known opponents for upset multiplier estimates. Actual ceiling may be higher or lower depending on future matchups."
      </div>
    </div>
  );
}
