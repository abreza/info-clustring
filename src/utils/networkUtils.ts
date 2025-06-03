import { AlgorithmType, Sensor, SimulationConfig } from "../service/types";
import { GridRowData, NetworkData } from "../types/NetworkVisualization.types";

export const getAlgorithmColor = (algorithm: AlgorithmType): string => {
  switch (algorithm) {
    case "kmeans":
      return "#2196F3";
    case "leach":
      return "#FF9800";
    case "info-kmeans":
      return "#9C27B0";
    default:
      return "#2196F3";
  }
};

export const getEnergyColor = (energyPercentage: number): string => {
  if (energyPercentage > 50) return "#4caf50";
  if (energyPercentage > 20) return "#ff9800";
  return "#f44336";
};

export const getEnergyHue = (energyRatio: number): number => {
  return energyRatio * 120;
};

export const getSensorRadius = (
  sensor: Sensor,
  config: SimulationConfig
): number => {
  const isAlive = sensor.energy > 0;
  const energyRatio = Math.max(0, sensor.energy / config.initialEnergy);
  return isAlive ? 3 + energyRatio * 4 : 2;
};

export const getSensorStatus = (sensor: Sensor): string => {
  if (sensor.energy <= 0) return "Dead";
  if (sensor.isAsleep) return "Sleeping";
  return "Active";
};

export const getClusterRole = (
  sensor: Sensor,
  isClusterHead: boolean,
  belongsToCluster: any
): string => {
  if (isClusterHead) return "Cluster Head";
  if (belongsToCluster) {
    return sensor.isAsleep ? "Sleeping Member" : "Active Member";
  }
  return "None";
};

export const prepareGridData = (
  networkData: NetworkData,
  config: SimulationConfig
): GridRowData[] => {
  const { sensors, clusters, sensorData } = networkData;

  return sensors.map((sensor) => {
    const currentSensorData = sensorData.find((sd) => sd.id === sensor.id);
    const cluster = clusters.find((c) => c.headId === sensor.id);
    const isClusterHead = !!cluster;

    let belongsToCluster = cluster;
    if (!belongsToCluster) {
      belongsToCluster = clusters.find(
        (c) =>
          c.members.some((m: any) => m.id === sensor.id) ||
          c.sleepingMembers?.some((m: any) => m.id === sensor.id)
      );
    }

    const energyPercentage = (sensor.energy / config.initialEnergy) * 100;
    const status = getSensorStatus(sensor);
    const clusterRole = getClusterRole(sensor, isClusterHead, belongsToCluster);

    return {
      id: sensor.id,
      sensorId: sensor.id,
      x: parseFloat(sensor.x.toFixed(1)),
      y: parseFloat(sensor.y.toFixed(1)),
      energy: parseFloat(sensor.energy.toFixed(1)),
      energyPercentage: parseFloat(energyPercentage.toFixed(1)),
      status,
      isClusterHead,
      clusterId: belongsToCluster?.id,
      clusterRole,
      memberCount: cluster?.members.length,
      sleepingMemberCount: cluster?.sleepingMembers?.length || 0,
      temperature: currentSensorData?.temperature,
      salinity: currentSensorData?.salinity,
      pressure: currentSensorData?.pressure,
      ph: currentSensorData?.ph,
    };
  });
};

export const formatValue = (
  value: number | undefined,
  decimals: number = 1
): string => {
  return value !== undefined ? value.toFixed(decimals) : "-";
};
