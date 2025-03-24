import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import { Game, Team, BracketPick, PlayerBracket } from "../types/bracket";
import {
  calculateRoundScores,
  calculateTotalScore,
} from "../utils/scoreCalculator";

interface BracketManagerProps {
  games: Game[];
  onSave: (playerBracket: PlayerBracket) => void;
}

export const BracketManager: React.FC<BracketManagerProps> = ({
  games,
  onSave,
}) => {
  const [playerName, setPlayerName] = useState("");
  const [picks, setPicks] = useState<BracketPick[]>([]);

  const handlePick = (gameId: string, winner: Team) => {
    setPicks((prevPicks) => {
      const existingPickIndex = prevPicks.findIndex(
        (pick) => pick.gameId === gameId
      );
      if (existingPickIndex >= 0) {
        const newPicks = [...prevPicks];
        newPicks[existingPickIndex] = { gameId, winner };
        return newPicks;
      }
      return [...prevPicks, { gameId, winner }];
    });
  };

  const handleSave = () => {
    if (!playerName.trim()) {
      alert("Please enter a player name");
      return;
    }

    const roundScores = calculateRoundScores(games, picks);
    const totalScore = calculateTotalScore(roundScores);

    onSave({
      playerName,
      picks,
      roundScores,
      totalScore,
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Bracket Manager
      </Typography>

      <TextField
        fullWidth
        label="Player Name"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
        sx={{ mb: 3 }}
      />

      <Grid container spacing={3}>
        {games.map((game) => (
          <Grid item xs={12} md={6} key={game.gameID}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {game.bracketRound || "Play-in Game"}
                </Typography>
                <Typography variant="subtitle1" gutterBottom>
                  {game.title}
                </Typography>

                <FormControl component="fieldset">
                  <RadioGroup
                    value={
                      picks.find((p) => p.gameId === game.gameID)?.winner?.names
                        .full || ""
                    }
                    onChange={(e) => {
                      const winner =
                        e.target.value === game.home.names.full
                          ? game.home
                          : game.away;
                      handlePick(game.gameID, winner);
                    }}
                  >
                    <FormControlLabel
                      value={game.home.names.full}
                      control={<Radio />}
                      label={`${game.home.names.full} (${
                        game.home.seed || "N/A"
                      })`}
                    />
                    <FormControlLabel
                      value={game.away.names.full}
                      control={<Radio />}
                      label={`${game.away.names.full} (${
                        game.away.seed || "N/A"
                      })`}
                    />
                  </RadioGroup>
                </FormControl>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={picks.length === 0}
        >
          Save Bracket
        </Button>
      </Box>
    </Box>
  );
};
