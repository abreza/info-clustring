import {
  Sensor,
  Cluster,
  SimulationConfig,
  ClusteringAlgorithm,
} from "../types";

interface HeedNodeState {
  sensor: Sensor;
  prob: number;
  status: "Tentative_CH" | "Final_CH" | "Passive";
  cost: number;
  myHeadId: number | null;
  myHeadCost: number;
  myHeadStatus: "Tentative_CH" | "Final_CH" | null;
  isFinalized: boolean;
}

export class HeedClusteringAlgorithm implements ClusteringAlgorithm {
  private readonly C_PROB = 0.05;
  private readonly P_MIN = 0.0001;
  private readonly MAX_ITERATIONS = 20;

  private readonly CLUSTER_RANGE = 150;

  public cluster(
    sensors: Sensor[],
    config: SimulationConfig,
    round: number = 0
  ): Cluster[] {
    const aliveSensors = sensors.filter((s) => s.energy > 0);
    if (aliveSensors.length === 0) return [];

    const nodeStates = new Map<number, HeedNodeState>();

    aliveSensors.forEach((sensor) => {
      const neighbors = this.getNeighbors(sensor, aliveSensors);
      const cost = this.calculateAMRP(sensor, neighbors, config);

      const ratio = sensor.energy / config.initialEnergy;
      let prob = this.C_PROB * ratio;
      prob = Math.max(this.P_MIN, prob);

      nodeStates.set(sensor.id, {
        sensor,
        prob,
        status: "Passive",
        cost,
        myHeadId: null,
        myHeadCost: Infinity,
        myHeadStatus: null,
        isFinalized: false,
      });
    });

    let allFinalized = false;
    let iterations = 0;

    while (!allFinalized && iterations < this.MAX_ITERATIONS) {
      allFinalized = true;

      for (const [id, state] of nodeStates) {
        if (state.isFinalized) continue;

        if (state.prob >= 1.0) {
          if (state.status !== "Final_CH") {
            state.status = "Final_CH";

            state.myHeadId = id;
            state.myHeadCost = state.cost;
            state.myHeadStatus = "Final_CH";
          }
          state.isFinalized = true;
        } else {
          allFinalized = false;

          if (state.status === "Passive") {
            const rand = Math.random();
            if (rand < state.prob) {
              state.status = "Tentative_CH";

              state.myHeadId = id;
              state.myHeadCost = state.cost;
              state.myHeadStatus = "Tentative_CH";
            }
          }
        }
      }

      for (const [id, state] of nodeStates) {
        if (state.isFinalized) continue;

        const neighbors = this.getNeighbors(state.sensor, aliveSensors);

        for (const neighbor of neighbors) {
          const neighborState = nodeStates.get(neighbor.id);
          if (!neighborState) continue;

          if (
            neighborState.status === "Tentative_CH" ||
            neighborState.status === "Final_CH"
          ) {
            let switchHead = false;

            if (state.myHeadId === null) {
              switchHead = true;
            } else {
              if (neighborState.cost < state.myHeadCost) {
                switchHead = true;
              } else if (neighborState.cost === state.myHeadCost) {
                if (
                  neighborState.status === "Final_CH" &&
                  state.myHeadStatus !== "Final_CH"
                ) {
                  switchHead = true;
                }
              }
            }

            if (switchHead) {
              state.myHeadId = neighbor.id;
              state.myHeadCost = neighborState.cost;
              state.myHeadStatus = neighborState.status;

              if (neighborState.status === "Final_CH") {
                state.status = "Passive";
                state.isFinalized = true;
              }
            }
          }
        }
      }

      for (const [_, state] of nodeStates) {
        if (!state.isFinalized) {
          state.prob = Math.min(1.0, state.prob * 2);
        }
      }

      iterations++;
    }

    for (const [id, state] of nodeStates) {
      if (state.status === "Tentative_CH") {
        state.status = "Final_CH";
        state.myHeadId = id;
        state.myHeadCost = state.cost;
        state.myHeadStatus = "Final_CH";
        state.isFinalized = true;
      }

      if (state.status === "Passive" && state.myHeadId === null) {
        state.status = "Final_CH";
        state.myHeadId = id;
        state.myHeadCost = state.cost;
        state.myHeadStatus = "Final_CH";
        state.isFinalized = true;
      }
    }

    const clustersMap = new Map<number, Cluster>();
    let clusterIndex = 0;

    for (const [id, state] of nodeStates) {
      if (state.status === "Final_CH") {
        clustersMap.set(id, {
          id: clusterIndex++,
          headId: id,
          members: [],
        });
      }
    }

    for (const [id, state] of nodeStates) {
      if (state.myHeadId !== null && clustersMap.has(state.myHeadId)) {
        const cluster = clustersMap.get(state.myHeadId)!;
        cluster.members.push(state.sensor);
      } else {
        if (!clustersMap.has(id)) {
          clustersMap.set(id, {
            id: clusterIndex++,
            headId: id,
            members: [state.sensor],
          });
        }
      }
    }

    return Array.from(clustersMap.values());
  }

  private calculateAMRP(
    target: Sensor,
    neighbors: Sensor[],
    config: SimulationConfig
  ): number {
    if (neighbors.length === 0) return Number.POSITIVE_INFINITY;

    let totalPower = 0;
    for (const neighbor of neighbors) {
      const dist = this.euclideanDistance(target, neighbor);

      const power = config.energyTxElec + config.distanceFactor * (dist * dist);
      totalPower += power;
    }

    return totalPower / neighbors.length;
  }

  private getNeighbors(target: Sensor, allSensors: Sensor[]): Sensor[] {
    return allSensors.filter((s) => {
      if (s.id === target.id) return false;
      const dist = this.euclideanDistance(target, s);
      return dist <= this.CLUSTER_RANGE;
    });
  }

  private euclideanDistance(
    p1: { x: number; y: number },
    p2: { x: number; y: number }
  ): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
