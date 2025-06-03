"use client";

import React, { useState } from "react";
import { Box, Grid } from "@mui/material";

import { NetworkVisualization } from "../components/visualization/NetworkVisualization";
import { SimulationStatsComponent } from "../components/SimulationStats";
import { SimulationControls } from "../components/SimulationControls";
import { SettingsDialog } from "../components/SettingsDialog";
import { Timeline } from "../components/Timeline";

import { useSimulation } from "../hooks/useSimulation";

export default function SimulationPage() {
  const [showSettings, setShowSettings] = useState(false);

  const {
    simulationResult,
    currentRound,
    isRunning,
    isPaused,
    isLoading,
    autoRun,
    playbackSpeed,
    config,
    algorithm,
    startSimulation,
    pauseSimulation,
    stopSimulation,
    resetSimulation,
    setAutoRun,
    setPlaybackSpeed,
    setConfig,
    setAlgorithm,
    setCurrentRound,
    getCurrentStats,
  } = useSimulation();

  const stats = getCurrentStats();

  const handleShowSettings = () => setShowSettings(true);
  const handleCloseSettings = () => setShowSettings(false);

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <SimulationControls
            isLoading={isLoading}
            algorithm={algorithm}
            onAlgorithmChange={setAlgorithm}
            onShowSettings={handleShowSettings}
            onResetSimulation={resetSimulation}
            isRunning={isRunning}
          />
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <NetworkVisualization
            simulationResult={simulationResult}
            config={config}
            currentRound={currentRound}
            stats={stats}
            algorithm={algorithm}
          />

          <Timeline
            simulationResult={simulationResult}
            config={config}
            currentRound={currentRound}
            isRunning={isRunning}
            isPaused={isPaused}
            isLoading={isLoading}
            autoRun={autoRun}
            playbackSpeed={playbackSpeed}
            algorithm={algorithm}
            onRoundChange={setCurrentRound}
            onStartSimulation={startSimulation}
            onPlayPause={pauseSimulation}
            onAutoRunChange={setAutoRun}
            onPlaybackSpeedChange={setPlaybackSpeed}
            getCurrentStats={getCurrentStats}
          />
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <SimulationStatsComponent
            simulationResult={simulationResult}
            config={config}
            currentRound={currentRound}
            stats={stats}
            algorithm={algorithm}
          />
        </Grid>
      </Grid>

      <SettingsDialog
        open={showSettings}
        config={config}
        onClose={handleCloseSettings}
        onConfigChange={setConfig}
      />
    </Box>
  );
}
