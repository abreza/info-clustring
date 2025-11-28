import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Slider,
  IconButton,
  Tooltip,
  Chip,
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
import {
  getAlgorithmColor,
  ALGORITHM_LABELS,
  ALL_ALGORITHMS,
} from "../constants";

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

type ChartDataPoint = {
  round: number;
  [key: string]: number;
};

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

    let maxRounds = 0;
    ALL_ALGORITHMS.forEach((algo) => {
      const historyLen = simulationResult.algorithms[algo]?.history.length || 0;
      const errorLen =
        simulationResult.algorithms[algo]?.estimationErrors?.length || 0;
      maxRounds = Math.max(maxRounds, historyLen, errorLen);
    });

    const data: ChartDataPoint[] = [];

    for (let round = 0; round < maxRounds; round++) {
      const point: ChartDataPoint = { round };

      ALL_ALGORITHMS.forEach((algo) => {
        const algoResult = simulationResult.algorithms[algo];
        if (!algoResult) return;

        if (round < algoResult.history.length) {
          const h = algoResult.history[round];

          const allMembers = h.clusters.flatMap((c) => [
            ...c.members,
            ...(c.sleepingMembers || []),
          ]);
          const aliveSensors = allMembers.filter((s) => s.energy > 0);

          point[`${algo}_alive`] = aliveSensors.length;
          point[`${algo}_energy`] = Math.round(
            aliveSensors.reduce((sum, s) => sum + s.energy, 0)
          );
          point[`${algo}_clusters`] = h.clusters.length;

          if (["info-kmeans", "lcssm", "random-kmeans"].includes(algo)) {
            const sleeping = aliveSensors.filter((s) => s.isAsleep).length;
            point[`${algo}_sleeping`] = sleeping;
            point[`${algo}_active`] = aliveSensors.length - sleeping;
          }
        }

        const errArray = algoResult.estimationErrors || [];
        const currentErr = round < errArray.length ? errArray[round] : 0;
        const prevErr =
          round > 0 ? (data[round - 1][`${algo}_cumErr`] as number) || 0 : 0;

        point[`${algo}_cumErr`] = prevErr + currentErr;
      });

      data.push(point);
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
      const allMembers = h.clusters.flatMap((c) => [
        ...c.members,
        ...(c.sleepingMembers || []),
      ]);
      const aliveSensors = allMembers.filter((s) => s.energy > 0);
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
        <Typography variant="caption" sx={{ minWidth: 90 }}>
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

    let winner = "";
    let maxLifetime = -1;

    ALL_ALGORITHMS.forEach((algo) => {
      const lifetime = simulationResult.algorithms[algo].networkLifetime;
      if (lifetime > maxLifetime) {
        maxLifetime = lifetime;
        winner = ALGORITHM_LABELS[algo];
      }
    });

    return (
      <Card variant="outlined" sx={{ p: 2, bgcolor: "grey.50", mt: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <CompareArrows />
          <Typography variant="subtitle1" fontWeight="bold">
            Algorithm Performance Comparison (Network Lifetime)
          </Typography>
        </Box>

        <Grid container spacing={2}>
          {ALL_ALGORITHMS.map((algo) => (
            <Grid size={{ xs: 6, sm: 4, md: 3 }} key={algo}>
              <AlgoBox
                label={ALGORITHM_LABELS[algo]}
                color={getAlgorithmColor(algo)}
                value={simulationResult.algorithms[algo].networkLifetime}
              />
            </Grid>
          ))}
        </Grid>

        <Box mt={2} textAlign="center">
          <Typography variant="body2" color="text.secondary">
            <strong>{winner}</strong> achieves the best network lifetime.
          </Typography>
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
    color: string;
    value: number;
  }) => (
    <Box
      textAlign="center"
      p={1}
      sx={{
        border: `1px solid ${color}`,
        borderRadius: 1,
        bgcolor: "white",
      }}
    >
      <Typography variant="caption" sx={{ color: color, fontWeight: "bold" }}>
        {label}
      </Typography>
      <Typography variant="h6" sx={{ color: color }}>
        {value}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontSize: "0.65rem" }}
      >
        rounds
      </Typography>
    </Box>
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const sortedPayload = [...payload].sort(
        (a: any, b: any) => b.value - a.value
      );

      return (
        <Box
          sx={{
            bgcolor: "rgba(255, 255, 255, 0.95)",
            p: 1.5,
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            boxShadow: 2,
            fontSize: "0.75rem",
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Round {label}
          </Typography>
          {sortedPayload.map((p: any, i: number) => (
            <Box key={i} display="flex" justifyContent="space-between" gap={2}>
              <Typography
                variant="body2"
                sx={{ color: p.color, fontSize: "0.75rem" }}
              >
                {p.name}:
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: "bold", fontSize: "0.75rem" }}
              >
                {p.value.toFixed(1)}
              </Typography>
            </Box>
          ))}
        </Box>
      );
    }
    return null;
  };

  const renderAlgorithmLines = (dataKeySuffix: string) => {
    return ALL_ALGORITHMS.map((algo) => (
      <Line
        key={algo}
        type="monotone"
        dataKey={`${algo}_${dataKeySuffix}`}
        stroke={getAlgorithmColor(algo)}
        strokeWidth={algorithm === algo ? 3 : 1.5}
        opacity={algorithm === algo ? 1 : 0.6}
        dot={false}
        name={ALGORITHM_LABELS[algo]}
      />
    ));
  };

  const renderNetworkSurvivalChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="round"
          label={{ value: "Round", position: "insideBottomRight", offset: -5 }}
        />
        <YAxis
          label={{ value: "Alive Nodes", angle: -90, position: "insideLeft" }}
        />
        <RechartsTooltip content={<CustomTooltip />} />
        <Legend />
        {renderAlgorithmLines("alive")}
      </LineChart>
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
          label={{ value: "Round", position: "insideBottomRight", offset: -5 }}
        />
        <YAxis
          label={{ value: "Total Energy", angle: -90, position: "insideLeft" }}
        />
        <RechartsTooltip content={<CustomTooltip />} />
        <Legend />
        {renderAlgorithmLines("energy")}
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
        <XAxis dataKey="round" />
        <YAxis />
        <RechartsTooltip content={<CustomTooltip />} />
        <Legend />
        <Area
          type="monotone"
          dataKey={`${algorithm}_active`}
          stackId="1"
          stroke="#2e7d32"
          fill="#2e7d32"
          name="Active"
        />
        <Area
          type="monotone"
          dataKey={`${algorithm}_sleeping`}
          stackId="1"
          stroke="#757575"
          fill="#757575"
          name="Sleeping"
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  const renderErrorChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="round" />
        <YAxis
          label={{
            value: "Cumulative Error",
            angle: -90,
            position: "insideLeft",
          }}
        />
        <RechartsTooltip content={<CustomTooltip />} />
        <Legend />
        {renderAlgorithmLines("cumErr")}
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
          for all 7 algorithms simultaneously.
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={isLoading ? <CircularProgress size={16} /> : <PlayArrow />}
          onClick={onStartSimulation}
          disabled={isLoading}
          sx={{ mb: 2 }}
        >
          {isLoading ? "Calculating..." : "Start Benchmark"}
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
  const algoColor = getAlgorithmColor(algorithm);

  return (
    <Paper sx={{ p: 3 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6">
          Playback: {ALGORITHM_LABELS[algorithm]}
        </Typography>
        <Box display="flex" gap={1}>
          {stats && (
            <>
              <Chip
                icon={<NetworkWifi />}
                label={`${stats.aliveSensors}/${config.numSensors}`}
                sx={{
                  bgcolor: `${algoColor}22`,
                  color: algoColor,
                  borderColor: algoColor,
                }}
                variant="outlined"
                size="small"
              />
              <Chip
                icon={<BatteryFull />}
                label={`${stats.totalEnergy.toFixed(0)}`}
                color="success"
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
            sx={{ minWidth: 120 }}
          >
            {isLoading
              ? "Loading"
              : isRunning && !isPaused
              ? "Running"
              : simulationResult
              ? "Restart"
              : "Start"}
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
            label="Auto"
          />

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              minWidth: 150,
            }}
          >
            <Typography variant="body2">Speed:</Typography>
            <Slider
              value={1000 - playbackSpeed}
              onChange={(_, v) => onPlaybackSpeedChange(1000 - (v as number))}
              min={100}
              max={950}
              step={50}
              size="small"
              sx={{ flex: 1 }}
            />
          </Box>
        </Box>
      </Box>

      {simulationResult && (
        <>
          <Box sx={{ mb: 3 }}>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <IconButton
                onClick={handlePrevious}
                disabled={currentRound === 0}
                size="small"
              >
                <SkipPrevious />
              </IconButton>

              <Box sx={{ flex: 1, mx: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Round {currentRound} / {maxRounds}
                </Typography>
                <Slider
                  value={currentRound}
                  onChange={handleRoundChange}
                  min={0}
                  max={maxRounds}
                  marks={getSliderMarks()}
                  sx={{ "& .MuiSlider-markLabel": { fontSize: "0.6rem" } }}
                />
              </Box>

              <IconButton
                onClick={handleNext}
                disabled={currentRound >= maxRounds}
                size="small"
              >
                <SkipNext />
              </IconButton>
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {renderMiniChart(metrics.aliveHistory, algoColor, "Alive Sensors")}
            {renderMiniChart(metrics.energyHistory, algoColor, "Total Energy")}
          </Box>

          {renderAlgorithmComparison()}

          <Divider sx={{ my: 3 }} />

          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <ShowChart />
            <Typography variant="h6">Performance Analysis</Typography>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              sx={{ mb: 2 }}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab
                label="Survival"
                icon={<NetworkWifi />}
                iconPosition="start"
              />
              <Tab label="Energy" icon={<BatteryFull />} iconPosition="start" />
              <Tab
                label="Error (MAE)"
                icon={<ErrorOutline />}
                iconPosition="start"
              />
              {(algorithm === "info-kmeans" ||
                algorithm === "lcssm" ||
                algorithm === "random-kmeans") && (
                <Tab
                  label="Sleep Cycle"
                  icon={<RemoveRedEye />}
                  iconPosition="start"
                />
              )}
            </Tabs>

            {tabValue === 0 && (
              <Box>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  Comparitive Network Lifetime (Alive Nodes)
                </Typography>
                {renderNetworkSurvivalChart()}
              </Box>
            )}

            {tabValue === 1 && (
              <Box>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  Energy Consumption Over Time
                </Typography>
                {renderEnergyComparisonChart()}
              </Box>
            )}

            {tabValue === 2 && (
              <Box>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  Data Reconstruction Error (Cumulative Mean Absolute Error)
                </Typography>
                {renderErrorChart()}
              </Box>
            )}

            {tabValue === 3 && (
              <Box>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  Active vs Sleeping Nodes ({ALGORITHM_LABELS[algorithm]})
                </Typography>
                {renderInfoKMeansChart()}
              </Box>
            )}
          </Box>
        </>
      )}
    </Paper>
  );
}
