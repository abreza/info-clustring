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
};

export const PLAYBACK_SPEED_DEFAULT = 300;
export const MAX_SIMULATION_ROUNDS = 500;
