import { SimulationConfig } from "./service/types";

export const DEFAULT_CONFIG: SimulationConfig = {
  width: 1000,
  height: 500,
  numSensors: 100,
  initialEnergy: 100,

  numClusters: 5,
  clusteringInterval: 1,
  energyTxElec: 0.02,
  energyRxElec: 0.01,
  distanceFactor: 0.00005,
  energyToSatellite: 5,

  minSalinity: 30,
  maxSalinity: 38,
  minPressure: 1000,
  maxPressure: 3000,
  minTemperature: 2,
  maxTemperature: 25,
  minPH: 7.5,
  maxPH: 8.5,

  // Info-KMeans parameters
  informationThreshold: 0.6,
  nearestNeighbors: 6,
  entropyBins: 10,
  historyWindow: 10, // New parameter for historical analysis
};

export const PLAYBACK_SPEED_DEFAULT = 300;
export const MAX_SIMULATION_ROUNDS = 500;
