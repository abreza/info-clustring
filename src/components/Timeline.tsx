import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Slider,
  IconButton,
  Tooltip,
  Chip,
  LinearProgress,
  Button,
  Switch,
  FormControlLabel,
  CircularProgress,
  Divider,
} from "@mui/material";
import {
  PlayArrow,
  Pause,
  SkipPrevious,
  SkipNext,
  Timeline as TimelineIcon,
  NetworkWifi,
  BatteryFull,
} from "@mui/icons-material";
import {
  SimulationResult,
  SimulationConfig,
  SimulationStats,
  AlgorithmType,
} from "../service/types";

interface TimelineProps {
  simulationResult: SimulationResult | null;
  config: SimulationConfig;
  currentRound: number;
  isRunning: boolean;
  isPaused: boolean;
  isLoading: boolean;
  autoRun: boolean;
  playbackSpeed: number;
  algorithm: AlgorithmType;
  onRoundChange: (round: number) => void;
  onStartSimulation: () => void;
  onPlayPause: () => void;
  onAutoRunChange: (checked: boolean) => void;
  onPlaybackSpeedChange: (speed: number) => void;
  getCurrentStats: () => SimulationStats | null;
}

export function Timeline({
  simulationResult,
  config,
  currentRound,
  isRunning,
  isPaused,
  isLoading,
  autoRun,
  playbackSpeed,
  algorithm,
  onRoundChange,
  onStartSimulation,
  onPlayPause,
  onAutoRunChange,
  onPlaybackSpeedChange,
  getCurrentStats,
}: TimelineProps) {
  const [metrics, setMetrics] = useState<{
    aliveHistory: number[];
    energyHistory: number[];
    clusterHistory: number[];
  }>({ aliveHistory: [], energyHistory: [], clusterHistory: [] });

  useEffect(() => {
    if (!simulationResult) {
      setMetrics({ aliveHistory: [], energyHistory: [], clusterHistory: [] });
      return;
    }

    const algorithmResult = simulationResult.algorithms[algorithm];
    const aliveHistory: number[] = [];
    const energyHistory: number[] = [];
    const clusterHistory: number[] = [];

    for (let round = 0; round < algorithmResult.history.length; round++) {
      const historyItem = algorithmResult.history[round];
      const aliveSensors = historyItem.clusters
        .flatMap((c) => c.members)
        .filter((s) => s.energy > 0);
      const totalEnergy = aliveSensors.reduce((sum, s) => sum + s.energy, 0);

      aliveHistory.push(aliveSensors.length);
      energyHistory.push(totalEnergy);
      clusterHistory.push(historyItem.clusters.length);
    }

    setMetrics({ aliveHistory, energyHistory, clusterHistory });
  }, [simulationResult, algorithm]);

  const handleRoundChange = (_: Event, value: number | number[]) => {
    const newRound = Array.isArray(value) ? value[0] : value;
    onRoundChange(newRound);
  };

  const handlePrevious = () => {
    if (currentRound > 0) {
      onRoundChange(currentRound - 1);
    }
  };

  const handleNext = () => {
    if (simulationResult) {
      const maxRounds =
        simulationResult.algorithms[algorithm].history.length - 1;
      if (currentRound < maxRounds) {
        onRoundChange(currentRound + 1);
      }
    }
  };

  const getSliderMarks = () => {
    if (!simulationResult) return [];

    const algorithmResult = simulationResult.algorithms[algorithm];
    const marks = [];
    const totalRounds = algorithmResult.history.length;
    const interval = Math.max(1, Math.floor(totalRounds / 10));

    for (let i = 0; i < totalRounds; i += interval) {
      marks.push({ value: i, label: i.toString() });
    }

    if (totalRounds > 0) {
      marks.push({
        value: totalRounds - 1,
        label: (totalRounds - 1).toString(),
      });
    }

    return marks;
  };

  const renderMiniChart = (data: number[], color: string, label: string) => {
    if (data.length === 0) return null;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const svgHeight = 40;
    const svgWidth = 200;
    const points = data
      .map((value, index) => {
        const x = (index / (data.length - 1)) * svgWidth;
        const y = svgHeight - ((value - min) / range) * (svgHeight - 10) - 5;
        return `${x},${y}`;
      })
      .join(" ");

    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}>
        <Typography variant="caption" sx={{ minWidth: 80 }}>
          {label}
        </Typography>
        <svg
          width={svgWidth}
          height={svgHeight}
          style={{ border: "1px solid #e0e0e0", borderRadius: 4 }}
        >
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="2"
            opacity={0.8}
          />

          {data.length > 0 && currentRound < data.length && (
            <circle
              cx={(currentRound / (data.length - 1)) * svgWidth}
              cy={
                svgHeight -
                ((data[currentRound] - min) / range) * (svgHeight - 10) -
                5
              }
              r="3"
              fill={color}
              stroke="white"
              strokeWidth="2"
            />
          )}
        </svg>
        <Typography variant="caption" color="text.secondary">
          {data[currentRound] !== undefined
            ? data[currentRound].toFixed(0)
            : "0"}
        </Typography>
      </Box>
    );
  };

  if (!simulationResult && !isLoading) {
    return (
      <Paper sx={{ p: 3, textAlign: "center" }}>
        <TimelineIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Ready to Start Simulation
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Click the Start button below to begin the sensor network simulation
          for all algorithms
        </Typography>

        <Button
          variant="contained"
          size="large"
          startIcon={isLoading ? <CircularProgress size={16} /> : <PlayArrow />}
          onClick={onStartSimulation}
          disabled={isLoading}
          sx={{ mb: 2 }}
        >
          {isLoading
            ? "Running All Algorithms..."
            : "Start Multi-Algorithm Simulation"}
        </Button>

        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoRun}
                onChange={(e) => onAutoRunChange(e.target.checked)}
                disabled={isLoading}
              />
            }
            label="Auto Run"
          />
        </Box>
      </Paper>
    );
  }

  const stats = getCurrentStats();
  const maxRounds = simulationResult
    ? simulationResult.algorithms[algorithm].history.length - 1
    : 0;
  const progress = maxRounds > 0 ? (currentRound / maxRounds) * 100 : 0;

  return (
    <Paper sx={{ p: 3 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6">Simulation Playback Controls</Typography>
        <Box display="flex" gap={1}>
          {stats && (
            <>
              <Chip
                icon={<NetworkWifi />}
                label={`${stats.aliveSensors}/${config.numSensors}`}
                color="primary"
                size="small"
              />
              <Chip
                icon={<BatteryFull />}
                label={`${stats.totalEnergy.toFixed(0)}`}
                color="success"
                size="small"
              />
              <Chip
                label={algorithm.toUpperCase()}
                color={algorithm === "kmeans" ? "primary" : "warning"}
                size="small"
                variant="outlined"
              />
            </>
          )}
        </Box>
      </Box>

      <Box sx={{ mb: 3, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Button
            variant="contained"
            size="large"
            startIcon={
              isLoading ? <CircularProgress size={16} /> : <PlayArrow />
            }
            onClick={onStartSimulation}
            disabled={isLoading || (isRunning && !isPaused)}
            sx={{ minWidth: 140 }}
          >
            {isLoading
              ? "Loading..."
              : isRunning && !isPaused
              ? "Running"
              : simulationResult
              ? "Resume"
              : "Start All"}
          </Button>

          <Tooltip title={isPaused ? "Resume" : "Pause"}>
            <IconButton
              onClick={onPlayPause}
              disabled={!isRunning || isLoading}
              color="primary"
              size="large"
            >
              {isPaused ? <PlayArrow /> : <Pause />}
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

          <FormControlLabel
            control={
              <Switch
                checked={autoRun}
                onChange={(e) => onAutoRunChange(e.target.checked)}
                disabled={isLoading}
              />
            }
            label="Auto Run"
          />

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              minWidth: 150,
            }}
          >
            <Typography variant="body2" sx={{ minWidth: 50 }}>
              Speed:
            </Typography>
            <Slider
              value={1000 - playbackSpeed}
              onChange={(_, value) =>
                onPlaybackSpeedChange(1000 - (value as number))
              }
              min={100}
              max={900}
              step={100}
              size="small"
              valueLabelFormat={(value) =>
                `${Math.round((1000 - value) / 100)}x`
              }
              valueLabelDisplay="auto"
              sx={{ flex: 1 }}
            />
          </Box>
        </Box>
      </Box>

      {simulationResult && (
        <>
          <Box sx={{ mb: 3 }}>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Tooltip title="Previous Round">
                <IconButton
                  onClick={handlePrevious}
                  disabled={currentRound === 0}
                  size="small"
                >
                  <SkipPrevious />
                </IconButton>
              </Tooltip>

              <Tooltip title="Next Round">
                <IconButton
                  onClick={handleNext}
                  disabled={currentRound >= maxRounds}
                  size="small"
                >
                  <SkipNext />
                </IconButton>
              </Tooltip>

              <Box sx={{ flex: 1, mx: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Round {currentRound} / {maxRounds} ({algorithm.toUpperCase()})
                </Typography>
                <Slider
                  value={currentRound}
                  onChange={handleRoundChange}
                  min={0}
                  max={maxRounds}
                  step={1}
                  marks={getSliderMarks()}
                  valueLabelDisplay="auto"
                  sx={{
                    "& .MuiSlider-markLabel": {
                      fontSize: "0.7rem",
                    },
                  }}
                />
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Historical Metrics ({algorithm.toUpperCase()})
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {renderMiniChart(
                metrics.aliveHistory,
                algorithm === "kmeans" ? "#1976d2" : "#ed6c02",
                "Alive Sensors"
              )}
              {renderMiniChart(
                metrics.energyHistory,
                "#2e7d32",
                "Total Energy"
              )}
              {renderMiniChart(
                metrics.clusterHistory,
                "#9c27b0",
                "Active Clusters"
              )}
            </Box>
          </Box>

          {simulationResult.algorithms[algorithm].networkLifetime > 0 && (
            <Box sx={{ mt: 2, p: 2, bgcolor: "error.50", borderRadius: 1 }}>
              <Typography variant="body2" color="error.main">
                <strong>Network Lifetime ({algorithm.toUpperCase()}):</strong>{" "}
                {simulationResult.algorithms[algorithm].networkLifetime} rounds
                {currentRound >=
                  simulationResult.algorithms[algorithm].networkLifetime &&
                  " (Network has failed - no active sensors)"}
              </Typography>
            </Box>
          )}
        </>
      )}
    </Paper>
  );
}
