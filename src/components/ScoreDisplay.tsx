import React from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { PlayerBracket, ROUND_MULTIPLIERS } from "../types/bracket";

interface ScoreDisplayProps {
  playerBracket: PlayerBracket;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  playerBracket,
}) => {
  const roundNames = {
    round1: "First Round",
    round2: "Second Round",
    round3: "Sweet 16",
    round4: "Elite 8",
    round5: "Final Four",
    round6: "Championship",
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {playerBracket.playerName}'s Bracket Score
      </Typography>

      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Round</TableCell>
              <TableCell align="right">Round Multiplier</TableCell>
              <TableCell align="right">Points</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(playerBracket.roundScores).map(([round, score]) => (
              <TableRow key={round}>
                <TableCell component="th" scope="row">
                  {roundNames[round as keyof typeof roundNames]}
                </TableCell>
                <TableCell align="right">
                  {ROUND_MULTIPLIERS[round as keyof typeof ROUND_MULTIPLIERS]}
                </TableCell>
                <TableCell align="right">{score}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={2} align="right">
                <strong>Total Score</strong>
              </TableCell>
              <TableCell align="right">
                <strong>{playerBracket.totalScore}</strong>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
