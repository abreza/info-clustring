// src/service/clustering/kmeans-clustering.ts
import {
  Sensor,
  Cluster,
  SimulationConfig,
  ClusteringAlgorithm,
} from "../types";

interface Centroid {
  x: number;
  y: number;
}

export class KMeansClusteringAlgorithm implements ClusteringAlgorithm {
  private maxIterations: number = 100;
  private convergenceThreshold: number = 1.0;

  public cluster(
    sensors: Sensor[],
    config: SimulationConfig,
    round?: number
  ): Cluster[] {
    // Filter out sensors with no energy (dead sensors)
    const aliveSensors = sensors.filter((sensor) => sensor.energy > 0);

    if (aliveSensors.length === 0) {
      return [];
    }

    // Ensure k doesn't exceed number of alive sensors
    const k = Math.min(config.numClusters, aliveSensors.length);

    if (k === 0) {
      return [];
    }

    // If we have only one sensor or one cluster, return single cluster
    if (k === 1 || aliveSensors.length === 1) {
      return [
        {
          id: 0,
          headId: aliveSensors[0].id,
          members: [...aliveSensors],
        },
      ];
    }

    // Initialize centroids randomly
    let centroids = this.initializeCentroids(aliveSensors, k, config);

    let assignments: number[] = new Array(aliveSensors.length).fill(0);
    let converged = false;
    let iteration = 0;

    while (!converged && iteration < this.maxIterations) {
      // Assign each sensor to nearest centroid
      const newAssignments = this.assignSensorsToCentroids(
        aliveSensors,
        centroids
      );

      // Update centroids
      const newCentroids = this.updateCentroids(
        aliveSensors,
        newAssignments,
        k
      );

      // Check for convergence
      converged = this.hasConverged(centroids, newCentroids);

      assignments = newAssignments;
      centroids = newCentroids;
      iteration++;
    }

    // Create clusters from final assignments
    return this.createClusters(aliveSensors, assignments, centroids, k);
  }

  private initializeCentroids(
    sensors: Sensor[],
    k: number,
    config: SimulationConfig
  ): Centroid[] {
    const centroids: Centroid[] = [];

    // Use grid-based deterministic initialization
    // Calculate grid dimensions that best fit k centroids
    const gridCols = Math.ceil(Math.sqrt(k));
    const gridRows = Math.ceil(k / gridCols);

    const stepX = config.width / (gridCols + 1);
    const stepY = config.height / (gridRows + 1);

    let centroidCount = 0;
    for (let row = 1; row <= gridRows && centroidCount < k; row++) {
      for (let col = 1; col <= gridCols && centroidCount < k; col++) {
        centroids.push({
          x: col * stepX,
          y: row * stepY,
        });
        centroidCount++;
      }
    }

    return centroids;
  }

  private assignSensorsToCentroids(
    sensors: Sensor[],
    centroids: Centroid[]
  ): number[] {
    const assignments: number[] = [];

    for (const sensor of sensors) {
      let minDistance = Infinity;
      let nearestCentroid = 0;

      for (let i = 0; i < centroids.length; i++) {
        const distance = this.euclideanDistance(sensor, centroids[i]);
        if (distance < minDistance) {
          minDistance = distance;
          nearestCentroid = i;
        }
      }

      assignments.push(nearestCentroid);
    }

    return assignments;
  }

  private updateCentroids(
    sensors: Sensor[],
    assignments: number[],
    k: number
  ): Centroid[] {
    const newCentroids: Centroid[] = [];

    for (let i = 0; i < k; i++) {
      const clusterSensors = sensors.filter(
        (_, index) => assignments[index] === i
      );

      if (clusterSensors.length === 0) {
        // If no sensors assigned to this centroid, keep it at current position
        // This shouldn't happen with proper initialization, but handle it gracefully
        newCentroids.push({ x: 0, y: 0 });
        continue;
      }

      // Calculate mean position of assigned sensors
      const sumX = clusterSensors.reduce((sum, sensor) => sum + sensor.x, 0);
      const sumY = clusterSensors.reduce((sum, sensor) => sum + sensor.y, 0);

      newCentroids.push({
        x: sumX / clusterSensors.length,
        y: sumY / clusterSensors.length,
      });
    }

    return newCentroids;
  }

  private hasConverged(
    oldCentroids: Centroid[],
    newCentroids: Centroid[]
  ): boolean {
    for (let i = 0; i < oldCentroids.length; i++) {
      const distance = this.euclideanDistance(oldCentroids[i], newCentroids[i]);
      if (distance > this.convergenceThreshold) {
        return false;
      }
    }
    return true;
  }

  private createClusters(
    sensors: Sensor[],
    assignments: number[],
    centroids: Centroid[],
    k: number
  ): Cluster[] {
    const clusters: Cluster[] = [];

    for (let i = 0; i < k; i++) {
      const clusterMembers = sensors.filter(
        (_, index) => assignments[index] === i
      );

      if (clusterMembers.length === 0) {
        continue; // Skip empty clusters
      }

      // Find the sensor closest to the centroid to be the cluster head
      let minDistance = Infinity;
      let headId = clusterMembers[0].id;

      for (const sensor of clusterMembers) {
        const distance = this.euclideanDistance(sensor, centroids[i]);
        if (distance < minDistance) {
          minDistance = distance;
          headId = sensor.id;
        }
      }

      clusters.push({
        id: i,
        headId: headId,
        members: [...clusterMembers],
      });
    }

    return clusters;
  }

  private euclideanDistance(
    point1: { x: number; y: number },
    point2: { x: number; y: number }
  ): number {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
