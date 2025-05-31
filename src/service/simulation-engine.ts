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

      // Regular cluster members (active nodes)
      const members = cluster.members.filter((m) => m.id !== cluster.headId);
      const rxEnergy = members.length * this.config.energyRxElec;
      head.energy -= rxEnergy;
      head.energy -= this.config.energyToSatellite;

      // Process active members
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

      // Process sleeping members (for info-kmeans)
      if (algorithm === "info-kmeans" && cluster.sleepingMembers) {
        cluster.sleepingMembers.forEach((sleepingMember) => {
          const memberSensor = sensors.find((s) => s.id === sleepingMember.id);
          if (!memberSensor || memberSensor.energy <= 0) return;

          // Sleeping nodes consume very little energy
          memberSensor.energy -= 0.001;
          if (memberSensor.energy < 0) {
            memberSensor.energy = 0;
          }
        });
      }

      // Base energy consumption for all active sensors
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

  private runSingleAlgorithm(
    algorithm: AlgorithmType,
    maxRounds: number = 1000
  ): AlgorithmResult {
    const algorithmSensors = this.deepCopySensors(this.sensors);
    const history: HistoryItem[] = [];

    let round = 0;
    let lastClusteringRound = -1;
    let networkLifetime = 0;
    let totalInformationNodes = 0;
    let informationNodeCounts = 0;
    let totalEnergySaved = 0;

    // Clear history for info-kmeans algorithm
    if (algorithm === "info-kmeans") {
      this.infoKmeansAlgorithm.clearHistory();
    }

    const clusteringAlgorithm =
      algorithm === "kmeans"
        ? this.kmeansAlgorithm
        : algorithm === "leach"
        ? this.leachAlgorithm
        : this.infoKmeansAlgorithm;

    while (round < maxRounds) {
      const aliveSensors = this.getAliveSensors(algorithmSensors);

      if (aliveSensors.length === 0) {
        if (networkLifetime === 0) {
          networkLifetime = round;
        }
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
          // info-kmeans with historical data
          clusters = clusteringAlgorithm.cluster(
            algorithmSensors,
            this.config,
            round,
            sensorsData
          );
        }
        lastClusteringRound = round;
      } else {
        if (history.length > 0) {
          const lastHistory = history[history.length - 1];
          clusters = lastHistory.clusters
            .map((cluster) => ({
              ...cluster,
              members: cluster.members
                .map((member) => {
                  const currentSensor = algorithmSensors.find(
                    (s) => s.id === member.id
                  );
                  return currentSensor || member;
                })
                .filter((member) => member.energy > 0),
              sleepingMembers: cluster.sleepingMembers
                ? cluster.sleepingMembers
                    .map((member) => {
                      const currentSensor = algorithmSensors.find(
                        (s) => s.id === member.id
                      );
                      return currentSensor || member;
                    })
                    .filter((member) => member.energy > 0)
                : undefined,
            }))
            .filter((cluster) => {
              const head = algorithmSensors.find(
                (s) => s.id === cluster.headId
              );
              return head && head.energy > 0;
            });
        }
      }

      this.calculateEnergyConsumption(clusters, algorithmSensors, algorithm);

      // Calculate metrics for info-kmeans
      if (algorithm === "info-kmeans") {
        const activeSensors = algorithmSensors.filter(
          (s) => s.energy > 0 && !s.isAsleep
        );
        const sleepingSensors = algorithmSensors.filter(
          (s) => s.energy > 0 && s.isAsleep
        );

        totalInformationNodes += activeSensors.length;
        informationNodeCounts++;

        // Estimate energy saved by sleeping nodes
        totalEnergySaved += sleepingSensors.length * 0.01;
      }

      const sleepingNodes = algorithmSensors
        .filter((s) => s.isAsleep && s.energy > 0)
        .map((s) => s.id);

      const historyItem: HistoryItem = {
        clusters: clusters.map((cluster) => ({
          ...cluster,
          members: cluster.members.map((member) => ({
            id: member.id,
            x: member.x,
            y: member.y,
            energy:
              algorithmSensors.find((s) => s.id === member.id)?.energy || 0,
            isAsleep:
              algorithmSensors.find((s) => s.id === member.id)?.isAsleep ||
              false,
          })),
          sleepingMembers: cluster.sleepingMembers?.map((member) => ({
            id: member.id,
            x: member.x,
            y: member.y,
            energy:
              algorithmSensors.find((s) => s.id === member.id)?.energy || 0,
            isAsleep: true,
          })),
        })),
        sensorsData: [...sensorsData],
        sleepingNodes: sleepingNodes.length > 0 ? sleepingNodes : undefined,
      };

      history.push(historyItem);
      round++;
    }

    if (networkLifetime === 0) {
      networkLifetime = round;
    }

    const result: AlgorithmResult = {
      history: [...history],
      networkLifetime,
      totalRounds: round,
    };

    // Add info-kmeans specific metrics
    if (algorithm === "info-kmeans") {
      result.averageInformationNodes =
        informationNodeCounts > 0
          ? totalInformationNodes / informationNodeCounts
          : 0;
      result.energySavings = totalEnergySaved;
    }

    return result;
  }

  public runSimulation(maxRounds: number = 1000): SimulationResult {
    this.generateSensors();

    const originalSensors = this.deepCopySensors(this.sensors);

    const algorithms: { [K in AlgorithmType]: AlgorithmResult } = {
      kmeans: this.runSingleAlgorithm("kmeans", maxRounds),
      leach: this.runSingleAlgorithm("leach", maxRounds),
      "info-kmeans": this.runSingleAlgorithm("info-kmeans", maxRounds),
    };

    return {
      sensors: originalSensors,
      algorithms,
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

    // Clear history when config changes
    this.infoKmeansAlgorithm.clearHistory();
  }

  public getEnvironmentModule(): EnvironmentModule {
    return this.environmentModule;
  }

  public updateEnvironment(): void {
    this.environmentModule.updateEnvironment();
  }

  // Method to get info-kmeans debug information
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
