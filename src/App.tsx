import { useState, useRef } from "react";
import { Container, Typography, Box, Button } from "@mui/material";
import BracketDisplay from "./components/BracketDisplay";
import { createInitialBracket, Matchup } from "./utils/bracketTransform";
import tournamentData from "./data/ncaa_2025_bracket.json";
import marchMadnessGames from "./data/march_madness_games.json";
import marchMadnessGamesTest from "./data/march_madness_games_TEST_DATA.json";

interface TournamentTeam {
  seed: string | number;
  name: string;
}

interface TournamentGame {
  game_code: string;
  top: string | TournamentTeam;
  bottom: string | TournamentTeam;
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

interface MarchMadnessGame {
  GameID: number;
  Round: number;
  "Game Number": number;
  "Top Team": string;
  "Bottom Team": string;
  "Top Team Score": number;
  "Bottom Team Score": number;
  "Winning Team": string;
  "Losing Team": string;
  "Winning Team Seed": number;
  "Losing Team Seed": number;
  "Winning Team Score": number;
  "Losing Team Score": number;
  "Game Status": string;
  "GameID.1": number;
  "Top Team Seed": number;
  "Bottom Team Seed": number;
  "Game Region": string;
  "Top Team Char6": string;
  "Bottom Team Char6": string;
  "Winning Team Char6": string;
  "Losing Team Char6": string;
  points: number;
}

interface MarchMadnessGames {
  [key: string]: MarchMadnessGame;
}

export default function App() {
  const [bracketName, setBracketName] = useState("My Bracket");
  const [useTestData, setUseTestData] = useState(true);
  const [matchups, setMatchups] = useState<Matchup[]>(() =>
    createInitialBracket(tournamentData)
  );
  const [totalScore, setTotalScore] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const typedMarchMadnessGames = useTestData
    ? (marchMadnessGamesTest as unknown as Record<string, MarchMadnessGame>)
    : (marchMadnessGames as unknown as Record<string, MarchMadnessGame>);

  const handleUpdateBracket = (newMatchups: Matchup[]) => {
    setMatchups(newMatchups);
    calculateScore(newMatchups);
  };

  const calculateScore = (currentMatchups: Matchup[]) => {
    let score = 0;
    currentMatchups.forEach((matchup) => {
      if (matchup && matchup.gameCode) {
        const gameData = (typedMarchMadnessGames as MarchMadnessGames)[
          matchup.gameCode
        ];
        if (gameData) {
          const pickedTeam =
            matchup.winner === "top"
              ? matchup.topTeam.name
              : matchup.bottomTeam.name;
          const actualWinner = gameData["Winning Team"];
          if (pickedTeam === actualWinner) {
            score += gameData.points;
          }
        }
      }
    });
    setTotalScore(score);
  };

  const handleSaveBracket = () => {
    const bracketData = {
      name: bracketName,
      matchups,
      totalScore,
    };
    const blob = new Blob([JSON.stringify(bracketData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${bracketName || "bracket"}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadBracket = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const bracketData = JSON.parse(e.target?.result as string);
        setMatchups(bracketData.matchups);
        setBracketName(bracketData.name || "");
        setTotalScore(bracketData.totalScore || 0);
      } catch (error) {
        console.error("Error loading bracket:", error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <Container
      maxWidth={false}
      sx={{
        px: 2,
        mx: "auto",
        width: "100%",
        maxWidth: "100%",
        position: "relative",
        zIndex: 1,
      }}
    >
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{ textAlign: "center", my: 4 }}
      >
        March Madness Bracket
      </Typography>
      <Box
        sx={{
          width: "100%",
          minWidth: "fit-content",
          overflowX: "auto",
          mb: 4,
        }}
      >
        <BracketDisplay
          initialMatchups={matchups}
          onUpdateBracket={handleUpdateBracket}
          bracketName={bracketName}
          onUpdateBracketName={setBracketName}
          totalScore={totalScore}
          useTestData={useTestData}
          onUpdateUseTestData={setUseTestData}
        />
      </Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          gap: 2,
          mt: 4,
          mb: 4,
          position: "relative",
          zIndex: 2,
        }}
      >
        <Button
          variant="contained"
          color="primary"
          onClick={handleSaveBracket}
          sx={{ minWidth: "120px" }}
        >
          Save Bracket
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleLoadBracket}
          sx={{ minWidth: "120px" }}
        >
          Load Bracket
        </Button>
      </Box>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        style={{ display: "none" }}
      />
    </Container>
  );
}
