import type { Matchup } from '../utils/bracketTransform';

type GamesMap = Record<string, Record<string, unknown>>;

// ─── Layout constants (must match BracketDisplay) ─────────────────────────────
const CARD_H = 56;
const CARD_GAP = 8;
const ROUND_W = 160;
const CONNECTOR_W = 24;
const SLOT = CARD_H + CARD_GAP;
const REGION_H = 8 * SLOT - CARD_GAP;
const ROUND_LABELS = ['Round of 64', 'Round of 32', 'Sweet 16', 'Elite Eight'];

const cardTop = (r: number, i: number) => {
  const stride = SLOT * (1 << r);
  return i * stride + (stride - CARD_H) / 2;
};

// ─── Colours ──────────────────────────────────────────────────────────────────
const C = {
  header: '#1a1a2e', headerText: '#fff',
  cardBorder: '#ccc', divider: '#e0e0e0',
  correct: '#d4edda', correctText: '#155724',
  incorrect: '#f8d7da', incorrectText: '#721c24',
  seed: '#666', text: '#111',
  points: '#1a6e1a', pointsNeg: '#b00000',
  connector: '#999',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface TeamInfo { name: string; seed: string; }

function getTeams(matchup: Matchup): { top: TeamInfo; bottom: TeamInfo } {
  return {
    top: { name: matchup.topTeam.name, seed: matchup.topTeam.seed },
    bottom: { name: matchup.bottomTeam.name, seed: matchup.bottomTeam.seed },
  };
}

function teamRowHtml(
  team: TeamInfo, position: 'top' | 'bottom',
  isWinner: boolean, gameCode: string, round: number,
  games: GamesMap,
): string {
  const result = games[gameCode];
  const isTbd = team.name === 'TBD';
  let bg = 'transparent', color = C.text, strike = '', checkmark = '';

  if (result && !isTbd) {
    const actual = position === 'top' ? result['Top Team'] : result['Bottom Team'];
    const winner = result['Winning Team'];
    const bothNull = result['Top Team'] === null && result['Bottom Team'] === null;
    if (!bothNull && round > 0) {
      if (team.name === actual) { bg = C.correct; color = C.correctText; }
      else if (actual !== null) { bg = C.incorrect; color = C.incorrectText; strike = 'text-decoration:line-through;'; }
    }
    if (winner === team.name) checkmark = ' ✓';
  }

  return `
    <div style="display:flex;align-items:center;gap:4px;padding:0 6px;height:26px;background:${bg};">
      <span style="font-size:9px;color:${C.seed};min-width:12px;text-align:right;flex-shrink:0;">${isTbd ? '' : team.seed}</span>
      <span style="font-size:11px;color:${color};font-weight:${isWinner ? 700 : 400};${strike}white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${team.name}${checkmark}</span>
    </div>`;
}

function ptsHtml(matchup: Matchup, games: GamesMap): string {
  if (!matchup.winner) return '';
  const result = games[matchup.gameCode];
  if (!result) return '';
  const w = matchup.winner === 'top' ? matchup.topTeam : matchup.bottomTeam;
  const pts = result['Winning Team'] === w.name ? (result.points as number) ?? 0 : 0;
  return `<div style="height:14px;text-align:right;padding-right:2px;font-size:9px;font-weight:700;color:${pts > 0 ? C.points : C.pointsNeg};">+${pts}</div>`;
}

function cardHtml(matchup: Matchup, top: number, round: number, games: GamesMap): string {
  const { top: t, bottom: b } = getTeams(matchup);
  const pts = ptsHtml(matchup, games);
  return `
    <div style="position:absolute;top:${top}px;left:0;width:${ROUND_W}px;">
      ${pts}
      <div style="width:${ROUND_W}px;height:${CARD_H}px;background:#fff;border:1px solid ${C.cardBorder};border-radius:4px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 1px 2px rgba(0,0,0,0.07);">
        ${teamRowHtml(t, 'top', matchup.winner === 'top', matchup.gameCode, round, games)}
        <div style="height:1px;background:${C.divider};flex-shrink:0;"></div>
        ${teamRowHtml(b, 'bottom', matchup.winner === 'bottom', matchup.gameCode, round, games)}
      </div>
    </div>`;
}

function connectorSvg(fromRound: number, dir: 'ltr' | 'rtl'): string {
  const count = 8 >> fromRound;
  const toRound = fromRound + 1;
  const w = CONNECTOR_W;
  let lines = '';
  for (let i = 0; i < count; i += 2) {
    const y1 = cardTop(fromRound, i) + CARD_H / 2;
    const y2 = cardTop(fromRound, i + 1) + CARD_H / 2;
    const yMid = cardTop(toRound, i / 2) + CARD_H / 2;
    if (dir === 'ltr') {
      lines += `<line x1="0" y1="${y1}" x2="${w/2}" y2="${y1}" stroke="${C.connector}" stroke-width="1.5"/>
                <line x1="0" y1="${y2}" x2="${w/2}" y2="${y2}" stroke="${C.connector}" stroke-width="1.5"/>
                <line x1="${w/2}" y1="${y1}" x2="${w/2}" y2="${y2}" stroke="${C.connector}" stroke-width="1.5"/>
                <line x1="${w/2}" y1="${yMid}" x2="${w}" y2="${yMid}" stroke="${C.connector}" stroke-width="1.5"/>`;
    } else {
      lines += `<line x1="${w}" y1="${y1}" x2="${w/2}" y2="${y1}" stroke="${C.connector}" stroke-width="1.5"/>
                <line x1="${w}" y1="${y2}" x2="${w/2}" y2="${y2}" stroke="${C.connector}" stroke-width="1.5"/>
                <line x1="${w/2}" y1="${y1}" x2="${w/2}" y2="${y2}" stroke="${C.connector}" stroke-width="1.5"/>
                <line x1="${w/2}" y1="${yMid}" x2="0" y2="${yMid}" stroke="${C.connector}" stroke-width="1.5"/>`;
    }
  }
  return `<svg width="${w}" height="${REGION_H}" style="flex-shrink:0;display:block;overflow:visible;">${lines}</svg>`;
}

function roundColHtml(matchups: Matchup[], roundIdx: number, label: string, games: GamesMap): string {
  const cards = matchups.map((m, i) => cardHtml(m, cardTop(roundIdx, i), roundIdx, games)).join('');
  return `
    <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;">
      <div style="font-size:8px;color:${C.seed};margin-bottom:3px;white-space:nowrap;font-weight:600;letter-spacing:0.03em;">${label}</div>
      <div style="position:relative;width:${ROUND_W}px;height:${REGION_H}px;">${cards}</div>
    </div>`;
}

function regionHtml(name: string, matchups: Matchup[], games: GamesMap, dir: 'ltr' | 'rtl'): string {
  const rounds = [matchups.slice(0,8), matchups.slice(8,12), matchups.slice(12,14), matchups.slice(14,15)];
  const cols = ROUND_LABELS.map((label, i) => roundColHtml(rounds[i], i, label, games));

  let children = '';
  const connGap = `<div style="display:flex;align-items:flex-start;padding-top:16px;">`;

  if (dir === 'ltr') {
    cols.forEach((col, i) => {
      children += col;
      if (i < 3) children += connGap + connectorSvg(i, 'ltr') + '</div>';
    });
  } else {
    [...cols].reverse().forEach((col, i) => {
      children += col;
      if (i < 3) children += connGap + connectorSvg(3 - i - 1, 'rtl') + '</div>';
    });
  }

  return `
    <div style="display:flex;flex-direction:column;align-items:${dir === 'ltr' ? 'flex-start' : 'flex-end'};">
      <div style="font-size:10px;font-weight:700;color:${C.headerText};background:${C.header};padding:2px 8px;border-radius:3px;margin-bottom:6px;letter-spacing:0.05em;text-align:center;align-self:stretch;">
        ${name.toUpperCase()}
      </div>
      <div style="display:flex;flex-direction:row;align-items:flex-start;">${children}</div>
    </div>`;
}

function finalCardHtml(matchup: Matchup, games: GamesMap, round: number): string {
  const { top: t, bottom: b } = getTeams(matchup);
  const result = games[matchup.gameCode];
  const winner = result ? result['Winning Team'] as string | null : null;
  const pts = ptsHtml(matchup, games);
  return `
    <div style="width:${ROUND_W}px;">
      <div style="font-size:8px;color:${C.seed};text-align:center;margin-bottom:3px;">${matchup.gameCode}</div>
      ${pts}
      <div style="width:${ROUND_W}px;height:${CARD_H}px;background:#fff;border:1px solid ${C.cardBorder};border-radius:4px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 1px 2px rgba(0,0,0,0.07);">
        ${teamRowHtml(t, 'top', matchup.winner === 'top', matchup.gameCode, round, games)}
        <div style="height:1px;background:${C.divider};"></div>
        ${teamRowHtml(b, 'bottom', matchup.winner === 'bottom', matchup.gameCode, round, games)}
      </div>
    </div>`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function printBracket(matchups: Matchup[], games: GamesMap, bracketName: string, personName: string, totalScore: number) {
  const east    = matchups.slice(0, 15);
  const west    = matchups.slice(15, 30);
  const south   = matchups.slice(30, 45);
  const midwest = matchups.slice(45, 60);
  const ff1 = matchups.find(m => m.gameCode === 'FF1')!;
  const ff2 = matchups.find(m => m.gameCode === 'FF2')!;
  const ch1 = matchups.find(m => m.gameCode === 'CH1')!;

  const chWinner = ch1.winner ? (ch1.winner === 'top' ? ch1.topTeam.name : ch1.bottomTeam.name) : null;

  const centerHtml = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:200px;padding:0 12px;gap:8px;">
      <div style="font-size:12px;font-weight:700;color:${C.header};text-align:center;border-bottom:2px solid ${C.header};padding-bottom:4px;width:100%;">
        ${personName} — ${bracketName}
      </div>
      <div style="font-size:10px;font-weight:700;color:${C.headerText};background:${C.header};padding:2px 8px;border-radius:3px;letter-spacing:0.05em;width:100%;text-align:center;box-sizing:border-box;">
        FINAL FOUR
      </div>
      ${finalCardHtml(ff1, games, 3)}
      ${finalCardHtml(ff2, games, 3)}
      <div style="font-size:10px;font-weight:700;color:${C.headerText};background:${C.header};padding:2px 8px;border-radius:3px;letter-spacing:0.05em;width:100%;text-align:center;box-sizing:border-box;">
        CHAMPIONSHIP
      </div>
      ${finalCardHtml(ch1, games, 4)}
      ${chWinner ? `<div style="text-align:center;font-size:12px;font-weight:700;">🏆 ${chWinner}</div>` : ''}
      <div style="font-size:11px;font-weight:700;color:${C.points};margin-top:4px;">Score: ${totalScore} pts</div>
    </div>`;

  // Full bracket width: 4 regions × (4 rounds × (ROUND_W + CONNECTOR_W)) + center
  // Each region: 4 cols of ROUND_W + 3 connectors of CONNECTOR_W
  const regionW = 4 * ROUND_W + 3 * CONNECTOR_W;
  const totalW = 2 * regionW + 220; // left pair + right pair + center

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${personName} — ${bracketName}</title>
  <style>
    @page { size: 11in 8.5in landscape; margin: 0.25in; }
    body { margin: 0; padding: 0; font-family: system-ui, sans-serif; background: #fff; }
    * { box-sizing: border-box; }
  </style>
</head>
<body>
  <div style="width:${totalW}px;transform-origin:top left;transform:scale(${(10.5 * 96) / totalW});">
    <div style="display:flex;flex-direction:row;align-items:flex-start;gap:0;">
      <div style="display:flex;flex-direction:column;gap:24px;">
        ${regionHtml('East', east, games, 'ltr')}
        ${regionHtml('South', south, games, 'ltr')}
      </div>
      ${centerHtml}
      <div style="display:flex;flex-direction:column;gap:24px;">
        ${regionHtml('West', west, games, 'rtl')}
        ${regionHtml('Midwest', midwest, games, 'rtl')}
      </div>
    </div>
  </div>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (!w) { alert('Allow popups to print.'); return; }
  w.document.write(html);
  w.document.close();
  w.onload = () => { w.print(); };
}
