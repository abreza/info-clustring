import {
  Sensor,
  Cluster,
  SimulationConfig,
  ClusteringAlgorithm,
} from "../types";

interface TentativeNode {
  sensor: Sensor;
  rComp: number;
  isHead: boolean;
  neighborHeads: number[];
}

export class EeucClusteringAlgorithm implements ClusteringAlgorithm {
  public cluster(
    sensors: Sensor[],
    config: SimulationConfig,
    round: number = 0
  ): Cluster[] {
    const aliveSensors = sensors.filter((s) => s.energy > 0);
    if (aliveSensors.length === 0) return [];

    const T = config.eeucThreshold ?? 0.4;
    const R_comp0 = config.eeucRCompMax ?? 90;
    const c = config.eeucC ?? 0.5;

    const bsX = config.bsX ?? config.width / 2;
    const bsY = config.bsY ?? -1000;

    let dMax = 0;
    let dMin = Infinity;

    aliveSensors.forEach((s) => {
      const d = this.distToBS(s, bsX, bsY);
      if (d > dMax) dMax = d;
      if (d < dMin) dMin = d;
    });

    const tentativeNodes = new Map<number, TentativeNode>();

    aliveSensors.forEach((sensor) => {
      if (Math.random() < T) {
        const dist = this.distToBS(sensor, bsX, bsY);

        const denominator = dMax - dMin === 0 ? 1 : dMax - dMin;
        const normalizedDist = (dMax - dist) / denominator;

        const rComp = (1 - c * normalizedDist) * R_comp0;

        tentativeNodes.set(sensor.id, {
          sensor,
          rComp,
          isHead: true,
          neighborHeads: [],
        });
      }
    });

    const tentativeArr = Array.from(tentativeNodes.values());
    for (let i = 0; i < tentativeArr.length; i++) {
      for (let j = i + 1; j < tentativeArr.length; j++) {
        const n1 = tentativeArr[i];
        const n2 = tentativeArr[j];
        const dist = this.euclideanDistance(n1.sensor, n2.sensor);

        if (dist < n1.rComp || dist < n2.rComp) {
          n1.neighborHeads.push(n2.sensor.id);
          n2.neighborHeads.push(n1.sensor.id);
        }
      }
    }

    const finalHeads: Sensor[] = [];
    const processed = new Set<number>();

    const sortedTentative = tentativeArr.sort((a, b) => {
      if (Math.abs(b.sensor.energy - a.sensor.energy) > 0.0001) {
        return b.sensor.energy - a.sensor.energy;
      }
      return a.sensor.id - b.sensor.id;
    });

    for (const candidate of sortedTentative) {
      if (processed.has(candidate.sensor.id)) continue;

      finalHeads.push(candidate.sensor);
      processed.add(candidate.sensor.id);

      for (const neighborId of candidate.neighborHeads) {
        if (!processed.has(neighborId)) {
          processed.add(neighborId);
        }
      }
    }

    if (finalHeads.length === 0 && aliveSensors.length > 0) {
      const best = aliveSensors.reduce((p, c) => (p.energy > c.energy ? p : c));
      finalHeads.push(best);
    }

    const clusters: Cluster[] = finalHeads.map((head, idx) => ({
      id: idx,
      headId: head.id,
      members: [head],
      relayId: null,
    }));

    const headIds = new Set(finalHeads.map((h) => h.id));
    const ordinaryNodes = aliveSensors.filter((s) => !headIds.has(s.id));

    ordinaryNodes.forEach((node) => {
      let minDist = Infinity;
      let closestClusterIndex = -1;

      clusters.forEach((cluster, idx) => {
        const head = finalHeads[idx];
        const d = this.euclideanDistance(node, head);
        if (d < minDist) {
          minDist = d;
          closestClusterIndex = idx;
        }
      });

      if (closestClusterIndex !== -1) {
        clusters[closestClusterIndex].members.push(node);
      }
    });

    this.assignRelayNodes(clusters, finalHeads, config, bsX, bsY);

    return clusters;
  }

  private assignRelayNodes(
    clusters: Cluster[],
    heads: Sensor[],
    config: SimulationConfig,
    bsX: number,
    bsY: number
  ) {
    const TD_MAX = config.eeucTdMax ?? 150;

    clusters.forEach((cluster) => {
      const head = heads.find((h) => h.id === cluster.headId)!;
      const distToBS = this.distToBS(head, bsX, bsY);

      if (distToBS < TD_MAX) {
        cluster.relayId = null;
        return;
      }

      const candidates = heads.filter((candidate) => {
        if (candidate.id === head.id) return false;
        const candidateDistToBS = this.distToBS(candidate, bsX, bsY);
        return candidateDistToBS < distToBS;
      });

      if (candidates.length === 0) {
        cluster.relayId = null;
        return;
      }

      const candidatesWithCost = candidates.map((c) => {
        const d_relay_sq =
          Math.pow(this.euclideanDistance(head, c), 2) +
          Math.pow(this.distToBS(c, bsX, bsY), 2);
        return { node: c, cost: d_relay_sq };
      });

      candidatesWithCost.sort((a, b) => a.cost - b.cost);

      const topCandidates = candidatesWithCost.slice(0, 2);

      let selectedRelay = topCandidates[0].node;

      if (topCandidates.length > 1) {
        if (topCandidates[1].node.energy > topCandidates[0].node.energy) {
          selectedRelay = topCandidates[1].node;
        }
      }

      cluster.relayId = selectedRelay.id;
    });
  }

  private distToBS(
    p: { x: number; y: number },
    bsX: number,
    bsY: number
  ): number {
    return Math.sqrt(Math.pow(p.x - bsX, 2) + Math.pow(p.y - bsY, 2));
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
