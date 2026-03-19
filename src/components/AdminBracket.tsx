import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { gameCodeToIndex } from '../utils/bracketTransform';
import type { Matchup } from '../utils/bracketTransform';

// ─── Types ────────────────────────────────────────────────────────────────────

type GamesMap = Record<string, Record<string, unknown>>;

interface AdminBracketProps {
  matchups: Matchup[];       // bracket structure (teams)
  games: GamesMap;           // current results from Supabase
  onResultsChanged: () => void; // callback to reload results in parent
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CARD_H = 56;
const CARD_GAP = 8;
const ROUND_W = 160;
const CONNECTOR_W = 24;
const SLOT = CARD_H + CARD_GAP;
const REGION_H = 8 * SLOT - CARD_GAP;
const ROUND_LABELS = ['Round of 64', 'Round of 32', 'Sweet 16', 'Elite Eight'];

const roundLayout = (r: number) => ({ count: 8 >> r, stride: SLOT * (1 << r) });
const cardTop = (r: number, i: number) => { const { stride } = roundLayout(r); return i * stride + (stride - CARD_H) / 2; };

const C = {
  bg: '#f5f5f5', cardBg: '#fff', cardBorder: '#d0d0d0', divider: '#e0e0e0',
  text: '#1a1a1a', seed: '#666', header: '#1a1a2e', headerText: '#fff',
  roundLabel: '#888', winner: 'rgba(34,139,34,0.15)', winnerText: '#1a6e1a',
  pending: '#fff8e1', connectorLine: '#b0b0b0',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Resolve what team is actually in a slot given current results
function resolveTeam(matchups: Matchup[], games: GamesMap, gameCode: string, position: 'top' | 'bottom'): { name: string; seed: number | null } {
  const idx = gameCodeToIndex[gameCode];
  const matchup = matchups[idx];
  if (!matchup) return { name: 'TBD', seed: null };
  const team = position === 'top' ? matchup.topTeam : matchup.bottomTeam;
  // If team was propagated from picks, use it; otherwise fall back to games table
  const g = games[gameCode];
  const nameFromGames = g ? (position === 'top' ? g['top_team'] : g['bottom_team']) as string : null;
  const name = team.name !== 'TBD' ? team.name : (nameFromGames ?? 'TBD');
  const seed = team.seed && team.seed !== '-' ? Number(team.seed) : null;
  return { name, seed };
}

// ─── TeamRow ──────────────────────────────────────────────────────────────────

function AdminTeamRow({ name, seed, isWinner, isTbd, onClick }: {
  name: string; seed: number | null; isWinner: boolean; isTbd: boolean; onClick: () => void;
}) {
  return (
    <div
      onClick={isTbd ? undefined : onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '0 8px', height: 26,
        background: isWinner ? C.winner : 'transparent',
        cursor: isTbd ? 'default' : 'pointer',
        userSelect: 'none',
      }}
    >
      <span style={{ fontSize: 10, color: C.seed, minWidth: 14, textAlign: 'right', flexShrink: 0 }}>
        {seed ?? ''}
      </span>
      <span style={{
        fontSize: 12, color: isWinner ? C.winnerText : isTbd ? C.seed : C.text,
        fontWeight: isWinner ? 700 : 400,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {name}{isWinner ? ' ✓' : ''}
      </span>
    </div>
  );
}

// ─── MatchupCard ──────────────────────────────────────────────────────────────

function AdminMatchupCard({ gameCode, matchups, games, onPick, saving, top }: {
  gameCode: string; matchups: Matchup[]; games: GamesMap;
  onPick: (gameCode: string, winner: string, loser: string) => void;
  saving: string | null; top: number;
}) {
  const g = games[gameCode];
  const winnerName = g ? g['Winning Team'] as string | null : null;
  const topTeam = resolveTeam(matchups, games, gameCode, 'top');
  const bottomTeam = resolveTeam(matchups, games, gameCode, 'bottom');
  const isSaving = saving === gameCode;

  return (
    <div style={{ position: 'absolute', top, left: 0, width: ROUND_W }}>
      <div style={{
        width: ROUND_W, height: CARD_H,
        background: isSaving ? C.pending : C.cardBg,
        border: `1px solid ${C.cardBorder}`, borderRadius: 6,
        overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column',
        opacity: isSaving ? 0.7 : 1, transition: 'opacity 0.15s',
      }}>
        <AdminTeamRow
          name={topTeam.name} seed={topTeam.seed}
          isWinner={!!winnerName && winnerName === topTeam.name}
          isTbd={topTeam.name === 'TBD'}
          onClick={() => topTeam.name !== 'TBD' && bottomTeam.name !== 'TBD' &&
            onPick(gameCode, topTeam.name, bottomTeam.name)}
        />
        <div style={{ height: 1, background: C.divider, flexShrink: 0 }} />
        <AdminTeamRow
          name={bottomTeam.name} seed={bottomTeam.seed}
          isWinner={!!winnerName && winnerName === bottomTeam.name}
          isTbd={bottomTeam.name === 'TBD'}
          onClick={() => topTeam.name !== 'TBD' && bottomTeam.name !== 'TBD' &&
            onPick(gameCode, bottomTeam.name, topTeam.name)}
        />
      </div>
      <div style={{ fontSize: 9, color: C.seed, textAlign: 'center', marginTop: 2 }}>{gameCode}</div>
    </div>
  );
}

// ─── ConnectorSVG (reused) ────────────────────────────────────────────────────

function ConnectorSVG({ fromRound, dir }: { fromRound: number; dir: 'ltr' | 'rtl' }) {
  const { count } = roundLayout(fromRound);
  const toRound = fromRound + 1;
  const w = CONNECTOR_W;
  const lines: React.ReactNode[] = [];
  for (let i = 0; i < count; i += 2) {
    const y1 = cardTop(fromRound, i) + CARD_H / 2;
    const y2 = cardTop(fromRound, i + 1) + CARD_H / 2;
    const yMid = cardTop(toRound, i / 2) + CARD_H / 2;
    if (dir === 'ltr') {
      lines.push(<g key={i}>
        <line x1={0} y1={y1} x2={w/2} y2={y1} stroke={C.connectorLine} strokeWidth={1.5} />
        <line x1={0} y1={y2} x2={w/2} y2={y2} stroke={C.connectorLine} strokeWidth={1.5} />
        <line x1={w/2} y1={y1} x2={w/2} y2={y2} stroke={C.connectorLine} strokeWidth={1.5} />
        <line x1={w/2} y1={yMid} x2={w} y2={yMid} stroke={C.connectorLine} strokeWidth={1.5} />
      </g>);
    } else {
      lines.push(<g key={i}>
        <line x1={w} y1={y1} x2={w/2} y2={y1} stroke={C.connectorLine} strokeWidth={1.5} />
        <line x1={w} y1={y2} x2={w/2} y2={y2} stroke={C.connectorLine} strokeWidth={1.5} />
        <line x1={w/2} y1={y1} x2={w/2} y2={y2} stroke={C.connectorLine} strokeWidth={1.5} />
        <line x1={w/2} y1={yMid} x2={0} y2={yMid} stroke={C.connectorLine} strokeWidth={1.5} />
      </g>);
    }
  }
  return <svg width={w} height={REGION_H} style={{ flexShrink: 0, display: 'block', overflow: 'visible' }}>{lines}</svg>;
}

// ─── RoundColumn ──────────────────────────────────────────────────────────────

function AdminRoundColumn({ gameCodes, roundIdx, label, matchups, games, onPick, saving }: {
  gameCodes: string[]; roundIdx: number; label: string;
  matchups: Matchup[]; games: GamesMap;
  onPick: (gameCode: string, winner: string, loser: string) => void;
  saving: string | null;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
      <div style={{ fontSize: 10, color: C.roundLabel, marginBottom: 4, whiteSpace: 'nowrap', fontWeight: 600, letterSpacing: '0.03em' }}>
        {label}
      </div>
      <div style={{ position: 'relative', width: ROUND_W, height: REGION_H }}>
        {gameCodes.map((code, i) => (
          <AdminMatchupCard key={code} gameCode={code} matchups={matchups} games={games} onPick={onPick} saving={saving} top={cardTop(roundIdx, i)} />
        ))}
      </div>
    </div>
  );
}

// ─── Region ───────────────────────────────────────────────────────────────────

const REGION_GAME_CODES: Record<string, string[][]> = {
  East:    [['E1','E2','E3','E4','E5','E6','E7','E8'], ['E9','E10','E11','E12'], ['E13','E14'], ['E15']],
  South:   [['S1','S2','S3','S4','S5','S6','S7','S8'], ['S9','S10','S11','S12'], ['S13','S14'], ['S15']],
  West:    [['W1','W2','W3','W4','W5','W6','W7','W8'], ['W9','W10','W11','W12'], ['W13','W14'], ['W15']],
  Midwest: [['M1','M2','M3','M4','M5','M6','M7','M8'], ['M9','M10','M11','M12'], ['M13','M14'], ['M15']],
};

function AdminRegion({ name, matchups, games, onPick, saving, dir }: {
  name: string; matchups: Matchup[]; games: GamesMap;
  onPick: (gameCode: string, winner: string, loser: string) => void;
  saving: string | null; dir: 'ltr' | 'rtl';
}) {
  const rounds = REGION_GAME_CODES[name];
  const columns = ROUND_LABELS.map((label, i) => (
    <AdminRoundColumn key={i} gameCodes={rounds[i]} roundIdx={i} label={label} matchups={matchups} games={games} onPick={onPick} saving={saving} />
  ));

  const children: React.ReactNode[] = [];
  if (dir === 'ltr') {
    columns.forEach((col, i) => {
      children.push(col);
      if (i < 3) children.push(
        <div key={`c${i}`} style={{ display: 'flex', alignItems: 'flex-start', paddingTop: 18 }}>
          <ConnectorSVG fromRound={i} dir='ltr' />
        </div>
      );
    });
  } else {
    [...columns].reverse().forEach((col, i) => {
      children.push(col);
      if (i < 3) children.push(
        <div key={`c${i}`} style={{ display: 'flex', alignItems: 'flex-start', paddingTop: 18 }}>
          <ConnectorSVG fromRound={3 - i - 1} dir='rtl' />
        </div>
      );
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: dir === 'ltr' ? 'flex-start' : 'flex-end' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.headerText, background: C.header, padding: '3px 10px', borderRadius: 4, marginBottom: 8, letterSpacing: '0.05em', alignSelf: 'stretch', textAlign: 'center' }}>
        {name.toUpperCase()}
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>{children}</div>
    </div>
  );
}

// ─── FinalFour ────────────────────────────────────────────────────────────────

function AdminFinalFour({ matchups, games, onPick, saving }: {
  matchups: Matchup[]; games: GamesMap;
  onPick: (gameCode: string, winner: string, loser: string) => void;
  saving: string | null;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 200, padding: '0 16px', gap: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.headerText, background: C.header, padding: '3px 10px', borderRadius: 4, letterSpacing: '0.05em', width: '100%', textAlign: 'center', boxSizing: 'border-box' }}>
        FINAL FOUR
      </div>
      {['FF1', 'FF2'].map(code => {
        const g = games[code];
        const winner = g ? g['Winning Team'] as string | null : null;
        const top = resolveTeam(matchups, games, code, 'top');
        const bottom = resolveTeam(matchups, games, code, 'bottom');
        const isSaving = saving === code;
        return (
          <div key={code} style={{ width: ROUND_W }}>
            <div style={{ fontSize: 9, color: C.seed, textAlign: 'center', marginBottom: 4 }}>{code}</div>
            <div style={{ width: ROUND_W, height: CARD_H, background: isSaving ? C.pending : C.cardBg, border: `1px solid ${C.cardBorder}`, borderRadius: 6, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', opacity: isSaving ? 0.7 : 1 }}>
              <AdminTeamRow name={top.name} seed={top.seed} isWinner={!!winner && winner === top.name} isTbd={top.name === 'TBD'} onClick={() => top.name !== 'TBD' && bottom.name !== 'TBD' && onPick(code, top.name, bottom.name)} />
              <div style={{ height: 1, background: C.divider }} />
              <AdminTeamRow name={bottom.name} seed={bottom.seed} isWinner={!!winner && winner === bottom.name} isTbd={bottom.name === 'TBD'} onClick={() => top.name !== 'TBD' && bottom.name !== 'TBD' && onPick(code, bottom.name, top.name)} />
            </div>
          </div>
        );
      })}

      <div style={{ fontSize: 11, fontWeight: 700, color: C.headerText, background: C.header, padding: '3px 10px', borderRadius: 4, letterSpacing: '0.05em', width: '100%', textAlign: 'center', boxSizing: 'border-box' }}>
        CHAMPIONSHIP
      </div>
      {(() => {
        const code = 'CH1';
        const g = games[code];
        const winner = g ? g['Winning Team'] as string | null : null;
        const top = resolveTeam(matchups, games, code, 'top');
        const bottom = resolveTeam(matchups, games, code, 'bottom');
        const isSaving = saving === code;
        return (
          <div style={{ width: ROUND_W }}>
            <div style={{ width: ROUND_W, height: CARD_H, background: isSaving ? C.pending : C.cardBg, border: `2px solid ${C.header}`, borderRadius: 6, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', opacity: isSaving ? 0.7 : 1 }}>
              <AdminTeamRow name={top.name} seed={top.seed} isWinner={!!winner && winner === top.name} isTbd={top.name === 'TBD'} onClick={() => top.name !== 'TBD' && bottom.name !== 'TBD' && onPick(code, top.name, bottom.name)} />
              <div style={{ height: 1, background: C.divider }} />
              <AdminTeamRow name={bottom.name} seed={bottom.seed} isWinner={!!winner && winner === bottom.name} isTbd={bottom.name === 'TBD'} onClick={() => top.name !== 'TBD' && bottom.name !== 'TBD' && onPick(code, bottom.name, top.name)} />
            </div>
            {winner && <div style={{ textAlign: 'center', marginTop: 8, fontSize: 13, fontWeight: 700 }}>🏆 {winner}</div>}
          </div>
        );
      })()}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminBracket({ matchups, games, onResultsChanged }: AdminBracketProps) {
  const [saving, setSaving] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const handlePick = async (gameCode: string, winner: string, loser: string) => {
    const confirm = window.confirm(`Mark ${winner} as winner of ${gameCode}?`);
    if (!confirm) return;

    setSaving(gameCode);
    const { error } = await supabase
      .from('results')
      .update({ winning_team: winner, losing_team: loser, game_status: 'Final' })
      .eq('game_code', gameCode);

    setSaving(null);
    if (error) {
      console.error('Failed to save result:', error);
      alert('Save failed — check console.');
    } else {
      setLastSaved(`${gameCode}: ${winner}`);
      onResultsChanged();
    }
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 16, fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16, color: C.header }}>Admin — Enter Results</h2>
        <span style={{ fontSize: 12, color: C.seed }}>Click a team to mark them as the winner.</span>
        {lastSaved && <span style={{ fontSize: 12, color: '#2a7a2a' }}>✓ Saved: {lastSaved}</span>}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <AdminRegion name='East'  matchups={matchups} games={games} onPick={handlePick} saving={saving} dir='ltr' />
            <AdminRegion name='South' matchups={matchups} games={games} onPick={handlePick} saving={saving} dir='ltr' />
          </div>
          <AdminFinalFour matchups={matchups} games={games} onPick={handlePick} saving={saving} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <AdminRegion name='West'    matchups={matchups} games={games} onPick={handlePick} saving={saving} dir='rtl' />
            <AdminRegion name='Midwest' matchups={matchups} games={games} onPick={handlePick} saving={saving} dir='rtl' />
          </div>
        </div>
      </div>
    </div>
  );
}
