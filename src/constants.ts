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
  maxSalinity: 40,
  minPressure: 1000,
  maxPressure: 1500,
  minTemperature: 15,
  maxTemperature: 35,
  minPH: 7,
  maxPH: 9,
};

export const PLAYBACK_SPEED_DEFAULT = 300;
export const MAX_SIMULATION_ROUNDS = 1000;
