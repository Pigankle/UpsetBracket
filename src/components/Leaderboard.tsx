import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isLocked } from '../lib/deadline';

interface BracketRow {
  id: string;
  person_name: string;
  bracket_name: string;
  total_score: number;
  tiebreaker: number | null;
  created_at: string;
  updated_at: string;
}

interface LeaderboardProps {
  currentBracketId: string | null;
  onViewBracket: (id: string) => void;
}

const C = {
  bg: '#f5f5f5',
  header: '#1a1a2e',
  headerText: '#ffffff',
  border: '#d0d0d0',
  rowHover: '#eef2ff',
  text: '#1a1a1a',
  seed: '#666666',
  gold: '#b8860b',
  silver: '#666',
  bronze: '#7c4a00',
};

const MEDAL = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ currentBracketId, onViewBracket }: LeaderboardProps) {
  const [brackets, setBrackets] = useState<BracketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const locked = isLocked();

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('brackets')
        .select('id, person_name, bracket_name, total_score, tiebreaker, created_at, updated_at')
        .order('total_score', { ascending: false })
        .order('tiebreaker', { ascending: true, nullsFirst: false });

      if (error) {
        console.error('Failed to load leaderboard:', error);
      } else {
        setBrackets(data as BracketRow[]);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40, fontFamily: 'system-ui', color: C.seed }}>
        Loading leaderboard...
      </div>
    );
  }

  if (brackets.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, fontFamily: 'system-ui', color: C.seed }}>
        No brackets submitted yet.
      </div>
    );
  }

  const canView = locked;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 16px', fontFamily: 'system-ui' }}>
      {!locked && (
        <div style={{
          background: '#fff8e1',
          border: '1px solid #f0c040',
          borderRadius: 6,
          padding: '10px 16px',
          marginBottom: 16,
          fontSize: 13,
          color: '#7a5c00',
        }}>
          🔒 Brackets are hidden until the submission deadline has passed.
          Only your own bracket is visible until then.
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: C.header, color: C.headerText }}>
            <th style={{ padding: '8px 12px', textAlign: 'left', width: 40 }}>#</th>
            <th style={{ padding: '8px 12px', textAlign: 'left' }}>Name</th>
            <th style={{ padding: '8px 12px', textAlign: 'right' }}>Score</th>
            <th style={{ padding: '8px 12px', textAlign: 'right' }}>Tiebreaker</th>
            <th style={{ padding: '8px 12px', textAlign: 'right' }}>Submitted</th>
            {canView && <th style={{ padding: '8px 12px' }} />}
          </tr>
        </thead>
        <tbody>
          {brackets.map((b, i) => {
            const isOwn = b.id === currentBracketId;
            const visible = canView || isOwn;
            const rowStyle: React.CSSProperties = {
              background: isOwn ? '#eef2ff' : i % 2 === 0 ? '#fff' : '#fafafa',
              borderBottom: `1px solid ${C.border}`,
              fontWeight: isOwn ? 700 : 400,
            };

            return (
              <tr key={b.id} style={rowStyle}>
                <td style={{ padding: '8px 12px', color: C.seed }}>
                  {i < 3 ? MEDAL[i] : i + 1}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  {visible ? `${b.person_name} — ${b.bracket_name}` : '—'}
                  {isOwn && <span style={{ fontSize: 10, color: C.seed, marginLeft: 6 }}>(you)</span>}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {visible ? b.total_score : '—'}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right', color: C.seed, fontVariantNumeric: 'tabular-nums' }}>
                  {visible ? (b.tiebreaker ?? '—') : '—'}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right', color: C.seed, fontSize: 11 }}>
                  {new Date(b.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </td>
                {canView && (
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <button
                      onClick={() => onViewBracket(b.id)}
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 3,
                        border: `1px solid ${C.border}`,
                        background: '#fff',
                        cursor: 'pointer',
                        color: C.header,
                      }}
                    >
                      View
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
