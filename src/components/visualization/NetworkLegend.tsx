import React from "react";
import { NetworkLegendProps } from "../../types/NetworkVisualization.types";
import { getAlgorithmColor } from "../../utils/networkUtils";

export function NetworkLegend({ algorithm }: NetworkLegendProps) {
  const algorithmColor = getAlgorithmColor(algorithm);

  return (
    <g transform="translate(-80, 10)">
      <rect
        width="170"
        height="100"
        fill="white"
        fillOpacity="0.9"
        stroke="#ccc"
        rx="4"
      />
      <text x="10" y="20" fontSize="10" fill="#333" fontWeight="bold">
        Energy Level:
      </text>
      <circle cx="20" cy="35" r="3" fill="hsl(120, 70%, 50%)" />
      <text x="30" y="39" fontSize="9" fill="#333">
        High (Green)
      </text>
      <circle cx="120" cy="35" r="3" fill="hsl(60, 70%, 50%)" />
      <text x="130" y="39" fontSize="9" fill="#333">
        Medium
      </text>
      <circle cx="20" cy="50" r="3" fill="hsl(0, 70%, 50%)" />
      <text x="30" y="54" fontSize="9" fill="#333">
        Low (Red)
      </text>
      <circle cx="120" cy="50" r="2" fill="#999" />
      <text x="130" y="54" fontSize="9" fill="#333">
        Dead
      </text>

      <circle
        cx="20"
        cy="65"
        r="3"
        fill="hsl(60, 70%, 50%)"
        stroke={algorithmColor}
        strokeWidth="2"
      />
      <text x="30" y="69" fontSize="9" fill="#333">
        Cluster Head
      </text>

      {algorithm === "info-kmeans" && (
        <>
          <circle cx="20" cy="80" r="3" fill="#666" opacity="0.5" />
          <text x="30" y="84" fontSize="9" fill="#333">
            Sleeping Node
          </text>
          <text x="120" y="84" fontSize="8" fill="#666">
            💤
          </text>
        </>
      )}
    </g>
  );
}
