import { useState, useEffect } from 'react';
import type { Team, Matchup } from '../utils/bracketTransform';
import { gameCodeToIndex, gameFlowMap } from '../utils/bracketTransform';

// ─── Types ────────────────────────────────────────────────────────────────────

type GameRecord = Record<string, unknown>;
type GamesMap = Record<string, GameRecord>;

interface BracketDisplayProps {
  initialMatchups: Matchup[];
  onUpdateBracket: (matchups: Matchup[]) => void;
  bracketName: string;
  onUpdateBracketName: (name: string) => void;
  totalScore: number;
  useTestData: boolean;
  onUpdateUseTestData: (useTestData: boolean) => void;
  games: Record<string, Record<string, unknown>>;
  tiebreakerScore: string;
  onUpdateTiebreakerScore: (s: string) => void;
}

// ─── Layout constants ─────────────────────────────────────────────────────────

// Height of one matchup card (two team rows + divider)
const CARD_H = 56;
// Vertical gap between cards within a round
const CARD_GAP = 8;
// Width of each round column
const ROUND_W = 160;
// Horizontal gap between round columns
const ROUND_GAP = 12;
// Width of the connector SVG strip between adjacent round columns
const CONNECTOR_W = 24;

// Total vertical space one card occupies (card + gap below it)
const SLOT = CARD_H + CARD_GAP;

// For a given round index (0=R64, 1=R32, 2=S16, 3=E8) return how many cards
// are in that round and the vertical stride between card centers.
const roundLayout = (roundIdx: number) => {
  const count = 8 >> roundIdx; // 8,4,2,1
  // Cards in later rounds are spaced to align with the midpoint of their
  // two feeder cards from the previous round.
  const stride = SLOT * (1 << roundIdx); // 1x, 2x, 4x, 8x SLOT
  return { count, stride };
};

// Top offset (px) of card [i] in round [r], within a region column.
// Cards are centred within their stride bucket.
const cardTop = (roundIdx: number, cardIdx: number) => {
  const { stride } = roundLayout(roundIdx);
  // bucket start + centre within bucket
  return cardIdx * stride + (stride - CARD_H) / 2;
};

// Total height of a region column (driven by round 0: 8 cards)
const REGION_H = 8 * SLOT - CARD_GAP; // remove trailing gap

// ─── Colours / styles ─────────────────────────────────────────────────────────

const C = {
  bg: '#f5f5f5',
  cardBg: '#ffffff',
  cardBorder: '#d0d0d0',
  divider: '#e0e0e0',
  text: '#1a1a1a',
  seed: '#666666',
  correct: 'rgba(34,139,34,0.12)',
  incorrect: 'rgba(200,0,0,0.10)',
  correctText: '#1a6e1a',
  incorrectText: '#b00000',
  winnerBold: 700,
  connectorLine: '#b0b0b0',
  points: '#2a7a2a',
  pointsNeg: '#b00000',
  header: '#1a1a2e',
  headerText: '#ffffff',
  roundLabel: '#888888',
};

// ─── TeamRow ──────────────────────────────────────────────────────────────────

interface TeamRowProps {
  team: Team;
  position: 'top' | 'bottom';
  isWinner: boolean;
  gameCode: string;
  round: number;
  games: GamesMap;
  onClick: () => void;
}

function TeamRow({ team, position, isWinner, gameCode, round, games, onClick }: TeamRowProps) {
  const result = games[gameCode];
  const isTbd = team.name === 'TBD';

  let bg = 'transparent';
  let textColor = C.text;
  let strike = false;
  let checkmark = '';

  if (result && !isTbd) {
    const actualName = position === 'top' ? result['Top Team'] : result['Bottom Team'];
    const winnerName = result['Winning Team'];
    const bothNull = result['Top Team'] === null && result['Bottom Team'] === null;

    if (!bothNull && round > 0) {
      if (team.name === actualName) {
        bg = C.correct;
        textColor = C.correctText;
      } else if (actualName !== null) {
        bg = C.incorrect;
        textColor = C.incorrectText;
        strike = true;
      }
    }
    if (winnerName === team.name) checkmark = ' ✓';
  }

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 8px',
        height: 26,
        background: bg,
        cursor: isTbd ? 'default' : 'pointer',
        userSelect: 'none',
      }}
    >
      <span style={{ fontSize: 10, color: C.seed, minWidth: 14, textAlign: 'right', flexShrink: 0 }}>
        {isTbd ? '' : team.seed}
      </span>
      <span
        style={{
          fontSize: 12,
          color: textColor,
          fontWeight: isWinner ? C.winnerBold : 400,
          textDecoration: strike ? 'line-through' : 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {team.name}{checkmark}
      </span>
    </div>
  );
}

// ─── MatchupCard ──────────────────────────────────────────────────────────────

interface MatchupCardProps {
  matchup: Matchup;
  top: number;
  round: number;
  games: GamesMap;
  onPick: (code: string, pos: 'top' | 'bottom') => void;
  showGameCode: boolean;
}

function MatchupCard({ matchup, top, round, games, onPick, showGameCode }: MatchupCardProps) {
  const result = games[matchup.gameCode];
  let pts: number | null = null;
  if (matchup.winner && result) {
    const w = matchup.winner === 'top' ? matchup.topTeam : matchup.bottomTeam;
    if (result['Winning Team'] === w.name) pts = (result.points as number) ?? 0;
    else pts = 0;
  }

  const PTS_H = pts !== null ? 16 : 0;

  return (
    <div style={{ position: 'absolute', top, left: 0, width: ROUND_W }}>
      {pts !== null && (
        <div style={{
          height: PTS_H,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: 4,
          fontSize: 10,
          fontWeight: 700,
          color: pts > 0 ? C.points : C.pointsNeg,
        }}>
          +{pts}
        </div>
      )}
      <div style={{
        width: ROUND_W,
        height: CARD_H,
        background: C.cardBg,
        border: `1px solid ${C.cardBorder}`,
        borderRadius: 6,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {showGameCode && (
          <div style={{ fontSize: 9, color: C.seed, textAlign: 'center', lineHeight: '14px', borderBottom: `1px solid ${C.divider}`, background: '#fafafa' }}>
            {matchup.gameCode}
          </div>
        )}
        <TeamRow
          team={matchup.topTeam}
          position='top'
          isWinner={matchup.winner === 'top'}
          gameCode={matchup.gameCode}
          round={round}
          games={games}
          onClick={() => onPick(matchup.gameCode, 'top')}
        />
        <div style={{ height: 1, background: C.divider, flexShrink: 0 }} />
        <TeamRow
          team={matchup.bottomTeam}
          position='bottom'
          isWinner={matchup.winner === 'bottom'}
          gameCode={matchup.gameCode}
          round={round}
          games={games}
          onClick={() => onPick(matchup.gameCode, 'bottom')}
        />
      </div>
    </div>
  );
}

// ─── ConnectorSVG ─────────────────────────────────────────────────────────────
// Draws the bracket lines between round [r] and round [r+1].
// dir: 'ltr' = lines exit right of card (left-side regions)
//      'rtl' = lines exit left of card (right-side regions, mirrored)

interface ConnectorSVGProps {
  fromRound: number; // 0-2
  dir: 'ltr' | 'rtl';
}

function ConnectorSVG({ fromRound, dir }: ConnectorSVGProps) {
  const { count: fromCount } = roundLayout(fromRound);
  const toRound = fromRound + 1;

  const lines: React.ReactNode[] = [];
  const w = CONNECTOR_W;

  for (let i = 0; i < fromCount; i += 2) {
    // Centers of the two source cards
    const y1 = cardTop(fromRound, i) + CARD_H / 2;
    const y2 = cardTop(fromRound, i + 1) + CARD_H / 2;
    // Center of the destination card
    const yMid = cardTop(toRound, i / 2) + CARD_H / 2;

    if (dir === 'ltr') {
      // horizontal stubs from left, vertical join, stub to right
      lines.push(
        <g key={i}>
          <line x1={0} y1={y1} x2={w / 2} y2={y1} stroke={C.connectorLine} strokeWidth={1.5} />
          <line x1={0} y1={y2} x2={w / 2} y2={y2} stroke={C.connectorLine} strokeWidth={1.5} />
          <line x1={w / 2} y1={y1} x2={w / 2} y2={y2} stroke={C.connectorLine} strokeWidth={1.5} />
          <line x1={w / 2} y1={yMid} x2={w} y2={yMid} stroke={C.connectorLine} strokeWidth={1.5} />
        </g>
      );
    } else {
      // rtl: stubs from right, vertical join, stub to left
      lines.push(
        <g key={i}>
          <line x1={w} y1={y1} x2={w / 2} y2={y1} stroke={C.connectorLine} strokeWidth={1.5} />
          <line x1={w} y1={y2} x2={w / 2} y2={y2} stroke={C.connectorLine} strokeWidth={1.5} />
          <line x1={w / 2} y1={y1} x2={w / 2} y2={y2} stroke={C.connectorLine} strokeWidth={1.5} />
          <line x1={w / 2} y1={yMid} x2={0} y2={yMid} stroke={C.connectorLine} strokeWidth={1.5} />
        </g>
      );
    }
  }

  return (
    <svg
      width={w}
      height={REGION_H}
      style={{ flexShrink: 0, display: 'block', overflow: 'visible' }}
    >
      {lines}
    </svg>
  );
}

// ─── RoundColumn ──────────────────────────────────────────────────────────────

interface RoundColumnProps {
  matchups: Matchup[];
  roundIdx: number;
  label: string;
  games: GamesMap;
  onPick: (code: string, pos: 'top' | 'bottom') => void;
  showGameCode: boolean;
}

function RoundColumn({ matchups, roundIdx, label, games, onPick, showGameCode }: RoundColumnProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
      <div style={{ fontSize: 10, color: C.roundLabel, marginBottom: 4, whiteSpace: 'nowrap', fontWeight: 600, letterSpacing: '0.03em' }}>
        {label}
      </div>
      <div style={{ position: 'relative', width: ROUND_W, height: REGION_H }}>
        {matchups.map((m, i) => (
          <MatchupCard
            key={m.gameCode}
            matchup={m}
            top={cardTop(roundIdx, i)}
            round={roundIdx}
            games={games}
            onPick={onPick}
            showGameCode={showGameCode}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Region ───────────────────────────────────────────────────────────────────

const ROUND_LABELS = ['Round of 64', 'Round of 32', 'Sweet 16', 'Elite Eight'];

interface RegionProps {
  name: string;
  matchups: Matchup[];
  games: Record<string, MarchMadnessGame>;
  onPick: (code: string, pos: 'top' | 'bottom') => void;
  dir: 'ltr' | 'rtl';
  showGameCode: boolean;
}

function Region({ name, matchups, games, onPick, dir, showGameCode }: RegionProps) {
  const rounds = [
    matchups.slice(0, 8),
    matchups.slice(8, 12),
    matchups.slice(12, 14),
    matchups.slice(14, 15),
  ];

  const columns = ROUND_LABELS.map((label, i) => (
    <RoundColumn
      key={i}
      matchups={rounds[i]}
      roundIdx={i}
      label={label}
      games={games}
      onPick={onPick}
      showGameCode={showGameCode}
    />
  ));

  // Insert connector SVGs between round columns

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
    // RTL: columns are rendered E8→S16→R32→R64 (reversed)
    // Connector between col i and col i+1 joins logical rounds (3-i-1) and (3-i)
    const reversedCols = [...columns].reverse();
    reversedCols.forEach((col, i) => {
      children.push(col);
      if (i < 3) {
        // logical fromRound: col i is round (3-i), next col is round (3-i-1)
        // connector draws lines from round (3-i-1) cards merging into round (3-i)
        const logicalFromRound = 3 - i - 1; // 2, 1, 0
        children.push(
          <div key={`c${i}`} style={{ display: 'flex', alignItems: 'flex-start', paddingTop: 18 }}>
            <ConnectorSVG fromRound={logicalFromRound} dir='rtl' />
          </div>
        );
      }
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: dir === 'ltr' ? 'flex-start' : 'flex-end' }}>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        color: C.headerText,
        background: C.header,
        padding: '3px 10px',
        borderRadius: 4,
        marginBottom: 8,
        letterSpacing: '0.05em',
        alignSelf: 'stretch',
        textAlign: 'center',
      }}>
        {name.toUpperCase()}
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
        {children}
      </div>
    </div>
  );
}

// ─── FinalFourCenter ──────────────────────────────────────────────────────────

interface FinalFourCenterProps {
  matchups: Matchup[];
  games: GamesMap;
  onPick: (code: string, pos: 'top' | 'bottom') => void;
  bracketName: string;
  onUpdateBracketName: (n: string) => void;
  totalScore: number;
  useTestData: boolean;
  tiebreakerScore: string;
  onUpdateTiebreakerScore: (s: string) => void;
}

// Compact single-game card (used in Final Four column)
function FinalCard({
  matchup,
  round,
  games,
  onPick,
}: {
  matchup: Matchup;
  round: number;
  games: GamesMap;
  onPick: (code: string, pos: 'top' | 'bottom') => void;
}) {
  const result = games[matchup.gameCode];
  let pts: number | null = null;
  if (matchup.winner && result) {
    const w = matchup.winner === 'top' ? matchup.topTeam : matchup.bottomTeam;
    pts = result['Winning Team'] === w.name ? ((result.points as number) ?? 0) : 0;
  }

  return (
    <div style={{
      width: ROUND_W,
      height: CARD_H,
      background: C.cardBg,
      border: `1px solid ${C.cardBorder}`,
      borderRadius: 6,
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      flexShrink: 0,
    }}>
      <TeamRow team={matchup.topTeam} position='top' isWinner={matchup.winner === 'top'} gameCode={matchup.gameCode} round={round} games={games} onClick={() => onPick(matchup.gameCode, 'top')} />
      <div style={{ height: 1, background: C.divider }} />
      <TeamRow team={matchup.bottomTeam} position='bottom' isWinner={matchup.winner === 'bottom'} gameCode={matchup.gameCode} round={round} games={games} onClick={() => onPick(matchup.gameCode, 'bottom')} />
      {pts !== null && (
        <div style={{ position: 'absolute', right: 4, bottom: 2, fontSize: 10, fontWeight: 700, color: pts > 0 ? C.points : C.pointsNeg }}>
          +{pts}
        </div>
      )}
    </div>
  );
}

function FinalFourCenter({ matchups, games, onPick, bracketName, onUpdateBracketName, totalScore, useTestData, tiebreakerScore, onUpdateTiebreakerScore }: FinalFourCenterProps) {
  // matchups order from caller: [FF1=idx60, FF2=idx61, CH=idx62]
  const [ff1, ff2, ch] = matchups;

  // Connector from left Elite Eight into FF semifinal
  const ffCardTop = (REGION_H - CARD_H * 3 - 16) / 2;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 280,
      padding: '0 8px',
      gap: 0,
    }}>
      {/* Bracket name input */}
      <input
        value={bracketName}
        onChange={e => onUpdateBracketName(e.target.value)}
        placeholder='Bracket name'
        style={{
          border: `1px solid ${C.cardBorder}`,
          borderRadius: 4,
          padding: '4px 8px',
          fontSize: 12,
          marginBottom: 12,
          width: '100%',
          boxSizing: 'border-box',
          outline: 'none',
          color: C.text,
          background: '#fff',
        }}
      />

      <div style={{ fontSize: 11, fontWeight: 700, color: C.headerText, background: C.header, padding: '3px 10px', borderRadius: 4, marginBottom: 10, letterSpacing: '0.05em', width: '100%', textAlign: 'center', boxSizing: 'border-box' }}>
        FINAL FOUR
      </div>

      {/* Two semifinal games */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16, width: '100%', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 9, color: C.roundLabel, textAlign: 'center', marginBottom: 4 }}>{ff1.gameCode}</div>
          <FinalCard matchup={ff1} round={3} games={games} onPick={onPick} />
        </div>
        <div>
          <div style={{ fontSize: 9, color: C.roundLabel, textAlign: 'center', marginBottom: 4 }}>{ff2.gameCode}</div>
          <FinalCard matchup={ff2} round={3} games={games} onPick={onPick} />
        </div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: C.headerText, background: C.header, padding: '3px 10px', borderRadius: 4, marginBottom: 10, letterSpacing: '0.05em', width: '100%', textAlign: 'center', boxSizing: 'border-box' }}>
        CHAMPIONSHIP
      </div>

      <FinalCard matchup={ch} round={4} games={games} onPick={onPick} />

      {ch.winner && (
        <div style={{ marginTop: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: C.roundLabel }}>🏆 Champion</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
            {(ch.winner === 'top' ? ch.topTeam : ch.bottomTeam).name}
          </div>
        </div>
      )}

      {/* Tiebreaker */}
      <div style={{ marginTop: 12, width: '100%', borderTop: `1px solid ${C.divider}`, paddingTop: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 6 }}>Tiebreaker</div>
        <div style={{ fontSize: 10, color: C.seed, marginBottom: 6 }}>Predicted final game total score</div>
        <input
          type='number'
          min={0}
          value={tiebreakerScore}
          onChange={e => onUpdateTiebreakerScore(e.target.value)}
          placeholder='e.g. 145'
          style={{
            border: `1px solid ${C.cardBorder}`,
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 12,
            width: '100%',
            boxSizing: 'border-box',
            outline: 'none',
            color: C.text,
            background: '#fff',
          }}
        />
      </div>

      {/* Score summary */}
      <div style={{ marginTop: 16, width: '100%', fontSize: 11, color: C.text, borderTop: `1px solid ${C.divider}`, paddingTop: 10 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Scores by Round</div>
        {useTestData && (
          <div style={{ color: C.incorrectText, fontWeight: 700, fontSize: 10, marginBottom: 6 }}>⚠ SCORING BASED ON TEST DATA</div>
        )}
        <div style={{ fontSize: 11, fontWeight: 700, color: C.points, marginTop: 6 }}>
          Total: {totalScore} pts
        </div>
      </div>
    </div>
  );
}

// ─── Scoring helpers ──────────────────────────────────────────────────────────

function calcRoundScores(matchups: Matchup[], games: GamesMap) {
  const names = ['Round of 64', 'Round of 32', 'Sweet 16', 'Elite Eight', 'Final Four', 'Championship'];
  const scores = Array(6).fill(0);

  const r64 = new Set([...range(0,8), ...range(15,23), ...range(30,38), ...range(45,53)]);
  const r32 = new Set([...range(8,12), ...range(23,27), ...range(38,42), ...range(53,57)]);
  const s16 = new Set([12,13,27,28,42,43,57,58]);
  const e8  = new Set([14,29,44,59]);

  matchups.forEach((m, idx) => {
    if (!m.winner) return;
    const w = m.winner === 'top' ? m.topTeam : m.bottomTeam;
    const g = games[m.gameCode];
    if (!g || g['Winning Team'] !== w.name) return;
    const pts = (g.points as number) ?? 0;
    if (r64.has(idx)) scores[0] += pts;
    else if (r32.has(idx)) scores[1] += pts;
    else if (s16.has(idx)) scores[2] += pts;
    else if (e8.has(idx)) scores[3] += pts;
    else if (idx === 60 || idx === 61) scores[4] += pts;
    else if (idx === 62) scores[5] += pts;
  });

  return names.map((n, i) => ({ name: n, score: scores[i] }));
}

function range(a: number, b: number) {
  return Array.from({ length: b - a }, (_, i) => i + a);
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BracketDisplay({
  initialMatchups,
  onUpdateBracket,
  bracketName,
  onUpdateBracketName,
  totalScore,
  useTestData,
  onUpdateUseTestData,
  games,
  tiebreakerScore,
  onUpdateTiebreakerScore,
}: BracketDisplayProps) {
  const [matchups, setMatchups] = useState<Matchup[]>(initialMatchups);
  const [showGameCode, setShowGameCode] = useState(false);

  useEffect(() => { setMatchups(initialMatchups); }, [initialMatchups]);
  useEffect(() => { onUpdateBracket([...matchups]); }, [useTestData]);

  const handlePick = (gameCode: string, position: 'top' | 'bottom') => {
    const matchupIndex = gameCodeToIndex[gameCode];
    if (matchupIndex === undefined) return;

    const next = [...matchups];
    const cur = next[matchupIndex];
    const selected = position === 'top' ? cur.topTeam : cur.bottomTeam;
    if (selected.name === 'TBD') return;

    cur.winner = position;

    const clearPath = (code: string) => {
      const info = gameFlowMap[code];
      if (!info) return;
      const ni = gameCodeToIndex[info.nextGame];
      const nm = next[ni];
      const pos = info.position;
      const isOrigin = code === gameCode;

      if (isOrigin) {
        if (pos === 'top') nm.topTeam = selected;
        else nm.bottomTeam = selected;
      } else {
        if (pos === 'top') {
          if (nm.winner === 'top') { nm.winner = undefined; nm.topTeam = { name: 'TBD', seed: '0' }; clearPath(info.nextGame); }
          else nm.topTeam = { name: 'TBD', seed: '0' };
        } else {
          if (nm.winner === 'bottom') { nm.winner = undefined; nm.bottomTeam = { name: 'TBD', seed: '0' }; clearPath(info.nextGame); }
          else nm.bottomTeam = { name: 'TBD', seed: '0' };
        }
      }
    };

    clearPath(gameCode);
    setMatchups(next);
    onUpdateBracket(next);
  };

  // Region matchup slices (15 each: 8+4+2+1)
  // Order in flat array: East(0-14), West(15-29), South(30-44), Midwest(45-59)
  const east    = matchups.slice(0, 15);
  const west    = matchups.slice(15, 30);
  const south   = matchups.slice(30, 45);
  const midwest = matchups.slice(45, 60);
  // Look up FF/CH by gameCode to be immune to index ordering bugs
  const ff1 = matchups.find(m => m.gameCode === 'FF1')!;
  const ff2 = matchups.find(m => m.gameCode === 'FF2')!;
  const ch1 = matchups.find(m => m.gameCode === 'CH1')!;
  const ffMid = [ff1, ff2, ch1];

  const roundScores = calcRoundScores(matchups, games);

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      {/* Main bracket row */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 0, overflowX: 'auto' }}>

        {/* Left side: East (top) + South (bottom), ltr */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <Region name='East'  matchups={east}  games={games} onPick={handlePick} dir='ltr' showGameCode={showGameCode} />
          <Region name='South' matchups={south} games={games} onPick={handlePick} dir='ltr' showGameCode={showGameCode} />
        </div>

        {/* Center: Final Four + Championship */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignSelf: 'center', padding: '0 16px' }}>
          <FinalFourCenter
            matchups={ffMid}
            games={games}
            onPick={handlePick}
            bracketName={bracketName}
            onUpdateBracketName={onUpdateBracketName}
            totalScore={totalScore}
            useTestData={useTestData}
            tiebreakerScore={tiebreakerScore}
            onUpdateTiebreakerScore={setTiebreakerScore}
          />
          {/* Round scores */}
          <div style={{ marginTop: 12, fontSize: 11, color: C.text }}>
            {roundScores.map(r => (
              <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '1px 0' }}>
                <span style={{ color: C.seed }}>{r.name}</span>
                <span style={{ fontWeight: 600, color: r.score > 0 ? C.points : C.seed }}>{r.score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right side: West (top) + Midwest (bottom), rtl */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <Region name='West'    matchups={west}    games={games} onPick={handlePick} dir='rtl' showGameCode={showGameCode} />
          <Region name='Midwest' matchups={midwest} games={games} onPick={handlePick} dir='rtl' showGameCode={showGameCode} />
        </div>
      </div>

      {/* Controls */}
      <div style={{ marginTop: 16, display: 'flex', gap: 16, alignItems: 'center', fontSize: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input type='checkbox' checked={showGameCode} onChange={e => setShowGameCode(e.target.checked)} />
          Show game codes
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input type='checkbox' checked={useTestData} onChange={e => onUpdateUseTestData(e.target.checked)} />
          Use test data
        </label>
      </div>
    </div>
  );
}
