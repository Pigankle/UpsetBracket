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
import marchMadnessGamesTest from "../data/march_madness_games_TEST_DATA.json";
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
  onClick?: () => void;
  isStrikethrough?: boolean;
  matchup?: Matchup;
  gameCode: string;
  round: number;
  position: "top" | "bottom";
  marchMadnessGames: Record<string, MarchMadnessGame>;
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
  onClick,
  isStrikethrough,
  gameCode,
  round,
  matchup,
  position,
  marchMadnessGames,
}: TeamProps) {
  const gameResult = marchMadnessGames[gameCode];
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
            fontWeight: matchup?.winner === position ? "bold" : "normal",
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
            fontWeight: matchup?.winner === position ? "bold" : "normal",
          }}
        >
          {team.seed} {team.name}
          {gameResult["Winning Team"] === team.name && " ✓"}
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
  /*  console.log(`Game ${gameCode}, Round ${round}:`, {
    team: team.name,
    position,
    actualTopTeam,
    actualBottomTeam,
    isActualTeam,
    isIncorrect,
    correctTeam,
    correctSeed,
    gameResult,
  }); */

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
          {gameResult["Winning Team"] === correctTeam && " ✓"}
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
            fontWeight: matchup?.winner === position ? "bold" : "normal",
          }}
        >
          {team.seed} {team.name}
          {gameResult["Winning Team"] === team.name && " ✓"}
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
  useTestData: boolean;
  onUpdateUseTestData: (useTestData: boolean) => void;
}

export default function BracketDisplay({
  initialMatchups,
  onUpdateBracket,
  bracketName,
  onUpdateBracketName,
  totalScore,
  useTestData,
  onUpdateUseTestData,
}: BracketDisplayProps) {
  const [matchups, setMatchups] = useState<Matchup[]>(initialMatchups);
  const [showGameCode, setShowGameCode] = useState(false);

  useEffect(() => {
    setMatchups(initialMatchups);
  }, [initialMatchups]);

  const typedMarchMadnessGames = useTestData
    ? (marchMadnessGamesTest as unknown as Record<string, MarchMadnessGame>)
    : (marchMadnessGames as unknown as Record<string, MarchMadnessGame>);

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

    // Track the path of teams that need to be cleared
    const clearPath = (matchupIndex: number, position: "top" | "bottom") => {
      const matchup = newMatchups[matchupIndex];

      // If this matchup has no next matchup, we're done
      if (matchup.nextMatchupIndex === undefined) {
        return;
      }

      const nextMatchup = newMatchups[matchup.nextMatchupIndex];
      const nextPosition = matchup.nextPosition;

      // Update the team in the next matchup
      if (matchup === currentMatchup) {
        // If this is the original clicked matchup, propagate the selected team
        if (nextPosition === "top") {
          nextMatchup.topTeam = selectedTeam;
        } else {
          nextMatchup.bottomTeam = selectedTeam;
        }
      } else {
        // For subsequent matchups, clear the appropriate team
        if (nextPosition === "top") {
          // If this team was picked as winner, clear it and continue clearing
          if (nextMatchup.winner === "top") {
            nextMatchup.winner = undefined;
            nextMatchup.topTeam = { name: "TBD", seed: "0" };
            clearPath(matchup.nextMatchupIndex, "top");
          } else {
            // Just clear the team but preserve the winner if it was the other team
            nextMatchup.topTeam = { name: "TBD", seed: "0" };
          }
        } else {
          // If this team was picked as winner, clear it and continue clearing
          if (nextMatchup.winner === "bottom") {
            nextMatchup.winner = undefined;
            nextMatchup.bottomTeam = { name: "TBD", seed: "0" };
            clearPath(matchup.nextMatchupIndex, "bottom");
          } else {
            // Just clear the team but preserve the winner if it was the other team
            nextMatchup.bottomTeam = { name: "TBD", seed: "0" };
          }
        }
      }
    };

    // Start clearing the path from the current matchup
    clearPath(matchupIndex, position);

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
    //  console.log(`Rendering matchup ${matchup.gameCode} in round ${round}`);

    return (
      <MatchupWrapper key={matchup.gameCode}>
        <GameCodeLabel showGameCode={showGameCode}>
          {matchup.gameCode}
        </GameCodeLabel>
        <Team
          team={matchup.topTeam}
          isStrikethrough={bottomTeamWon}
          onClick={() => handleTeamClick(matchup.gameCode, "top")}
          gameCode={matchup.gameCode}
          round={round}
          matchup={matchup}
          position="top"
          marchMadnessGames={typedMarchMadnessGames}
        />
        <Team
          team={matchup.bottomTeam}
          isStrikethrough={topTeamWon}
          onClick={() => handleTeamClick(matchup.gameCode, "bottom")}
          gameCode={matchup.gameCode}
          round={round}
          matchup={matchup}
          position="bottom"
          marchMadnessGames={typedMarchMadnessGames}
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
            /*   console.log(`Region ${regionName}, Round ${roundIndex}:`, {
              count,
              currentIndex,
              matchups: roundMatchups.map((m) => m.gameCode),
            }); */
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
          </Box>
        </Box>
        <Box
          sx={{
            mt: 4,
            display: "flex",
            justifyContent: "space-between",
            gap: 4,
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: "success.main", textAlign: "center", flex: 1 }}
          >
            FF2: {(() => {
              if (matchups[61]?.winner) {
                const winner = matchups[61].winner === "top" ? matchups[61].topTeam : matchups[61].bottomTeam;
                const gameResult = typedMarchMadnessGames["FF2"];
                if (gameResult && gameResult["Winning Team"] === winner.name) {
                  return gameResult.points || 0;
                }
              }
              return 0;
            })()} points
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "success.main", textAlign: "center", flex: 1 }}
          >
            CH1: {(() => {
              if (matchups[62]?.winner) {
                const winner = matchups[62].winner === "top" ? matchups[62].topTeam : matchups[62].bottomTeam;
                const gameResult = typedMarchMadnessGames["CH1"];
                if (gameResult && gameResult["Winning Team"] === winner.name) {
                  return gameResult.points || 0;
                }
              }
              return 0;
            })()} points
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "success.main", textAlign: "center", flex: 1 }}
          >
            FF1: {(() => {
              if (matchups[60]?.winner) {
                const winner = matchups[60].winner === "top" ? matchups[60].topTeam : matchups[60].bottomTeam;
                const gameResult = typedMarchMadnessGames["FF1"];
                if (gameResult && gameResult["Winning Team"] === winner.name) {
                  return gameResult.points || 0;
                }
              }
              return 0;
            })()} points
          </Typography>
        </Box>
        <Typography
          variant="h6"
          sx={{
            mt: 2,
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
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          mt: 2,
        }}
      >
        <FormControlLabel
          control={
            <Checkbox
              checked={showGameCode}
              onChange={(e) => setShowGameCode(e.target.checked)}
            />
          }
          label="Show Game Code"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={useTestData}
              onChange={(e) => onUpdateUseTestData(e.target.checked)}
            />
          }
          label="Use Test Data"
        />
        {useTestData && (
          <Typography
            variant="h6"
            sx={{
              color: "error.main",
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            SCORING BASED ON TEST DATA (Disable below)
          </Typography>
        )}
      </Box>
    </Box>
  );
}
