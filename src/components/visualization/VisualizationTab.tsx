import React from "react";
import { Box } from "@mui/material";
import { VisualizationTabProps } from "../../types/NetworkVisualization.types";
import { NetworkLegend } from "./NetworkLegend";
import {
  getAlgorithmColor,
  getSensorRadius,
  getEnergyHue,
} from "../../utils/networkUtils";

export function VisualizationTab({
  sensors,
  clusters,
  config,
  algorithm,
  onSensorHover,
  onSensorLeave,
  svgRef,
}: VisualizationTabProps) {
  const algorithmColor = getAlgorithmColor(algorithm);

  return (
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

        {clusters.map((cluster) => {
          const head = sensors.find((s) => s.id === cluster.headId);
          if (!head || head.energy <= 0) return null;

          return (
            <g key={`cluster-${cluster.id}`}>
              {cluster.members
                .filter(
                  (member: any) =>
                    member.id !== cluster.headId &&
                    member.energy > 0 &&
                    !member.isAsleep
                )
                .map((member: any) => (
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

              {algorithm === "info-kmeans" &&
                cluster.sleepingMembers &&
                cluster.sleepingMembers
                  .filter((member: any) => member.energy > 0)
                  .map((member: any) => (
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

        {sensors.map((sensor) => {
          const isAlive = sensor.energy > 0;
          const isAsleep = sensor.isAsleep && isAlive;
          const energyRatio = Math.max(0, sensor.energy / config.initialEnergy);
          const hue = getEnergyHue(energyRatio);
          const radius = getSensorRadius(sensor, config);

          const isClusterHead = clusters.some(
            (cluster) => cluster.headId === sensor.id && sensor.energy > 0
          );

          return (
            <g key={sensor.id}>
              <circle
                cx={sensor.x}
                cy={sensor.y}
                r={radius}
                fill={
                  isAsleep ? "#666" : isAlive ? `hsl(${hue}, 70%, 50%)` : "#999"
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
                onMouseEnter={(e) => onSensorHover(sensor, e)}
                onMouseLeave={onSensorLeave}
                onMouseMove={(e) => onSensorHover(sensor, e)}
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
                  style={{ pointerEvents: "none" }}
                />
              )}

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

        <NetworkLegend algorithm={algorithm} />
      </svg>
    </Box>
  );
}
