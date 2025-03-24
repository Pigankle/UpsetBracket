import {
  Game,
  Team,
  RoundScores,
  BracketPick,
  ROUND_MULTIPLIERS,
} from "../types/bracket";

export const getRoundNumber = (roundName: string): number => {
  const roundMap: { [key: string]: number } = {
    "First Round": 1,
    "Second Round": 2,
    "Sweet 16": 3,
    "Elite 8": 4,
    "Final Four": 5,
    Championship: 6,
  };
  return roundMap[roundName] || 0;
};

export const calculateGameScore = (game: Game, pick: Team): number => {
  const roundNumber = getRoundNumber(game.bracketRound);
  if (!roundNumber) return 0;

  const roundMultiplier =
    ROUND_MULTIPLIERS[`round${roundNumber}` as keyof typeof ROUND_MULTIPLIERS];

  // If the picked team won, calculate upset bonus
  if (pick.winner) {
    const otherTeam = pick === game.home ? game.away : game.home;
    const pickSeed = parseInt(pick.seed) || 0;
    const otherSeed = parseInt(otherTeam.seed) || 0;

    // If it's an upset (lower seed won)
    if (pickSeed > otherSeed) {
      const seedDifference = pickSeed - otherSeed;
      return roundMultiplier * seedDifference;
    }

    // If favorite won, just return round multiplier
    return roundMultiplier;
  }

  return 0;
};

export const calculateRoundScores = (
  games: Game[],
  picks: BracketPick[]
): RoundScores => {
  const roundScores: RoundScores = {
    round1: 0,
    round2: 0,
    round3: 0,
    round4: 0,
    round5: 0,
    round6: 0,
  };

  picks.forEach((pick) => {
    const game = games.find((g) => g.gameID === pick.gameId);
    if (game) {
      const roundNumber = getRoundNumber(game.bracketRound);
      if (roundNumber) {
        const score = calculateGameScore(game, pick.winner);
        roundScores[`round${roundNumber}` as keyof RoundScores] += score;
      }
    }
  });

  return roundScores;
};

export const calculateTotalScore = (roundScores: RoundScores): number => {
  return Object.values(roundScores).reduce((sum, score) => sum + score, 0);
};

export function calculateScore(picks: string[], games: Game[]): number {
  let score = 0;
  picks.forEach((pick, index) => {
    const game = games[index];
    if (!game) return;

    const otherTeam = pick === game.top ? game.bottom : game.top;
    if (game.winner === pick) {
      score += 1;
    }
  });
  return score;
}
