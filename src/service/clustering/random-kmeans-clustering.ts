import {
  Sensor,
  Cluster,
  SimulationConfig,
  ClusteringAlgorithm,
  SensorData,
  EnvironmentGrids,
} from "../types";
import { KMeansClusteringAlgorithm } from "./kmeans-clustering";

export class RandomKMeansClusteringAlgorithm implements ClusteringAlgorithm {
  private kmeansAlgorithm: KMeansClusteringAlgorithm;

  private readonly SLEEP_PROBABILITY = 0.2;

  constructor() {
    this.kmeansAlgorithm = new KMeansClusteringAlgorithm();
  }

  public cluster(
    sensors: Sensor[],
    config: SimulationConfig,
    round?: number,
    sensorsData?: SensorData[],
    historicalData?: SensorData[][],
    environmentGrids?: EnvironmentGrids
  ): Cluster[] {
    const aliveSensors = sensors.filter((s) => s.energy > 0);

    if (aliveSensors.length === 0) return [];

    const activeSensors: Sensor[] = [];

    for (const sensor of aliveSensors) {
      sensor.isAsleep = false;

      const shouldSleep = Math.random() < this.SLEEP_PROBABILITY;

      if (shouldSleep) {
        sensor.isAsleep = true;
      } else {
        activeSensors.push(sensor);
      }
    }

    if (activeSensors.length === 0 && aliveSensors.length > 0) {
      aliveSensors[0].isAsleep = false;
      activeSensors.push(aliveSensors[0]);
    }

    const clusters = this.kmeansAlgorithm.cluster(activeSensors, config, round);

    const sleepingSensors = aliveSensors.filter((s) => s.isAsleep);
    if (sleepingSensors.length > 0) {
      this.assignSleepingToCluster(clusters, sleepingSensors);
    }

    return clusters;
  }

  private assignSleepingToCluster(
    clusters: Cluster[],
    sleepingSensors: Sensor[]
  ): void {
    if (clusters.length === 0) return;

    for (const sleepingSensor of sleepingSensors) {
      let nearestCluster = clusters[0];
      let minDistance = Infinity;

      for (const cluster of clusters) {
        const head = cluster.members.find((m) => m.id === cluster.headId);
        if (head) {
          const distance = Math.sqrt(
            Math.pow(sleepingSensor.x - head.x, 2) +
              Math.pow(sleepingSensor.y - head.y, 2)
          );
          if (distance < minDistance) {
            minDistance = distance;
            nearestCluster = cluster;
          }
        }
      }

      if (nearestCluster) {
        if (!nearestCluster.sleepingMembers) {
          nearestCluster.sleepingMembers = [];
        }
        nearestCluster.sleepingMembers.push(sleepingSensor);
      }
    }
  }
}
