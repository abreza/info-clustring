export interface Sensor {
  id: number;
  x: number;
  y: number;
  energy: number;
}

export interface SensorData {
  id: number;
  salinity: number;
  pressure: number;
  temperature: number;
  ph: number;
}

export interface Cluster {
  id: number;
  headId: number;
  members: Sensor[];
}

export interface HistoryItem {
  clusters: Cluster[];
  sensorsData: SensorData[];
}

export interface SimulationConfig {
  width: number;
  height: number;
  numSensors: number;
  initialEnergy: number;

  numClusters: number;
  clusteringInterval: number;

  energyTxElec: number;
  energyRxElec: number;
  distanceFactor: number;
  energyToSatellite: number;

  minSalinity: number;
  maxSalinity: number;
  minPressure: number;
  maxPressure: number;
  minTemperature: number;
  maxTemperature: number;
  minPH: number;
  maxPH: number;
}

export interface LeachConfig {
  distanceFactor: number;
}

export type AlgorithmType = "kmeans" | "leach";

export interface AlgorithmResult {
  history: HistoryItem[];
  networkLifetime: number;
  totalRounds: number;
}

export interface SimulationResult {
  sensors: Sensor[];
  algorithms: {
    [K in AlgorithmType]: AlgorithmResult;
  };
}

export interface SimulationStats {
  round: number;
  aliveSensors: number;
  totalEnergy: number;
  averageEnergy: number;
  clusters: number;
  lastClusteringRound: number;
}

export interface ClusteringAlgorithm {
  cluster(
    sensors: Sensor[],
    config: SimulationConfig,
    round?: number
  ): Cluster[];
}
