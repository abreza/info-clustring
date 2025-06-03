import {
  SimulationResult,
  SimulationConfig,
  SimulationStats,
  Sensor,
  SensorData,
  AlgorithmType,
} from "../service/types";

export interface NetworkVisualizationProps {
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

export interface GridRowData {
  id: number;
  sensorId: number;
  x: number;
  y: number;
  energy: number;
  energyPercentage: number;
  status: string;
  isClusterHead: boolean;
  clusterId?: number;
  clusterRole: string;
  memberCount?: number;
  sleepingMemberCount?: number;
  temperature?: number;
  salinity?: number;
  pressure?: number;
  ph?: number;
}

export interface NetworkData {
  sensors: Sensor[];
  clusters: any[];
  sensorData: SensorData[];
}

export interface SensorTooltipProps {
  hoveredSensor: HoveredSensorInfo | null;
  config: SimulationConfig;
  algorithm: AlgorithmType;
}

export interface NetworkLegendProps {
  algorithm: AlgorithmType;
}

export interface VisualizationTabProps {
  sensors: Sensor[];
  clusters: any[];
  sensorData: SensorData[];
  config: SimulationConfig;
  algorithm: AlgorithmType;
  onSensorHover: (sensor: Sensor, event: React.MouseEvent) => void;
  onSensorLeave: () => void;
  svgRef: React.RefObject<SVGSVGElement | null>;
}

export interface DataGridTabProps {
  gridData: GridRowData[];
}

export interface NetworkStatsProps {
  stats: SimulationStats | null;
  config: SimulationConfig;
  clusters: any[];
  algorithm: AlgorithmType;
  simulationResult: SimulationResult | null;
}
