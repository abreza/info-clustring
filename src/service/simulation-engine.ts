import {
  Sensor,
  SensorData,
  Cluster,
  HistoryItem,
  SimulationConfig,
  AlgorithmType,
  SimulationResult,
  SimulationStats,
  AlgorithmResult,
} from "./types";
import { KMeansClusteringAlgorithm } from "./clustering/kmeans-clustering";
import { LeachClusteringAlgorithm } from "./clustering/leach-clustering";
import { InfoKMeansClusteringAlgorithm } from "./clustering/info-kmeans-clustering";
import { EnvironmentModule } from "./environment/environment-module";

export class WSNSimulationEngine {
  private config: SimulationConfig;
  private sensors: Sensor[];
  private sensorsData: SensorData[];
  private kmeansAlgorithm: KMeansClusteringAlgorithm;
  private leachAlgorithm: LeachClusteringAlgorithm;
  private infoKmeansAlgorithm: InfoKMeansClusteringAlgorithm;
  private environmentModule: EnvironmentModule;

  private readonly EPS = 1e-4;
  private readonly EST_K = 6;

  constructor(config: SimulationConfig) {
    this.config = config;
    this.sensors = [];
    this.sensorsData = [];
    this.kmeansAlgorithm = new KMeansClusteringAlgorithm();
    this.leachAlgorithm = new LeachClusteringAlgorithm();
    this.infoKmeansAlgorithm = new InfoKMeansClusteringAlgorithm();
    this.environmentModule = new EnvironmentModule(config);
  }

  private generateSensors(): void {
    this.sensors = [];
    this.sensorsData = [];

    for (let i = 0; i < this.config.numSensors; i++) {
      const x = Math.random() * this.config.width;
      const y = Math.random() * this.config.height;

      const sensor: Sensor = {
        id: i,
        x,
        y,
        energy: this.config.initialEnergy,
        isAsleep: false,
      };

      this.sensors.push(sensor);
    }
  }

  private distance(sensor1: Sensor, sensor2: Sensor): number {
    return Math.sqrt(
      Math.pow(sensor1.x - sensor2.x, 2) + Math.pow(sensor1.y - sensor2.y, 2)
    );
  }

  private getAliveSensors(sensors: Sensor[]): Sensor[] {
    return sensors.filter((s) => s.energy > 0);
  }

  private calculateEnergyConsumption(
    clusters: Cluster[],
    sensors: Sensor[],
    algorithm: AlgorithmType
  ): void {
    clusters.forEach((cluster) => {
      const head = sensors.find((s) => s.id === cluster.headId);
      if (!head || head.energy <= 0) return;

      const members = cluster.members.filter((m) => m.id !== cluster.headId);
      const rxEnergy = members.length * this.config.energyRxElec;
      head.energy -= rxEnergy;
      head.energy -= this.config.energyToSatellite;

      members.forEach((member) => {
        const memberSensor = sensors.find((s) => s.id === member.id);
        if (!memberSensor || memberSensor.energy <= 0 || memberSensor.isAsleep)
          return;

        const dist = this.distance(member, head);
        const txEnergy =
          this.config.energyTxElec +
          this.config.distanceFactor * Math.pow(dist, 2);
        memberSensor.energy -= txEnergy;

        if (memberSensor.energy < 0) {
          memberSensor.energy = 0;
        }
      });

      if (algorithm === "info-kmeans" && cluster.sleepingMembers) {
        cluster.sleepingMembers.forEach((sleepingMember) => {
          const memberSensor = sensors.find((s) => s.id === sleepingMember.id);
          if (!memberSensor || memberSensor.energy <= 0) return;

          memberSensor.energy -= 0.001;
          if (memberSensor.energy < 0) {
            memberSensor.energy = 0;
          }
        });
      }

      sensors.forEach((sensor) => {
        if (sensor.energy > 0 && !sensor.isAsleep) {
          sensor.energy -= 0.01;
          if (sensor.energy < 0) {
            sensor.energy = 0;
          }
        }
      });

      if (head.energy < 0) {
        head.energy = 0;
      }
    });
  }

  private deepCopySensors(sensors: Sensor[]): Sensor[] {
    return sensors.map((sensor) => ({ ...sensor }));
  }

  private estimateSensorValueEnhanced(
    target: Sensor,
    roundIdx: number,
    lastKnown: Map<number, SensorData>,
    allSensors: Sensor[]
  ): SensorData {
    const allNeighbors = allSensors
      .filter((s) => s.id !== target.id)
      .sort((a, b) => this.distance(a, target) - this.distance(b, target))
      .slice(0, this.EST_K);

    if (allNeighbors.length === 0) {
      return {
        id: target.id,
        ...this.environmentModule.getSensorData(target.x, target.y, roundIdx),
      };
    }

    let wSum = 0;
    const acc = { salinity: 0, pressure: 0, temperature: 0, ph: 0 };
    let usedNeighbors = 0;

    for (const neighbor of allNeighbors) {
      const neighborData = lastKnown.get(neighbor.id);
      if (neighborData) {
        const w = 1 / (this.distance(neighbor, target) + this.EPS);
        wSum += w;
        acc.salinity += neighborData.salinity * w;
        acc.pressure += neighborData.pressure * w;
        acc.temperature += neighborData.temperature * w;
        acc.ph += neighborData.ph * w;
        usedNeighbors++;
      }
    }

    if (usedNeighbors === 0) {
      return {
        id: target.id,
        ...this.environmentModule.getSensorData(target.x, target.y, roundIdx),
      };
    }

    return {
      id: target.id,
      salinity: acc.salinity / wSum,
      pressure: acc.pressure / wSum,
      temperature: acc.temperature / wSum,
      ph: acc.ph / wSum,
    };
  }

  private runSingleAlgorithm(
    algorithm: AlgorithmType,
    maxRounds: number = 1000
  ): AlgorithmResult {
    const algorithmSensors = this.deepCopySensors(this.sensors);

    const history: HistoryItem[] = [];
    const estimationErrors: number[] = [];

    if (algorithm === "info-kmeans") {
      this.infoKmeansAlgorithm.clearHistory();
    }

    const clusteringAlgorithm =
      algorithm === "kmeans"
        ? this.kmeansAlgorithm
        : algorithm === "leach"
        ? this.leachAlgorithm
        : this.infoKmeansAlgorithm;

    const lastKnown = new Map<number, SensorData>();

    let round = 0;
    let lastClusteringRound = -1;
    let networkLifetime = 0;
    let totalInformationNodes = 0;
    let informationNodeCounts = 0;
    let totalEnergySaved = 0;

    let networkEnded = false;
    while (round < maxRounds) {
      const aliveSensors = algorithmSensors.filter((s) => s.energy > 0);

      if (aliveSensors.length === 0) {
        if (networkLifetime === 0) networkLifetime = round;
        networkEnded = true;
        break;
      }

      const sensorsData = algorithmSensors.map((sensor) => ({
        id: sensor.id,
        ...this.environmentModule.getSensorData(sensor.x, sensor.y, round),
      }));

      let clusters: Cluster[] = [];
      const shouldRecluster =
        round - lastClusteringRound >= this.config.clusteringInterval ||
        lastClusteringRound === -1;

      if (shouldRecluster) {
        if (algorithm === "kmeans") {
          clusters = clusteringAlgorithm.cluster(algorithmSensors, this.config);
        } else if (algorithm === "leach") {
          clusters = clusteringAlgorithm.cluster(
            algorithmSensors,
            this.config,
            Math.floor(round / this.config.clusteringInterval)
          );
        } else {
          clusters = clusteringAlgorithm.cluster(
            algorithmSensors,
            this.config,
            round,
            sensorsData
          );
        }
        lastClusteringRound = round;
      } else if (history.length) {
        const prev = history[history.length - 1];
        clusters = prev.clusters
          .map((c) => ({
            ...c,
            members: c.members
              .map((m) => {
                const now = algorithmSensors.find((s) => s.id === m.id);
                return now ?? m;
              })
              .filter((m) => m.energy > 0),
            sleepingMembers: c.sleepingMembers
              ?.map((m) => {
                const now = algorithmSensors.find((s) => s.id === m.id);
                return now ?? m;
              })
              .filter((m) => m.energy > 0),
          }))
          .filter(
            (c) => algorithmSensors.find((s) => s.id === c.headId)?.energy! > 0
          );
      }

      this.calculateEnergyConsumption(clusters, algorithmSensors, algorithm);

      for (const sensor of algorithmSensors) {
        const truth = sensorsData.find((d) => d.id === sensor.id)!;

        if (sensor.energy > 0 && !sensor.isAsleep) {
          lastKnown.set(sensor.id, truth);
        }
      }

      let maeSum = 0;
      let sampleCnt = 0;

      for (const sensor of algorithmSensors) {
        const truth = sensorsData.find((d) => d.id === sensor.id)!;
        const missing = sensor.energy <= 0 || sensor.isAsleep;

        if (missing) {
          const est = this.estimateSensorValueEnhanced(
            sensor,
            round,
            lastKnown,
            this.sensors
          );
          maeSum +=
            Math.abs(est.salinity - truth.salinity) +
            Math.abs(est.pressure - truth.pressure) +
            Math.abs(est.temperature - truth.temperature) +
            Math.abs(est.ph - truth.ph);
          sampleCnt += 4;
        }
      }
      estimationErrors.push(sampleCnt ? maeSum / sampleCnt : 0);

      if (algorithm === "info-kmeans") {
        const active = algorithmSensors.filter(
          (s) => s.energy > 0 && !s.isAsleep
        );
        const sleeping = algorithmSensors.filter(
          (s) => s.energy > 0 && s.isAsleep
        );
        totalInformationNodes += active.length;
        informationNodeCounts++;
        totalEnergySaved += sleeping.length * 0.01;
      }

      const sleepingNodes = algorithmSensors
        .filter((s) => s.isAsleep && s.energy > 0)
        .map((s) => s.id);

      history.push({
        clusters: clusters.map((cluster) => ({
          ...cluster,
          members: cluster.members.map((member) => ({
            id: member.id,
            x: member.x,
            y: member.y,
            energy:
              algorithmSensors.find((s) => s.id === member.id)?.energy ?? 0,
            isAsleep:
              algorithmSensors.find((s) => s.id === member.id)?.isAsleep ??
              false,
          })),
          sleepingMembers: cluster.sleepingMembers?.map((m) => ({
            id: m.id,
            x: m.x,
            y: m.y,
            energy: algorithmSensors.find((s) => s.id === m.id)?.energy ?? 0,
            isAsleep: true,
          })),
        })),
        sensorsData: [...sensorsData],
        sleepingNodes: sleepingNodes.length ? sleepingNodes : undefined,
      });

      round++;
    }

    if (networkLifetime === 0) networkLifetime = round;

    const result: AlgorithmResult = {
      history,
      networkLifetime,
      totalRounds: round,
      estimationErrors,
    };

    if (algorithm === "info-kmeans") {
      result.averageInformationNodes =
        informationNodeCounts > 0
          ? totalInformationNodes / informationNodeCounts
          : 0;
      result.energySavings = totalEnergySaved;
    }

    return result;
  }

  private calculateExtendedErrors(
    results: { [K in AlgorithmType]: AlgorithmResult },
    maxRounds: number
  ): void {
    const algorithms: AlgorithmType[] = ["kmeans", "leach", "info-kmeans"];

    for (const algorithm of algorithms) {
      const result = results[algorithm];
      const currentRounds = result.totalRounds;

      if (currentRounds < maxRounds) {
        const lastKnown = new Map<number, SensorData>();

        for (let round = 0; round < currentRounds; round++) {
          const historyItem = result.history[round];
          for (const data of historyItem.sensorsData) {
            const allMembers = historyItem.clusters.flatMap((c) => [
              ...c.members,
              ...(c.sleepingMembers || []),
            ]);
            const sensor = allMembers.find((m) => m.id === data.id);

            if (sensor && sensor.energy > 0 && !sensor.isAsleep) {
              lastKnown.set(data.id, data);
            }
          }
        }

        for (let round = currentRounds; round < maxRounds; round++) {
          const sensorsData = this.sensors.map((sensor) => ({
            id: sensor.id,
            ...this.environmentModule.getSensorData(sensor.x, sensor.y, round),
          }));

          let maeSum = 0;
          let sampleCnt = 0;

          for (const sensor of this.sensors) {
            const truth = sensorsData.find((d) => d.id === sensor.id)!;
            const est = this.estimateSensorValueEnhanced(
              sensor,
              round,
              lastKnown,
              this.sensors
            );

            maeSum +=
              Math.abs(est.salinity - truth.salinity) +
              Math.abs(est.pressure - truth.pressure) +
              Math.abs(est.temperature - truth.temperature) +
              Math.abs(est.ph - truth.ph);
            sampleCnt += 4;
          }

          result.estimationErrors?.push(sampleCnt ? maeSum / sampleCnt : 0);
        }

        result.totalRounds = maxRounds;
      }
    }
  }

  public runSimulation(maxRounds: number = 1000): SimulationResult {
    this.generateSensors();

    const originalSensors = this.deepCopySensors(this.sensors);

    const algorithmResults = {
      kmeans: this.runSingleAlgorithm("kmeans", maxRounds),
      leach: this.runSingleAlgorithm("leach", maxRounds),
      "info-kmeans": this.runSingleAlgorithm("info-kmeans", maxRounds),
    };

    const maxAchievedRounds = Math.max(
      algorithmResults.kmeans.totalRounds,
      algorithmResults.leach.totalRounds,
      algorithmResults["info-kmeans"].totalRounds
    );

    this.calculateExtendedErrors(algorithmResults, maxAchievedRounds);

    return {
      sensors: originalSensors,
      algorithms: algorithmResults,
    };
  }

  public getStatsForRound(
    result: SimulationResult,
    algorithm: AlgorithmType,
    round: number
  ): SimulationStats {
    const algorithmResult = result.algorithms[algorithm];

    if (round >= algorithmResult.history.length) {
      return {
        round,
        aliveSensors: 0,
        totalEnergy: 0,
        averageEnergy: 0,
        clusters: 0,
        lastClusteringRound: 0,
        sleepingNodes: 0,
        activeNodes: 0,
      };
    }

    const historyItem = algorithmResult.history[round];
    const allMembers = historyItem.clusters.flatMap((c) => [
      ...c.members,
      ...(c.sleepingMembers || []),
    ]);

    const aliveSensors = allMembers.filter((s) => s.energy > 0);
    const activeSensors = aliveSensors.filter((s) => !s.isAsleep);
    const sleepingSensors = aliveSensors.filter((s) => s.isAsleep);

    const totalEnergy = aliveSensors.reduce((sum, s) => sum + s.energy, 0);

    const lastClusteringRound =
      Math.floor(round / this.config.clusteringInterval) *
      this.config.clusteringInterval;

    return {
      round,
      aliveSensors: aliveSensors.length,
      totalEnergy: parseFloat(totalEnergy.toFixed(1)),
      averageEnergy:
        aliveSensors.length > 0
          ? parseFloat((totalEnergy / aliveSensors.length).toFixed(1))
          : 0,
      clusters: historyItem.clusters.length,
      lastClusteringRound,
      sleepingNodes: sleepingSensors.length,
      activeNodes: activeSensors.length,
    };
  }

  public getConfig(): SimulationConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<SimulationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.environmentModule = new EnvironmentModule(this.config);

    this.infoKmeansAlgorithm.clearHistory();
  }

  public getEnvironmentModule(): EnvironmentModule {
    return this.environmentModule;
  }

  public updateEnvironment(): void {
    this.environmentModule.updateEnvironment();
  }

  public getInfoKMeansDebugInfo(): {
    historySize: number;
    averageHistoryLength: number;
  } {
    return {
      historySize: this.infoKmeansAlgorithm.getHistorySize(),
      averageHistoryLength: this.infoKmeansAlgorithm.getAverageHistoryLength(),
    };
  }
}
