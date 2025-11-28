import React, { useState, useRef, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
  Tooltip,
  Tabs,
  Tab,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import {
  NetworkWifi,
  Visibility,
  TableChart,
  Thermostat,
  Waves,
  Compress,
  Science,
} from "@mui/icons-material";
import {
  AlgorithmType,
  Sensor,
  SensorData,
  SimulationConfig,
  SimulationResult,
  SimulationStats,
} from "../../service/types";
import { useNetworkData } from "../../hooks/useNetworkData";
import { prepareGridData } from "../../utils/networkUtils";
import { SensorTooltip } from "./SensorTooltip";
import { VisualizationTab } from "./VisualizationTab";
import { DataGridTab } from "./DataGridTab";
import { NetworkStats } from "./NetworkStats";

interface NetworkVisualizationProps {
  simulationResult: SimulationResult | null;
  config: SimulationConfig;
  currentRound: number;
  stats: SimulationStats | null;
  algorithm: AlgorithmType;
}

export interface HoveredSensorInfo {
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

type HeatmapParameter = "temperature" | "salinity" | "pressure" | "ph" | "none";

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
  const [tabValue, setTabValue] = useState(0);
  const [selectedHeatmap, setSelectedHeatmap] =
    useState<HeatmapParameter>("none");
  const svgRef = useRef<SVGSVGElement>(null);

  const networkData = useNetworkData(simulationResult, algorithm, currentRound);
  const { sensors, clusters, sensorData, environmentGrids } = networkData;

  const gridData = useMemo(() => {
    return prepareGridData(networkData, config);
  }, [networkData, config]);

  const handleSensorHover = (sensor: Sensor, event: React.MouseEvent) => {
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

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleHeatmapChange = (
    _: React.MouseEvent<HTMLElement>,
    newParam: HeatmapParameter | null
  ) => {
    setSelectedHeatmap(newParam || "none");
  };

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

  return (
    <Paper sx={{ p: 2, position: "relative" }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h6">
            Network Data - Round {currentRound}
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
      </Box>

      <Box display="flex" justifyContent="flex-end" mb={1}>
        <Tooltip title="Select Heatmap Background">
          <ToggleButtonGroup
            value={selectedHeatmap}
            exclusive
            onChange={handleHeatmapChange}
            size="small"
          >
            <ToggleButton value="temperature" aria-label="temperature">
              <Thermostat fontSize="small" />
              <Typography
                variant="caption"
                sx={{ ml: 1, display: { xs: "none", sm: "block" } }}
              >
                Temp
              </Typography>
            </ToggleButton>

            <ToggleButton value="salinity" aria-label="salinity">
              <Waves fontSize="small" />
              <Typography
                variant="caption"
                sx={{ ml: 1, display: { xs: "none", sm: "block" } }}
              >
                Salinity
              </Typography>
            </ToggleButton>

            <ToggleButton value="pressure" aria-label="pressure">
              <Compress fontSize="small" />
              <Typography
                variant="caption"
                sx={{ ml: 1, display: { xs: "none", sm: "block" } }}
              >
                Pressure
              </Typography>
            </ToggleButton>

            <ToggleButton value="ph" aria-label="ph">
              <Science fontSize="small" />
              <Typography
                variant="caption"
                sx={{ ml: 1, display: { xs: "none", sm: "block" } }}
              >
                pH
              </Typography>
            </ToggleButton>
          </ToggleButtonGroup>
        </Tooltip>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab
            icon={<Visibility />}
            iconPosition="start"
            label="Network Visualization"
          />

          <Tab
            icon={<TableChart />}
            iconPosition="start"
            label="Sensors Data Grid"
          />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <Box sx={{ position: "relative" }}>
          <VisualizationTab
            sensors={sensors}
            clusters={clusters}
            sensorData={sensorData}
            config={config}
            algorithm={algorithm}
            onSensorHover={handleSensorHover}
            onSensorLeave={handleSensorLeave}
            svgRef={svgRef}
            environmentGrids={environmentGrids}
            selectedHeatmap={selectedHeatmap}
          />

          <SensorTooltip
            hoveredSensor={hoveredSensor}
            config={config}
            algorithm={algorithm}
          />
        </Box>
      )}
      {tabValue === 1 && <DataGridTab gridData={gridData} />}

      <NetworkStats
        stats={stats}
        config={config}
        clusters={clusters}
        algorithm={algorithm}
        simulationResult={simulationResult}
      />
    </Paper>
  );
}
