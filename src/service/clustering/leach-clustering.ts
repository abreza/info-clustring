import {
  Sensor,
  Cluster,
  SimulationConfig,
  ClusteringAlgorithm,
} from "../types";

interface LeachNode {
  sensor: Sensor;
  wasClusterHead: boolean;
  lastClusterHeadRound: number;
}

export class LeachClusteringAlgorithm implements ClusteringAlgorithm {
  private nodes: Map<number, LeachNode> = new Map();
  private clusterHeadProbability: number = 0.1;
  private roundsPerCycle: number;

  constructor() {
    this.roundsPerCycle = Math.ceil(1 / this.clusterHeadProbability);
  }

  public cluster(
    sensors: Sensor[],
    config: SimulationConfig,
    round: number = 0
  ): Cluster[] {
    const aliveSensors = sensors.filter((sensor) => sensor.energy > 0);

    if (aliveSensors.length === 0) {
      return [];
    }

    this.updateNodeTracking(aliveSensors, round);

    const desiredClusterHeads = Math.min(
      config.numClusters,
      aliveSensors.length
    );

    this.updateClusterHeadProbability(desiredClusterHeads, aliveSensors.length);

    const clusterHeads = this.selectClusterHeads(
      aliveSensors,
      round,
      desiredClusterHeads
    );

    if (clusterHeads.length === 0) {
      const emergencyHead = aliveSensors.reduce((max, sensor) =>
        sensor.energy > max.energy ? sensor : max
      );
      clusterHeads.push(emergencyHead);
    }

    return this.formClusters(aliveSensors, clusterHeads);
  }

  private updateClusterHeadProbability(
    desiredClusterHeads: number,
    totalSensors: number
  ): void {
    this.clusterHeadProbability = Math.min(
      1.0,
      desiredClusterHeads / totalSensors
    );
    this.roundsPerCycle = Math.ceil(1 / this.clusterHeadProbability);
  }

  private updateNodeTracking(sensors: Sensor[], currentRound: number): void {
    for (const sensor of sensors) {
      if (!this.nodes.has(sensor.id)) {
        this.nodes.set(sensor.id, {
          sensor: sensor,
          wasClusterHead: false,
          lastClusterHeadRound: -1,
        });
      } else {
        const node = this.nodes.get(sensor.id)!;
        node.sensor = sensor;
      }
    }

    const aliveSensorIds = new Set(sensors.map((s) => s.id));
    for (const [nodeId] of this.nodes) {
      if (!aliveSensorIds.has(nodeId)) {
        this.nodes.delete(nodeId);
      }
    }
  }

  private selectClusterHeads(
    sensors: Sensor[],
    currentRound: number,
    desiredCount: number
  ): Sensor[] {
    const clusterHeads: Sensor[] = [];
    const candidates: { sensor: Sensor; probability: number }[] = [];

    for (const sensor of sensors) {
      const node = this.nodes.get(sensor.id)!;
      const probability = this.calculateClusterHeadProbability(
        node,
        currentRound
      );
      candidates.push({ sensor, probability });
    }

    candidates.sort((a, b) => {
      if (Math.abs(a.probability - b.probability) < 0.001) {
        return b.sensor.energy - a.sensor.energy;
      }
      return b.probability - a.probability;
    });

    const numToSelect = Math.min(desiredCount, candidates.length);
    for (let i = 0; i < numToSelect; i++) {
      const candidate = candidates[i];
      if (candidate.probability > 0) {
        clusterHeads.push(candidate.sensor);

        const node = this.nodes.get(candidate.sensor.id)!;
        node.wasClusterHead = true;
        node.lastClusterHeadRound = currentRound;
      }
    }

    while (
      clusterHeads.length < desiredCount &&
      clusterHeads.length < sensors.length
    ) {
      const remainingSensors = sensors.filter((s) => !clusterHeads.includes(s));
      if (remainingSensors.length === 0) break;

      const nextHead = remainingSensors.reduce((max, sensor) =>
        sensor.energy > max.energy ? sensor : max
      );
      clusterHeads.push(nextHead);

      const node = this.nodes.get(nextHead.id)!;
      node.wasClusterHead = true;
      node.lastClusterHeadRound = currentRound;
    }

    return clusterHeads;
  }

  private calculateClusterHeadProbability(
    node: LeachNode,
    currentRound: number
  ): number {
    const cycleRound = currentRound % this.roundsPerCycle;

    if (
      node.wasClusterHead &&
      node.lastClusterHeadRound >= currentRound - this.roundsPerCycle
    ) {
      return 0;
    }

    if (cycleRound === 0) {
      node.wasClusterHead = false;
      node.lastClusterHeadRound = -1;
    }

    const k = this.clusterHeadProbability;
    const baseProb = k / (1 - k * cycleRound);

    const energyFactor = Math.min(2.0, node.sensor.energy / 50);

    return Math.min(1.0, baseProb * energyFactor);
  }

  private formClusters(
    allSensors: Sensor[],
    clusterHeads: Sensor[]
  ): Cluster[] {
    const clusters: Cluster[] = [];
    const clusterHeadIds = new Set(clusterHeads.map((h) => h.id));

    for (let i = 0; i < clusterHeads.length; i++) {
      clusters.push({
        id: i,
        headId: clusterHeads[i].id,
        members: [clusterHeads[i]],
      });
    }

    const nonHeadSensors = allSensors.filter(
      (sensor) => !clusterHeadIds.has(sensor.id)
    );

    for (const sensor of nonHeadSensors) {
      let nearestClusterIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < clusterHeads.length; i++) {
        const distance = this.euclideanDistance(sensor, clusterHeads[i]);
        if (distance < minDistance) {
          minDistance = distance;
          nearestClusterIndex = i;
        }
      }

      clusters[nearestClusterIndex].members.push(sensor);
    }

    return clusters.filter((cluster) => cluster.members.length > 0);
  }

  private euclideanDistance(sensor1: Sensor, sensor2: Sensor): number {
    const dx = sensor1.x - sensor2.x;
    const dy = sensor1.y - sensor2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public setClusterHeadProbability(probability: number): void {
    this.clusterHeadProbability = Math.max(0.01, Math.min(1.0, probability));
    this.roundsPerCycle = Math.ceil(1 / this.clusterHeadProbability);
  }

  public getParameters(): { probability: number; roundsPerCycle: number } {
    return {
      probability: this.clusterHeadProbability,
      roundsPerCycle: this.roundsPerCycle,
    };
  }
}
