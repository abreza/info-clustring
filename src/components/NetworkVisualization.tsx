import React from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
  Tooltip,
  IconButton,
} from "@mui/material";
import {
  NetworkWifi,
  BatteryFull,
  Fullscreen,
  Download,
} from "@mui/icons-material";
import {
  SimulationResult,
  SimulationConfig,
  SimulationStats,
  Sensor,
  AlgorithmType,
} from "../service/types";

interface NetworkVisualizationProps {
  simulationResult: SimulationResult | null;
  config: SimulationConfig;
  currentRound: number;
  stats: SimulationStats | null;
  algorithm: AlgorithmType;
}

export function NetworkVisualization({
  simulationResult,
  config,
  currentRound,
  stats,
  algorithm,
}: NetworkVisualizationProps) {
  if (!simulationResult) {
    return (
      <Paper
        sx={{
          p: 4,
          height: 500,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box textAlign="center">
          <NetworkWifi sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No simulation data
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Start a simulation to visualize the sensor network
          </Typography>
        </Box>
      </Paper>
    );
  }

  const getCurrentRoundSensors = (): Sensor[] => {
    const algorithmResult = simulationResult.algorithms[algorithm];

    if (currentRound >= algorithmResult.history.length) {
      return simulationResult.sensors;
    }

    const historyItem = algorithmResult.history[currentRound];
    const sensorMap = new Map<number, Sensor>();

    simulationResult.sensors.forEach((sensor) => {
      sensorMap.set(sensor.id, {
        id: sensor.id,
        x: sensor.x,
        y: sensor.y,
        energy: 0,
      });
    });

    historyItem.clusters.forEach((cluster) => {
      cluster.members.forEach((member) => {
        sensorMap.set(member.id, {
          id: member.id,
          x: member.x,
          y: member.y,
          energy: member.energy,
        });
      });
    });

    return Array.from(sensorMap.values());
  };

  const sensors = getCurrentRoundSensors();

  const getCurrentRoundClusters = () => {
    const algorithmResult = simulationResult.algorithms[algorithm];

    if (currentRound >= algorithmResult.history.length) {
      return [];
    }
    return algorithmResult.history[currentRound].clusters;
  };

  const clusters = getCurrentRoundClusters();

  // Color scheme for different algorithms
  const getAlgorithmColor = () => {
    return algorithm === "kmeans" ? "#2196F3" : "#FF9800";
  };

  const algorithmColor = getAlgorithmColor();

  return (
    <Paper sx={{ p: 2, height: 500 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h6">
            Network Visualization - Round {currentRound}
          </Typography>
          <Chip
            label={algorithm.toUpperCase()}
            color={algorithm === "kmeans" ? "primary" : "warning"}
            size="small"
            variant="outlined"
          />
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="Fullscreen View">
            <IconButton size="small">
              <Fullscreen />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export Visualization">
            <IconButton size="small">
              <Download />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box
        sx={{
          width: "100%",
          height: 400,
          border: "1px solid #ccc",
          position: "relative",
          backgroundColor: "#f8f9fa",
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${config.width} ${config.height}`}
        >
          <defs>
            <pattern
              id="grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="#e0e0e0"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {clusters.map((cluster) => {
            const head = sensors.find((s) => s.id === cluster.headId);
            if (!head || head.energy <= 0) return null;

            return cluster.members
              .filter(
                (member) => member.id !== cluster.headId && member.energy > 0
              )
              .map((member) => (
                <line
                  key={`${cluster.id}-${member.id}`}
                  x1={head.x}
                  y1={head.y}
                  x2={member.x}
                  y2={member.y}
                  stroke={algorithmColor}
                  strokeWidth="1"
                  opacity="0.3"
                  strokeDasharray="2,2"
                />
              ));
          })}

          {sensors.map((sensor) => {
            const isAlive = sensor.energy > 0;
            const energyRatio = Math.max(
              0,
              sensor.energy / config.initialEnergy
            );
            const hue = energyRatio * 120;
            const radius = isAlive ? 3 + energyRatio * 4 : 2;

            const isClusterHead = clusters.some(
              (cluster) => cluster.headId === sensor.id && sensor.energy > 0
            );

            return (
              <g key={sensor.id}>
                <circle
                  cx={sensor.x}
                  cy={sensor.y}
                  r={radius}
                  fill={isAlive ? `hsl(${hue}, 70%, 50%)` : "#999"}
                  stroke={
                    isClusterHead ? algorithmColor : isAlive ? "#333" : "#666"
                  }
                  strokeWidth={isClusterHead ? 2 : 0.5}
                  opacity={isAlive ? 0.8 : 0.3}
                />

                {isClusterHead && (
                  <circle
                    cx={sensor.x}
                    cy={sensor.y}
                    r={radius + 3}
                    fill="none"
                    stroke={algorithmColor}
                    strokeWidth={1.5}
                    opacity={0.6}
                  />
                )}

                {isAlive && energyRatio > 0.8 && (
                  <circle
                    cx={sensor.x}
                    cy={sensor.y}
                    r={radius + 2}
                    fill="none"
                    stroke={`hsl(${hue}, 70%, 50%)`}
                    strokeWidth={1}
                    opacity={0.3}
                  />
                )}

                {isAlive && (
                  <text
                    x={sensor.x}
                    y={sensor.y - radius - 5}
                    fontSize="8"
                    fill="#333"
                    textAnchor="middle"
                    opacity="0.7"
                  >
                    {sensor.energy.toFixed(1)}
                  </text>
                )}
              </g>
            );
          })}

          <g transform="translate(10, 10)">
            <rect
              width="160"
              height="100"
              fill="white"
              fillOpacity="0.9"
              stroke="#ccc"
              rx="4"
            />
            <text x="10" y="20" fontSize="10" fill="#333" fontWeight="bold">
              Energy Level:
            </text>
            <circle cx="20" cy="35" r="3" fill="hsl(120, 70%, 50%)" />
            <text x="30" y="39" fontSize="9" fill="#333">
              High (Green)
            </text>
            <circle cx="100" cy="35" r="3" fill="hsl(60, 70%, 50%)" />
            <text x="110" y="39" fontSize="9" fill="#333">
              Medium
            </text>
            <circle cx="20" cy="50" r="3" fill="hsl(0, 70%, 50%)" />
            <text x="30" y="54" fontSize="9" fill="#333">
              Low (Red)
            </text>
            <circle cx="100" cy="50" r="2" fill="#999" />
            <text x="110" y="54" fontSize="9" fill="#333">
              Dead
            </text>
            <circle
              cx="20"
              cy="65"
              r="3"
              fill="hsl(60, 70%, 50%)"
              stroke={algorithmColor}
              strokeWidth="2"
            />
            <text x="30" y="69" fontSize="9" fill="#333">
              Cluster Head
            </text>
            <text
              x="10"
              y="85"
              fontSize="8"
              fill={algorithmColor}
              fontWeight="bold"
            >
              Algorithm: {algorithm.toUpperCase()}
            </text>
          </g>
        </svg>
      </Box>

      {stats && (
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
          <Chip
            label={`Network Life: ${simulationResult.algorithms[algorithm].networkLifetime} rounds`}
            color={algorithm === "kmeans" ? "primary" : "warning"}
            size="small"
            variant="outlined"
          />
        </Box>
      )}
    </Paper>
  );
}
