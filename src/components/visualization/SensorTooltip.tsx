import React from "react";
import {
  Box,
  Typography,
  Chip,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import { BatteryFull } from "@mui/icons-material";
import { SensorTooltipProps } from "../../types/NetworkVisualization.types";
import { getAlgorithmColor } from "../../utils/networkUtils";

export function SensorTooltip({
  hoveredSensor,
  config,
  algorithm,
}: SensorTooltipProps) {
  if (!hoveredSensor) return null;

  const { sensor, sensorData, isClusterHead, clusterInfo, position } =
    hoveredSensor;
  const energyPercentage = (sensor.energy / config.initialEnergy) * 100;
  const algorithmColor = getAlgorithmColor(algorithm);

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

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Status:</strong> {sensor.energy > 0 ? "Alive" : "Dead"}
              {sensor.energy > 0 && sensor.isAsleep && " (Sleeping)"}
            </Typography>

            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Position:</strong> ({sensor.x.toFixed(1)},{" "}
              {sensor.y.toFixed(1)})
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
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

          {isClusterHead && clusterInfo && (
            <>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="primary" gutterBottom>
                  <strong>Cluster #{clusterInfo.clusterId} Information:</strong>
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
}
