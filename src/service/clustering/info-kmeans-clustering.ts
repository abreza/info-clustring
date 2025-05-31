import {
  Sensor,
  SensorData,
  Cluster,
  SimulationConfig,
  ClusteringAlgorithm,
} from "../types";

interface Centroid {
  x: number;
  y: number;
}

interface TemporalProbabilities {
  jointCounts: Map<string, number>;
  neighborCounts: Map<number, number>;
  totalSamples: number;
}

export class InfoKMeansClusteringAlgorithm implements ClusteringAlgorithm {
  private maxIterations: number = 100;
  private convergenceThreshold: number = 1.0;
  private nearestNeighbors: number = 6;
  private entropyBins: number = 10;
  private informationThreshold: number = 0.7;
  private historyWindow: number = 10;

  // Store historical data for each sensor
  private sensorHistory: Map<number, SensorData[]> = new Map();

  public cluster(
    sensors: Sensor[],
    config: SimulationConfig,
    round?: number,
    sensorsData?: SensorData[],
    historicalData?: SensorData[][]
  ): Cluster[] {
    // Update parameters from config
    this.nearestNeighbors = config.nearestNeighbors || 6;
    this.entropyBins = config.entropyBins || 10;
    this.informationThreshold = config.informationThreshold || 0.7;
    this.historyWindow = config.historyWindow || 10;

    // Filter out sensors with no energy (dead sensors)
    const aliveSensors = sensors.filter((sensor) => sensor.energy > 0);

    if (aliveSensors.length === 0) {
      return [];
    }

    // Reset sleep status for all sensors
    aliveSensors.forEach((sensor) => (sensor.isAsleep = false));

    // Update historical data
    if (sensorsData && sensorsData.length > 0) {
      this.updateSensorHistory(sensorsData);
    }

    // If we have sufficient historical data, calculate information content and put low-info nodes to sleep
    let activeSensors = aliveSensors;
    if (round && round > 0 && this.hasMinimumHistory()) {
      activeSensors = this.selectInformativeNodesWithHistory(
        aliveSensors,
        config
      );
    }

    // Ensure k doesn't exceed number of active sensors
    const k = Math.min(config.numClusters, activeSensors.length);

    if (k === 0) {
      return [];
    }

    // If we have only one sensor or one cluster, return single cluster
    if (k === 1 || activeSensors.length === 1) {
      const cluster: Cluster = {
        id: 0,
        headId: activeSensors[0].id,
        members: [...activeSensors],
      };

      // Add sleeping members if any
      const sleepingMembers = aliveSensors.filter((s) => s.isAsleep);
      if (sleepingMembers.length > 0) {
        cluster.sleepingMembers = sleepingMembers;
      }

      return [cluster];
    }

    // Apply K-Means clustering to active sensors
    const clusters = this.applyKMeansClustering(activeSensors, k, config);

    // Assign sleeping sensors to nearest clusters
    const sleepingSensors = aliveSensors.filter((s) => s.isAsleep);
    if (sleepingSensors.length > 0) {
      this.assignSleepingToCluster(clusters, sleepingSensors);
    }

    return clusters;
  }

  private updateSensorHistory(sensorsData: SensorData[]): void {
    for (const sensorData of sensorsData) {
      if (!this.sensorHistory.has(sensorData.id)) {
        this.sensorHistory.set(sensorData.id, []);
      }

      const history = this.sensorHistory.get(sensorData.id)!;
      history.push({ ...sensorData });

      // Keep only the last historyWindow entries
      if (history.length > this.historyWindow) {
        history.shift();
      }
    }
  }

  private hasMinimumHistory(): boolean {
    // Check if we have at least 3 rounds of data for most sensors
    let sensorsWithHistory = 0;
    for (const history of this.sensorHistory.values()) {
      if (history.length >= 3) {
        sensorsWithHistory++;
      }
    }
    return sensorsWithHistory >= this.sensorHistory.size * 0.8;
  }

  private selectInformativeNodesWithHistory(
    sensors: Sensor[],
    config: SimulationConfig
  ): Sensor[] {
    const informationValues = new Map<number, number>();

    // Calculate information content for each sensor using historical data
    for (const sensor of sensors) {
      const sensorHistory = this.sensorHistory.get(sensor.id);
      if (!sensorHistory || sensorHistory.length < 2) {
        // Not enough history, consider as informative
        informationValues.set(sensor.id, 1.0);
        continue;
      }

      const nearestNeighborsHistory = this.findNearestNeighborsHistory(
        sensor,
        sensors
      );
      if (nearestNeighborsHistory.length < 2) {
        // Not enough neighbors with history, consider as informative
        informationValues.set(sensor.id, 1.0);
        continue;
      }

      const informationContent = this.calculateHistoricalInformationContent(
        sensorHistory,
        nearestNeighborsHistory,
        config
      );
      informationValues.set(sensor.id, informationContent);
    }

    // Determine which sensors to keep active
    const activeSensors: Sensor[] = [];
    for (const sensor of sensors) {
      const info = informationValues.get(sensor.id) || 1.0;

      if (info >= this.informationThreshold) {
        // High information content - keep active
        sensor.isAsleep = false;
        activeSensors.push(sensor);
      } else {
        // Low information content - put to sleep to save energy
        sensor.isAsleep = true;
        // Sleeping nodes consume much less energy
        sensor.energy -= 0.001;
      }
    }

    // Ensure we have at least some active sensors for clustering
    if (activeSensors.length < Math.min(3, sensors.length * 0.3)) {
      // If too many sensors are sleeping, wake up some with highest information content
      const sortedSensors = sensors
        .filter((s) => s.isAsleep)
        .sort(
          (a, b) =>
            (informationValues.get(b.id) || 0) -
            (informationValues.get(a.id) || 0)
        );

      const numToWake = Math.min(3, sortedSensors.length);
      for (let i = 0; i < numToWake; i++) {
        sortedSensors[i].isAsleep = false;
        activeSensors.push(sortedSensors[i]);
      }
    }

    return activeSensors;
  }

  private findNearestNeighborsHistory(
    targetSensor: Sensor,
    allSensors: Sensor[]
  ): SensorData[][] {
    const neighbors = allSensors
      .filter(
        (s) => s.id !== targetSensor.id && s.energy > 0 && s.isAsleep === false
      )
      .map((sensor) => ({
        sensor,
        history: this.sensorHistory.get(sensor.id),
        distance: this.euclideanDistance(targetSensor, sensor),
      }))
      .filter((item) => item.history && item.history.length >= 2)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, this.nearestNeighbors)
      .map((item) => item.history!);

    return neighbors;
  }

  private calculateHistoricalInformationContent(
    targetHistory: SensorData[],
    neighborsHistory: SensorData[][],
    config: SimulationConfig
  ): number {
    if (neighborsHistory.length === 0 || targetHistory.length < 2) return 1.0;

    // Calculate conditional entropy for each parameter using historical data
    const salinityEntropy = this.calculateHistoricalConditionalEntropy(
      targetHistory.map((d) => d.salinity),
      neighborsHistory.map((nh) => nh.map((d) => d.salinity)),
      config.minSalinity,
      config.maxSalinity
    );

    const pressureEntropy = this.calculateHistoricalConditionalEntropy(
      targetHistory.map((d) => d.pressure),
      neighborsHistory.map((nh) => nh.map((d) => d.pressure)),
      config.minPressure,
      config.maxPressure
    );

    const temperatureEntropy = this.calculateHistoricalConditionalEntropy(
      targetHistory.map((d) => d.temperature),
      neighborsHistory.map((nh) => nh.map((d) => d.temperature)),
      config.minTemperature,
      config.maxTemperature
    );

    const phEntropy = this.calculateHistoricalConditionalEntropy(
      targetHistory.map((d) => d.ph),
      neighborsHistory.map((nh) => nh.map((d) => d.ph)),
      config.minPH,
      config.maxPH
    );

    // Average conditional entropy across all parameters
    const avgEntropy =
      (salinityEntropy + pressureEntropy + temperatureEntropy + phEntropy) / 4;

    // Convert entropy to information content (higher entropy = higher information)
    const maxPossibleEntropy = Math.log2(this.entropyBins);
    const normalizedEntropy = avgEntropy / maxPossibleEntropy;

    return Math.max(0, Math.min(1, normalizedEntropy));
  }

  private calculateHistoricalConditionalEntropy(
    targetValues: number[],
    neighborValues: number[][],
    minValue: number,
    maxValue: number
  ): number {
    if (neighborValues.length === 0 || targetValues.length === 0) return 0;

    // Discretize all values
    const discretizedTarget = targetValues.map((v) =>
      this.discretizeValue(v, minValue, maxValue)
    );
    const discretizedNeighbors = neighborValues.map((neighbor) =>
      neighbor.map((v) => this.discretizeValue(v, minValue, maxValue))
    );

    // Calculate temporal conditional entropy
    const temporalProbs = this.calculateTemporalProbabilities(
      discretizedTarget,
      discretizedNeighbors
    );

    return this.computeConditionalEntropy(temporalProbs);
  }

  private calculateTemporalProbabilities(
    targetValues: number[],
    neighborValues: number[][]
  ): TemporalProbabilities {
    const jointCounts = new Map<string, number>();
    const neighborCounts = new Map<number, number>();
    let totalSamples = 0;

    // For each time step
    for (let t = 0; t < targetValues.length; t++) {
      const targetValue = targetValues[t];

      // For each neighbor
      for (let n = 0; n < neighborValues.length; n++) {
        if (t < neighborValues[n].length) {
          const neighborValue = neighborValues[n][t];

          // Create joint occurrence key
          const jointKey = `${targetValue},${neighborValue}`;
          jointCounts.set(jointKey, (jointCounts.get(jointKey) || 0) + 1);

          // Count neighbor occurrences
          neighborCounts.set(
            neighborValue,
            (neighborCounts.get(neighborValue) || 0) + 1
          );

          totalSamples++;
        }
      }
    }

    return {
      jointCounts,
      neighborCounts,
      totalSamples,
    };
  }

  private computeConditionalEntropy(probs: TemporalProbabilities): number {
    if (probs.totalSamples === 0) return 0;

    let conditionalEntropy = 0;

    // Calculate H(X|Y) = -∑∑ P(x,y) * log2(P(x|y))
    for (const [jointKey, jointCount] of probs.jointCounts) {
      const [targetValue, neighborValue] = jointKey.split(",").map(Number);
      const neighborCount = probs.neighborCounts.get(neighborValue) || 1;

      const jointProb = jointCount / probs.totalSamples;
      const conditionalProb = jointCount / neighborCount;

      if (conditionalProb > 0) {
        conditionalEntropy -= jointProb * Math.log2(conditionalProb);
      }
    }

    return conditionalEntropy;
  }

  private discretizeValue(value: number, min: number, max: number): number {
    const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const binIndex = Math.floor(normalized * (this.entropyBins - 1));
    return Math.max(0, Math.min(this.entropyBins - 1, binIndex));
  }

  private applyKMeansClustering(
    sensors: Sensor[],
    k: number,
    config: SimulationConfig
  ): Cluster[] {
    // Initialize centroids randomly
    let centroids = this.initializeCentroids(sensors, k, config);

    let assignments: number[] = new Array(sensors.length).fill(0);
    let converged = false;
    let iteration = 0;

    while (!converged && iteration < this.maxIterations) {
      // Assign each sensor to nearest centroid
      const newAssignments = this.assignSensorsToCentroids(sensors, centroids);

      // Update centroids
      const newCentroids = this.updateCentroids(sensors, newAssignments, k);

      // Check for convergence
      converged = this.hasConverged(centroids, newCentroids);

      assignments = newAssignments;
      centroids = newCentroids;
      iteration++;
    }

    // Create clusters from final assignments
    return this.createClusters(sensors, assignments, centroids, k);
  }

  private assignSleepingToCluster(
    clusters: Cluster[],
    sleepingSensors: Sensor[]
  ): void {
    for (const sleepingSensor of sleepingSensors) {
      // Find the nearest cluster head
      let nearestCluster = clusters[0];
      let minDistance = Infinity;

      for (const cluster of clusters) {
        const head = cluster.members.find((m) => m.id === cluster.headId);
        if (head) {
          const distance = this.euclideanDistance(sleepingSensor, head);
          if (distance < minDistance) {
            minDistance = distance;
            nearestCluster = cluster;
          }
        }
      }

      // Add to sleeping members of nearest cluster
      if (!nearestCluster.sleepingMembers) {
        nearestCluster.sleepingMembers = [];
      }
      nearestCluster.sleepingMembers.push(sleepingSensor);
    }
  }

  // Standard K-means helper methods (same as before)
  private initializeCentroids(
    sensors: Sensor[],
    k: number,
    config: SimulationConfig
  ): Centroid[] {
    const centroids: Centroid[] = [];

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
        newCentroids.push({ x: 0, y: 0 });
        continue;
      }

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
        continue;
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

  // Method to clear history (useful for reset)
  public clearHistory(): void {
    this.sensorHistory.clear();
  }

  // Method to get current history size for debugging
  public getHistorySize(): number {
    return this.sensorHistory.size;
  }

  // Method to get average history length for debugging
  public getAverageHistoryLength(): number {
    if (this.sensorHistory.size === 0) return 0;

    let totalLength = 0;
    for (const history of this.sensorHistory.values()) {
      totalLength += history.length;
    }

    return totalLength / this.sensorHistory.size;
  }
}
