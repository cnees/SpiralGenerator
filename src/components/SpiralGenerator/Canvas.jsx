import React from "react";
import { SpiralPath } from "./SpiralPath";
import { SPIRAL_TYPES } from "./constants";
import { extendLine } from "./utils/geometryUtils";

export const Canvas = ({
  spirals,
  isDrawing,
  startPoint,
  currentPoint,
  selectedTool,
  selectedSpiral,
  hoveredEnd,
  snappingEnabled,
  parentSpiral,
  snapPoint,
  snappedSpiral,
  isClockwise,
  lineThickness,
  taperToCenter,
  spiralType,
  sizeRatio,
  endpointSnapRadius,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  isDescendantOfSelected,
  getCoilsForSize,
  defaultCoils,
}) => (
  <div className="flex-1 bg-white rounded-lg shadow">
    <svg
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="w-full h-full min-h-[800px] border rounded"
    >
      {/* Existing Spirals */}
      {spirals.map((spiral, index) => (
        <SpiralPath
          key={index}
          spiral={spiral}
          isSelected={index === selectedSpiral}
          index={index}
          selectedTool={selectedTool}
          hoveredEnd={hoveredEnd}
          isDescendant={isDescendantOfSelected(index)}
        />
      ))}

      {/* Preview Spiral */}
      {isDrawing && startPoint && currentPoint && (
        <>
          <SpiralPath
            spiral={{
              outer: {
                ...startPoint,
                thickness: lineThickness,
              },
              center: currentPoint,
              clockwise: isClockwise,
              coils: getCoilsForSize(
                Math.sqrt(
                  Math.pow(currentPoint.x - startPoint.x, 2) +
                    Math.pow(currentPoint.y - startPoint.y, 2)
                )
              ),
              taperToCenter,
              type: spiralType,
              sizeRatio,
            }}
            opacity={0.5}
            previewThickness={lineThickness}
          />

          {/* Snapping Guidelines */}
          {snappingEnabled && parentSpiral && startPoint && (
            <SnappingGuidelines
              startPoint={startPoint}
              parentSpiral={parentSpiral}
            />
          )}
        </>
      )}

      {/* Snap Point Indicators */}
      {!isDrawing && snapPoint && (
        <SnapPointIndicator point={snapPoint} radius={endpointSnapRadius} />
      )}

      {/* Drawing Snap Point */}
      {isDrawing &&
        snapPoint &&
        snappedSpiral &&
        parentSpiral &&
        startPoint && (
          <DrawingSnapPoint
            point={snapPoint}
            startPoint={startPoint}
            parentSpiral={parentSpiral}
          />
        )}
    </svg>
  </div>
);

const SnappingGuidelines = ({ startPoint, parentSpiral }) => {
  // Calculate tangent line at snap point
  const dx = startPoint.x - parentSpiral.center.x;
  const dy = startPoint.y - parentSpiral.center.y;
  const r = Math.sqrt(dx * dx + dy * dy);
  const baseAngle = Math.atan2(dy, dx);
  const growthFactor = Math.log(r) / (2 * Math.PI * parentSpiral.coils);
  const tangentAngle =
    baseAngle +
    (parentSpiral.clockwise ? 1 : -1) * (Math.PI / 2 + Math.atan(growthFactor));

  // Create original radial line
  const extendedLine = extendLine(startPoint, parentSpiral.center, 100);

  // Reflect the radial line over the tangent
  const reflectPoint = (point) => {
    const vx = point.x - startPoint.x;
    const vy = point.y - startPoint.y;
    const cos2 = Math.cos(2 * tangentAngle);
    const sin2 = Math.sin(2 * tangentAngle);
    return {
      x: startPoint.x + vx * cos2 + vy * sin2,
      y: startPoint.y + vx * sin2 - vy * cos2,
    };
  };

  const mirroredStart = reflectPoint(extendedLine.start);
  const mirroredEnd = reflectPoint(extendedLine.end);

  return (
    <>
      <line
        x1={extendedLine.start.x}
        y1={extendedLine.start.y}
        x2={extendedLine.end.x}
        y2={extendedLine.end.y}
        stroke="green"
        strokeWidth="2"
        strokeDasharray="5,5"
      />
      <line
        x1={mirroredStart.x}
        y1={mirroredStart.y}
        x2={mirroredEnd.x}
        y2={mirroredEnd.y}
        stroke="green"
        strokeWidth="2"
        strokeDasharray="5,5"
      />
    </>
  );
};

const SnapPointIndicator = ({ point, radius }) => (
  <>
    <circle cx={point.x} cy={point.y} r={4} fill="purple" opacity="0.5" />
    <circle
      cx={point.x}
      cy={point.y}
      r={radius}
      fill="none"
      stroke="purple"
      strokeWidth="1"
      opacity="0.3"
    />
  </>
);

const DrawingSnapPoint = ({ point }) => (
  <circle cx={point.x} cy={point.y} r={4} fill="green" opacity="0.8" />
);
