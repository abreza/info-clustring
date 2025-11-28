import type { NetworkData } from "@/hooks/useNetworkData";
import type { Sensor, SimulationConfig } from "../service/types";
import type { GridRowData } from "@/components/visualization/DataGridTab";

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

export const getHeatmapColor = (
  value: number,
  min: number,
  max: number
): [number, number, number] => {
  const ratio = (value - min) / (max - min || 1);
  const hue = (1 - ratio) * 240;
  const saturation = 75;
  const lightness = 50;

  const s = saturation / 100;
  const l = lightness / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;

  if (hue >= 0 && hue < 60) {
    [r, g, b] = [c, x, 0];
  } else if (hue >= 60 && hue < 120) {
    [r, g, b] = [x, c, 0];
  } else if (hue >= 120 && hue < 180) {
    [r, g, b] = [0, c, x];
  } else if (hue >= 180 && hue < 240) {
    [r, g, b] = [0, x, c];
  } else if (hue >= 240 && hue < 300) {
    [r, g, b] = [x, 0, c];
  } else {
    [r, g, b] = [c, 0, x];
  }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
};
