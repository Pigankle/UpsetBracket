interface Team {
  name: string;
  seed: string;
  score?: string;
}

interface Matchup {
  topTeam: Team;
  bottomTeam: Team;
  winner?: "top" | "bottom";
  nextMatchupIndex?: number;
  nextPosition?: "top" | "bottom";
  gameCode: string;
}

interface TournamentTeam {
  name: string;
  seed: string | number;
}

interface TournamentGame {
  game_code: string;
  top: TournamentTeam | string;
  bottom: TournamentTeam | string;
}

interface TournamentData {
  regions: {
    [key: string]: {
      rounds: {
        "Round of 64": TournamentGame[];
        "Round of 32": TournamentGame[];
        "Sweet 16": TournamentGame[];
        "Elite Eight": TournamentGame[];
      };
    };
  };
  final_four: {
    games: TournamentGame[];
  };
  championship: TournamentGame;
}

// Mapping of game codes to their next game and position
const gameFlowMap: {
  [key: string]: { nextGame: string; position: "top" | "bottom" };
} = {
  // East Region
  E1: { nextGame: "E9", position: "top" },
  E2: { nextGame: "E9", position: "bottom" },
  E3: { nextGame: "E10", position: "top" },
  E4: { nextGame: "E10", position: "bottom" },
  E5: { nextGame: "E11", position: "top" },
  E6: { nextGame: "E11", position: "bottom" },
  E7: { nextGame: "E12", position: "top" },
  E8: { nextGame: "E12", position: "bottom" },
  E9: { nextGame: "E13", position: "top" },
  E10: { nextGame: "E13", position: "bottom" },
  E11: { nextGame: "E14", position: "top" },
  E12: { nextGame: "E14", position: "bottom" },
  E13: { nextGame: "E15", position: "top" },
  E14: { nextGame: "E15", position: "bottom" },
  E15: { nextGame: "FF1", position: "top" },

  // West Region
  W1: { nextGame: "W9", position: "top" },
  W2: { nextGame: "W9", position: "bottom" },
  W3: { nextGame: "W10", position: "top" },
  W4: { nextGame: "W10", position: "bottom" },
  W5: { nextGame: "W11", position: "top" },
  W6: { nextGame: "W11", position: "bottom" },
  W7: { nextGame: "W12", position: "top" },
  W8: { nextGame: "W12", position: "bottom" },
  W9: { nextGame: "W13", position: "top" },
  W10: { nextGame: "W13", position: "bottom" },
  W11: { nextGame: "W14", position: "top" },
  W12: { nextGame: "W14", position: "bottom" },
  W13: { nextGame: "W15", position: "top" },
  W14: { nextGame: "W15", position: "bottom" },
  W15: { nextGame: "FF2", position: "bottom" },

  // South Region
  S1: { nextGame: "S9", position: "top" },
  S2: { nextGame: "S9", position: "bottom" },
  S3: { nextGame: "S10", position: "top" },
  S4: { nextGame: "S10", position: "bottom" },
  S5: { nextGame: "S11", position: "top" },
  S6: { nextGame: "S11", position: "bottom" },
  S7: { nextGame: "S12", position: "top" },
  S8: { nextGame: "S12", position: "bottom" },
  S9: { nextGame: "S13", position: "top" },
  S10: { nextGame: "S13", position: "bottom" },
  S11: { nextGame: "S14", position: "top" },
  S12: { nextGame: "S14", position: "bottom" },
  S13: { nextGame: "S15", position: "top" },
  S14: { nextGame: "S15", position: "bottom" },
  S15: { nextGame: "FF2", position: "top" },

  // Midwest Region
  M1: { nextGame: "M9", position: "top" },
  M2: { nextGame: "M9", position: "bottom" },
  M3: { nextGame: "M10", position: "top" },
  M4: { nextGame: "M10", position: "bottom" },
  M5: { nextGame: "M11", position: "top" },
  M6: { nextGame: "M11", position: "bottom" },
  M7: { nextGame: "M12", position: "top" },
  M8: { nextGame: "M12", position: "bottom" },
  M9: { nextGame: "M13", position: "top" },
  M10: { nextGame: "M13", position: "bottom" },
  M11: { nextGame: "M14", position: "top" },
  M12: { nextGame: "M14", position: "bottom" },
  M13: { nextGame: "M15", position: "top" },
  M14: { nextGame: "M15", position: "bottom" },
  M15: { nextGame: "FF1", position: "bottom" },

  // Final Four
  FF1: { nextGame: "CH1", position: "top" },
  FF2: { nextGame: "CH1", position: "bottom" },
};

// Map game codes to their indices in the matchups array
export const gameCodeToIndex: { [key: string]: number } = {
  // East Region (0-14)
  E1: 0,
  E2: 1,
  E3: 2,
  E4: 3,
  E5: 4,
  E6: 5,
  E7: 6,
  E8: 7,
  E9: 8,
  E10: 9,
  E11: 10,
  E12: 11,
  E13: 12,
  E14: 13,
  E15: 14,

  // West Region (15-29)
  W1: 15,
  W2: 16,
  W3: 17,
  W4: 18,
  W5: 19,
  W6: 20,
  W7: 21,
  W8: 22,
  W9: 23,
  W10: 24,
  W11: 25,
  W12: 26,
  W13: 27,
  W14: 28,
  W15: 29,

  // South Region (30-44)
  S1: 30,
  S2: 31,
  S3: 32,
  S4: 33,
  S5: 34,
  S6: 35,
  S7: 36,
  S8: 37,
  S9: 38,
  S10: 39,
  S11: 40,
  S12: 41,
  S13: 42,
  S14: 43,
  S15: 44,

  // Midwest Region (45-59)
  M1: 45,
  M2: 46,
  M3: 47,
  M4: 48,
  M5: 49,
  M6: 50,
  M7: 51,
  M8: 52,
  M9: 53,
  M10: 54,
  M11: 55,
  M12: 56,
  M13: 57,
  M14: 58,
  M15: 59,

  // Final Four and Championship (60-62)
  FF1: 60,
  FF2: 61,
  CH1: 62,
};

// Map game codes to seed pairs
const seedMap: { [key: string]: [string, string] } = {
  // East Region
  E1: ["1", "16"],
  E2: ["8", "9"],
  E3: ["5", "12"],
  E4: ["4", "13"],
  E5: ["6", "11"],
  E6: ["3", "14"],
  E7: ["7", "10"],
  E8: ["2", "15"],

  // West Region
  W1: ["1", "16"],
  W2: ["8", "9"],
  W3: ["5", "12"],
  W4: ["4", "13"],
  W5: ["6", "11"],
  W6: ["3", "14"],
  W7: ["7", "10"],
  W8: ["2", "15"],

  // South Region
  S1: ["1", "16"],
  S2: ["8", "9"],
  S3: ["5", "12"],
  S4: ["4", "13"],
  S5: ["6", "11"],
  S6: ["3", "14"],
  S7: ["7", "10"],
  S8: ["2", "15"],

  // Midwest Region
  M1: ["1", "16"],
  M2: ["8", "9"],
  M3: ["5", "12"],
  M4: ["4", "13"],
  M5: ["6", "11"],
  M6: ["3", "14"],
  M7: ["7", "10"],
  M8: ["2", "15"],
};

export function createInitialBracket(
  tournamentData: TournamentData
): Matchup[] {
  const matchups: Matchup[] = new Array(63).fill(null).map(() => ({
    topTeam: { name: "TBD", seed: "-" },
    bottomTeam: { name: "TBD", seed: "-" },
    gameCode: "",
  }));

  // Helper function to set next matchup information
  const setNextMatchup = (gameCode: string, matchupIndex: number) => {
    const nextInfo = gameFlowMap[gameCode];
    if (nextInfo) {
      const nextMatchupIndex = gameCodeToIndex[nextInfo.nextGame];
      matchups[matchupIndex].nextMatchupIndex = nextMatchupIndex;
      matchups[matchupIndex].nextPosition = nextInfo.position;
    }
  };

  // Process each region
  Object.entries(tournamentData.regions).forEach(([regionName, region]) => {
    // Process Round of 64
    region.rounds["Round of 64"].forEach((game) => {
      const matchupIndex = gameCodeToIndex[game.game_code];
      const top = game.top as TournamentTeam;
      const bottom = game.bottom as TournamentTeam;
      matchups[matchupIndex] = {
        topTeam: { name: top.name, seed: top.seed.toString() },
        bottomTeam: { name: bottom.name, seed: bottom.seed.toString() },
        gameCode: game.game_code,
      };
      setNextMatchup(game.game_code, matchupIndex);
    });

    // Set up empty matchups for later rounds
    (["Round of 32", "Sweet 16", "Elite Eight"] as const).forEach((round) => {
      region.rounds[round].forEach((game) => {
        const matchupIndex = gameCodeToIndex[game.game_code];
        matchups[matchupIndex] = {
          topTeam: { name: "TBD", seed: "-" },
          bottomTeam: { name: "TBD", seed: "-" },
          gameCode: game.game_code,
        };
        setNextMatchup(game.game_code, matchupIndex);
      });
    });
  });

  // Process Final Four
  tournamentData.final_four.games.forEach((game) => {
    const matchupIndex = gameCodeToIndex[game.game_code];
    matchups[matchupIndex] = {
      topTeam: { name: "TBD", seed: "-" },
      bottomTeam: { name: "TBD", seed: "-" },
      gameCode: game.game_code,
    };
    setNextMatchup(game.game_code, matchupIndex);
  });

  // Process Championship
  const championshipIndex =
    gameCodeToIndex[tournamentData.championship.game_code];
  matchups[championshipIndex] = {
    topTeam: { name: "TBD", seed: "-" },
    bottomTeam: { name: "TBD", seed: "-" },
    gameCode: tournamentData.championship.game_code,
  };

  return matchups;
}

function getNextMatchupIndex(index: number): number | undefined {
  // For games 1-8, they feed into game 9
  // For games 9-12, they feed into game 13
  // For games 13-14, they feed into game 15
  // For game 15, it feeds into the Final Four
  if (index >= 0 && index < 8) return 8;
  if (index >= 8 && index < 12) return 12;
  if (index >= 12 && index < 14) return 14;
  if (index === 14) return 15;
  return undefined;
}

function getNextPosition(index: number): "top" | "bottom" | undefined {
  // For games 1-8, they feed into the top or bottom of game 9
  // For games 9-12, they feed into the top or bottom of game 13
  // For games 13-14, they feed into the top or bottom of game 15
  // For game 15, it feeds into the Final Four
  if (index >= 0 && index < 8) return index % 2 === 0 ? "top" : "bottom";
  if (index >= 8 && index < 12) return index % 2 === 0 ? "top" : "bottom";
  if (index >= 12 && index < 14) return index % 2 === 0 ? "top" : "bottom";
  if (index === 14) return "top";
  return undefined;
}

export function transformBracketData(data: TournamentGame[]): Matchup[] {
  return data.map((game, index) => {
    const top = game.top as TournamentTeam;
    const bottom = game.bottom as TournamentTeam;

    return {
      gameCode: game.game_code,
      topTeam: { name: top.name, seed: top.seed.toString() },
      bottomTeam: { name: bottom.name, seed: bottom.seed.toString() },
      nextMatchupIndex: getNextMatchupIndex(index),
      nextPosition: getNextPosition(index),
    };
  });
}

export type { Team, Matchup };
