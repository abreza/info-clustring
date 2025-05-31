import React from "react";
import {
  Box,
  Card,
  Paper,
  Typography,
  LinearProgress,
  Grid,
} from "@mui/material";
import {
  Timeline,
  NetworkWifi,
  BatteryFull,
  Info,
  RemoveRedEye,
} from "@mui/icons-material";
import {
  SimulationResult,
  SimulationConfig,
  SimulationStats,
  AlgorithmType,
} from "../service/types";

interface SimulationStatsProps {
  simulationResult: SimulationResult | null;
  config: SimulationConfig;
  currentRound: number;
  stats: SimulationStats | null;
  algorithm: AlgorithmType;
}

export function SimulationStatsComponent({
  simulationResult,
  config,
  currentRound,
  stats,
  algorithm,
}: SimulationStatsProps) {
  if (!stats || !simulationResult) {
    return (
      <Paper sx={{ p: 4, textAlign: "center" }}>
        <Timeline sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          No statistics available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Statistics will be shown during simulation
        </Typography>
      </Paper>
    );
  }

  const algorithmResult = simulationResult.algorithms[algorithm];
  const progress =
    (currentRound / Math.max(algorithmResult.totalRounds, 1)) * 100;
  const networkHealth = (stats.aliveSensors / config.numSensors) * 100;

  const getAlgorithmColor = (alg: AlgorithmType) => {
    switch (alg) {
      case "kmeans":
        return "primary";
      case "leach":
        return "warning";
      case "info-kmeans":
        return "secondary";
      default:
        return "primary";
    }
  };

  const renderCurrentStats = () => (
    <Grid container spacing={2}>
      <Grid size={{ xs: 6 }}>
        <Card
          variant="outlined"
          sx={{ p: 2, textAlign: "center", bgcolor: "primary.50" }}
        >
          <NetworkWifi color="primary" sx={{ mb: 1 }} />
          <Typography variant="h4" color="primary.main">
            {stats.aliveSensors}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Alive Sensors
          </Typography>
          <LinearProgress
            variant="determinate"
            value={networkHealth}
            color="primary"
            sx={{ mt: 1, height: 4 }}
          />
        </Card>
      </Grid>

      <Grid size={{ xs: 6 }}>
        <Card
          variant="outlined"
          sx={{ p: 2, textAlign: "center", bgcolor: "success.50" }}
        >
          <BatteryFull color="success" sx={{ mb: 1 }} />
          <Typography variant="h4" color="success.main">
            {stats.totalEnergy.toFixed(0)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total Energy
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Avg: {stats.averageEnergy.toFixed(1)}
          </Typography>
        </Card>
      </Grid>

      {algorithm === "info-kmeans" && stats.sleepingNodes !== undefined && (
        <>
          <Grid size={{ xs: 6 }}>
            <Card
              variant="outlined"
              sx={{ p: 2, textAlign: "center", bgcolor: "grey.100" }}
            >
              <RemoveRedEye sx={{ mb: 1, color: "text.secondary" }} />
              <Typography variant="h4" color="text.secondary">
                {stats.sleepingNodes}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sleeping Nodes
              </Typography>
            </Card>
          </Grid>

          <Grid size={{ xs: 6 }}>
            <Card
              variant="outlined"
              sx={{ p: 2, textAlign: "center", bgcolor: "info.50" }}
            >
              <Info color="info" sx={{ mb: 1 }} />
              <Typography variant="h4" color="info.main">
                {stats.activeNodes}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Nodes
              </Typography>
            </Card>
          </Grid>
        </>
      )}

      <Grid size={{ xs: 12 }}>
        <Card
          variant="outlined"
          sx={{
            p: 2,
            textAlign: "center",
            bgcolor: `${getAlgorithmColor(algorithm)}.50`,
          }}
        >
          <Typography
            variant="h5"
            color={`${getAlgorithmColor(algorithm)}.main`}
          >
            {algorithmResult.networkLifetime}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Network Lifetime (Rounds) - {algorithm.toUpperCase()}
          </Typography>
          {algorithm === "info-kmeans" && algorithmResult.energySavings && (
            <Typography variant="caption" color="success.main">
              Energy Saved: {algorithmResult.energySavings.toFixed(1)}
            </Typography>
          )}
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ mb: 3 }}>
        <Box display="flex" justifyContent="space-between" mb={1}>
          <Typography variant="body2" color="text.secondary">
            Progress: Round {currentRound} / {algorithmResult.totalRounds}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {progress.toFixed(1)}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ height: 8, borderRadius: 4 }}
          color={getAlgorithmColor(algorithm)}
        />
      </Box>

      <Typography variant="h6" gutterBottom>
        Current Statistics ({algorithm.toUpperCase()})
      </Typography>

      {renderCurrentStats()}
    </Paper>
  );
}
