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
  ErrorOutline,
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
  kmeans_cumErr: number;
  leach_cumErr: number;
  infokmeans_cumErr: number;
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

  const chartData = useMemo((): ChartDataPoint[] => {
    if (!simulationResult) return [];

    const kmeansHistory = simulationResult.algorithms.kmeans.history;
    const leachHistory = simulationResult.algorithms.leach.history;
    const infoKmeansHistory =
      simulationResult.algorithms["info-kmeans"].history;

    const kmeansErr = simulationResult.algorithms.kmeans.estimationErrors || [];
    const leachErr = simulationResult.algorithms.leach.estimationErrors || [];
    const infoKmeansErr =
      simulationResult.algorithms["info-kmeans"].estimationErrors || [];

    const maxErrorLength = Math.max(
      kmeansErr.length,
      leachErr.length,
      infoKmeansErr.length
    );

    const maxHistoryLength = Math.max(
      kmeansHistory.length,
      leachHistory.length,
      infoKmeansHistory.length
    );

    const maxLength = Math.max(maxErrorLength, maxHistoryLength);

    const data: ChartDataPoint[] = [];

    for (let round = 0; round < maxLength; round++) {
      let kmeansAlive = 0;
      let kmeansEnergy = 0;
      let kmeansClusters = 0;

      if (round < kmeansHistory.length) {
        const h = kmeansHistory[round];
        const aliveSensors = h.clusters
          .flatMap((c) => c.members)
          .filter((s) => s.energy > 0);
        kmeansAlive = aliveSensors.length;
        kmeansEnergy = aliveSensors.reduce((sum, s) => sum + s.energy, 0);
        kmeansClusters = h.clusters.length;
      }

      let leachAlive = 0;
      let leachEnergy = 0;
      let leachClusters = 0;

      if (round < leachHistory.length) {
        const h = leachHistory[round];
        const aliveSensors = h.clusters
          .flatMap((c) => c.members)
          .filter((s) => s.energy > 0);
        leachAlive = aliveSensors.length;
        leachEnergy = aliveSensors.reduce((sum, s) => sum + s.energy, 0);
        leachClusters = h.clusters.length;
      }

      let infoAlive = 0;
      let infoEnergy = 0;
      let infoClusters = 0;
      let infoSleeping = 0;
      let infoActive = 0;

      if (round < infoKmeansHistory.length) {
        const h = infoKmeansHistory[round];
        const allMembers = h.clusters.flatMap((c) => [
          ...c.members,
          ...(c.sleepingMembers || []),
        ]);
        const aliveSensors = allMembers.filter((s) => s.energy > 0);
        infoAlive = aliveSensors.length;
        infoEnergy = aliveSensors.reduce((sum, s) => sum + s.energy, 0);
        infoClusters = h.clusters.length;
        infoSleeping = aliveSensors.filter((s) => s.isAsleep).length;
        infoActive = infoAlive - infoSleeping;
      }

      const prev = round > 0 ? data[round - 1] : null;

      const kErr = round < kmeansErr.length ? kmeansErr[round] : 0;
      const lErr = round < leachErr.length ? leachErr[round] : 0;
      const iErr = round < infoKmeansErr.length ? infoKmeansErr[round] : 0;

      data.push({
        round,
        kmeans_alive: kmeansAlive,
        leach_alive: leachAlive,
        infokmeans_alive: infoAlive,
        kmeans_energy: Math.round(kmeansEnergy),
        leach_energy: Math.round(leachEnergy),
        infokmeans_energy: Math.round(infoEnergy),
        kmeans_clusters: kmeansClusters,
        leach_clusters: leachClusters,
        infokmeans_clusters: infoClusters,
        kmeans_avg_energy: kmeansAlive
          ? Math.round((kmeansEnergy / kmeansAlive) * 10) / 10
          : 0,
        leach_avg_energy: leachAlive
          ? Math.round((leachEnergy / leachAlive) * 10) / 10
          : 0,
        infokmeans_avg_energy: infoAlive
          ? Math.round((infoEnergy / infoAlive) * 10) / 10
          : 0,
        infokmeans_sleeping: infoSleeping,
        infokmeans_active: infoActive,
        kmeans_cumErr: (prev?.kmeans_cumErr || 0) + kErr,
        leach_cumErr: (prev?.leach_cumErr || 0) + lErr,
        infokmeans_cumErr: (prev?.infokmeans_cumErr || 0) + iErr,
      });
    }

    return data;
  }, [simulationResult]);

  useEffect(() => {
    if (!simulationResult) {
      setMetrics({ aliveHistory: [], energyHistory: [], clusterHistory: [] });
      return;
    }

    const algResult = simulationResult.algorithms[algorithm];
    const alive: number[] = [];
    const energy: number[] = [];
    const cluster: number[] = [];

    for (const h of algResult.history) {
      const aliveSensors = h.clusters
        .flatMap((c) => c.members)
        .filter((s) => s.energy > 0);
      alive.push(aliveSensors.length);
      energy.push(aliveSensors.reduce((sum, s) => sum + s.energy, 0));
      cluster.push(h.clusters.length);
    }

    setMetrics({
      aliveHistory: alive,
      energyHistory: energy,
      clusterHistory: cluster,
    });
  }, [simulationResult, algorithm]);

  const handleTabChange = (_: React.SyntheticEvent, val: number) => {
    setTabValue(val);
  };

  const handleRoundChange = (_: Event, value: number | number[]) => {
    const newRound = Array.isArray(value) ? value[0] : value;
    onRoundChange(newRound);
  };

  const handlePrevious = () => {
    if (currentRound > 0) onRoundChange(currentRound - 1);
  };

  const handleNext = () => {
    if (!simulationResult) return;
    const maxRounds = simulationResult.algorithms[algorithm].history.length - 1;
    if (currentRound < maxRounds) onRoundChange(currentRound + 1);
  };

  const getSliderMarks = () => {
    if (!simulationResult) return [];
    const total = simulationResult.algorithms[algorithm].history.length;
    const interval = Math.max(1, Math.floor(total / 10));
    const marks = [];
    for (let i = 0; i < total; i += interval)
      marks.push({ value: i, label: i.toString() });
    if (total > 0)
      marks.push({ value: total - 1, label: (total - 1).toString() });
    return marks;
  };

  const renderMiniChart = (dataArr: number[], color: string, label: string) => {
    if (dataArr.length === 0) return null;
    const max = Math.max(...dataArr);
    const min = Math.min(...dataArr);
    const range = max - min || 1;
    const W = 200;
    const H = 40;
    const points = dataArr
      .map(
        (v, i) =>
          `${(i / (dataArr.length - 1)) * W},${
            H - ((v - min) / range) * (H - 10) - 5
          }`
      )
      .join(" ");

    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}>
        <Typography variant="caption" sx={{ minWidth: 80 }}>
          {label}
        </Typography>
        <svg
          width={W}
          height={H}
          style={{ border: "1px solid #e0e0e0", borderRadius: 4 }}
        >
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth={2}
            opacity={0.8}
          />
          {dataArr.length > 0 && currentRound < dataArr.length && (
            <circle
              cx={(currentRound / (dataArr.length - 1)) * W}
              cy={H - ((dataArr[currentRound] - min) / range) * (H - 10) - 5}
              r={3}
              fill={color}
              stroke="white"
              strokeWidth={2}
            />
          )}
        </svg>
        <Typography variant="caption" color="text.secondary">
          {dataArr[currentRound] !== undefined
            ? dataArr[currentRound].toFixed(0)
            : "0"}
        </Typography>
      </Box>
    );
  };

  const renderAlgorithmComparison = () => {
    if (!simulationResult) return null;
    const { kmeans, leach, "info-kmeans": info } = simulationResult.algorithms;
    const best = Math.max(
      kmeans.networkLifetime,
      leach.networkLifetime,
      info.networkLifetime
    );
    const winner =
      best === info.networkLifetime
        ? "Info-KMeans"
        : best === kmeans.networkLifetime
        ? "K-Means"
        : "LEACH";

    const maxTotalRounds = Math.max(
      kmeans.totalRounds,
      leach.totalRounds,
      info.totalRounds
    );

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
            <AlgoBox
              label="K-MEANS"
              color="primary"
              value={kmeans.networkLifetime}
            />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <AlgoBox
              label="LEACH"
              color="warning"
              value={leach.networkLifetime}
            />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <AlgoBox
              label="INFO-KMEANS"
              color="secondary"
              value={info.networkLifetime}
            />
          </Grid>
        </Grid>

        <Box mt={2} textAlign="center">
          <Typography variant="body2" color="text.secondary">
            {winner} achieves the best lifetime.
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Error estimation extended to {maxTotalRounds} rounds for all
            algorithms.
          </Typography>
          {info.energySavings && (
            <Typography
              variant="caption"
              color="success.main"
              display="block"
              mt={1}
            >
              Info-KMeans saved {info.energySavings.toFixed(1)} units of energy.
            </Typography>
          )}
        </Box>
      </Card>
    );
  };

  const AlgoBox = ({
    label,
    color,
    value,
  }: {
    label: string;
    color: any;
    value: number;
  }) => (
    <Box
      textAlign="center"
      p={2}
      sx={{ bgcolor: `${color}.50`, borderRadius: 1 }}
    >
      <Typography variant="subtitle2" color={`${color}.main`} fontWeight="bold">
        {label}
      </Typography>
      <Typography variant="h6" color={`${color}.main`}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        rounds
      </Typography>
    </Box>
  );

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
          {payload.map((p: any, i: number) => (
            <Typography key={i} variant="body2" sx={{ color: p.color }}>
              {p.name}: {p.value.toFixed(2)}
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
          name="K-Means"
        />
        <Area
          type="monotone"
          dataKey="leach_alive"
          stackId="1"
          stroke="#ed6c02"
          fill="#ed6c02"
          fillOpacity={0.3}
          name="LEACH"
        />
        <Area
          type="monotone"
          dataKey="infokmeans_alive"
          stackId="1"
          stroke="#9c27b0"
          fill="#9c27b0"
          fillOpacity={0.3}
          name="Info-KMeans"
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
          name="K-Means"
        />
        <Line
          type="monotone"
          dataKey="leach_energy"
          stroke="#ed6c02"
          strokeWidth={2}
          dot={false}
          name="LEACH"
        />
        <Line
          type="monotone"
          dataKey="infokmeans_energy"
          stroke="#9c27b0"
          strokeWidth={2}
          dot={false}
          name="Info-KMeans"
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
          name="Active"
        />
        <Area
          type="monotone"
          dataKey="infokmeans_sleeping"
          stackId="1"
          stroke="#757575"
          fill="#757575"
          fillOpacity={0.4}
          name="Sleeping"
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  console.log(chartData);

  const renderErrorChart = () => (
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
          label={{
            value: "Cumulative MAE",
            angle: -90,
            position: "insideLeft",
          }}
        />
        <RechartsTooltip content={<CustomTooltip />} />
        <Legend />
        <Line
          type="monotone"
          dataKey="kmeans_cumErr"
          stroke="#1976d2"
          strokeWidth={2}
          dot={false}
          name="K-Means"
        />
        <Line
          type="monotone"
          dataKey="leach_cumErr"
          stroke="#ed6c02"
          strokeWidth={2}
          dot={false}
          name="LEACH"
        />
        <Line
          type="monotone"
          dataKey="infokmeans_cumErr"
          stroke="#9c27b0"
          strokeWidth={2}
          dot={false}
          name="Info-KMeans"
        />
      </LineChart>
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
              onChange={(_, v) => onPlaybackSpeedChange(1000 - (v as number))}
              min={100}
              max={900}
              step={100}
              size="small"
              valueLabelFormat={(v) => `${Math.round((1000 - v) / 100)}x`}
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
                  sx={{ "& .MuiSlider-markLabel": { fontSize: "0.7rem" } }}
                />
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {renderMiniChart(
              metrics.aliveHistory,
              algorithm === "kmeans"
                ? "#1976d2"
                : algorithm === "leach"
                ? "#ed6c02"
                : "#9c27b0",
              "Alive Sensors"
            )}
            {renderMiniChart(metrics.energyHistory, "#2e7d32", "Total Energy")}
            {renderMiniChart(
              metrics.clusterHistory,
              "#9c27b0",
              "Active Clusters"
            )}
          </Box>

          {renderAlgorithmComparison()}

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
              <Tab
                label="Cum. Estimation Error"
                icon={<ErrorOutline />}
                iconPosition="start"
              />
            </Tabs>

            {tabValue === 0 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Network Survival Over Time
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Alive-sensor count across rounds.
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
                  Total energy remaining per algorithm.
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
                  Dynamic sleep scheduling behaviour.
                </Typography>
                {renderInfoKMeansChart()}
                <Box sx={{ mt: 2, p: 2, bgcolor: "info.50", borderRadius: 1 }}>
                  <Typography variant="body2" color="info.main">
                    <strong>Info-KMeans Advantage:</strong> puts low-information
                    nodes to sleep, saving energy without sacrificing coverage.
                  </Typography>
                </Box>
              </Box>
            )}

            {tabValue === 3 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Cumulative Mean Absolute Estimation Error
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Lower curves indicate better ability to reconstruct readings
                  of sleeping/dead nodes. Error calculation extended to maximum
                  rounds achieved by any algorithm using last known values for
                  dead neighbors.
                </Typography>
                {renderErrorChart()}
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
                  " (network failed)"}
              </Typography>
            </Box>
          )}
        </>
      )}
    </Paper>
  );
}
