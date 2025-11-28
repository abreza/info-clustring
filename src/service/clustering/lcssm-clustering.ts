import {
  Sensor,
  Cluster,
  SimulationConfig,
  ClusteringAlgorithm,
  SensorData,
  EnvironmentGrids,
} from "../types";

export class LcssmClusteringAlgorithm implements ClusteringAlgorithm {
  private history: Map<number, number[]> = new Map();
  private lccMatrix: Map<string, number> = new Map();
  private thresholds: Map<number, number> = new Map();
  private isTrained: boolean = false;

  private readonly VE_THRESHOLD_RATIO = 0.2;
  private readonly TRAINING_ROUNDS = 20;
  private readonly V_CONS = 0.95;

  public cluster(
    sensors: Sensor[],
    config: SimulationConfig,
    round: number = 0,
    sensorsData?: SensorData[],
    historicalData?: SensorData[][],
    environmentGrids?: EnvironmentGrids
  ): Cluster[] {
    const aliveSensors = sensors.filter((s) => s.energy > 0);
    if (aliveSensors.length === 0) return [];

    const currentStatusMap = new Map<number, number>();
    if (sensorsData) {
      sensorsData.forEach((data) => {
        const isVE = this.isValuableEvent(data, config);
        currentStatusMap.set(data.id, isVE ? 1 : 0);

        if (!this.history.has(data.id)) {
          this.history.set(data.id, []);
        }
        this.history.get(data.id)!.push(isVE ? 1 : 0);
      });
    }

    if (!this.isTrained && round >= this.TRAINING_ROUNDS) {
      this.trainModel(aliveSensors);
      this.isTrained = true;
    }

    aliveSensors.forEach((s) => (s.isAsleep = false));

    if (this.isTrained && sensorsData) {
      this.applySleepScheduling(aliveSensors, currentStatusMap);
    }

    const activeSensors = aliveSensors.filter((s) => !s.isAsleep);
    const sleepingSensors = aliveSensors.filter((s) => s.isAsleep);

    if (activeSensors.length === 0 && aliveSensors.length > 0) {
      const backup = aliveSensors.reduce((p, c) =>
        p.energy > c.energy ? p : c
      );
      backup.isAsleep = false;
      activeSensors.push(backup);
    }

    if (activeSensors.length === 0) return [];

    const head = activeSensors.reduce((prev, curr) =>
      prev.energy > curr.energy ? prev : curr
    );

    return [
      {
        id: 0,
        headId: head.id,
        members: activeSensors,
        sleepingMembers: sleepingSensors,
      },
    ];
  }

  private isValuableEvent(data: SensorData, config: SimulationConfig): boolean {
    const checkMetric = (val: number, min: number, max: number): boolean => {
      const range = max - min;
      if (range === 0) return false;
      const normalized = (val - min) / range;

      return (
        normalized > 1 - this.VE_THRESHOLD_RATIO ||
        normalized < this.VE_THRESHOLD_RATIO
      );
    };

    return (
      checkMetric(
        data.temperature,
        config.minTemperature,
        config.maxTemperature
      ) ||
      checkMetric(data.salinity, config.minSalinity, config.maxSalinity) ||
      checkMetric(data.pressure, config.minPressure, config.maxPressure) ||
      checkMetric(data.ph, config.minPH, config.maxPH)
    );
  }

  private trainModel(sensors: Sensor[]): void {
    for (let i = 0; i < sensors.length; i++) {
      for (let j = i + 1; j < sensors.length; j++) {
        const id1 = sensors[i].id;
        const id2 = sensors[j].id;

        const hist1 = this.history.get(id1) || [];
        const hist2 = this.history.get(id2) || [];

        const lcc = this.calculateLCC(hist1, hist2);

        this.lccMatrix.set(`${id1}-${id2}`, lcc);
        this.lccMatrix.set(`${id2}-${id1}`, lcc);
      }
    }

    sensors.forEach((sensor) => {
      const alpha = this.optimizeThreshold(sensor, sensors);
      this.thresholds.set(sensor.id, alpha);
    });
  }

  private calculateLCC(vecA: number[], vecB: number[]): number {
    const minLen = Math.min(vecA.length, vecB.length);

    const filteredA: number[] = [];
    const filteredB: number[] = [];

    for (let k = 0; k < minLen; k++) {
      if (vecA[k] === 1 || vecB[k] === 1) {
        filteredA.push(vecA[k]);
        filteredB.push(vecB[k]);
      }
    }

    if (filteredA.length === 0) return 0;

    const isConstant = (arr: number[], val: number) =>
      arr.every((v) => v === val);

    if (isConstant(filteredA, 1) && isConstant(filteredB, 1)) return 1;

    if (
      (isConstant(filteredA, 1) && isConstant(filteredB, 0)) ||
      (isConstant(filteredA, 0) && isConstant(filteredB, 1))
    )
      return -1;

    if (new Set(filteredA).size === 1 || new Set(filteredB).size === 1)
      return 0;

    const meanA = filteredA.reduce((a, b) => a + b, 0) / filteredA.length;
    const meanB = filteredB.reduce((a, b) => a + b, 0) / filteredB.length;

    const sd = (arr: number[], mean: number) =>
      Math.sqrt(
        arr.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / arr.length
      );

    const sdA = sd(filteredA, meanA);
    const sdB = sd(filteredB, meanB);

    if (sdA === 0 || sdB === 0) return 0;

    const normA = filteredA.map((v) => (v - meanA) / sdA);
    const normB = filteredB.map((v) => (v - meanB) / sdB);

    const dotProduct = normA.reduce(
      (sum, val, idx) => sum + val * normB[idx],
      0
    );
    return Math.max(-1, Math.min(1, dotProduct / filteredA.length));
  }

  private optimizeThreshold(target: Sensor, allSensors: Sensor[]): number {
    const neighbors = allSensors.filter((s) => {
      if (s.id === target.id) return false;
      const lcc = this.lccMatrix.get(`${target.id}-${s.id}`) ?? 0;
      return lcc < 0;
    });

    if (neighbors.length === 0) return -1;

    const sortedLCCs = neighbors
      .map((n) => this.lccMatrix.get(`${target.id}-${n.id}`)!)
      .sort((a, b) => a - b);

    const sLeft = [-1, ...sortedLCCs];

    let optimalAlpha = -1;

    const history = this.history.get(target.id) || [];
    const totalVEs = history.filter((v) => v === 1).length;

    if (totalVEs === 0) return 0;

    for (const alpha of sLeft) {
      let sensedVEs = 0;

      for (let t = 0; t < history.length; t++) {
        if (history[t] === 1) {
          let isAsleep = false;
          for (const n of neighbors) {
            const lcc = this.lccMatrix.get(`${target.id}-${n.id}`)!;
            if (lcc <= alpha) {
              const neighborHist = this.history.get(n.id);
              if (neighborHist && neighborHist[t] === 1) {
                isAsleep = true;
                break;
              }
            }
          }

          if (!isAsleep) sensedVEs++;
        }
      }

      const vhr = sensedVEs / totalVEs;

      if (vhr >= this.V_CONS) {
        optimalAlpha = alpha;
      } else {
        break;
      }
    }

    return optimalAlpha;
  }

  private applySleepScheduling(
    sensors: Sensor[],
    statusMap: Map<number, number>
  ): void {
    const activeSensors = sensors.filter((s) => statusMap.get(s.id) === 1);

    sensors.forEach((Si) => {
      if (statusMap.get(Si.id) === 0) {
        const alpha = this.thresholds.get(Si.id) ?? -1;
        let shouldSleep = false;

        for (const Sj of activeSensors) {
          if (Si.id === Sj.id) continue;

          const lcc = this.lccMatrix.get(`${Sj.id}-${Si.id}`) ?? 0;

          if (lcc <= alpha) {
            shouldSleep = true;
            break;
          }
        }

        if (shouldSleep) {
          Si.isAsleep = true;
        } else {
          Si.isAsleep = false;
        }
      } else {
        Si.isAsleep = false;
      }
    });
  }
}
