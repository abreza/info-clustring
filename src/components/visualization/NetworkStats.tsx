import React from "react";
import { Box, Chip } from "@mui/material";
import { NetworkWifi, BatteryFull, RemoveRedEye } from "@mui/icons-material";
import { NetworkStatsProps } from "../../types/NetworkVisualization.types";

export function NetworkStats({
  stats,
  config,
  clusters,
  algorithm,
  simulationResult,
}: NetworkStatsProps) {
  if (!stats || !simulationResult) return null;

  return (
    <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
      <Chip
        icon={<NetworkWifi />}
        label={`Alive: ${stats.aliveSensors}/${config.numSensors}`}
        color="primary"
        size="small"
      />
      <Chip
        icon={<BatteryFull />}
        label={`Avg Energy: ${stats.averageEnergy.toFixed(1)}`}
        color="success"
        size="small"
      />
      <Chip
        label={`Total Energy: ${stats.totalEnergy.toFixed(1)}`}
        color="info"
        size="small"
      />
      <Chip
        label={`Clusters: ${clusters.length}`}
        color="secondary"
        size="small"
      />
      {algorithm === "info-kmeans" && stats.sleepingNodes !== undefined && (
        <Chip
          icon={<RemoveRedEye />}
          label={`Sleeping: ${stats.sleepingNodes}`}
          color="default"
          size="small"
          sx={{ opacity: 0.8 }}
        />
      )}
      <Chip
        label={`Network Life: ${simulationResult.algorithms[algorithm].networkLifetime} rounds`}
        color={
          algorithm === "kmeans"
            ? "primary"
            : algorithm === "leach"
            ? "warning"
            : "secondary"
        }
        size="small"
        variant="outlined"
      />
    </Box>
  );
}
