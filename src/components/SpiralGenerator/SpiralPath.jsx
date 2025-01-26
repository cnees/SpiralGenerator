import React from "react";
import { generateTaperedSpiralSegments } from "./utils/spiralCalculations";
import { SPIRAL_TYPES } from "./constants";

export const SpiralPath = ({
  spiral,
  opacity = 1,
  previewThickness,
  isSelected,
  index,
  selectedTool,
  hoveredEnd,
  isDescendant,
}) => {
  const segments = generateTaperedSpiralSegments(
    spiral.outer,
    spiral.center,
    spiral.clockwise,
    50,
    previewThickness || spiral.outer.thickness || 2,
    spiral.coils,
    spiral.taperToCenter ?? true,
    spiral.type || SPIRAL_TYPES.LOGARITHMIC,
    spiral
  );

  return (
    <>
      {segments.map((segment, segIndex) => (
        <path
          key={segIndex}
          d={`M ${segment.points.map((p) => `${p.x},${p.y}`).join(" L ")}`}
          fill="none"
          stroke={isSelected || isDescendant ? "orange" : "blue"}
          strokeWidth={segment.thickness}
          opacity={opacity}
        />
      ))}

      {/* Add endpoint indicators only for selected spiral */}
      {selectedTool === "select" && isSelected && (
        <>
          {/* Outer endpoint */}
          <circle
            cx={spiral.outer.x}
            cy={spiral.outer.y}
            r={4}
            fill={hoveredEnd === "outer" ? "yellow" : "white"}
            stroke="orange"
            strokeWidth="2"
          />

          {/* Center endpoint */}
          <circle
            cx={spiral.center.x}
            cy={spiral.center.y}
            r={4}
            fill={hoveredEnd === "center" ? "yellow" : "white"}
            stroke="orange"
            strokeWidth="2"
          />
        </>
      )}
    </>
  );
};
