import React from "react";
import { SimulationConfig } from "../../service/types";
import { getHeatmapColor } from "../../utils/networkUtils";

interface HeatmapLayerProps {
  grid: number[][];
  config: SimulationConfig;
  paramKey: "temperature" | "salinity" | "pressure" | "ph";
}

export function HeatmapLayer({ grid, config, paramKey }: HeatmapLayerProps) {
  if (!grid || grid.length === 0) {
    return null;
  }

  const gridHeight = grid.length;
  const gridWidth = grid[0].length;
  const cellWidth = config.width / gridWidth;
  const cellHeight = config.height / gridHeight;

  const minVal = grid.reduce((min, row) => {
    const rowMin = Math.min(...row);
    return Math.min(min, rowMin);
  }, Infinity);

  const maxVal = grid.reduce((max, row) => {
    const rowMax = Math.max(...row);
    return Math.max(max, rowMax);
  }, -Infinity);

  return (
    <g opacity="0.6" style={{ pointerEvents: "none" }}>
      {grid.map((row, i) =>
        row.map((value, j) => {
          const [r, g, b] = getHeatmapColor(value, minVal, maxVal);
          return (
            <rect
              key={`${i}-${j}`}
              x={j * cellWidth}
              y={i * cellHeight}
              width={cellWidth}
              height={cellHeight}
              fill={`rgb(${r},${g},${b})`}
            />
          );
        })
      )}
    </g>
  );
}
