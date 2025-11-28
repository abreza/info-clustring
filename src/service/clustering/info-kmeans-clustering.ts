import {
  Sensor,
  SensorData,
  Cluster,
  SimulationConfig,
  ClusteringAlgorithm,
  EnvironmentGrids,
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

  private sensorHistory: Map<number, SensorData[]> = new Map();

  public cluster(
    sensors: Sensor[],
    config: SimulationConfig,
    round?: number,
    sensorsData?: SensorData[],
    historicalData?: SensorData[][],
    environmentGrids?: EnvironmentGrids
  ): Cluster[] {
    this.nearestNeighbors = config.nearestNeighbors || 6;
    this.entropyBins = config.entropyBins || 10;
    this.informationThreshold = 0.2;
    this.historyWindow = config.historyWindow || 10;

    const aliveSensors = sensors.filter((sensor) => sensor.energy > 0);

    if (aliveSensors.length === 0) {
      return [];
    }

    aliveSensors.forEach((sensor) => (sensor.isAsleep = false));

    if (sensorsData && sensorsData.length > 0) {
      this.updateSensorHistory(sensorsData);
    }

    let activeSensors = aliveSensors;
    if (round && round > 0 && this.hasMinimumHistory()) {
      activeSensors = this.selectInformativeNodesWithHistory(
        aliveSensors,
        environmentGrids!
      );
    }

    const k = Math.min(config.numClusters, activeSensors.length);

    if (k === 0) {
      return [];
    }

    if (k === 1 || activeSensors.length === 1) {
      const cluster: Cluster = {
        id: 0,
        headId: activeSensors[0].id,
        members: [...activeSensors],
      };

      const sleepingMembers = aliveSensors.filter((s) => s.isAsleep);
      if (sleepingMembers.length > 0) {
        cluster.sleepingMembers = sleepingMembers;
      }

      return [cluster];
    }

    const clusters = this.applyKMeansClustering(activeSensors, k, config);

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

      if (history.length > this.historyWindow) {
        history.shift();
      }
    }
  }

  private hasMinimumHistory(): boolean {
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
    environmentGrids: EnvironmentGrids
  ): Sensor[] {
    const informationValues = new Map<number, number>();

    for (const sensor of sensors) {
      const sensorHistory = this.sensorHistory.get(sensor.id);
      if (!sensorHistory || sensorHistory.length < 2) {
        informationValues.set(sensor.id, 1.0);
        continue;
      }

      const nearestNeighborsHistory = this.findNearestNeighborsHistory(
        sensor,
        sensors
      );

      if (nearestNeighborsHistory.length < 2) {
        informationValues.set(sensor.id, 1.0);
        continue;
      }

      const informationContent = this.calculateHistoricalInformationContent(
        sensorHistory,
        nearestNeighborsHistory,
        environmentGrids
      );
      informationValues.set(sensor.id, informationContent);
    }

    const activeSensors: Sensor[] = [];
    for (const sensor of sensors) {
      const info = informationValues.get(sensor.id) ?? 1;

      console.log(info);

      if (info >= this.informationThreshold) {
        sensor.isAsleep = false;
        activeSensors.push(sensor);
      } else {
        sensor.isAsleep = true;
        sensor.energy -= 0.001;
      }
    }

    if (activeSensors.length < Math.min(3, sensors.length * 0.3)) {
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
    environmentGrids: EnvironmentGrids
  ): number {
    if (neighborsHistory.length === 0 || targetHistory.length < 2) return 1.0;

    const getGridMinMax = (grid: number[][]) => {
      const flatGrid = grid.flat();
      return { min: Math.min(...flatGrid), max: Math.max(...flatGrid) };
    };

    const salinityRange = getGridMinMax(environmentGrids.salinity);

    const pressureRange = getGridMinMax(environmentGrids.pressure);

    const temperatureRange = getGridMinMax(environmentGrids.temperature);

    const phRange = getGridMinMax(environmentGrids.ph);

    const salinityEntropy = this.calculateHistoricalConditionalEntropy(
      targetHistory.map((d) => d.salinity),
      neighborsHistory.map((nh) => nh.map((d) => d.salinity)),
      salinityRange.min,
      salinityRange.max
    );

    const pressureEntropy = this.calculateHistoricalConditionalEntropy(
      targetHistory.map((d) => d.pressure),
      neighborsHistory.map((nh) => nh.map((d) => d.pressure)),
      pressureRange.min,
      pressureRange.max
    );

    const temperatureEntropy = this.calculateHistoricalConditionalEntropy(
      targetHistory.map((d) => d.temperature),
      neighborsHistory.map((nh) => nh.map((d) => d.temperature)),
      temperatureRange.min,
      temperatureRange.max
    );

    const phEntropy = this.calculateHistoricalConditionalEntropy(
      targetHistory.map((d) => d.ph),
      neighborsHistory.map((nh) => nh.map((d) => d.ph)),
      phRange.min,
      phRange.max
    );

    const avgEntropy =
      (salinityEntropy + pressureEntropy + temperatureEntropy + phEntropy) / 4;

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

    const discretizedTarget = targetValues.map((v) =>
      this.discretizeValue(v, minValue, maxValue)
    );
    const discretizedNeighbors = neighborValues.map((neighbor) =>
      neighbor.map((v) => this.discretizeValue(v, minValue, maxValue))
    );

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

    for (let t = 0; t < targetValues.length; t++) {
      const targetValue = targetValues[t];

      for (let n = 0; n < neighborValues.length; n++) {
        if (t < neighborValues[n].length) {
          const neighborValue = neighborValues[n][t];

          const jointKey = `${targetValue},${neighborValue}`;
          jointCounts.set(jointKey, (jointCounts.get(jointKey) || 0) + 1);

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
    const range = max - min;
    if (range === 0) return 0;
    const normalized = Math.max(0, Math.min(1, (value - min) / range));
    const binIndex = Math.floor(normalized * (this.entropyBins - 1));
    return Math.max(0, Math.min(this.entropyBins - 1, binIndex));
  }

  private applyKMeansClustering(
    sensors: Sensor[],
    k: number,
    config: SimulationConfig
  ): Cluster[] {
    let centroids = this.initializeCentroids(sensors, k, config);

    let assignments: number[] = new Array(sensors.length).fill(0);
    let converged = false;
    let iteration = 0;

    while (!converged && iteration < this.maxIterations) {
      const newAssignments = this.assignSensorsToCentroids(sensors, centroids);

      const newCentroids = this.updateCentroids(sensors, newAssignments, k);

      converged = this.hasConverged(centroids, newCentroids);

      assignments = newAssignments;
      centroids = newCentroids;
      iteration++;
    }

    return this.createClusters(sensors, assignments, centroids, k);
  }

  private assignSleepingToCluster(
    clusters: Cluster[],
    sleepingSensors: Sensor[]
  ): void {
    for (const sleepingSensor of sleepingSensors) {
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

      if (nearestCluster) {
        if (!nearestCluster.sleepingMembers) {
          nearestCluster.sleepingMembers = [];
        }
        nearestCluster.sleepingMembers.push(sleepingSensor);
      }
    }
  }

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

  public clearHistory(): void {
    this.sensorHistory.clear();
  }

  public getHistorySize(): number {
    return this.sensorHistory.size;
  }

  public getAverageHistoryLength(): number {
    if (this.sensorHistory.size === 0) return 0;

    let totalLength = 0;
    for (const history of this.sensorHistory.values()) {
      totalLength += history.length;
    }

    return totalLength / this.sensorHistory.size;
  }
}
