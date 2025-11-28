import { AlgorithmType, SimulationConfig } from "./service/types";

export const DEFAULT_CONFIG: SimulationConfig = {
  width: 1000,
  height: 500, // 800
  numSensors: 100, // 60
  initialEnergy: 100, // 140

  numClusters: 5,
  clusteringInterval: 1,
  energyTxElec: 0.02, // 0.1
  energyRxElec: 0.01,
  distanceFactor: 0.00005,
  energyToSatellite: 5,

  minSalinity: 10,
  maxSalinity: 68,
  minPressure: 1000,
  maxPressure: 30000,
  minTemperature: 2,
  maxTemperature: 65,
  minPH: 7.5,
  maxPH: 18.5,

  informationThreshold: 0.6,
  nearestNeighbors: 6,
  entropyBins: 10,
  historyWindow: 10,

  eeucThreshold: 0.4,
  eeucRCompMax: 90,
  eeucC: 0.5,
  eeucTdMax: 150,
  bsX: 500,
  bsY: -1000,
};

export const PLAYBACK_SPEED_DEFAULT = 300;
export const MAX_SIMULATION_ROUNDS = 500;

export const ALL_ALGORITHMS: AlgorithmType[] = [
  "kmeans",
  "leach",
  "heed",
  "random-kmeans",
  "info-kmeans",
  "eeuc",
  "lcssm",
];

export const ALGORITHM_LABELS: Record<AlgorithmType, string> = {
  kmeans: "K-Means",
  leach: "LEACH",
  heed: "HEED",
  "random-kmeans": "Random K-Means",
  "info-kmeans": "Info-KMeans",
  eeuc: "EEUC",
  lcssm: "LCSSM",
};

export const getAlgorithmColor = (algorithm: AlgorithmType): string => {
  switch (algorithm) {
    case "kmeans":
      return "#2196F3";
    case "leach":
      return "#FF9800";
    case "heed":
      return "#4CAF50";
    case "random-kmeans":
      return "#607D8B";
    case "info-kmeans":
      return "#9C27B0";
    case "eeuc":
      return "#E91E63";
    case "lcssm":
      return "#FF5722";
    default:
      return "#2196F3";
  }
};
