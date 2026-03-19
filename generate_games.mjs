import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bracket = JSON.parse(fs.readFileSync(path.join(__dirname, 'src', 'data', 'ncaa_2025_bracket.json'), 'utf8'));

const BASE_POINTS = { 64: 2, 32: 3, 16: 5, 8: 8, 4: 15, 2: 21 };

// Region order matching existing files: South, West, East, Midwest
const REGION_ORDER = ['South', 'West', 'East', 'Midwest'];
const ROUND_NAMES = ['Round of 64', 'Round of 32', 'Sweet 16', 'Elite Eight'];
const ROUND_NUMS = { 'Round of 64': 64, 'Round of 32': 32, 'Sweet 16': 16, 'Elite Eight': 8 };

// GameID ranges per round (matching existing convention)
const GAME_ID_BASES = { 64: 201, 32: 301, 16: 401, 8: 501, 4: 601, 2: 701 };

const CHAR6 = {
  "Duke": "DUKE", "Siena": "SIENA", "Ohio State": "OHIOST", "TCU": "TCU",
  "St. John's": "STJOHN", "Northern Iowa": "N IOWA", "Kansas": "KANSAS",
  "Cal Baptist": "CALBAP", "Louisville": "LOUIS", "South Florida": "S FLA",
  "Michigan State": "MICHST", "North Dakota St": "ND ST", "UCLA": "UCLA",
  "UCF": "UCF", "UConn": "UCONN", "Furman": "FURMAN",
  "Arizona": "ARIZ", "LIU": "LIU", "Villanova": "NOVA", "Utah State": "UT ST",
  "Wisconsin": "WISC", "High Point": "HIGHPT", "Arkansas": "ARK",
  "Hawaii": "HAWAII", "BYU": "BYU", "Texas": "TEXAS",
  "Gonzaga": "GONZ", "Kennesaw State": "KENNST", "Miami (FL)": "MIA FL",
  "Missouri": "MIZZOU", "Purdue": "PURDUE", "Queens": "QUEENS",
  "Florida": "FLA", "Prairie View A&M": "PVAMU", "Clemson": "CLEM",
  "Iowa": "IOWA", "Vanderbilt": "VANDY", "McNeese": "MCNEES",
  "Nebraska": "NEB", "Troy": "TROY", "North Carolina": "UNC",
  "VCU": "VCU", "Illinois": "ILL", "Penn": "PENN",
  "Saint Mary's": "STMARY", "Texas A&M": "TX A&M", "Houston": "HOU",
  "Idaho": "IDAHO", "Michigan": "MICH", "Howard": "HOWARD",
  "Georgia": "UGA", "Saint Louis": "STLOUI", "Texas Tech": "TXTECH",
  "Akron": "AKRON", "Alabama": "ALA", "Hofstra": "HOFSTR",
  "Tennessee": "TENN", "Miami (OH)": "MIAOH", "Virginia": "UVA",
  "Wright State": "WRTST", "Kentucky": "UK", "Santa Clara": "STCLRA",
  "Iowa State": "IOWAST", "Tennessee State": "TNST",
  "TBD": "TBD"
};

function getChar6(name) {
  return CHAR6[name] || name.substring(0, 6).toUpperCase();
}

function computePoints(roundNum, winnerSeed, loserSeed) {
  const base = BASE_POINTS[roundNum];
  if (winnerSeed > loserSeed) {
    return base * (winnerSeed - loserSeed);
  }
  return base;
}

function makeEntry(gameId, roundNum, gameNum, topName, topSeed, bottomName, bottomSeed, region, status, winnerName, loserName, winnerSeed, loserSeed, topScore, bottomScore) {
  const winScore = winnerName === topName ? topScore : bottomScore;
  const loseScore = winnerName === topName ? bottomScore : topScore;
  const pts = (winnerName && winnerSeed != null && loserSeed != null) ? computePoints(roundNum, winnerSeed, loserSeed) : BASE_POINTS[roundNum];

  return {
    GameID: gameId,
    Round: roundNum,
    "Game Number": gameNum,
    "Top Team": topName,
    "Bottom Team": bottomName,
    "Top Team Score": topScore,
    "Bottom Team Score": bottomScore,
    "Winning Team": winnerName || "",
    "Losing Team": loserName || "",
    "Winning Team Seed": winnerSeed,
    "Losing Team Seed": loserSeed,
    "Winning Team Score": winScore,
    "Losing Team Score": loseScore,
    "Game Status": status,
    "GameID.1": gameId,
    "Top Team Seed": topSeed,
    "Bottom Team Seed": bottomSeed,
    "Game Region": region,
    "Top Team Char6": getChar6(topName),
    "Bottom Team Char6": getChar6(bottomName),
    "Winning Team Char6": winnerName ? getChar6(winnerName) : "",
    "Losing Team Char6": loserName ? getChar6(loserName) : "",
    points: pts
  };
}

// Collect all games from the bracket in order: regions by round, then FF, then CH
function getAllGames() {
  const allGames = []; // { gameCode, roundNum, topTeam, bottomTeam, region }

  // Region games by round
  for (const roundName of ROUND_NAMES) {
    const roundNum = ROUND_NUMS[roundName];
    for (const region of REGION_ORDER) {
      const games = bracket.regions[region].rounds[roundName];
      if (!games) continue;
      for (const game of games) {
        allGames.push({
          gameCode: game.game_code,
          roundNum,
          top: game.top,
          bottom: game.bottom,
          region
        });
      }
    }
  }

  // Final Four
  for (const game of bracket.final_four.games) {
    allGames.push({
      gameCode: game.game_code,
      roundNum: 4,
      top: game.top,
      bottom: game.bottom,
      region: 'Final Four'
    });
  }

  // Championship
  allGames.push({
    gameCode: bracket.championship.game_code,
    roundNum: 2,
    top: bracket.championship.top,
    bottom: bracket.championship.bottom,
    region: 'Championship'
  });

  return allGames;
}

// ---- Generate march_madness_games.json (no games played) ----
function generateScheduled() {
  const result = {};
  const allGames = getAllGames();
  let gameIdCounter = {};
  let gameNumCounter = {};

  for (const g of allGames) {
    if (!gameIdCounter[g.roundNum]) {
      gameIdCounter[g.roundNum] = GAME_ID_BASES[g.roundNum];
      gameNumCounter[g.roundNum] = 1;
    }
    const gameId = gameIdCounter[g.roundNum]++;
    const gameNum = gameNumCounter[g.roundNum]++;

    // For Round of 64, we have actual teams; for later rounds, TBD
    let topName, topSeed, bottomName, bottomSeed;
    if (typeof g.top === 'object' && g.top !== null) {
      topName = g.top.name;
      topSeed = g.top.seed;
    } else {
      topName = "TBD";
      topSeed = null;
    }
    if (typeof g.bottom === 'object' && g.bottom !== null) {
      bottomName = g.bottom.name;
      bottomSeed = g.bottom.seed;
    } else {
      bottomName = "TBD";
      bottomSeed = null;
    }

    result[g.gameCode] = makeEntry(
      gameId, g.roundNum, gameNum,
      topName, topSeed, bottomName, bottomSeed,
      g.region, "Scheduled",
      "", "", null, null, 0, 0
    );
    // Override points for scheduled games
    result[g.gameCode].points = BASE_POINTS[g.roundNum];
  }

  return result;
}

// ---- Generate TEST_DATA (simulated tournament) ----
function generateTestData() {
  const result = {};
  const winners = {}; // "Winner of XX" -> { name, seed }
  const allGames = getAllGames();
  let gameIdCounter = {};
  let gameNumCounter = {};

  for (const g of allGames) {
    if (!gameIdCounter[g.roundNum]) {
      gameIdCounter[g.roundNum] = GAME_ID_BASES[g.roundNum];
      gameNumCounter[g.roundNum] = 1;
    }
    const gameId = gameIdCounter[g.roundNum]++;
    const gameNum = gameNumCounter[g.roundNum]++;

    // Resolve teams
    let topTeam, bottomTeam;
    if (typeof g.top === 'object' && g.top !== null) {
      topTeam = { name: g.top.name, seed: g.top.seed };
    } else {
      // It's a string like "Winner of E1"
      topTeam = winners[g.top] || { name: "TBD", seed: 8 };
    }
    if (typeof g.bottom === 'object' && g.bottom !== null) {
      bottomTeam = { name: g.bottom.name, seed: g.bottom.seed };
    } else {
      bottomTeam = winners[g.bottom] || { name: "TBD", seed: 8 };
    }

    // Determine winner: higher seed (lower number) wins 75% of the time
    let winner, loser;
    const topIsHigherSeed = topTeam.seed < bottomTeam.seed;
    const equalSeeds = topTeam.seed === bottomTeam.seed;

    let higherSeedWins;
    if (equalSeeds) {
      higherSeedWins = Math.random() < 0.5;
    } else {
      higherSeedWins = Math.random() < 0.75;
    }

    if (topIsHigherSeed || equalSeeds) {
      winner = higherSeedWins ? topTeam : bottomTeam;
      loser = higherSeedWins ? bottomTeam : topTeam;
    } else {
      winner = higherSeedWins ? bottomTeam : topTeam;
      loser = higherSeedWins ? topTeam : bottomTeam;
    }

    // Generate plausible scores
    const winScore = 65 + Math.floor(Math.random() * 30);
    const loseScore = Math.max(40, winScore - 3 - Math.floor(Math.random() * 25));
    const topScore = winner === topTeam ? winScore : loseScore;
    const bottomScore = winner === bottomTeam ? winScore : loseScore;

    // Store winner for future rounds
    winners[`Winner of ${g.gameCode}`] = { name: winner.name, seed: winner.seed };

    result[g.gameCode] = makeEntry(
      gameId, g.roundNum, gameNum,
      topTeam.name, topTeam.seed, bottomTeam.name, bottomTeam.seed,
      g.region, "Final",
      winner.name, loser.name,
      winner.seed, loser.seed,
      topScore, bottomScore
    );
  }

  return result;
}

// Generate and write both files
const scheduledGames = generateScheduled();
const testGames = generateTestData();

const outDir = path.join(__dirname, 'src', 'data');
fs.writeFileSync(path.join(outDir, 'march_madness_games.json'), JSON.stringify(scheduledGames, null, 2) + '\n');
fs.writeFileSync(path.join(outDir, 'march_madness_games_TEST_DATA.json'), JSON.stringify(testGames, null, 2) + '\n');

console.log('Generated march_madness_games.json');
console.log('Generated march_madness_games_TEST_DATA.json');

// Print test data summary
console.log('\n--- TEST DATA SUMMARY ---');
const ff1Winner = Object.values(testGames).find(g => g.GameID === 602);
const ff2Winner = Object.values(testGames).find(g => g.GameID === 601);
const champ = Object.values(testGames).find(g => g.GameID === 701);
if (ff1Winner) console.log(`FF1: ${ff1Winner["Winning Team"]} beat ${ff1Winner["Losing Team"]}`);
if (ff2Winner) console.log(`FF2: ${ff2Winner["Winning Team"]} beat ${ff2Winner["Losing Team"]}`);
if (champ) console.log(`Champion: ${champ["Winning Team"]}`);

// Count upsets
let upsets = 0;
for (const [code, game] of Object.entries(testGames)) {
  if (game["Winning Team Seed"] > game["Losing Team Seed"]) upsets++;
}
console.log(`Total upsets: ${upsets} / ${Object.keys(testGames).length} games`);
