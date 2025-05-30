// src/components/SimulationStats.tsx
import React, { useMemo } from "react";
import {
  Box,
  Card,
  Paper,
  Typography,
  LinearProgress,
  Grid,
  Tabs,
  Tab,
  Divider,
} from "@mui/material";
import {
  Timeline,
  NetworkWifi,
  BatteryFull,
  CompareArrows,
  ShowChart,
  Assessment,
} from "@mui/icons-material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";
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

interface ChartDataPoint {
  round: number;
  kmeans_alive: number;
  leach_alive: number;
  kmeans_energy: number;
  leach_energy: number;
  kmeans_clusters: number;
  leach_clusters: number;
  kmeans_avg_energy: number;
  leach_avg_energy: number;
}

export function SimulationStatsComponent({
  simulationResult,
  config,
  currentRound,
  stats,
  algorithm,
}: SimulationStatsProps) {
  const [tabValue, setTabValue] = React.useState(0);

  // Prepare chart data
  const chartData = useMemo((): ChartDataPoint[] => {
    if (!simulationResult) return [];

    const kmeansHistory = simulationResult.algorithms.kmeans.history;
    const leachHistory = simulationResult.algorithms.leach.history;
    const maxLength = Math.max(kmeansHistory.length, leachHistory.length);

    const data: ChartDataPoint[] = [];

    for (let round = 0; round < maxLength; round++) {
      const kmeansData =
        round < kmeansHistory.length ? kmeansHistory[round] : null;
      const leachData =
        round < leachHistory.length ? leachHistory[round] : null;

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

      data.push({
        round,
        kmeans_alive: kmeansAlive,
        leach_alive: leachAlive,
        kmeans_energy: Math.round(kmeansEnergy),
        leach_energy: Math.round(leachEnergy),
        kmeans_clusters: kmeansClusters,
        leach_clusters: leachClusters,
        kmeans_avg_energy:
          kmeansAlive > 0
            ? Math.round((kmeansEnergy / kmeansAlive) * 10) / 10
            : 0,
        leach_avg_energy:
          leachAlive > 0 ? Math.round((leachEnergy / leachAlive) * 10) / 10 : 0,
      });
    }

    return data;
  }, [simulationResult]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

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

      <Grid size={{ xs: 12 }}>
        <Card
          variant="outlined"
          sx={{
            p: 2,
            textAlign: "center",
            bgcolor: `${algorithm === "kmeans" ? "primary" : "warning"}.50`,
          }}
        >
          <Typography
            variant="h5"
            color={`${algorithm === "kmeans" ? "primary" : "warning"}.main`}
          >
            {algorithmResult.networkLifetime}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Network Lifetime (Rounds) - {algorithm.toUpperCase()}
          </Typography>
        </Card>
      </Grid>
    </Grid>
  );

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
        <Tooltip content={<CustomTooltip />} />
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
        <Tooltip content={<CustomTooltip />} />
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
      </LineChart>
    </ResponsiveContainer>
  );

  const renderAverageEnergyChart = () => (
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
            value: "Average Energy per Sensor",
            angle: -90,
            position: "insideLeft",
          }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line
          type="monotone"
          dataKey="kmeans_avg_energy"
          stroke="#2e7d32"
          strokeWidth={2}
          dot={false}
          name="K-Means Avg Energy"
        />
        <Line
          type="monotone"
          dataKey="leach_avg_energy"
          stroke="#9c27b0"
          strokeWidth={2}
          dot={false}
          name="LEACH Avg Energy"
        />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderClusteringEfficiencyChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={chartData.filter((_, i) => i % 5 === 0)}
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
            value: "Number of Clusters",
            angle: -90,
            position: "insideLeft",
          }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar dataKey="kmeans_clusters" fill="#1976d2" name="K-Means Clusters" />
        <Bar dataKey="leach_clusters" fill="#ed6c02" name="LEACH Clusters" />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderAlgorithmComparison = () => (
    <Card variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <CompareArrows />
        <Typography variant="subtitle1" fontWeight="bold">
          Performance Summary
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 6 }}>
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
              rounds survived
            </Typography>
          </Box>
        </Grid>

        <Grid size={{ xs: 6 }}>
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
              rounds survived
            </Typography>
          </Box>
        </Grid>
      </Grid>

      <Box mt={2} textAlign="center">
        <Typography variant="body2" color="text.secondary">
          {simulationResult.algorithms.kmeans.networkLifetime >
          simulationResult.algorithms.leach.networkLifetime
            ? `K-Means outlasts LEACH by ${
                simulationResult.algorithms.kmeans.networkLifetime -
                simulationResult.algorithms.leach.networkLifetime
              } rounds`
            : simulationResult.algorithms.leach.networkLifetime >
              simulationResult.algorithms.kmeans.networkLifetime
            ? `LEACH outlasts K-Means by ${
                simulationResult.algorithms.leach.networkLifetime -
                simulationResult.algorithms.kmeans.networkLifetime
              } rounds`
            : "Both algorithms perform equally"}
        </Typography>
      </Box>
    </Card>
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
          color={algorithm === "kmeans" ? "primary" : "warning"}
        />
      </Box>

      <Typography variant="h6" gutterBottom>
        Current Statistics ({algorithm.toUpperCase()})
      </Typography>

      {renderCurrentStats()}

      <Divider sx={{ my: 3 }} />

      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <ShowChart />
        <Typography variant="h6">Algorithm Performance Comparison</Typography>
      </Box>

      {renderAlgorithmComparison()}

      <Box sx={{ mt: 3 }}>
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
          <Tab label="Clustering" icon={<Assessment />} iconPosition="start" />
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
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Total Energy Consumption
                </Typography>
                {renderEnergyComparisonChart()}
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Average Energy per Sensor
                </Typography>
                {renderAverageEnergyChart()}
              </Grid>
            </Grid>
          </Box>
        )}

        {tabValue === 2 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Clustering Efficiency
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Number of active clusters over time (sampled every 5 rounds)
            </Typography>
            {renderClusteringEfficiencyChart()}
          </Box>
        )}
      </Box>
    </Paper>
  );
}
