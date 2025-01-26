import React, { useState, useCallback, useEffect } from 'react';

export const SpiralGenerator = () => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [currentPoint, setCurrentPoint] = useState(null);
  const [snapPoint, setSnapPoint] = useState(null);
  const [spirals, setSpirals] = useState([]);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [snapRadius, setSnapRadius] = useState(10);
  const [isClockwise, setIsClockwise] = useState(true);
  const [snappedSpiral, setSnappedSpiral] = useState(null);
  const [endpointSnapRadius, setEndpointSnapRadius] = useState(10);
  const [centerSnapRadius, setCenterSnapRadius] = useState(20);
  const [lastFlipTime, setLastFlipTime] = useState(0);
  const [lineThickness, setLineThickness] = useState(2);
  const [defaultCoils, setDefaultCoils] = useState(3);
  const [heldKeys, setHeldKeys] = useState(new Set());
  const COIL_ADJUST_SPEED = 0.05;
  const MIN_COILS = -22;
  const MAX_COILS = 22;
  const LINE_ADJUST_SPEED = 0.2;
  const MIN_LINE_THICKNESS = 1;
  const MAX_LINE_THICKNESS = 50;
  const [snappingEnabled, setSnappingEnabled] = useState(true);
  const [spiralType, setSpiralType] = useState('logarithmic');
  const [taperToCenter, setTaperToCenter] = useState(true);
  const [sizeRatio, setSizeRatio] = useState(1.0);
  const [parentSpiral, setParentSpiral] = useState(null);
  const [selectedTool, setSelectedTool] = useState("spiral");
  const [selectedSpiral, setSelectedSpiral] = useState(null);
  const [selectedEnd, setSelectedEnd] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredEnd, setHoveredEnd] = useState(null);

  const SPIRAL_TYPES = {
    LINE: "line",
    LOGARITHMIC: "logarithmic",
    ARCHIMEDES: "archimedes",
    HYPERBOLIC: "hyperbolic",
    FERMAT: "fermat",
    S_CURVE: "s_curve",
  };

  const generateSpiralPoints = (outer, center, clockwise = true, coils = 3) => {
    if (!outer || !center) return [];

    const points = [];
    const dx = outer.x - center.x;
    const dy = outer.y - center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const steps = 100 * coils;

    const baseAngle = Math.atan2(dy, dx);
    console.log("baseAngle", baseAngle);
    const growthFactor = Math.log(distance) / (2 * Math.PI * coils);

    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      const radius = Math.exp(2 * Math.PI * coils * t * growthFactor);
      const angleMultiplier = clockwise ? 1 : -1;
      const angle = baseAngle + angleMultiplier * 2 * Math.PI * coils * (1 - t);
      const x = center.x + radius * Math.cos(angle);
      const y = center.y + radius * Math.sin(angle);
      points.push({ x, y });
    }

    return points;
  };

  const generateSpiralPath = (outer, center, clockwise = true) => {
    const points = generateSpiralPoints(outer, center, clockwise);
    if (points.length === 0) return "";
    return `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;
  };

  const distanceToLineSegment = (point, start, end) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len2 = dx * dx + dy * dy;

    if (len2 === 0) {
      const distX = point.x - start.x;
      const distY = point.y - start.y;
      return {
        distance: Math.sqrt(distX * distX + distY * distY),
        point: start,
      };
    }

    let t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));

    const projX = start.x + t * dx;
    const projY = start.y + t * dy;
    const distX = point.x - projX;
    const distY = point.y - projY;

    return {
      distance: Math.sqrt(distX * distX + distY * distY),
      point: { x: projX, y: projY },
    };
  };

  const extendLine = (start, end, factor = 10) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    const extendedStart = {
      x: start.x - dx * ((factor - 1) / 2),
      y: start.y - dy * ((factor - 1) / 2),
    };

    const extendedEnd = {
      x: end.x + dx * ((factor - 1) / 2),
      y: end.y + dy * ((factor - 1) / 2),
    };

    return { start: extendedStart, end: extendedEnd };
  };

  const findSnapPoint = (point, isInitialPoint = false) => {
    if (!snappingEnabled) return { point: null, spiral: null };

    let closestDist = Infinity;
    let closestPoint = null;
    let closestSpiral = null;

    if (isDrawing && startPoint && parentSpiral) {
      const dx = startPoint.x - parentSpiral.center.x;
      const dy = startPoint.y - parentSpiral.center.y;
      const r = Math.sqrt(dx * dx + dy * dy);
      const baseAngle = Math.atan2(dy, dx);
      const growthFactor = Math.log(r) / (2 * Math.PI * parentSpiral.coils);
      const tangentAngle =
        baseAngle +
        (parentSpiral.clockwise ? 1 : -1) *
          (Math.PI / 2 + Math.atan(growthFactor));

      // Original line
      const extendedLine = extendLine(startPoint, parentSpiral.center, 100);
      const result = distanceToLineSegment(
        point,
        extendedLine.start,
        extendedLine.end
      );

      // Reflect points for mirrored line
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
      const mirroredResult = distanceToLineSegment(
        point,
        mirroredStart,
        mirroredEnd
      );

      // Use whichever line is closer
      if (
        result.distance <= endpointSnapRadius ||
        mirroredResult.distance <= endpointSnapRadius
      ) {
        if (result.distance < mirroredResult.distance) {
          closestDist = result.distance;
          closestPoint = result.point;
        } else {
          closestDist = mirroredResult.distance;
          closestPoint = mirroredResult.point;
        }
        closestSpiral = parentSpiral;
      }
    }

    // Then check all spiral points
    for (const spiral of spirals) {
      // Check endpoints
      const checkEndpoint = (endPoint) => {
        const dx = point.x - endPoint.x;
        const dy = point.y - endPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= endpointSnapRadius && distance < closestDist) {
          closestDist = distance;
          closestPoint = { ...endPoint };
          closestSpiral = spiral;
        }
      };

      checkEndpoint(spiral.outer);
      checkEndpoint(spiral.center);

      // Check along the spiral using the correct spiral type
      const spiralPoints = generateSpiralPointsByType(
        spiral.outer,
        spiral.center,
        spiral.clockwise,
        spiral.coils || 3,
        spiral.type || SPIRAL_TYPES.LOGARITHMIC,
        spiral
      );

      // Check each segment of the spiral
      for (let i = 0; i < spiralPoints.length - 1; i++) {
        const result = distanceToLineSegment(
          point,
          spiralPoints[i],
          spiralPoints[i + 1]
        );
        if (
          result.distance <= endpointSnapRadius &&
          result.distance < closestDist
        ) {
          closestDist = result.distance;
          closestPoint = result.point;
          closestSpiral = spiral;
        }
      }
    }

    return {
      point: closestPoint,
      spiral: closestSpiral,
      distance: closestDist,
    };
  };

  const getThicknessAtPoint = (point, spiral) => {
    if (!spiral) return lineThickness;

    const dx = point.x - spiral.center.x;
    const dy = point.y - spiral.center.y;
    const pointRadius = Math.sqrt(dx * dx + dy * dy);

    const maxDx = spiral.outer.x - spiral.center.x;
    const maxDy = spiral.outer.y - spiral.center.y;
    const maxRadius = Math.sqrt(maxDx * maxDx + maxDy * maxDy);

    const pointAngle = Math.atan2(dy, dx);
    const baseAngle = Math.atan2(maxDy, maxDx);

    let angleDiff = pointAngle - baseAngle;
    if (spiral.clockwise) {
      if (angleDiff > 0) angleDiff -= 2 * Math.PI;
    } else {
      if (angleDiff < 0) angleDiff += 2 * Math.PI;
    }

    const t = Math.exp(angleDiff / (2 * Math.PI)) * (pointRadius / maxRadius);

    return (spiral.outer.thickness || lineThickness) * t + 0.5;
  };

  const handleMouseDown = useCallback(
    (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const point = { x, y };

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
            const result = distanceToLineSegment(
              point,
              points[j],
              points[j + 1]
            );
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
        if (snappingEnabled) {
          // Find closest spiral and point
          let closestDist = Infinity;
          let closestSpiral = null;
          let closestPoint = null;

          for (const spiral of spirals) {
            // Check center point
            const dx = point.x - spiral.center.x;
            const dy = point.y - spiral.center.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= centerSnapRadius && distance < closestDist) {
              closestDist = distance;
              closestSpiral = spiral;
              closestPoint = spiral.center;
            }

            // Check outer point
            const dxOuter = point.x - spiral.outer.x;
            const dyOuter = point.y - spiral.outer.y;
            const distanceOuter = Math.sqrt(
              dxOuter * dxOuter + dyOuter * dyOuter
            );

            if (
              distanceOuter <= endpointSnapRadius &&
              distanceOuter < closestDist
            ) {
              closestDist = distanceOuter;
              closestSpiral = spiral;
              closestPoint = spiral.outer;
            }

            // Check points along the spiral
            const spiralPoints = generateSpiralPoints(
              spiral.outer,
              spiral.center,
              spiral.clockwise,
              spiral.coils || 3
            );

            for (let i = 0; i < spiralPoints.length - 1; i++) {
              const result = distanceToLineSegment(
                point,
                spiralPoints[i],
                spiralPoints[i + 1]
              );
              if (
                result.distance <= endpointSnapRadius &&
                result.distance < closestDist
              ) {
                closestDist = result.distance;
                closestSpiral = spiral;
                closestPoint = result.point;
              }
            }
          }

          if (closestSpiral && closestPoint) {
            setParentSpiral(closestSpiral);
            setStartPoint({
              ...closestPoint,
              thickness: lineThickness,
            });
            setIsDrawing(true);
            return;
          }
        }

        // If no snap point found, use raw point and clear parent spiral
        setParentSpiral(null);
        setStartPoint({
          ...point,
          thickness: lineThickness,
        });
        setIsDrawing(true);
      }
    },
    [
      selectedTool,
      selectedSpiral,
      spirals,
      endpointSnapRadius,
      centerSnapRadius,
    ]
  );

  const handleMouseMove = useCallback(
    (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const point = { x, y };

      if (selectedTool === "select") {
        // Handle dragging
        if (isDragging && selectedSpiral !== null && selectedEnd) {
          // Check for snap points when dragging
          let targetPoint = point;
          if (snappingEnabled) {
            const { point: snappedPoint } = findSnapPoint(point, false);
            if (snappedPoint) {
              targetPoint = snappedPoint;
            }
          }

          setSpirals(
            spirals.map((spiral, i) => {
              if (i === selectedSpiral) {
                if (selectedEnd === "center") {
                  // Move only the center point
                  return {
                    ...spiral,
                    center: {
                      ...spiral.center,
                      x: targetPoint.x,
                      y: targetPoint.y,
                    },
                  };
                } else {
                  // Move the whole spiral when dragging outer point
                  const dx = targetPoint.x - spiral.outer.x;
                  const dy = targetPoint.y - spiral.outer.y;
                  return {
                    ...spiral,
                    outer: {
                      ...spiral.outer,
                      x: targetPoint.x,
                      y: targetPoint.y,
                    },
                    center: {
                      ...spiral.center,
                      x: spiral.center.x + dx,
                      y: spiral.center.y + dy,
                    },
                  };
                }
              }
              return spiral;
            })
          );
        }

        // Check for endpoint hovering
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
      } else if (selectedTool === "spiral") {
        if (isDrawing) {
          if (snappingEnabled) {
            const { point: snappedPoint, spiral } = findSnapPoint(point, false);
            if (snappedPoint) {
              setCurrentPoint(snappedPoint);
              setSnapPoint(snappedPoint);
              setSnappedSpiral(spiral);
              return;
            }
          }
          setCurrentPoint(point);
          setSnapPoint(null);
          setSnappedSpiral(null);
        } else {
          if (snappingEnabled) {
            const { point: snappedPoint, spiral } = findSnapPoint(point, false);
            setSnapPoint(snappedPoint);
            setSnappedSpiral(spiral);
          } else {
            setSnapPoint(null);
            setSnappedSpiral(null);
          }
        }
      }
    },
    [
      selectedTool,
      isDrawing,
      snappingEnabled,
      selectedSpiral,
      selectedEnd,
      isDragging,
      spirals,
      endpointSnapRadius,
    ]
  );

  const handleMouseUp = useCallback(
    (e) => {
      if (selectedTool === "select") {
        setIsDragging(false);
      } else {
        if (isDrawing && startPoint && currentPoint) {
          setSpirals((prev) => [
            ...prev,
            {
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
            },
          ]);
          setUndoStack([...undoStack, spirals]);
          setRedoStack([]);
        }
        setIsDrawing(false);
        setStartPoint(null);
        setCurrentPoint(null);
        setSnapPoint(null);
        setSnappedSpiral(null);
      }
    },
    [
      selectedTool,
      isDrawing,
      startPoint,
      currentPoint,
      isClockwise,
      undoStack,
      spirals,
      taperToCenter,
      spiralType,
      sizeRatio,
      lineThickness,
    ]
  );

  useEffect(() => {
    let animationFrame;

    const updateCoils = () => {
      if (heldKeys.has("a") || heldKeys.has("d")) {
        setDefaultCoils((prev) => {
          const delta = heldKeys.has("d")
            ? COIL_ADJUST_SPEED
            : -COIL_ADJUST_SPEED;
          return Math.min(MAX_COILS, Math.max(MIN_COILS, prev + delta));
        });
        animationFrame = requestAnimationFrame(updateCoils);
      }
    };

    if (heldKeys.has("a") || heldKeys.has("d")) {
      animationFrame = requestAnimationFrame(updateCoils);
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [heldKeys]);

  useEffect(() => {
    let animationFrame;

    const updateThickness = () => {
      if (heldKeys.has("w") || heldKeys.has("s")) {
        setLineThickness((prev) => {
          const delta = heldKeys.has("w")
            ? LINE_ADJUST_SPEED
            : -LINE_ADJUST_SPEED;
          return Math.min(
            MAX_LINE_THICKNESS,
            Math.max(MIN_LINE_THICKNESS, prev + delta)
          );
        });
        animationFrame = requestAnimationFrame(updateThickness);
      }
    };

    if (heldKeys.has("w") || heldKeys.has("s")) {
      animationFrame = requestAnimationFrame(updateThickness);
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [heldKeys]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.metaKey && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        if (undoStack.length > 0) {
          const previousState = undoStack[undoStack.length - 1];
          setRedoStack([...redoStack, spirals]);
          setSpirals(previousState);
          setUndoStack(undoStack.slice(0, -1));
        }
      } else if (e.metaKey && e.shiftKey && e.key === "z") {
        e.preventDefault();
        if (redoStack.length > 0) {
          const nextState = redoStack[redoStack.length - 1];
          setUndoStack([...undoStack, spirals]);
          setSpirals(nextState);
          setRedoStack(redoStack.slice(0, -1));
        }
      } else if (e.key.toLowerCase() === "x") {
        e.preventDefault();
        const now = Date.now();
        if (now - lastFlipTime > 100) {
          if (isDrawing && startPoint && currentPoint && parentSpiral) {
            if (e.shiftKey) {
              // Flip over the green radial line
              const dx = startPoint.x - parentSpiral.center.x;
              const dy = startPoint.y - parentSpiral.center.y;
              const radialAngle = Math.atan2(dy, dx);

              // Reflect current point over radial line
              const reflectPoint = (point) => {
                const vx = point.x - startPoint.x;
                const vy = point.y - startPoint.y;

                const cos2 = Math.cos(2 * radialAngle);
                const sin2 = Math.sin(2 * radialAngle);

                return {
                  x: startPoint.x + vx * cos2 + vy * sin2,
                  y: startPoint.y + vx * sin2 - vy * cos2,
                };
              };

              const reflectedPoint = reflectPoint(currentPoint);
              setCurrentPoint(reflectedPoint);
            } else {
              // Regular X: Flip over orange tangent line
              const dx = startPoint.x - parentSpiral.center.x;
              const dy = startPoint.y - parentSpiral.center.y;
              const r = Math.sqrt(dx * dx + dy * dy);
              const baseAngle = Math.atan2(dy, dx);
              const growthFactor =
                Math.log(r) / (2 * Math.PI * parentSpiral.coils);
              const tangentAngle =
                baseAngle +
                (parentSpiral.clockwise ? 1 : -1) *
                  (Math.PI / 2 + Math.atan(growthFactor));

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

              const reflectedPoint = reflectPoint(currentPoint);
              setCurrentPoint(reflectedPoint);
            }
          }

          // Flip direction
          setIsClockwise(!isClockwise);
          setLastFlipTime(now);
        }
      } else if (e.key.toLowerCase() === "q") {
        e.preventDefault();
        setSnappingEnabled((prev) => !prev);
      } else if (e.key.toLowerCase() === "e") {
        e.preventDefault();
        setTaperToCenter((prev) => !prev);
      } else if (["w", "a", "s", "d"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        setHeldKeys((prev) => new Set([...prev, e.key.toLowerCase()]));
      } else if (e.key === "z" || e.key === "Z") {
        setSizeRatio((prev) => Math.max(0, prev - 0.1));
      } else if (e.key === "c" || e.key === "C") {
        setSizeRatio((prev) => Math.min(3.0, prev + 0.1));
      } else if (e.key.toLowerCase() === "v") {
        setSelectedTool("select");
      } else if (e.key.toLowerCase() === "b") {
        setSelectedTool("spiral");
      }
    },
    [
      spirals,
      undoStack,
      redoStack,
      isClockwise,
      lastFlipTime,
      sizeRatio,
      isDrawing,
      startPoint,
      currentPoint,
      parentSpiral,
      selectedTool,
    ]
  );

  const handleKeyUp = useCallback((e) => {
    if (["w", "a", "s", "d"].includes(e.key.toLowerCase())) {
      e.preventDefault();
      setHeldKeys((prev) => {
        const next = new Set(prev);
        next.delete(e.key.toLowerCase());
        return next;
      });
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const getCoilsForSize = (distance) => {
    const minCoils = defaultCoils * 0.5;
    const maxCoils = defaultCoils;
    const minDistance = 50;
    const maxDistance = 200;

    return (
      minCoils +
      (maxCoils - minCoils) *
        Math.min(
          1,
          Math.max(0, (distance - minDistance) / (maxDistance - minDistance))
        )
    );
  };

  const generateSpiralPointsByType = (
    outer,
    center,
    clockwise,
    coils,
    type,
    spiral
  ) => {
    if (!outer || !center) return [];

    const points = [];
    const dx = outer.x - center.x;
    const dy = outer.y - center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const steps = 100 * Math.abs(coils);
    const baseAngle = Math.atan2(dy, dx);
    const angleMultiplier = (coils >= 0 ? clockwise : !clockwise) ? 1 : -1;

    switch (type) {
      case SPIRAL_TYPES.LINE:
        // Just return start and end points for a line
        points.push({ x: outer.x, y: outer.y }, { x: center.x, y: center.y });
        break;

      case SPIRAL_TYPES.LOGARITHMIC:
        // Current logarithmic spiral
        const growthFactor =
          Math.log(distance) / (2 * Math.PI * Math.abs(coils));
        for (let i = steps; i >= 0; i--) {
          const t = i / steps;
          const radius = Math.exp(
            2 * Math.PI * Math.abs(coils) * t * growthFactor
          );
          const angle =
            baseAngle +
            angleMultiplier * 2 * Math.PI * Math.abs(coils) * (1 - t);
          points.push({
            x: center.x + radius * Math.cos(angle),
            y: center.y + radius * Math.sin(angle),
          });
        }
        break;

      case SPIRAL_TYPES.ARCHIMEDES:
        // Linear growth spiral (reversed t for correct tapering)
        for (let i = steps; i >= 0; i--) {
          const t = 1 - i / steps; // Reversed t
          const radius = distance * t;
          const angle =
            baseAngle +
            angleMultiplier * 2 * Math.PI * Math.abs(coils) * (1 - t);
          points.push({
            x: center.x + radius * Math.cos(angle),
            y: center.y + radius * Math.sin(angle),
          });
        }
        break;

      case SPIRAL_TYPES.HYPERBOLIC:
        // 1/r spiral with fixed outer point and proper coils
        for (let i = steps; i >= 0; i--) {
          const t = i / steps;
          const scale = 5;
          const radius = distance / (1 + scale * t);
          const angle =
            baseAngle +
            (clockwise ? -1 : 1) * 2 * Math.PI * Math.abs(coils) * (1 - t);
          points.push({
            x: center.x + radius * Math.cos(angle),
            y: center.y + radius * Math.sin(angle),
          });
        }
        break;

      case SPIRAL_TYPES.FERMAT:
        // Square root spiral (reversed t for correct tapering)
        for (let i = steps; i >= 0; i--) {
          const t = 1 - i / steps; // Reversed t
          const radius = distance * Math.sqrt(t);
          const angle =
            baseAngle +
            angleMultiplier * 2 * Math.PI * Math.abs(coils) * (1 - t);
          points.push({
            x: center.x + radius * Math.cos(angle),
            y: center.y + radius * Math.sin(angle),
          });
        }
        break;

      case SPIRAL_TYPES.S_CURVE:
        const baseGrowthFactor =
          Math.log(distance) / (2 * Math.PI * Math.abs(coils));
        const firstSpiralPoints = [];
        const secondSpiralPoints = [];

        // Get the sizeRatio from the spiral object or use current state for preview
        const currentSizeRatio = spiral?.sizeRatio ?? sizeRatio;

        // Generate first spiral (full size)
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const radius =
            distance *
            Math.exp(
              2 * Math.PI * Math.abs(coils) * (t - 1) * baseGrowthFactor
            );
          const angle =
            baseAngle +
            angleMultiplier * 2 * Math.PI * Math.abs(coils) * (1 - t);
          firstSpiralPoints.push({
            x: outer.x + radius * Math.cos(angle + Math.PI),
            y: outer.y + radius * Math.sin(angle + Math.PI),
          });
        }

        // Generate second spiral rotated 180° around cursor position
        for (let i = steps; i >= 0; i--) {
          const t = i / steps;
          const radius =
            distance *
            Math.exp(
              2 * Math.PI * Math.abs(coils) * (t - 1) * baseGrowthFactor
            );
          const angle =
            baseAngle +
            angleMultiplier * 2 * Math.PI * Math.abs(coils) * (1 - t);

          // Calculate base point position
          const baseX = outer.x + radius * Math.cos(angle + Math.PI);
          const baseY = outer.y + radius * Math.sin(angle + Math.PI);

          // Scale from cursor point using the spiral's stored ratio
          const dx = baseX - center.x;
          const dy = baseY - center.y;
          secondSpiralPoints.push({
            x: center.x - dx * currentSizeRatio,
            y: center.y - dy * currentSizeRatio,
          });
        }

        points.push(...firstSpiralPoints, ...secondSpiralPoints);
        break;
    }

    return points;
  };

  const generateTaperedSpiralSegments = (
    outer,
    center,
    clockwise = true,
    segments = 50,
    startThickness = 2,
    coils = 3,
    taperToCenter = true,
    type = SPIRAL_TYPES.LOGARITHMIC,
    spiral
  ) => {
    const actualClockwise = coils >= 0 ? clockwise : !clockwise;
    const absoluteCoils = Math.abs(coils);

    if (!outer || !center) return [];

    const dx = outer.x - center.x;
    const dy = outer.y - center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 0.1) return [];

    const sizeFactor = Math.max(1, 100 / distance);

    const result = [];
    for (let i = segments; i >= 1; i--) {
      const points = generateSpiralPointsByType(
        outer,
        center,
        actualClockwise,
        absoluteCoils,
        type,
        spiral
      ).filter((_, index, arr) => {
        const segStart = Math.floor(((i - 1) * arr.length) / segments);
        const segEnd = Math.floor((i * arr.length) / segments);
        return index >= segStart && index <= segEnd;
      });

      const progress = i / segments;
      const taperT = taperToCenter ? progress : 1 - progress;
      const segmentThickness =
        startThickness * Math.pow(taperT, sizeFactor) + 0.5;

      if (
        points.length > 0 &&
        points.every((p) => !isNaN(p.x) && !isNaN(p.y))
      ) {
        result.push({
          points,
          thickness: segmentThickness,
        });
      }
    }

    return result;
  };

  const SpiralPath = ({
    spiral,
    opacity = 1,
    previewThickness,
    isSelected,
  }) => {
    const segments = generateTaperedSpiralSegments(
      spiral.outer,
      spiral.center,
      spiral.clockwise,
      50,
      previewThickness || spiral.outer.thickness || lineThickness,
      spiral.coils,
      spiral.taperToCenter ?? true,
      spiral.type || SPIRAL_TYPES.LOGARITHMIC,
      spiral
    );

    return (
      <>
        {segments.map((segment, index) => (
          <path
            key={index}
            d={`M ${segment.points.map((p) => `${p.x},${p.y}`).join(" L ")}`}
            fill="none"
            stroke={isSelected ? "orange" : "blue"}
            strokeWidth={segment.thickness}
            opacity={opacity}
          />
        ))}

        {/* Add endpoint indicators when in select mode */}
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

  const Toolbar = () => (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 bg-white p-1 rounded-lg shadow space-y-1">
      <button
        className={`w-[30px] h-[30px] rounded flex items-center justify-center font-medium text-sm ${
          selectedTool === "select"
            ? "bg-blue-500 text-white"
            : "hover:bg-gray-100 text-gray-700"
        }`}
        onClick={() => setSelectedTool("select")}
        title="Select Tool (V)"
      >
        V
      </button>
      <button
        className={`w-[30px] h-[30px] rounded flex items-center justify-center font-medium text-sm ${
          selectedTool === "spiral"
            ? "bg-blue-500 text-white"
            : "hover:bg-gray-100 text-gray-700"
        }`}
        onClick={() => setSelectedTool("spiral")}
        title="Spiral Tool (B)"
      >
        B
      </button>
    </div>
  );

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <Toolbar />
      <div className="max-w-[1800px] mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          Spiral Generator
        </h1>

        <div className="flex gap-6">
          {/* Controls container as a table */}
          <table className="flex-none border-separate border-spacing-4">
            <tr>
              {/* Shape Controls */}
              <td className="w-[250px] bg-white p-4 rounded-lg shadow align-top">
                <h2 className="font-semibold text-gray-700 mb-4">
                  Shape Controls
                </h2>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type:
                  </label>
                  <select
                    className="w-full p-2 border rounded"
                    value={spiralType}
                    onChange={(e) => setSpiralType(e.target.value)}
                  >
                    <option value={SPIRAL_TYPES.LINE}>Line</option>
                    <option value={SPIRAL_TYPES.S_CURVE}>S Curve</option>
                    <option value={SPIRAL_TYPES.LOGARITHMIC}>
                      Logarithmic Spiral
                    </option>
                    <option value={SPIRAL_TYPES.ARCHIMEDES}>
                      Archimedes Spiral
                    </option>
                    <option value={SPIRAL_TYPES.HYPERBOLIC}>
                      Hyperbolic Spiral
                    </option>
                    <option value={SPIRAL_TYPES.FERMAT}>Fermat Spiral</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Direction:{" "}
                    <span className="text-gray-500 text-xs">(X)</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      className={`flex-1 px-3 py-1 rounded ${
                        isClockwise ? "bg-blue-500 text-white" : "bg-gray-200"
                      }`}
                      onClick={() => setIsClockwise(true)}
                    >
                      Clockwise
                    </button>
                    <button
                      className={`flex-1 px-3 py-1 rounded ${
                        !isClockwise ? "bg-blue-500 text-white" : "bg-gray-200"
                      }`}
                      onClick={() => setIsClockwise(false)}
                    >
                      Counter-clockwise
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Taper Direction:{" "}
                    <span className="text-gray-500 text-xs">(E)</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      className={`flex-1 px-3 py-1 rounded ${
                        taperToCenter ? "bg-blue-500 text-white" : "bg-gray-200"
                      }`}
                      onClick={() => setTaperToCenter(true)}
                    >
                      To Center
                    </button>
                    <button
                      className={`flex-1 px-3 py-1 rounded ${
                        !taperToCenter
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200"
                      }`}
                      onClick={() => setTaperToCenter(false)}
                    >
                      From Center
                    </button>
                  </div>
                </div>
              </td>

              {/* Parameters */}
              <td className="w-[250px] bg-white p-4 rounded-lg shadow align-top">
                <h2 className="font-semibold text-gray-700 mb-4">Parameters</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Line Thickness: {lineThickness.toFixed(1)}px{" "}
                      <span className="text-gray-500 text-xs">(W/S)</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      step="0.1"
                      value={lineThickness}
                      onChange={(e) => setLineThickness(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Coils: {defaultCoils.toFixed(1)}{" "}
                      <span className="text-gray-500 text-xs">(A/D)</span>
                    </label>
                    <input
                      type="range"
                      min="-22"
                      max="22"
                      step="0.1"
                      value={defaultCoils}
                      onChange={(e) => setDefaultCoils(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </td>

              {/* Snapping Controls */}
              <td className="w-[250px] bg-white p-4 rounded-lg shadow align-top">
                <h2 className="font-semibold text-gray-700 mb-4">Snapping</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Snapping:{" "}
                      <span className="text-gray-500 text-xs">(Q)</span>
                    </label>
                    <button
                      className={`w-full px-3 py-1 rounded ${
                        snappingEnabled
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200"
                      }`}
                      onClick={() => setSnappingEnabled(!snappingEnabled)}
                    >
                      {snappingEnabled ? "Enabled" : "Disabled"}
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Endpoint Snap Radius: {endpointSnapRadius}px
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      value={endpointSnapRadius}
                      onChange={(e) =>
                        setEndpointSnapRadius(Number(e.target.value))
                      }
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Center Snap Radius: {centerSnapRadius}px
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={centerSnapRadius}
                      onChange={(e) =>
                        setCenterSnapRadius(Number(e.target.value))
                      }
                      className="w-full"
                    />
                  </div>
                </div>
              </td>

              {/* Actions */}
              <td className="w-[250px] bg-white p-4 rounded-lg shadow align-top">
                <h2 className="font-semibold text-gray-700 mb-4">Actions</h2>
                <button
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors mb-4"
                  onClick={() => {
                    setUndoStack([...undoStack, spirals]);
                    setSpirals([]);
                    setRedoStack([]);
                  }}
                >
                  Clear Canvas
                </button>
                <div className="text-sm text-gray-600 text-center">
                  <div>
                    <span className="font-medium">Undo:</span> ⌘Z
                  </div>
                  <div>
                    <span className="font-medium">Redo:</span> ⌘⇧Z
                  </div>
                </div>
              </td>
            </tr>
          </table>

          {/* Canvas */}
          <div className="flex-1 bg-white rounded-lg shadow">
            <svg
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="w-full h-full min-h-[800px] border rounded"
            >
              {spirals.map((spiral, index) => (
                <SpiralPath
                  key={index}
                  spiral={spiral}
                  isSelected={index === selectedSpiral}
                />
              ))}

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
                  {snappingEnabled && parentSpiral && startPoint && (
                    <>
                      {(() => {
                        // Calculate tangent line at snap point
                        const dx = startPoint.x - parentSpiral.center.x;
                        const dy = startPoint.y - parentSpiral.center.y;
                        const r = Math.sqrt(dx * dx + dy * dy);
                        const baseAngle = Math.atan2(dy, dx);
                        const growthFactor =
                          Math.log(r) / (2 * Math.PI * parentSpiral.coils);

                        // Calculate true spiral tangent angle
                        const tangentAngle =
                          baseAngle +
                          (parentSpiral.clockwise ? 1 : -1) *
                            (Math.PI / 2 + Math.atan(growthFactor));

                        // Create original radial line
                        const extendedLine = extendLine(
                          startPoint,
                          parentSpiral.center,
                          100
                        );

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

                        // Create mirrored line
                        const mirroredStart = reflectPoint(extendedLine.start);
                        const mirroredEnd = reflectPoint(extendedLine.end);

                        return (
                          <>
                            {/* Original radial line */}
                            <line
                              x1={extendedLine.start.x}
                              y1={extendedLine.start.y}
                              x2={extendedLine.end.x}
                              y2={extendedLine.end.y}
                              stroke="green"
                              strokeWidth="2"
                              strokeDasharray="5,5"
                            />
                            {/* Mirrored radial line */}
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
                      })()}
                    </>
                  )}
                </>
              )}

              {!isDrawing && snapPoint && (
                <>
                  <circle
                    cx={snapPoint.x}
                    cy={snapPoint.y}
                    r={4}
                    fill="purple"
                    opacity="0.5"
                  />
                  <circle
                    cx={snapPoint.x}
                    cy={snapPoint.y}
                    r={endpointSnapRadius}
                    fill="none"
                    stroke="purple"
                    strokeWidth="1"
                    opacity="0.3"
                  />
                </>
              )}

              {isDrawing &&
                snapPoint &&
                snappedSpiral &&
                parentSpiral &&
                startPoint && (
                  <>
                    {(() => {
                      // Calculate vector from center to start point
                      const dx = startPoint.x - parentSpiral.center.x;
                      const dy = startPoint.y - parentSpiral.center.y;
                      const r = Math.sqrt(dx * dx + dy * dy);

                      // Calculate base angle
                      const baseAngle = Math.atan2(dy, dx);

                      // Calculate growth factor for logarithmic spiral
                      const growthFactor =
                        Math.log(r) / (2 * Math.PI * parentSpiral.coils);

                      // Calculate true spiral tangent angle
                      const tangentAngle =
                        baseAngle +
                        (parentSpiral.clockwise ? 1 : -1) *
                          (Math.PI / 2 + Math.atan(growthFactor));

                      return (
                        <>
                          <circle
                            cx={snapPoint.x}
                            cy={snapPoint.y}
                            r={4}
                            fill="green"
                            opacity="0.8"
                          />
                        </>
                      );
                    })()}
                  </>
                )}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
