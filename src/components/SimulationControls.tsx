import React from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { Refresh, Settings } from "@mui/icons-material";
import { AlgorithmType } from "../service/types";
import { ALGORITHM_LABELS } from "../constants";

interface SimulationControlsProps {
  isLoading: boolean;
  isRunning: boolean;
  algorithm: AlgorithmType;
  onAlgorithmChange: (algorithm: AlgorithmType) => void;
  onShowSettings: () => void;
  onResetSimulation: () => void;
}

export function SimulationControls({
  isLoading,
  isRunning,
  algorithm,
  onAlgorithmChange,
  onShowSettings,
  onResetSimulation,
}: SimulationControlsProps) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Simulation Configuration
      </Typography>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        <FormControl size="small" sx={{ minWidth: 250 }}>
          <InputLabel>Clustering Algorithm</InputLabel>
          <Select
            value={algorithm}
            label="Clustering Algorithm"
            onChange={(e) => onAlgorithmChange(e.target.value as AlgorithmType)}
            disabled={isLoading || isRunning}
          >
            {Object.entries(ALGORITHM_LABELS).map(([key, label]) => (
              <MenuItem key={key} value={key}>
                {label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={onResetSimulation}
            disabled={isLoading}
          >
            Reset
          </Button>

          <Button
            variant="outlined"
            startIcon={<Settings />}
            onClick={onShowSettings}
            disabled={isLoading}
          >
            Settings
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
