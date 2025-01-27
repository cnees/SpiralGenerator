import React, { useEffect } from "react";
import { Toolbar } from "./Toolbar";
import { ControlPanel } from "./ControlPanel";
import { Canvas } from "./Canvas";
import { SPIRAL_TYPES, DEFAULT_VALUES } from "./constants";
import { useSpiralState } from "./hooks/useSpiralState";
import { useKeyboardControls } from "./hooks/useKeyboardControls";
import { distanceToLineSegment, extendLine } from "./utils/geometryUtils";
import {
  generateSpiralPoints,
  generateSpiralPointsByType,
} from "./utils/spiralCalculations";
import {
  getCoilsForSize,
  findTValueOnSpiral,
  updateDescendants,
} from "./utils/spiralUtils";

export const SpiralGenerator = () => {
  const {
    isDrawing,
    setIsDrawing,
    startPoint,
    setStartPoint,
    currentPoint,
    setCurrentPoint,
    snapPoint,
    setSnapPoint,
    spirals,
    setSpirals,
    undoStack,
    setUndoStack,
    redoStack,
    setRedoStack,
    isClockwise,
    setIsClockwise,
    snappedSpiral,
    setSnappedSpiral,
    lastFlipTime,
    setLastFlipTime,
    lineThickness,
    setLineThickness,
    defaultCoils,
    setDefaultCoils,
    heldKeys,
    setHeldKeys,
    snappingEnabled,
    setSnappingEnabled,
    spiralType,
    setSpiralType,
    taperToCenter,
    setTaperToCenter,
    sizeRatio,
    setSizeRatio,
    parentSpiral,
    setParentSpiral,
    selectedTool,
    setSelectedTool,
    selectedSpiral,
    setSelectedSpiral,
    selectedEnd,
    setSelectedEnd,
    isDragging,
    setIsDragging,
    hoveredEnd,
    setHoveredEnd,
    spiralRelationships,
    setSpiralRelationships,
    endpointSnapRadius,
    setEndpointSnapRadius,
    centerSnapRadius,
    setCenterSnapRadius,
  } = useSpiralState();

  const { handleKeyDown, handleKeyUp } = useKeyboardControls({
    spirals,
    setSpirals,
    selectedSpiral,
    undoStack,
    setUndoStack,
    redoStack,
    setRedoStack,
    isClockwise,
    setIsClockwise,
    lastFlipTime,
    setLastFlipTime,
    snappingEnabled,
    setSnappingEnabled,
    taperToCenter,
    setTaperToCenter,
    sizeRatio,
    setSizeRatio,
    selectedTool,
    setSelectedTool,
    setSelectedSpiral,
    heldKeys,
    setHeldKeys,
    lineThickness,
    setLineThickness,
    defaultCoils,
    setDefaultCoils,
  });

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const findSnapPoint = (point, isInitialPoint = false) => {
    if (!snappingEnabled) return { point: null, spiral: null };

    let closestDist = Infinity;
    let closestPoint = null;
    let closestSpiral = null;
    let snapT = 0;

    // If we're drawing and have a parent spiral, check snapping guidelines
    if (!isInitialPoint && isDrawing && startPoint && parentSpiral) {
      // Calculate tangent angle at start point
      const dx = startPoint.x - parentSpiral.center.x;
      const dy = startPoint.y - parentSpiral.center.y;
      const r = Math.sqrt(dx * dx + dy * dy);
      const baseAngle = Math.atan2(dy, dx);
      const growthFactor = Math.log(r) / (2 * Math.PI * parentSpiral.coils);
      const tangentAngle =
        baseAngle +
        (parentSpiral.clockwise ? 1 : -1) *
          (Math.PI / 2 + Math.atan(growthFactor));

      // Create original and reflected radial lines
      const extendedLine = extendLine(startPoint, parentSpiral.center, 1000);

      // Check distance to original radial line
      const radialResult = distanceToLineSegment(
        point,
        extendedLine.start,
        extendedLine.end
      );

      // Calculate reflected line
      const reflectPoint = (p) => {
        const vx = p.x - startPoint.x;
        const vy = p.y - startPoint.y;
        const cos2 = Math.cos(2 * tangentAngle);
        const sin2 = Math.sin(2 * tangentAngle);
        return {
          x: startPoint.x + vx * cos2 + vy * sin2,
          y: startPoint.y + vx * sin2 - vy * cos2,
        };
      };

      const mirroredStart = reflectPoint(extendedLine.start);
      const mirroredEnd = reflectPoint(extendedLine.end);

      // Check distance to reflected line
      const mirrorResult = distanceToLineSegment(
        point,
        mirroredStart,
        mirroredEnd
      );

      // If close to either line, snap to it
      if (
        radialResult.distance <= endpointSnapRadius &&
        radialResult.distance < closestDist
      ) {
        closestDist = radialResult.distance;
        closestPoint = radialResult.point;
        closestSpiral = parentSpiral;
        // Calculate thickness at this point on the parent spiral
        const t = findTValueOnSpiral(radialResult.point, parentSpiral);
        snapT = t;
      }

      if (
        mirrorResult.distance <= endpointSnapRadius &&
        mirrorResult.distance < closestDist
      ) {
        closestDist = mirrorResult.distance;
        closestPoint = mirrorResult.point;
        closestSpiral = parentSpiral;
        // Calculate thickness at this point on the parent spiral
        const t = findTValueOnSpiral(mirrorResult.point, parentSpiral);
        snapT = t;
      }
    }

    // Check all spiral points
    for (const spiral of spirals) {
      // Skip parent spiral when drawing to prevent self-snapping
      if (isDrawing && spiral === parentSpiral) continue;

      // Check along spiral path
      const spiralPoints = generateSpiralPointsByType(
        spiral.outer,
        spiral.center,
        spiral.clockwise,
        spiral.coils || DEFAULT_VALUES.DEFAULT_COILS,
        spiral.type || SPIRAL_TYPES.LOGARITHMIC,
        spiral
      );

      for (let i = 0; i < spiralPoints.length - 1; i++) {
        const result = distanceToLineSegment(
          point,
          spiralPoints[i],
          spiralPoints[i + 1]
        );
        const snapRadius = isInitialPoint
          ? centerSnapRadius
          : endpointSnapRadius;
        if (result.distance <= snapRadius && result.distance < closestDist) {
          closestDist = result.distance;
          // Calculate exact point and thickness
          const segmentLength = Math.hypot(
            spiralPoints[i + 1].x - spiralPoints[i].x,
            spiralPoints[i + 1].y - spiralPoints[i].y
          );
          const pointDist = Math.hypot(
            result.point.x - spiralPoints[i].x,
            result.point.y - spiralPoints[i].y
          );
          const segmentT = pointDist / segmentLength;
          const t = (i + segmentT) / (spiralPoints.length - 1);

          closestPoint = {
            ...result.point,
            thickness: spiral.taperToCenter
              ? spiral.outer.thickness * (1 - t)
              : spiral.outer.thickness,
          };
          closestSpiral = spiral;
          snapT = t;
        }
      }

      // Check endpoints
      const checkEndpoint = (endPoint) => {
        const dx = point.x - endPoint.x;
        const dy = point.y - endPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= endpointSnapRadius && distance < closestDist) {
          closestDist = distance;
          closestPoint = { ...endPoint };
          closestSpiral = spiral;
          snapT = endPoint === spiral.outer ? 0 : 1;
        }
      };

      checkEndpoint(spiral.outer);
      checkEndpoint(spiral.center);
    }

    return {
      point: closestPoint,
      spiral: closestSpiral,
      distance: closestDist,
      t: snapT,
    };
  };

  // Add function to get all descendants of a spiral
  const getAllDescendants = (spiralIndex) => {
    const descendants = new Set();
    const toProcess = [spiralIndex];

    while (toProcess.length > 0) {
      const currentIndex = toProcess.pop();
      const children = spiralRelationships
        .filter((rel) => rel.parentIndex === currentIndex)
        .map((rel) => rel.childIndex);

      children.forEach((childIndex) => {
        if (!descendants.has(childIndex)) {
          descendants.add(childIndex);
          toProcess.push(childIndex);
        }
      });
    }

    return descendants;
  };

  const isDescendantOfSelected = (spiralIndex) => {
    if (selectedSpiral === null) return false;
    const descendants = getAllDescendants(selectedSpiral);
    return descendants.has(spiralIndex);
  };

  const handleMouseDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const point = { x, y };

    // Reset any existing drawing state
    setCurrentPoint(null);
    setSnapPoint(null);
    setSnappedSpiral(null);

    if (selectedTool === "select") {
      if (selectedSpiral !== null) {
        const spiral = spirals[selectedSpiral];
        const outerDist = Math.hypot(
          point.x - spiral.outer.x,
          point.y - spiral.outer.y
        );
        const centerDist = Math.hypot(
          point.x - spiral.center.x,
          point.y - spiral.center.y
        );

        if (outerDist <= endpointSnapRadius) {
          setSelectedEnd("outer");
          setIsDragging(true);
          return;
        }
        if (centerDist <= endpointSnapRadius) {
          setSelectedEnd("center");
          setIsDragging(true);
          return;
        }
      }

      // Select spiral by clicking on it
      for (let i = spirals.length - 1; i >= 0; i--) {
        const spiral = spirals[i];
        const points = generateSpiralPointsByType(
          spiral.outer,
          spiral.center,
          spiral.clockwise,
          spiral.coils,
          spiral.type,
          spiral
        );

        for (let j = 0; j < points.length - 1; j++) {
          const result = distanceToLineSegment(point, points[j], points[j + 1]);
          if (result.distance <= endpointSnapRadius) {
            setSelectedSpiral(i);
            setSelectedEnd(null);
            return;
          }
        }
      }

      setSelectedSpiral(null);
      setSelectedEnd(null);
    } else {
      // Drawing mode
      if (snappingEnabled) {
        const {
          point: snappedPoint,
          spiral: snapTarget,
          t: snapT,
        } = findSnapPoint(point, true);
        if (snappedPoint) {
          // Calculate the thickness at the snap point
          const points = generateSpiralPointsByType(
            snapTarget.outer,
            snapTarget.center,
            snapTarget.clockwise,
            snapTarget.coils,
            snapTarget.type,
            snapTarget
          );

          // Get the exact point along the spiral
          const index = Math.floor(snapT * (points.length - 1));
          const nextIndex = Math.min(index + 1, points.length - 1);
          const segmentT = snapT * (points.length - 1) - index;

          // Interpolate thickness
          const startThickness = snapTarget.taperToCenter
            ? snapTarget.outer.thickness * (1 - index / (points.length - 1))
            : snapTarget.outer.thickness;
          const endThickness = snapTarget.taperToCenter
            ? snapTarget.outer.thickness * (1 - nextIndex / (points.length - 1))
            : snapTarget.outer.thickness;
          const sampledThickness =
            startThickness * (1 - segmentT) + endThickness * segmentT;

          setParentSpiral(snapTarget);
          setStartPoint({
            ...snappedPoint,
            thickness: sampledThickness,
          });
          setLineThickness(sampledThickness);
          setIsDrawing(true);
          return;
        }
      }

      setParentSpiral(null);
      setStartPoint({
        ...point,
        thickness: lineThickness,
      });
      setIsDrawing(true);
    }
  };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const point = { x, y };

    if (selectedTool === "select") {
      if (isDragging && selectedSpiral !== null && selectedEnd) {
        let targetPoint = point;
        let newParentSpiral = null;

        if (snappingEnabled && selectedEnd === "outer") {
          const { point: snappedPoint, spiral: snapTarget } = findSnapPoint(
            point,
            false
          );
          if (snappedPoint && snapTarget) {
            const descendants = getAllDescendants(selectedSpiral);
            if (!descendants.has(spirals.indexOf(snapTarget))) {
              targetPoint = snappedPoint;
              newParentSpiral = snapTarget;
            }
          }
        }

        let updatedSpirals = [...spirals];
        if (selectedEnd === "center") {
          const updatedSpiral = {
            ...updatedSpirals[selectedSpiral],
            center: {
              ...updatedSpirals[selectedSpiral].center,
              x: targetPoint.x,
              y: targetPoint.y,
            },
          };
          updatedSpirals[selectedSpiral] = updatedSpiral;

          // Update the angle in the relationship if this spiral is a child
          setSpiralRelationships((prev) => {
            return prev.map((rel) => {
              if (rel.childIndex === selectedSpiral) {
                const parentSpiral = spirals[rel.parentIndex];
                const parentPoints = generateSpiralPointsByType(
                  parentSpiral.outer,
                  parentSpiral.center,
                  parentSpiral.clockwise,
                  parentSpiral.coils,
                  parentSpiral.type,
                  parentSpiral
                );
                const index = Math.floor(rel.t * (parentPoints.length - 1));
                const attachPoint = parentPoints[index];

                const parentAngle = Math.atan2(
                  parentSpiral.center.y - attachPoint.y,
                  parentSpiral.center.x - attachPoint.x
                );
                const childVectorX = updatedSpiral.center.x - attachPoint.x;
                const childVectorY = updatedSpiral.center.y - attachPoint.y;
                const childAngle = Math.atan2(childVectorY, childVectorX);
                const relativeAngle =
                  ((childAngle - parentAngle + 3 * Math.PI) % (2 * Math.PI)) -
                  Math.PI;

                return { ...rel, angle: relativeAngle };
              }
              return rel;
            });
          });
        } else {
          const dx = targetPoint.x - updatedSpirals[selectedSpiral].outer.x;
          const dy = targetPoint.y - updatedSpirals[selectedSpiral].outer.y;
          updatedSpirals[selectedSpiral] = {
            ...updatedSpirals[selectedSpiral],
            outer: {
              ...updatedSpirals[selectedSpiral].outer,
              x: targetPoint.x,
              y: targetPoint.y,
            },
            center: {
              ...updatedSpirals[selectedSpiral].center,
              x: updatedSpirals[selectedSpiral].center.x + dx,
              y: updatedSpirals[selectedSpiral].center.y + dy,
            },
          };

          if (newParentSpiral) {
            setSpiralRelationships((prev) => {
              const filtered = prev.filter(
                (rel) => rel.childIndex !== selectedSpiral
              );
              const t = findTValueOnSpiral(targetPoint, newParentSpiral);
              const parentAngle = Math.atan2(
                newParentSpiral.center.y - targetPoint.y,
                newParentSpiral.center.x - targetPoint.x
              );
              const childSpiral = updatedSpirals[selectedSpiral];
              const childVectorX = childSpiral.center.x - childSpiral.outer.x;
              const childVectorY = childSpiral.center.y - childSpiral.outer.y;
              const childAngle = Math.atan2(childVectorY, childVectorX);
              const relativeAngle =
                ((childAngle - parentAngle + 3 * Math.PI) % (2 * Math.PI)) -
                Math.PI;

              return [
                ...filtered,
                {
                  childIndex: selectedSpiral,
                  parentIndex: spirals.indexOf(newParentSpiral),
                  t,
                  angle: relativeAngle,
                },
              ];
            });
          }
        }

        updatedSpirals = updateDescendants(
          selectedSpiral,
          updatedSpirals[selectedSpiral],
          updatedSpirals,
          spiralRelationships
        );
        setSpirals(updatedSpirals);
      }

      // Handle endpoint hovering
      let foundHover = false;
      if (selectedSpiral !== null) {
        const spiral = spirals[selectedSpiral];
        const outerDist = Math.hypot(
          point.x - spiral.outer.x,
          point.y - spiral.outer.y
        );
        const centerDist = Math.hypot(
          point.x - spiral.center.x,
          point.y - spiral.center.y
        );

        if (outerDist <= endpointSnapRadius) {
          setHoveredEnd("outer");
          foundHover = true;
        } else if (centerDist <= endpointSnapRadius) {
          setHoveredEnd("center");
          foundHover = true;
        }
      }

      if (!foundHover && !isDragging) {
        setHoveredEnd(null);
      }
    } else if (isDrawing) {
      setCurrentPoint(point);
      if (snappingEnabled) {
        const { point: snappedPoint, spiral } = findSnapPoint(point, false);
        if (snappedPoint) {
          setCurrentPoint(snappedPoint);
          setSnapPoint(snappedPoint);
          setSnappedSpiral(spiral);
          return;
        }
      }
      setSnapPoint(null);
      setSnappedSpiral(null);
    } else if (snappingEnabled) {
      const { point: snappedPoint, spiral } = findSnapPoint(point, false);
      setSnapPoint(snappedPoint);
      setSnappedSpiral(spiral);
    }
  };

  const handleMouseUp = (e) => {
    if (selectedTool === "select") {
      setIsDragging(false);
    } else if (
      isDrawing &&
      startPoint &&
      currentPoint &&
      (startPoint.x !== currentPoint.x || startPoint.y !== currentPoint.y)
    ) {
      const newSpiralIndex = spirals.length;
      setSpirals((prev) => [
        ...prev,
        {
          outer: {
            ...startPoint,
            thickness: startPoint.thickness,
          },
          center: currentPoint,
          clockwise: isClockwise,
          coils: getCoilsForSize(
            Math.sqrt(
              Math.pow(currentPoint.x - startPoint.x, 2) +
                Math.pow(currentPoint.y - startPoint.y, 2)
            ),
            defaultCoils
          ),
          taperToCenter,
          type: spiralType,
          sizeRatio,
        },
      ]);

      if (snappedSpiral) {
        const parentIndex = spirals.findIndex((s) => s === snappedSpiral);
        if (parentIndex !== -1) {
          const t = findTValueOnSpiral(startPoint, snappedSpiral);
          const parentAngle = Math.atan2(
            snappedSpiral.center.y - startPoint.y,
            snappedSpiral.center.x - startPoint.x
          );
          const childAngle = Math.atan2(
            currentPoint.y - startPoint.y,
            currentPoint.x - startPoint.x
          );
          const relativeAngle = childAngle - parentAngle;

          setSpiralRelationships((prev) => [
            ...prev,
            {
              childIndex: newSpiralIndex,
              parentIndex,
              t,
              angle: relativeAngle,
            },
          ]);
        }
      }

      setUndoStack([...undoStack, spirals]);
      setRedoStack([]);
    }

    // Always reset drawing state
    setIsDrawing(false);
    setStartPoint(null);
    setCurrentPoint(null);
    setSnapPoint(null);
    setSnappedSpiral(null);
    setParentSpiral(null);
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <Toolbar
        selectedTool={selectedTool}
        setSelectedTool={setSelectedTool}
        setSelectedSpiral={setSelectedSpiral}
      />
      <div className="max-w-[1800px] mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          Spiral Generator
        </h1>
        <div className="flex gap-6">
          <ControlPanel
            spiralType={spiralType}
            setSpiralType={setSpiralType}
            isClockwise={isClockwise}
            setIsClockwise={setIsClockwise}
            taperToCenter={taperToCenter}
            setTaperToCenter={setTaperToCenter}
            lineThickness={lineThickness}
            setLineThickness={setLineThickness}
            defaultCoils={defaultCoils}
            setDefaultCoils={setDefaultCoils}
            selectedSpiral={selectedSpiral}
            spirals={spirals}
            setSpirals={setSpirals}
            snappingEnabled={snappingEnabled}
            setSnappingEnabled={setSnappingEnabled}
            endpointSnapRadius={endpointSnapRadius}
            setEndpointSnapRadius={setEndpointSnapRadius}
            centerSnapRadius={centerSnapRadius}
            setCenterSnapRadius={setCenterSnapRadius}
            undoStack={undoStack}
            setUndoStack={setUndoStack}
            setRedoStack={setRedoStack}
          />
          <Canvas
            spirals={spirals}
            isDrawing={isDrawing}
            startPoint={startPoint}
            currentPoint={currentPoint}
            selectedTool={selectedTool}
            selectedSpiral={selectedSpiral}
            hoveredEnd={hoveredEnd}
            snappingEnabled={snappingEnabled}
            parentSpiral={parentSpiral}
            snapPoint={snapPoint}
            snappedSpiral={snappedSpiral}
            isClockwise={isClockwise}
            lineThickness={lineThickness}
            taperToCenter={taperToCenter}
            spiralType={spiralType}
            sizeRatio={sizeRatio}
            endpointSnapRadius={endpointSnapRadius}
            centerSnapRadius={centerSnapRadius}
            handleMouseDown={handleMouseDown}
            handleMouseMove={handleMouseMove}
            handleMouseUp={handleMouseUp}
            isDescendantOfSelected={isDescendantOfSelected}
            getCoilsForSize={(distance) =>
              getCoilsForSize(distance, defaultCoils)
            }
            defaultCoils={defaultCoils}
          />
        </div>
      </div>
    </div>
  );
};
