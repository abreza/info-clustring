import React, { useState, useRef, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
  Tooltip,
  IconButton,
  Tabs,
  Tab,
} from "@mui/material";
import {
  NetworkWifi,
  Fullscreen,
  Download,
  RemoveRedEye,
  Visibility,
  TableChart,
} from "@mui/icons-material";
import { Sensor } from "../../service/types";
import {
  NetworkVisualizationProps,
  HoveredSensorInfo,
} from "../../types/NetworkVisualization.types";
import { useNetworkData } from "../../hooks/useNetworkData";
import { prepareGridData } from "../../utils/networkUtils";
import { SensorTooltip } from "./SensorTooltip";
import { VisualizationTab } from "./VisualizationTab";
import { DataGridTab } from "./DataGridTab";
import { NetworkStats } from "./NetworkStats";

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
  const svgRef = useRef<SVGSVGElement>(null);

  // Get current round data using custom hook
  const networkData = useNetworkData(simulationResult, algorithm, currentRound);
  const { sensors, clusters, sensorData } = networkData;

  // Prepare data for the DataGrid
  const gridData = useMemo(() => {
    return prepareGridData(networkData, config);
  }, [networkData, config]);

  // Handle sensor hover
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
    <Paper sx={{ p: 2, height: 500, position: "relative" }}>
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
