export interface Sensor {
  id: number;
  x: number;
  y: number;
  energy: number;
  isAsleep?: boolean;
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
  sleepingMembers?: Sensor[];
}

export interface HistoryItem {
  clusters: Cluster[];
  sensorsData: SensorData[];
  sleepingNodes?: number[];
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

  // Info-KMeans parameters
  informationThreshold?: number;
  nearestNeighbors?: number;
  entropyBins?: number;
  historyWindow?: number; // New parameter for history window size
}

export interface LeachConfig {
  distanceFactor: number;
}

export type AlgorithmType = "kmeans" | "leach" | "info-kmeans";

export interface AlgorithmResult {
  history: HistoryItem[];
  networkLifetime: number;
  totalRounds: number;
  averageInformationNodes?: number;
  energySavings?: number;
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
  sleepingNodes?: number;
  activeNodes?: number;
}

export interface ClusteringAlgorithm {
  cluster(
    sensors: Sensor[],
    config: SimulationConfig,
    round?: number,
    sensorsData?: SensorData[],
    historicalData?: SensorData[][] // New parameter for historical data
  ): Cluster[];
}

// Historical data storage interface
export interface HistoricalSensorData {
  sensorId: number;
  dataHistory: SensorData[]; // Array of sensor data over time
}
