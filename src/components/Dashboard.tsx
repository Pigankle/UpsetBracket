import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/auth';
import { isLocked } from '../lib/deadline';

interface BracketRow {
  id: string;
  person_name: string;
  bracket_name: string;
  total_score: number;
  tiebreaker: number | null;
  updated_at: string;
  user_id: string;
}

interface DashboardProps {
  profile: Profile;
  onOpenBracket: (id: string) => void;
  onNewBracket: () => void;
}

const C = {
  header: '#1a1a2e',
  border: '#d0d0d0',
  seed: '#666',
  text: '#1a1a1a',
  points: '#2a7a2a',
};

const MAX_BRACKETS = 3;

export default function Dashboard({ profile, onOpenBracket, onNewBracket }: DashboardProps) {
  const [brackets, setBrackets] = useState<BracketRow[]>([]);
  const [allBrackets, setAllBrackets] = useState<BracketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const locked = isLocked();

  useEffect(() => {
    async function load() {
      // Own brackets
      const { data: own } = await supabase
        .from('brackets')
        .select('id, person_name, bracket_name, total_score, tiebreaker, updated_at, user_id')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: true });
      setBrackets((own ?? []) as BracketRow[]);

      // All brackets (admin only)
      if (profile.is_admin) {
        const { data: all } = await supabase
          .from('brackets')
          .select('id, person_name, bracket_name, total_score, tiebreaker, updated_at, user_id')
          .order('total_score', { ascending: false });
        setAllBrackets((all ?? []) as BracketRow[]);
      }

      setLoading(false);
    }
    load();
  }, [profile.id]);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 40, fontFamily: 'system-ui', color: C.seed }}>Loading...</div>
  );

  const canAddMore = !locked && (profile.is_admin || brackets.length < MAX_BRACKETS);

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 16px', fontFamily: 'system-ui' }}>
      <h2 style={{ color: C.header, margin: '0 0 4px' }}>Welcome, {profile.display_name}</h2>
      <p style={{ color: C.seed, fontSize: 13, margin: '0 0 24px' }}>
        {locked
          ? 'Submissions are closed. View your brackets below.'
          : profile.is_admin
            ? `You have ${brackets.length} bracket(s). As admin, you can create unlimited brackets.`
            : `You have ${brackets.length} of ${MAX_BRACKETS} brackets.`}
      </p>

      {/* Own brackets */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {brackets.map(b => (
          <BracketCard key={b.id} bracket={b} onOpen={() => onOpenBracket(b.id)} />
        ))}
        {brackets.length === 0 && (
          <div style={{ color: C.seed, fontSize: 13 }}>No brackets yet.</div>
        )}
      </div>

      {canAddMore && (
        <button
          onClick={onNewBracket}
          style={{ padding: '10px 24px', borderRadius: 4, background: C.header, color: '#fff', border: 'none', fontSize: 13, cursor: 'pointer' }}
        >
          + New Bracket
        </button>
      )}

      {/* Admin: all brackets */}
      {profile.is_admin && allBrackets.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <h3 style={{ color: C.header, margin: '0 0 12px', fontSize: 15 }}>All Brackets (Admin)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {allBrackets.map(b => (
              <BracketCard key={b.id} bracket={b} onOpen={() => onOpenBracket(b.id)} showOwner />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BracketCard({ bracket, onOpen, showOwner }: { bracket: BracketRow; onOpen: () => void; showOwner?: boolean }) {
  return (
    <div
      onClick={onOpen}
      style={{
        background: '#fff', border: `1px solid ${C.border}`, borderRadius: 6,
        padding: '12px 16px', cursor: 'pointer', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)')}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>
          {showOwner ? `${bracket.person_name} — ` : ''}{bracket.bracket_name}
        </div>
        <div style={{ fontSize: 11, color: C.seed, marginTop: 2 }}>
          Updated {new Date(bracket.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: C.points }}>{bracket.total_score}</div>
        <div style={{ fontSize: 10, color: C.seed }}>pts</div>
      </div>
    </div>
  );
}
