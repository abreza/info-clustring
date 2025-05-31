import React, { useState, useEffect, useMemo } from "react";
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
  Card,
  Grid,
  Tabs,
  Tab,
} from "@mui/material";
import {
  PlayArrow,
  Pause,
  SkipPrevious,
  SkipNext,
  Timeline as TimelineIcon,
  NetworkWifi,
  BatteryFull,
  CompareArrows,
  ShowChart,
  RemoveRedEye,
} from "@mui/icons-material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
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

interface ChartDataPoint {
  round: number;
  kmeans_alive: number;
  leach_alive: number;
  infokmeans_alive: number;
  kmeans_energy: number;
  leach_energy: number;
  infokmeans_energy: number;
  kmeans_clusters: number;
  leach_clusters: number;
  infokmeans_clusters: number;
  kmeans_avg_energy: number;
  leach_avg_energy: number;
  infokmeans_avg_energy: number;
  infokmeans_sleeping: number;
  infokmeans_active: number;
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
  const [tabValue, setTabValue] = useState(0);
  const [metrics, setMetrics] = useState<{
    aliveHistory: number[];
    energyHistory: number[];
    clusterHistory: number[];
  }>({ aliveHistory: [], energyHistory: [], clusterHistory: [] });

  // Prepare detailed chart data
  const chartData = useMemo((): ChartDataPoint[] => {
    if (!simulationResult) return [];

    const kmeansHistory = simulationResult.algorithms.kmeans.history;
    const leachHistory = simulationResult.algorithms.leach.history;
    const infoKmeansHistory =
      simulationResult.algorithms["info-kmeans"].history;
    const maxLength = Math.max(
      kmeansHistory.length,
      leachHistory.length,
      infoKmeansHistory.length
    );

    const data: ChartDataPoint[] = [];

    for (let round = 0; round < maxLength; round++) {
      const kmeansData =
        round < kmeansHistory.length ? kmeansHistory[round] : null;
      const leachData =
        round < leachHistory.length ? leachHistory[round] : null;
      const infoKmeansData =
        round < infoKmeansHistory.length ? infoKmeansHistory[round] : null;

      // Calculate metrics for K-Means
      let kmeansAlive = 0;
      let kmeansEnergy = 0;
      let kmeansClusters = 0;

      if (kmeansData) {
        const kmeansAliveSensors = kmeansData.clusters
          .flatMap((c) => c.members)
          .filter((s) => s.energy > 0);
        kmeansAlive = kmeansAliveSensors.length;
        kmeansEnergy = kmeansAliveSensors.reduce((sum, s) => sum + s.energy, 0);
        kmeansClusters = kmeansData.clusters.length;
      }

      // Calculate metrics for LEACH
      let leachAlive = 0;
      let leachEnergy = 0;
      let leachClusters = 0;

      if (leachData) {
        const leachAliveSensors = leachData.clusters
          .flatMap((c) => c.members)
          .filter((s) => s.energy > 0);
        leachAlive = leachAliveSensors.length;
        leachEnergy = leachAliveSensors.reduce((sum, s) => sum + s.energy, 0);
        leachClusters = leachData.clusters.length;
      }

      // Calculate metrics for Info-KMeans
      let infoKmeansAlive = 0;
      let infoKmeansEnergy = 0;
      let infoKmeansClusters = 0;
      let infoKmeansSleeping = 0;
      let infoKmeansActive = 0;

      if (infoKmeansData) {
        const allMembers = infoKmeansData.clusters.flatMap((c) => [
          ...c.members,
          ...(c.sleepingMembers || []),
        ]);
        const infoKmeansAliveSensors = allMembers.filter((s) => s.energy > 0);
        const activeSensors = infoKmeansAliveSensors.filter((s) => !s.isAsleep);
        const sleepingSensors = infoKmeansAliveSensors.filter(
          (s) => s.isAsleep
        );

        infoKmeansAlive = infoKmeansAliveSensors.length;
        infoKmeansEnergy = infoKmeansAliveSensors.reduce(
          (sum, s) => sum + s.energy,
          0
        );
        infoKmeansClusters = infoKmeansData.clusters.length;
        infoKmeansSleeping = sleepingSensors.length;
        infoKmeansActive = activeSensors.length;
      }

      data.push({
        round,
        kmeans_alive: kmeansAlive,
        leach_alive: leachAlive,
        infokmeans_alive: infoKmeansAlive,
        kmeans_energy: Math.round(kmeansEnergy),
        leach_energy: Math.round(leachEnergy),
        infokmeans_energy: Math.round(infoKmeansEnergy),
        kmeans_clusters: kmeansClusters,
        leach_clusters: leachClusters,
        infokmeans_clusters: infoKmeansClusters,
        kmeans_avg_energy:
          kmeansAlive > 0
            ? Math.round((kmeansEnergy / kmeansAlive) * 10) / 10
            : 0,
        leach_avg_energy:
          leachAlive > 0 ? Math.round((leachEnergy / leachAlive) * 10) / 10 : 0,
        infokmeans_avg_energy:
          infoKmeansAlive > 0
            ? Math.round((infoKmeansEnergy / infoKmeansAlive) * 10) / 10
            : 0,
        infokmeans_sleeping: infoKmeansSleeping,
        infokmeans_active: infoKmeansActive,
      });
    }

    return data;
  }, [simulationResult]);

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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

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

  const renderAlgorithmComparison = () => {
    if (!simulationResult) return null;

    return (
      <Card variant="outlined" sx={{ p: 2, bgcolor: "grey.50", mt: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <CompareArrows />
          <Typography variant="subtitle1" fontWeight="bold">
            Algorithm Performance Comparison
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid size={{ xs: 4 }}>
            <Box
              textAlign="center"
              p={2}
              sx={{ bgcolor: "primary.50", borderRadius: 1 }}
            >
              <Typography
                variant="subtitle2"
                color="primary.main"
                fontWeight="bold"
              >
                K-MEANS
              </Typography>
              <Typography variant="h6" color="primary.main">
                {simulationResult.algorithms.kmeans.networkLifetime}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                rounds
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 4 }}>
            <Box
              textAlign="center"
              p={2}
              sx={{ bgcolor: "warning.50", borderRadius: 1 }}
            >
              <Typography
                variant="subtitle2"
                color="warning.main"
                fontWeight="bold"
              >
                LEACH
              </Typography>
              <Typography variant="h6" color="warning.main">
                {simulationResult.algorithms.leach.networkLifetime}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                rounds
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 4 }}>
            <Box
              textAlign="center"
              p={2}
              sx={{ bgcolor: "secondary.50", borderRadius: 1 }}
            >
              <Typography
                variant="subtitle2"
                color="secondary.main"
                fontWeight="bold"
              >
                INFO-KMEANS
              </Typography>
              <Typography variant="h6" color="secondary.main">
                {simulationResult.algorithms["info-kmeans"].networkLifetime}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                rounds
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box mt={2} textAlign="center">
          <Typography variant="body2" color="text.secondary">
            {simulationResult.algorithms["info-kmeans"].networkLifetime >=
            Math.max(
              simulationResult.algorithms.kmeans.networkLifetime,
              simulationResult.algorithms.leach.networkLifetime
            )
              ? `Info-KMeans achieves the best performance`
              : simulationResult.algorithms.kmeans.networkLifetime >
                simulationResult.algorithms.leach.networkLifetime
              ? `K-Means outperforms other algorithms`
              : `LEACH shows better performance`}
          </Typography>

          {simulationResult.algorithms["info-kmeans"].energySavings && (
            <Typography
              variant="caption"
              color="success.main"
              display="block"
              mt={1}
            >
              Info-KMeans saved{" "}
              {simulationResult.algorithms["info-kmeans"].energySavings.toFixed(
                1
              )}
              units of energy through intelligent sleeping
            </Typography>
          )}
        </Box>
      </Card>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            bgcolor: "background.paper",
            p: 2,
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            boxShadow: 2,
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Round {label}
          </Typography>
          {payload.map((entry: any, index: number) => (
            <Typography key={index} variant="body2" sx={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };

  const renderNetworkSurvivalChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="round"
          label={{
            value: "Simulation Round",
            position: "insideBottom",
            offset: -10,
          }}
        />
        <YAxis
          label={{ value: "Alive Sensors", angle: -90, position: "insideLeft" }}
        />
        <RechartsTooltip content={<CustomTooltip />} />
        <Legend />
        <Area
          type="monotone"
          dataKey="kmeans_alive"
          stackId="1"
          stroke="#1976d2"
          fill="#1976d2"
          fillOpacity={0.3}
          name="K-Means Alive"
        />
        <Area
          type="monotone"
          dataKey="leach_alive"
          stackId="2"
          stroke="#ed6c02"
          fill="#ed6c02"
          fillOpacity={0.3}
          name="LEACH Alive"
        />
        <Area
          type="monotone"
          dataKey="infokmeans_alive"
          stackId="3"
          stroke="#9c27b0"
          fill="#9c27b0"
          fillOpacity={0.3}
          name="Info-KMeans Alive"
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  const renderEnergyComparisonChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="round"
          label={{
            value: "Simulation Round",
            position: "insideBottom",
            offset: -10,
          }}
        />
        <YAxis
          label={{ value: "Total Energy", angle: -90, position: "insideLeft" }}
        />
        <RechartsTooltip content={<CustomTooltip />} />
        <Legend />
        <Line
          type="monotone"
          dataKey="kmeans_energy"
          stroke="#1976d2"
          strokeWidth={2}
          dot={false}
          name="K-Means Total Energy"
        />
        <Line
          type="monotone"
          dataKey="leach_energy"
          stroke="#ed6c02"
          strokeWidth={2}
          dot={false}
          name="LEACH Total Energy"
        />
        <Line
          type="monotone"
          dataKey="infokmeans_energy"
          stroke="#9c27b0"
          strokeWidth={2}
          dot={false}
          name="Info-KMeans Total Energy"
        />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderInfoKMeansChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="round"
          label={{
            value: "Simulation Round",
            position: "insideBottom",
            offset: -10,
          }}
        />
        <YAxis
          label={{
            value: "Number of Nodes",
            angle: -90,
            position: "insideLeft",
          }}
        />
        <RechartsTooltip content={<CustomTooltip />} />
        <Legend />
        <Area
          type="monotone"
          dataKey="infokmeans_active"
          stackId="1"
          stroke="#2e7d32"
          fill="#2e7d32"
          fillOpacity={0.6}
          name="Active Nodes"
        />
        <Area
          type="monotone"
          dataKey="infokmeans_sleeping"
          stackId="1"
          stroke="#757575"
          fill="#757575"
          fillOpacity={0.4}
          name="Sleeping Nodes"
        />
      </AreaChart>
    </ResponsiveContainer>
  );

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

          {/* Algorithm Performance Comparison */}
          {renderAlgorithmComparison()}

          {/* Detailed Performance Analysis moved here */}
          <Divider sx={{ my: 3 }} />

          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <ShowChart />
            <Typography variant="h6">Detailed Performance Analysis</Typography>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
              <Tab
                label="Network Survival"
                icon={<NetworkWifi />}
                iconPosition="start"
              />
              <Tab
                label="Energy Trends"
                icon={<BatteryFull />}
                iconPosition="start"
              />
              <Tab
                label="Info-KMeans Details"
                icon={<RemoveRedEye />}
                iconPosition="start"
              />
            </Tabs>

            {tabValue === 0 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Network Survival Over Time
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Shows how many sensors remain alive throughout the simulation
                </Typography>
                {renderNetworkSurvivalChart()}
              </Box>
            )}

            {tabValue === 1 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Energy Analysis
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Total energy consumption comparison across algorithms
                </Typography>
                {renderEnergyComparisonChart()}
              </Box>
            )}

            {tabValue === 2 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Info-KMeans: Active vs Sleeping Nodes
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Shows how Info-KMeans dynamically manages node states based on
                  information content
                </Typography>
                {renderInfoKMeansChart()}

                <Box sx={{ mt: 2, p: 2, bgcolor: "info.50", borderRadius: 1 }}>
                  <Typography variant="body2" color="info.main">
                    <strong>Info-KMeans Advantage:</strong> By intelligently
                    putting low-information nodes to sleep, this algorithm
                    reduces overall energy consumption while maintaining network
                    coverage and data quality. Sleeping nodes consume minimal
                    energy and can be awakened when their information becomes
                    valuable again.
                  </Typography>
                </Box>
              </Box>
            )}
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
