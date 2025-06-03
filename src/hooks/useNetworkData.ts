import { useMemo } from "react";
import { SimulationResult, AlgorithmType, Sensor } from "../service/types";
import { NetworkData } from "../types/NetworkVisualization.types";

export const useNetworkData = (
  simulationResult: SimulationResult | null,
  algorithm: AlgorithmType,
  currentRound: number
): NetworkData => {
  return useMemo(() => {
    if (!simulationResult) {
      return {
        sensors: [],
        clusters: [],
        sensorData: [],
      };
    }

    const algorithmResult = simulationResult.algorithms[algorithm];

    if (currentRound >= algorithmResult.history.length) {
      return {
        sensors: simulationResult.sensors,
        clusters: [],
        sensorData: [],
      };
    }

    const historyItem = algorithmResult.history[currentRound];
    const sensorMap = new Map<number, Sensor>();

    simulationResult.sensors.forEach((sensor) => {
      sensorMap.set(sensor.id, {
        id: sensor.id,
        x: sensor.x,
        y: sensor.y,
        energy: 0,
        isAsleep: false,
      });
    });

    historyItem.clusters.forEach((cluster) => {
      cluster.members.forEach((member: any) => {
        sensorMap.set(member.id, {
          id: member.id,
          x: member.x,
          y: member.y,
          energy: member.energy,
          isAsleep: member.isAsleep || false,
        });
      });

      if (cluster.sleepingMembers) {
        cluster.sleepingMembers.forEach((member: any) => {
          sensorMap.set(member.id, {
            id: member.id,
            x: member.x,
            y: member.y,
            energy: member.energy,
            isAsleep: true,
          });
        });
      }
    });

    return {
      sensors: Array.from(sensorMap.values()),
      clusters: historyItem.clusters,
      sensorData: historyItem.sensorsData,
    };
  }, [simulationResult, algorithm, currentRound]);
};
