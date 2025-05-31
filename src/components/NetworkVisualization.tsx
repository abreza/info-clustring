import React, { useState, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
  Tooltip,
  IconButton,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import {
  NetworkWifi,
  BatteryFull,
  Fullscreen,
  Download,
  RemoveRedEye,
} from "@mui/icons-material";
import {
  SimulationResult,
  SimulationConfig,
  SimulationStats,
  Sensor,
  SensorData,
  AlgorithmType,
} from "../service/types";

interface NetworkVisualizationProps {
  simulationResult: SimulationResult | null;
  config: SimulationConfig;
  currentRound: number;
  stats: SimulationStats | null;
  algorithm: AlgorithmType;
}

interface HoveredSensorInfo {
  sensor: Sensor;
  sensorData?: SensorData;
  isClusterHead: boolean;
  clusterInfo?: {
    clusterId: number;
    memberCount: number;
    sleepingMemberCount?: number;
  };
  position: { x: number; y: number };
}

export function NetworkVisualization({
  simulationResult,
  config,
  currentRound,
  stats,
  algorithm,
}: NetworkVisualizationProps) {
  const [hoveredSensor, setHoveredSensor] = useState<HoveredSensorInfo | null>(
    null
  );
  const svgRef = useRef<SVGSVGElement>(null);

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
        isAsleep: false,
      });
    });

    historyItem.clusters.forEach((cluster) => {
      cluster.members.forEach((member) => {
        sensorMap.set(member.id, {
          id: member.id,
          x: member.x,
          y: member.y,
          energy: member.energy,
          isAsleep: member.isAsleep || false,
        });
      });

      if (cluster.sleepingMembers) {
        cluster.sleepingMembers.forEach((member) => {
          sensorMap.set(member.id, {
            id: member.id,
            x: member.x,
            y: member.y,
            energy: member.energy,
            isAsleep: true,
          });
        });
      }
    });

    return Array.from(sensorMap.values());
  };

  const getCurrentRoundClusters = () => {
    const algorithmResult = simulationResult.algorithms[algorithm];

    if (currentRound >= algorithmResult.history.length) {
      return [];
    }
    return algorithmResult.history[currentRound].clusters;
  };

  const getCurrentRoundSensorData = (): SensorData[] => {
    const algorithmResult = simulationResult.algorithms[algorithm];

    if (currentRound >= algorithmResult.history.length) {
      return [];
    }
    return algorithmResult.history[currentRound].sensorsData;
  };

  const handleSensorHover = (sensor: Sensor, event: React.MouseEvent) => {
    const clusters = getCurrentRoundClusters();
    const sensorData = getCurrentRoundSensorData();

    const currentSensorData = sensorData.find((sd) => sd.id === sensor.id);

    const cluster = clusters.find((c) => c.headId === sensor.id);
    const isClusterHead = !!cluster;

    let clusterInfo;
    if (cluster) {
      clusterInfo = {
        clusterId: cluster.id,
        memberCount: cluster.members.length,
        sleepingMemberCount: cluster.sleepingMembers?.length || 0,
      };
    }

    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      setHoveredSensor({
        sensor,
        sensorData: currentSensorData,
        isClusterHead,
        clusterInfo,
        position: { x, y },
      });
    }
  };

  const handleSensorLeave = () => {
    setHoveredSensor(null);
  };

  const sensors = getCurrentRoundSensors();
  const clusters = getCurrentRoundClusters();

  const getAlgorithmColor = () => {
    switch (algorithm) {
      case "kmeans":
        return "#2196F3";
      case "leach":
        return "#FF9800";
      case "info-kmeans":
        return "#9C27B0";
      default:
        return "#2196F3";
    }
  };

  const algorithmColor = getAlgorithmColor();

  const renderSensorTooltip = () => {
    if (!hoveredSensor) return null;

    const { sensor, sensorData, isClusterHead, clusterInfo, position } =
      hoveredSensor;
    const energyPercentage = (sensor.energy / config.initialEnergy) * 100;

    return (
      <Box
        sx={{
          position: "absolute",
          left: position.x + 10,
          top: position.y - 10,
          zIndex: 1000,
          pointerEvents: "none",
          maxWidth: 300,
        }}
      >
        <Card
          sx={{
            boxShadow: 3,
            border: isClusterHead
              ? `2px solid ${algorithmColor}`
              : "1px solid #ccc",
            backgroundColor: "rgba(255, 255, 255, 0.98)",
          }}
        >
          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
            {/* Header */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <Typography variant="h6" color="primary">
                Sensor #{sensor.id}
              </Typography>
              {isClusterHead && (
                <Chip
                  label="Cluster Head"
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
              {sensor.isAsleep && (
                <Chip
                  label="Sleeping"
                  size="small"
                  sx={{ backgroundColor: "#666", color: "white" }}
                />
              )}
            </Box>

            {/* Status Information */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Status:</strong> {sensor.energy > 0 ? "Alive" : "Dead"}
                {sensor.energy > 0 && sensor.isAsleep && " (Sleeping)"}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Position:</strong> ({sensor.x.toFixed(1)},{" "}
                {sensor.y.toFixed(1)})
              </Typography>

              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                <BatteryFull
                  sx={{
                    fontSize: 16,
                    color:
                      energyPercentage > 50
                        ? "success.main"
                        : energyPercentage > 20
                        ? "warning.main"
                        : "error.main",
                  }}
                />
                <Typography variant="body2">
                  <strong>Energy:</strong> {sensor.energy.toFixed(1)} /{" "}
                  {config.initialEnergy}
                </Typography>
              </Box>

              <Box sx={{ width: "100%", mb: 1 }}>
                <Box
                  sx={{
                    width: "100%",
                    height: 8,
                    backgroundColor: "#e0e0e0",
                    borderRadius: 4,
                  }}
                >
                  <Box
                    sx={{
                      width: `${Math.min(100, energyPercentage)}%`,
                      height: "100%",
                      backgroundColor:
                        energyPercentage > 50
                          ? "#4caf50"
                          : energyPercentage > 20
                          ? "#ff9800"
                          : "#f44336",
                      transition: "width 0.2s ease",
                    }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {energyPercentage.toFixed(1)}% remaining
                </Typography>
              </Box>
            </Box>

            {/* Cluster Information */}
            {isClusterHead && clusterInfo && (
              <>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="primary" gutterBottom>
                    <strong>
                      Cluster #{clusterInfo.clusterId} Information:
                    </strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Total members: {clusterInfo.memberCount}
                  </Typography>
                  {algorithm === "info-kmeans" &&
                    clusterInfo.sleepingMemberCount !== undefined && (
                      <Typography variant="body2" color="text.secondary">
                        • Sleeping members: {clusterInfo.sleepingMemberCount}
                      </Typography>
                    )}
                  <Typography variant="body2" color="text.secondary">
                    • Active members:{" "}
                    {clusterInfo.memberCount -
                      (clusterInfo.sleepingMemberCount || 0)}
                  </Typography>
                </Box>
              </>
            )}

            {/* Sensor Data */}
            {sensorData && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" color="secondary" gutterBottom>
                  <strong>Environmental Data:</strong>
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Temperature
                    </Typography>
                    <Typography variant="body2">
                      {sensorData.temperature.toFixed(1)}°C
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Salinity
                    </Typography>
                    <Typography variant="body2">
                      {sensorData.salinity.toFixed(1)} PSU
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Pressure
                    </Typography>
                    <Typography variant="body2">
                      {sensorData.pressure.toFixed(1)} kPa
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      pH Level
                    </Typography>
                    <Typography variant="body2">
                      {sensorData.ph.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              </>
            )}

            {/* Algorithm-specific information */}
            {algorithm === "info-kmeans" && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" color="secondary">
                  <strong>Info-KMeans:</strong>{" "}
                  {sensor.isAsleep
                    ? "Low information content - conserving energy"
                    : "High information content - actively monitoring"}
                </Typography>
              </>
            )}
          </CardContent>
        </Card>
      </Box>
    );
  };

  return (
    <Paper sx={{ p: 2, height: 500, position: "relative" }}>
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
        <Box display="flex" gap={1}>
          <Tooltip title="Hover over sensors for detailed information">
            <IconButton size="small">
              <RemoveRedEye />
            </IconButton>
          </Tooltip>
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
        }}
      >
        <svg
          ref={svgRef}
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

          {/* Cluster connections */}
          {clusters.map((cluster) => {
            const head = sensors.find((s) => s.id === cluster.headId);
            if (!head || head.energy <= 0) return null;

            return (
              <g key={`cluster-${cluster.id}`}>
                {/* Connections to active members */}
                {cluster.members
                  .filter(
                    (member) =>
                      member.id !== cluster.headId &&
                      member.energy > 0 &&
                      !member.isAsleep
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
                      opacity="0.6"
                      strokeDasharray="2,2"
                    />
                  ))}

                {/* Connections to sleeping members (dotted lines) */}
                {algorithm === "info-kmeans" &&
                  cluster.sleepingMembers &&
                  cluster.sleepingMembers
                    .filter((member) => member.energy > 0)
                    .map((member) => (
                      <line
                        key={`sleeping-${cluster.id}-${member.id}`}
                        x1={head.x}
                        y1={head.y}
                        x2={member.x}
                        y2={member.y}
                        stroke={algorithmColor}
                        strokeWidth="0.5"
                        opacity="0.3"
                        strokeDasharray="1,3"
                      />
                    ))}
              </g>
            );
          })}

          {/* Sensor nodes */}
          {sensors.map((sensor) => {
            const isAlive = sensor.energy > 0;
            const isAsleep = sensor.isAsleep && isAlive;
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
                {/* Main sensor circle */}
                <circle
                  cx={sensor.x}
                  cy={sensor.y}
                  r={radius}
                  fill={
                    isAsleep
                      ? "#666"
                      : isAlive
                      ? `hsl(${hue}, 70%, 50%)`
                      : "#999"
                  }
                  stroke={
                    isClusterHead ? algorithmColor : isAlive ? "#333" : "#666"
                  }
                  strokeWidth={isClusterHead ? 2 : 0.5}
                  opacity={isAsleep ? 0.5 : isAlive ? 0.8 : 0.3}
                  style={{
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => handleSensorHover(sensor, e)}
                  onMouseLeave={handleSensorLeave}
                  onMouseMove={(e) => handleSensorHover(sensor, e)}
                />

                {/* Cluster head indicator */}
                {isClusterHead && (
                  <circle
                    cx={sensor.x}
                    cy={sensor.y}
                    r={radius + 3}
                    fill="none"
                    stroke={algorithmColor}
                    strokeWidth={1.5}
                    opacity={0.6}
                    style={{ pointerEvents: "none" }}
                  />
                )}

                {/* Sleep indicator */}
                {isAsleep && (
                  <g style={{ pointerEvents: "none" }}>
                    <circle
                      cx={sensor.x}
                      cy={sensor.y}
                      r={radius + 5}
                      fill="none"
                      stroke="#666"
                      strokeWidth={1}
                      opacity={0.4}
                      strokeDasharray="2,2"
                    />
                    <text
                      x={sensor.x + radius + 8}
                      y={sensor.y - radius - 3}
                      fontSize="8"
                      fill="#666"
                      opacity="0.8"
                    >
                      💤
                    </text>
                  </g>
                )}

                {/* High energy glow */}
                {isAlive && !isAsleep && energyRatio > 0.8 && (
                  <circle
                    cx={sensor.x}
                    cy={sensor.y}
                    r={radius + 2}
                    fill="none"
                    stroke={`hsl(${hue}, 70%, 50%)`}
                    strokeWidth={1}
                    opacity={0.3}
                    style={{ pointerEvents: "none" }}
                  />
                )}

                {/* Energy text */}
                {isAlive && !isAsleep && (
                  <text
                    x={sensor.x}
                    y={sensor.y - radius - 5}
                    fontSize="8"
                    fill="#333"
                    textAnchor="middle"
                    opacity="0.7"
                    style={{ pointerEvents: "none" }}
                  >
                    {sensor.energy.toFixed(1)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Legend */}
          <g transform="translate(10, 10)">
            <rect
              width="200"
              height="160"
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
            <circle cx="120" cy="35" r="3" fill="hsl(60, 70%, 50%)" />
            <text x="130" y="39" fontSize="9" fill="#333">
              Medium
            </text>
            <circle cx="20" cy="50" r="3" fill="hsl(0, 70%, 50%)" />
            <text x="30" y="54" fontSize="9" fill="#333">
              Low (Red)
            </text>
            <circle cx="120" cy="50" r="2" fill="#999" />
            <text x="130" y="54" fontSize="9" fill="#333">
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

            {algorithm === "info-kmeans" && (
              <>
                <circle cx="20" cy="80" r="3" fill="#666" opacity="0.5" />
                <text x="30" y="84" fontSize="9" fill="#333">
                  Sleeping Node
                </text>
                <text x="120" y="84" fontSize="8" fill="#666">
                  💤
                </text>
              </>
            )}

            <text
              x="10"
              y="110"
              fontSize="8"
              fill={algorithmColor}
              fontWeight="bold"
            >
              Algorithm: {algorithm.toUpperCase()}
            </text>

            {algorithm === "info-kmeans" && (
              <text x="10" y="125" fontSize="8" fill="#666">
                Information-aware clustering
              </text>
            )}

            <text x="10" y="145" fontSize="8" fill="#2196f3" fontWeight="bold">
              💡 Hover over nodes for details
            </text>
          </g>
        </svg>

        {/* Render hover tooltip */}
        {renderSensorTooltip()}
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
      )}
    </Paper>
  );
}
