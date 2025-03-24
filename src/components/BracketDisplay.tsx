import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import type { Team, Matchup } from "../utils/bracketTransform";
import { gameCodeToIndex } from "../utils/bracketTransform";
import marchMadnessGames from "../data/march_madness_games.json";
import bracketStructure from "../data/ncaa_2025_bracket.json";

type Region = "East" | "West" | "South" | "Midwest";
type Round = "Round of 64" | "Round of 32" | "Sweet 16" | "Elite Eight";

interface GameResult {
  game_code: string;
  winner: string;
  loser: string;
}

interface RegionResults {
  rounds: {
    [key in Round]: GameResult[];
  };
}

interface FinalFourGame {
  game_code: string;
  winner: string;
}

interface ChampionshipGame {
  game_code: string;
  winner: string;
}

interface Results {
  regions: {
    [key in Region]: RegionResults;
  };
  final_four: {
    games: FinalFourGame[];
  };
  championship: ChampionshipGame;
}

interface MarchMadnessGame {
  GameID: number;
  Round: number;
  "Game Number": number;
  "Top Team": string | number;
  "Bottom Team": string | number;
  "Top Team Score": number;
  "Bottom Team Score": number;
  "Winning Team": string | number;
  "Losing Team": string | number;
  "Winning Team Seed": number | null;
  "Losing Team Seed": number | null;
  "Winning Team Score": number;
  "Losing Team Score": number;
  "Game Status": string;
  "Top Team Seed": number;
  "Bottom Team Seed": number;
  "Game Region": string;
  "Top Team Char6": string;
  "Bottom Team Char6": string;
  "Winning Team Char6": string;
  "Losing Team Char6": string;
  points: number;
}

const typedMarchMadnessGames = marchMadnessGames as unknown as Record<
  string,
  MarchMadnessGame
>;

interface BracketTeam {
  seed: number;
  name: string;
}

interface BracketGame {
  game_code: string;
  top: BracketTeam | string;
  bottom: BracketTeam | string;
}

interface BracketStructure {
  regions: {
    [key in Region]: {
      rounds: {
        [key in Round]: BracketGame[];
      };
    };
  };
  final_four: {
    games: BracketGame[];
  };
  championship: BracketGame;
}

const typedBracketStructure = bracketStructure as BracketStructure;

interface TeamProps {
  team: Team;
  isWinner?: boolean;
  onClick?: () => void;
  isStrikethrough?: boolean;
  matchup?: Matchup;
}

const TeamSlot = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: "4px 8px",
  width: "200px",
  height: "32px",
  border: `1px solid ${theme.palette.divider}`,
  cursor: "pointer",
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

const MatchupContainer = styled(Box)({
  display: "flex",
  flexDirection: "column",
  position: "relative",
  margin: "4px 0",
});

interface GameCodeLabelProps {
  showGameCode: boolean;
}

const GameCodeLabel = styled(Typography, {
  shouldForwardProp: (prop) => prop !== "showGameCode",
})<GameCodeLabelProps>(({ theme, showGameCode }) => ({
  position: "absolute",
  left: "-24px",
  top: "50%",
  transform: "translateY(-50%)",
  fontSize: "0.75rem",
  color: showGameCode ? theme.palette.text.secondary : "white",
  fontWeight: "bold",
}));

const MatchupConnector = styled(Box)({
  position: "absolute",
  right: "-16px",
  width: "16px",
  borderTop: "2px solid #ccc",
});

const Round = styled(Box)({
  display: "flex",
  flexDirection: "column",
  minWidth: "220px",
  margin: "0 8px",
  justifyContent: "space-around",
});

const Region = styled(Box)({
  display: "flex",
  flexDirection: "column",
  flex: 1,
});

const FirstRoundMatchup = styled(MatchupContainer)({
  marginBottom: "32px",
  "&:last-child": {
    marginBottom: 0,
  },
});

const PointsLabel = styled(Typography)(({ theme }) => ({
  position: "absolute",
  right: "-40px",
  top: "50%",
  transform: "translateY(-50%)",
  fontSize: "0.75rem",
  color: theme.palette.success.main,
  fontWeight: "bold",
}));

const regionCodeToName: Record<string, Region> = {
  E: "East",
  W: "West",
  S: "South",
  M: "Midwest",
};

function Team({
  team,
  isWinner,
  onClick,
  isStrikethrough,
  gameCode,
  round,
  matchup,
  position,
}: TeamProps & {
  gameCode: string;
  round: number;
  position: "top" | "bottom";
}) {
  const gameResult = typedMarchMadnessGames[gameCode];
  if (!gameResult) {
    console.log(`No game result found for ${gameCode}`);
    return null;
  }

  const actualTopTeam = gameResult["Top Team"] as string;
  const actualBottomTeam = gameResult["Bottom Team"] as string;
  const actualTopSeed = gameResult["Top Team Seed"] as number;
  const actualBottomSeed = gameResult["Bottom Team Seed"] as number;

  // Skip highlighting if both teams are null (future games)
  if (actualTopTeam === null && actualBottomTeam === null) {
    return (
      <TeamSlot
        onClick={onClick}
        sx={{
          bgcolor: "background.paper",
          position: "relative",
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: "text.primary",
          }}
        >
          {team.seed} {team.name}
        </Typography>
      </TeamSlot>
    );
  }

  // For Round of 64 (round 0), just show the team without any highlighting
  if (round === 0) {
    return (
      <TeamSlot
        onClick={onClick}
        sx={{
          bgcolor: "background.paper",
          position: "relative",
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: "text.primary",
            fontWeight: isWinner ? "bold" : "normal",
          }}
        >
          {team.seed} {team.name}
        </Typography>
      </TeamSlot>
    );
  }

  // For Round of 32 and beyond, compare picked teams with actual teams
  const isActualTeam =
    position === "top"
      ? actualTopTeam === team.name
      : actualBottomTeam === team.name;

  // A team is incorrect if it's picked but doesn't match the actual team in that position
  const isIncorrect =
    team.name !== (position === "top" ? actualTopTeam : actualBottomTeam);

  const correctTeam = position === "top" ? actualTopTeam : actualBottomTeam;
  const correctSeed = position === "top" ? actualTopSeed : actualBottomSeed;

  // Debug log to check values
  console.log(`Game ${gameCode}, Round ${round}:`, {
    team: team.name,
    position,
    actualTopTeam,
    actualBottomTeam,
    isActualTeam,
    isIncorrect,
    correctTeam,
    correctSeed,
    gameResult,
  });

  return (
    <Box sx={{ position: "relative" }}>
      {isIncorrect && (
        <Typography
          variant="body2"
          sx={{
            position: "absolute",
            left: 0,
            right: 0,
            [position === "top" ? "bottom" : "top"]: "100%",
            color: "error.main",
            mb: position === "top" ? 0.5 : 0,
            mt: position === "bottom" ? 0.5 : 0,
            textAlign: "center",
            fontSize: "0.75rem",
          }}
        >
          {correctSeed} {correctTeam}
        </Typography>
      )}
      <TeamSlot
        onClick={onClick}
        sx={{
          bgcolor: isActualTeam
            ? "rgba(76, 175, 80, 0.15)"
            : isIncorrect
            ? "rgba(244, 67, 54, 0.15)"
            : "background.paper",
          textDecoration: isIncorrect ? "line-through" : "none",
          position: "relative",
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: isIncorrect ? "error.main" : "text.primary",
            fontWeight: isWinner ? "bold" : "normal",
          }}
        >
          {team.seed} {team.name}
        </Typography>
      </TeamSlot>
    </Box>
  );
}

interface BracketDisplayProps {
  initialMatchups: Matchup[];
  onUpdateBracket: (matchups: Matchup[]) => void;
  bracketName: string;
  onUpdateBracketName: (name: string) => void;
  totalScore: number;
}

export default function BracketDisplay({
  initialMatchups,
  onUpdateBracket,
  bracketName,
  onUpdateBracketName,
  totalScore,
}: BracketDisplayProps) {
  const [matchups, setMatchups] = useState<Matchup[]>(initialMatchups);
  const [showGameCode, setShowGameCode] = useState(false);

  useEffect(() => {
    setMatchups(initialMatchups);
  }, [initialMatchups]);

  const handleTeamClick = (gameCode: string, position: "top" | "bottom") => {
    const matchupIndex = gameCodeToIndex[gameCode];
    if (matchupIndex === undefined) return;

    const newMatchups = [...matchups];
    const currentMatchup = newMatchups[matchupIndex];
    const selectedTeam =
      position === "top" ? currentMatchup.topTeam : currentMatchup.bottomTeam;

    // Only allow clicking if the selected team is not "TBD"
    if (selectedTeam.name === "TBD") {
      return;
    }

    // Update current matchup
    currentMatchup.winner = position;

    // Find all subsequent matchups that need to be cleared
    let currentIndex = matchupIndex;
    while (newMatchups[currentIndex].nextMatchupIndex !== undefined) {
      const nextIndex = newMatchups[currentIndex].nextMatchupIndex;
      if (nextIndex === undefined) break;

      const nextMatchup = newMatchups[nextIndex];

      // Clear the winner
      nextMatchup.winner = undefined;

      // If this is the first next matchup, update the team
      if (currentIndex === matchupIndex) {
        if (newMatchups[currentIndex].nextPosition === "top") {
          nextMatchup.topTeam = selectedTeam;
        } else {
          nextMatchup.bottomTeam = selectedTeam;
        }
      } else {
        // For all subsequent matchups, set both teams to TBD
        nextMatchup.topTeam = { name: "TBD", seed: "0" };
        nextMatchup.bottomTeam = { name: "TBD", seed: "0" };
      }

      currentIndex = nextIndex;
    }

    setMatchups(newMatchups);
    onUpdateBracket(newMatchups);
  };

  const getRegionMatchups = (start: number, count: number) => {
    return matchups.slice(start, start + count);
  };

  const renderMatchup = (
    matchup: Matchup,
    index: number,
    isFirstRound: boolean = false,
    round: number = 0
  ) => {
    const topTeamWon = matchup.winner === "top";
    const bottomTeamWon = matchup.winner === "bottom";
    const MatchupWrapper = isFirstRound ? FirstRoundMatchup : MatchupContainer;

    // Calculate points for correct picks
    let points = 0;
    if (matchup.winner) {
      const winner =
        matchup.winner === "top" ? matchup.topTeam : matchup.bottomTeam;
      const loser =
        matchup.winner === "top" ? matchup.bottomTeam : matchup.topTeam;

      // Get the game result from march_madness_games.json
      const gameResult = typedMarchMadnessGames[matchup.gameCode];
      if (gameResult && gameResult["Winning Team"] === winner.name) {
        points = gameResult.points;
      }
    }

    // Debug log to check round numbers
    console.log(`Rendering matchup ${matchup.gameCode} in round ${round}`);

    return (
      <MatchupWrapper key={matchup.gameCode}>
        <GameCodeLabel showGameCode={showGameCode}>
          {matchup.gameCode}
        </GameCodeLabel>
        <Team
          team={matchup.topTeam}
          isWinner={topTeamWon}
          isStrikethrough={bottomTeamWon}
          onClick={() => handleTeamClick(matchup.gameCode, "top")}
          gameCode={matchup.gameCode}
          round={round}
          matchup={matchup}
          position="top"
        />
        <Team
          team={matchup.bottomTeam}
          isWinner={bottomTeamWon}
          isStrikethrough={topTeamWon}
          onClick={() => handleTeamClick(matchup.gameCode, "bottom")}
          gameCode={matchup.gameCode}
          round={round}
          matchup={matchup}
          position="bottom"
        />
        {matchup.nextMatchupIndex !== undefined && (
          <MatchupConnector
            sx={{
              top: matchup.nextPosition === "top" ? "50%" : undefined,
              bottom: matchup.nextPosition === "bottom" ? "50%" : undefined,
            }}
          />
        )}
        {points !== undefined && <PointsLabel>+{points}</PointsLabel>}
      </MatchupWrapper>
    );
  };

  const renderRegion = (
    regionName: string,
    startIndex: number,
    isReversed: boolean = false
  ) => {
    const roundCounts = [8, 4, 2, 1];
    let currentIndex = startIndex;

    return (
      <Region>
        <Typography variant="h6" sx={{ mb: 2, textAlign: "center" }}>
          {regionName}
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: isReversed ? "row-reverse" : "row",
          }}
        >
          {roundCounts.map((count, roundIndex) => {
            const roundMatchups = getRegionMatchups(currentIndex, count);
            currentIndex += count;
            // Debug log to check round numbers
            console.log(`Region ${regionName}, Round ${roundIndex}:`, {
              count,
              currentIndex,
              matchups: roundMatchups.map((m) => m.gameCode),
            });
            return (
              <Round key={roundIndex}>
                {roundMatchups.map((matchup) =>
                  renderMatchup(matchup, 0, roundIndex === 0, roundIndex)
                )}
              </Round>
            );
          })}
        </Box>
      </Region>
    );
  };

  const renderFinalFour = () => {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          minWidth: "220px",
          mx: 4,
          justifyContent: "center",
          height: "100%",
          alignSelf: "center",
        }}
      >
        <TextField
          value={bracketName}
          onChange={(e) => onUpdateBracketName(e.target.value)}
          placeholder="Enter Bracket Name"
          size="small"
          sx={{ mb: 2 }}
        />
        <Typography variant="h6" sx={{ mb: 2, textAlign: "center" }}>
          Final Four
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 4 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Round>
              {renderMatchup(matchups[61], 61, false, 3)}{" "}
              {/* FF2: South vs West */}
            </Round>
            <Typography variant="body2" sx={{ mt: 1, color: "success.main" }}>
              {matchups[61]?.winner && matchups[61].winner === "top"
                ? matchups[61].topTeam.name ===
                  marchMadnessGames["FF2"]?.["Winning Team"]
                  ? marchMadnessGames["FF2"]?.points || 0
                  : 0
                : matchups[61].bottomTeam.name ===
                  marchMadnessGames["FF2"]?.["Winning Team"]
                ? marchMadnessGames["FF2"]?.points || 0
                : 0}{" "}
              points
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Round>{renderMatchup(matchups[62], 62, false, 4)}</Round>{" "}
            {/* Championship */}
            <Typography variant="body2" sx={{ mt: 1, color: "success.main" }}>
              {matchups[62]?.winner && matchups[62].winner === "top"
                ? matchups[62].topTeam.name ===
                  marchMadnessGames["CH1"]?.["Winning Team"]
                  ? marchMadnessGames["CH1"]?.points || 0
                  : 0
                : matchups[62].bottomTeam.name ===
                  marchMadnessGames["CH1"]?.["Winning Team"]
                ? marchMadnessGames["CH1"]?.points || 0
                : 0}{" "}
              points
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Round>
              {renderMatchup(matchups[60], 60, false, 3)}{" "}
              {/* FF1: East vs Midwest */}
            </Round>
            <Typography variant="body2" sx={{ mt: 1, color: "success.main" }}>
              {matchups[60]?.winner && matchups[60].winner === "top"
                ? matchups[60].topTeam.name ===
                  marchMadnessGames["FF1"]?.["Winning Team"]
                  ? marchMadnessGames["FF1"]?.points || 0
                  : 0
                : matchups[60].bottomTeam.name ===
                  marchMadnessGames["FF1"]?.["Winning Team"]
                ? marchMadnessGames["FF1"]?.points || 0
                : 0}{" "}
              points
            </Typography>
          </Box>
        </Box>
        <Typography
          variant="h6"
          sx={{
            mt: 4,
            textAlign: "center",
            color: "success.main",
            fontWeight: "bold",
          }}
        >
          Total Score: {totalScore}
        </Typography>
      </Box>
    );
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 4,
        p: 2,
        minHeight: "100vh",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          gap: 4,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            justifyContent: "center",
          }}
        >
          {renderRegion("South", 30)}
          {renderRegion("West", 15)}
        </Box>
        {renderFinalFour()}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            justifyContent: "center",
          }}
        >
          {renderRegion("East", 0, true)}
          {renderRegion("Midwest", 45, true)}
        </Box>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={showGameCode}
              onChange={(e) => setShowGameCode(e.target.checked)}
            />
          }
          label="Show Game Code"
        />
      </Box>
    </Box>
  );
}
