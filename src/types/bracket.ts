export interface Team {
  name: string;
  seed?: string;
}

export interface Matchup {
  gameCode: string;
  topTeam: Team;
  bottomTeam: Team;
  winner?: "top" | "bottom";
  nextMatchupIndex?: number;
  nextPosition?: "top" | "bottom";
}

export interface Game {
  gameID: string;
  away: Team;
  home: Team;
  finalMessage: string;
  bracketRound: string;
  title: string;
  url: string;
  network: string;
  liveVideoEnabled: boolean;
  startTime: string;
  startTimeEpoch: string;
  bracketId: string;
  gameState: string;
  startDate: string;
  currentPeriod: string;
  videoState: string;
  bracketRegion: string;
  contestClock: string;
  contestName: string;
}

export interface BracketData {
  inputMD5Sum: string;
  instanceId: string;
  updated_at: string;
  games: Array<{ game: Game }>;
  hideRank: boolean;
}

export interface RoundScores {
  round1: number;
  round2: number;
  round3: number;
  round4: number;
  round5: number;
  round6: number;
}

export interface BracketPick {
  gameId: string;
  winner: Team;
}

export interface PlayerBracket {
  playerName: string;
  picks: BracketPick[];
  roundScores: RoundScores;
  totalScore: number;
}

export const ROUND_MULTIPLIERS = {
  round1: 2,
  round2: 3,
  round3: 5,
  round4: 8,
  round5: 13,
  round6: 21,
};
