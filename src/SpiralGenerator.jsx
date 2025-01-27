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
  const [lineThickness, setLineThickness] = useState(10);
  const [defaultCoils, setDefaultCoils] = useState(3);
  const [heldKeys, setHeldKeys] = useState(new Set());
  const COIL_ADJUST_SPEED = 0.05;
  const MIN_COILS = -22;
  const MAX_COILS = 22;
  const LINE_ADJUST_SPEED = 0.2;
  const MIN_LINE_THICKNESS = 1;
  const MAX_LINE_THICKNESS = 50;
  const [snappingEnabled, setSnappingEnabled] = useState(true);
  const [spiralType, setSpiralType] = useState("logarithmic");
  const [taperToCenter, setTaperToCenter] = useState(true);
  const [sizeRatio, setSizeRatio] = useState(1.0);
  const [parentSpiral, setParentSpiral] = useState(null);
  const [selectedTool, setSelectedTool] = useState("spiral");
  const [selectedSpiral, setSelectedSpiral] = useState(null);
  const [selectedEnd, setSelectedEnd] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredEnd, setHoveredEnd] = useState(null);
  const [spiralRelationships, setSpiralRelationships] = useState([]);

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

    const baseThickness = spiral.outer.thickness || lineThickness;
    const t = Math.exp(angleDiff / (2 * Math.PI)) * (pointRadius / maxRadius);
    const calculatedThickness = baseThickness * t;

    return calculatedThickness;
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

      // Check along the spiral
      const spiralPoints = generateSpiralPointsByType(
        spiral.outer,
        spiral.center,
        spiral.clockwise,
        spiral.coils || 3,
        spiral.type || SPIRAL_TYPES.LOGARITHMIC,
        spiral
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
          const { point: snappedPoint, spiral: snapSpiral } = findSnapPoint(
            point,
            false
          );
          if (snappedPoint) {
            console.log("Before calculating snap thickness:", {
              snappedPoint,
              snapSpiral,
              spiralThickness: snapSpiral.outer.thickness,
              defaultThickness: lineThickness,
            });

            const snapThickness = getThicknessAtPoint(snappedPoint, snapSpiral);

            console.log("After calculating snap thickness:", {
              snapThickness,
              finalThickness: snapThickness || lineThickness,
            });

            setParentSpiral(snapSpiral);
            console.log("Using snapthickness ", snapThickness);
            setStartPoint({
              ...snappedPoint,
              thickness: snapThickness,
            });
            setIsDrawing(true);
            return;
          }
        }

        // If no snap point found, use raw point and clear parent spiral
        setParentSpiral(null);
        console.log("No parent");
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
      lineThickness,
      snappingEnabled,
    ]
  );

  const updateDescendants = (
    parentIndex,
    parentSpiral,
    updatedSpirals,
    relationships
  ) => {
    // Add visited set to prevent cycles
    const visited = new Set();

    const updateDescendantsHelper = (currentIndex, currentSpiral) => {
      if (!currentSpiral || visited.has(currentIndex)) return updatedSpirals;
      visited.add(currentIndex);

      // Find all immediate children
      const children = relationships.filter(
        (rel) => rel.parentIndex === currentIndex
      );

      children.forEach((rel) => {
        const childSpiral = updatedSpirals[rel.childIndex];
        // Skip if child spiral doesn't exist
        if (!childSpiral) return;

        const attachPoint = getPointOnSpiral(rel.t, currentSpiral);
        if (!attachPoint) return; // Skip if we can't get attachment point

        // Calculate new center point maintaining the relative angle
        const parentAngle = Math.atan2(
          currentSpiral.center.y - attachPoint.y,
          currentSpiral.center.x - attachPoint.x
        );
        const newChildAngle = parentAngle + rel.angle;

        // Calculate the distance between attachment point and child center
        const childRadius = Math.hypot(
          childSpiral.center.x - childSpiral.outer.x,
          childSpiral.center.y - childSpiral.outer.y
        );

        // Update the child spiral
        const updatedChild = {
          ...childSpiral,
          outer: {
            ...childSpiral.outer,
            x: attachPoint.x,
            y: attachPoint.y,
          },
          center: {
            x: attachPoint.x + childRadius * Math.cos(newChildAngle),
            y: attachPoint.y + childRadius * Math.sin(newChildAngle),
          },
        };

        updatedSpirals[rel.childIndex] = updatedChild;

        // Recursively update this child's descendants
        updateDescendantsHelper(rel.childIndex, updatedChild);
      });

      return updatedSpirals;
    };

    return updateDescendantsHelper(parentIndex, parentSpiral);
  };

  const handleMouseMove = useCallback(
    (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const point = { x, y };

      if (selectedTool === "select") {
        if (isDragging && selectedSpiral !== null && selectedEnd) {
          // Get mouse position and handle snapping
          let targetPoint = point;
          let newParentSpiral = null;

          if (snappingEnabled && selectedEnd === "outer") {
            const { point: snappedPoint, spiral: snapTarget } = findSnapPoint(
              point,
              false
            );
            if (snappedPoint && snapTarget) {
              // Don't allow snapping to own descendants to prevent cycles
              const descendants = getAllDescendants(selectedSpiral);
              if (!descendants.has(spirals.indexOf(snapTarget))) {
                targetPoint = snappedPoint;
                newParentSpiral = snapTarget;
              }
            }
          }

          // Create a copy of spirals to work with
          let updatedSpirals = [...spirals];

          // Update the dragged spiral
          if (selectedEnd === "center") {
            updatedSpirals[selectedSpiral] = {
              ...updatedSpirals[selectedSpiral],
              center: {
                ...updatedSpirals[selectedSpiral].center,
                x: targetPoint.x,
                y: targetPoint.y,
              },
            };
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

            // Update spiral relationships if we snapped to a new parent
            if (newParentSpiral) {
              setSpiralRelationships((prev) => {
                // Remove any existing relationship where this spiral is the child
                const filtered = prev.filter(
                  (rel) => rel.childIndex !== selectedSpiral
                );

                // Calculate t value along parent spiral
                const t = findTValueOnSpiral(targetPoint, newParentSpiral);

                // Calculate parent angle from its center to the snap point
                const parentAngle = Math.atan2(
                  newParentSpiral.center.y - targetPoint.y,
                  newParentSpiral.center.x - targetPoint.x
                );

                // Calculate the current angle of the child spiral relative to its outer point
                const childSpiral = updatedSpirals[selectedSpiral];
                const childVectorX = childSpiral.center.x - childSpiral.outer.x;
                const childVectorY = childSpiral.center.y - childSpiral.outer.y;
                const childAngle = Math.atan2(childVectorY, childVectorX);

                // Calculate relative angle while preserving the child's current orientation
                const relativeAngle =
                  ((childAngle - parentAngle + 3 * Math.PI) % (2 * Math.PI)) -
                  Math.PI;

                // Add new relationship
                const newParentIndex = spirals.findIndex(
                  (s) => s === newParentSpiral
                );
                return [
                  ...filtered,
                  {
                    childIndex: selectedSpiral,
                    parentIndex: newParentIndex,
                    t,
                    angle: relativeAngle,
                  },
                ];
              });
            }
          }

          // After updating the spiral's position, update its relationship angle if it's a child
          const relationship = spiralRelationships.find(
            (rel) => rel.childIndex === selectedSpiral
          );
          if (relationship) {
            setSpiralRelationships((prev) =>
              prev.map((rel) => {
                if (rel.childIndex === selectedSpiral) {
                  const parentSpiral = spirals[rel.parentIndex];
                  const childSpiral = updatedSpirals[selectedSpiral];
                  const attachPoint = getPointOnSpiral(rel.t, parentSpiral);

                  // Calculate parent angle from its center to the attachment point
                  const parentAngle = Math.atan2(
                    parentSpiral.center.y - attachPoint.y,
                    parentSpiral.center.x - attachPoint.x
                  );

                  // Calculate the current angle of the child spiral relative to its outer point
                  const childVectorX =
                    childSpiral.center.x - childSpiral.outer.x;
                  const childVectorY =
                    childSpiral.center.y - childSpiral.outer.y;
                  const childAngle = Math.atan2(childVectorY, childVectorX);

                  // Calculate new relative angle
                  const relativeAngle =
                    ((childAngle - parentAngle + 3 * Math.PI) % (2 * Math.PI)) -
                    Math.PI;

                  return {
                    ...rel,
                    angle: relativeAngle,
                  };
                }
                return rel;
              })
            );
          }

          // Recursively update all descendants using the visited set to prevent cycles
          const visited = new Set();
          const updateDescendantsWithCycleCheck = (
            parentIndex,
            parentSpiral
          ) => {
            if (visited.has(parentIndex)) return updatedSpirals;
            visited.add(parentIndex);

            const children = spiralRelationships.filter(
              (rel) => rel.parentIndex === parentIndex
            );
            children.forEach((rel) => {
              if (!visited.has(rel.childIndex)) {
                const childSpiral = updatedSpirals[rel.childIndex];
                const attachPoint = getPointOnSpiral(rel.t, parentSpiral);

                const parentAngle = Math.atan2(
                  parentSpiral.center.y - attachPoint.y,
                  parentSpiral.center.x - attachPoint.x
                );
                const newChildAngle = parentAngle + rel.angle;

                const childRadius = Math.hypot(
                  childSpiral.center.x - childSpiral.outer.x,
                  childSpiral.center.y - childSpiral.outer.y
                );

                updatedSpirals[rel.childIndex] = {
                  ...childSpiral,
                  outer: {
                    ...childSpiral.outer,
                    x: attachPoint.x,
                    y: attachPoint.y,
                  },
                  center: {
                    x: attachPoint.x + childRadius * Math.cos(newChildAngle),
                    y: attachPoint.y + childRadius * Math.sin(newChildAngle),
                  },
                };

                updateDescendantsWithCycleCheck(
                  rel.childIndex,
                  updatedSpirals[rel.childIndex]
                );
              }
            });

            return updatedSpirals;
          };

          updatedSpirals = updateDescendantsWithCycleCheck(
            selectedSpiral,
            updatedSpirals[selectedSpiral]
          );
          setSpirals(updatedSpirals);
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
      spiralRelationships,
    ]
  );

  const handleMouseUp = useCallback(
    (e) => {
      if (selectedTool === "select") {
        setIsDragging(false);
      } else {
        if (isDrawing && startPoint && currentPoint) {
          console.log("Drawing  start current");
          const newSpiralIndex = spirals.length;
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

          // If snapped to another spiral, store the relationship with angle
          if (snappedSpiral) {
            console.log("IS snapped");
            const parentIndex = spirals.findIndex((s) => s === snappedSpiral);
            if (parentIndex !== -1) {
              // Calculate t value along parent spiral
              const t = findTValueOnSpiral(startPoint, snappedSpiral);

              // Calculate relative angle between parent and child
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
      snappedSpiral,
      spiralRelationships,
    ]
  );

  useEffect(() => {
    let animationFrame;

    const updateCoils = () => {
      if (heldKeys.has("a") || heldKeys.has("d")) {
        const delta = heldKeys.has("d")
          ? COIL_ADJUST_SPEED
          : -COIL_ADJUST_SPEED;
        if (selectedSpiral !== null) {
          // Update selected spiral's coils
          setSpirals(
            spirals.map((spiral, i) => {
              if (i === selectedSpiral) {
                return {
                  ...spiral,
                  coils: Math.min(
                    MAX_COILS,
                    Math.max(MIN_COILS, spiral.coils + delta)
                  ),
                };
              }
              return spiral;
            })
          );
        } else {
          // Update default coils
          setDefaultCoils((prev) =>
            Math.min(MAX_COILS, Math.max(MIN_COILS, prev + delta))
          );
        }
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
  }, [heldKeys, selectedSpiral, spirals]);

  useEffect(() => {
    let animationFrame;

    const updateThickness = () => {
      if (heldKeys.has("w") || heldKeys.has("s")) {
        const delta = heldKeys.has("w")
          ? LINE_ADJUST_SPEED
          : -LINE_ADJUST_SPEED;
        if (selectedSpiral !== null) {
          // Update selected spiral's thickness
          setSpirals(
            spirals.map((spiral, i) => {
              if (i === selectedSpiral) {
                return {
                  ...spiral,
                  outer: {
                    ...spiral.outer,
                    thickness: Math.min(
                      MAX_LINE_THICKNESS,
                      Math.max(
                        MIN_LINE_THICKNESS,
                        (spiral.outer.thickness || lineThickness) + delta
                      )
                    ),
                  },
                };
              }
              return spiral;
            })
          );
        } else {
          // Update default thickness
          setLineThickness((prev) =>
            Math.min(
              MAX_LINE_THICKNESS,
              Math.max(MIN_LINE_THICKNESS, prev + delta)
            )
          );
        }
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
  }, [heldKeys, selectedSpiral, spirals]);

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
          if (selectedSpiral !== null) {
            // Flip selected spiral
            setSpirals(
              spirals.map((spiral, i) => {
                if (i === selectedSpiral) {
                  return {
                    ...spiral,
                    clockwise: !spiral.clockwise,
                  };
                }
                return spiral;
              })
            );
          } else {
            setIsClockwise(!isClockwise);
          }
          setLastFlipTime(now);
        }
      } else if (e.key.toLowerCase() === "q") {
        e.preventDefault();
        setSnappingEnabled((prev) => !prev);
      } else if (e.key.toLowerCase() === "e") {
        e.preventDefault();
        if (selectedSpiral !== null) {
          // Toggle taper direction of selected spiral
          setSpirals(
            spirals.map((spiral, i) => {
              if (i === selectedSpiral) {
                return {
                  ...spiral,
                  taperToCenter: !spiral.taperToCenter,
                };
              }
              return spiral;
            })
          );
        } else {
          setTaperToCenter(!taperToCenter);
        }
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
        setSelectedSpiral(null);
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
      selectedSpiral,
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
    clockwise,
    numSegments,
    startThickness,
    coils,
    taperToCenter = true,
    type,
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
    const points = generateSpiralPointsByType(
      outer,
      center,
      actualClockwise,
      absoluteCoils,
      type,
      spiral
    );

    const segments = [];
    for (let i = 0; i < points.length - 1; i++) {
      const t = i / (points.length - 1); // t goes from 0 to 1
      const taperT = taperToCenter ? 1 - t : t; // Reverse t for tapering to center
      const segmentThickness =
        startThickness * Math.pow(taperT, sizeFactor) + 0.5;

      if (
        points.length > 0 &&
        points.every((p) => !isNaN(p.x) && !isNaN(p.y))
      ) {
        segments.push({
          points: [points[i], points[i + 1]],
          thickness: segmentThickness,
        });
      }
    }

    return segments;
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

  // Add function to get the root spiral of a tree
  const getRootSpiral = (spiralIndex) => {
    let currentIndex = spiralIndex;
    const visited = new Set();

    while (currentIndex !== null && !visited.has(currentIndex)) {
      visited.add(currentIndex);
      const relationship = spiralRelationships.find(
        (rel) => rel.childIndex === currentIndex
      );
      if (!relationship) return currentIndex;
      currentIndex = relationship.parentIndex;
    }

    return currentIndex;
  };

  // Modify isDescendantOfSelected to handle multiple trees
  const isDescendantOfSelected = (spiralIndex) => {
    if (selectedSpiral === null) return false;

    // Get root of selected spiral's tree
    const selectedRoot = getRootSpiral(selectedSpiral);
    // Get root of this spiral's tree
    const thisRoot = getRootSpiral(spiralIndex);

    // If they're not in the same tree, return false
    if (selectedRoot !== thisRoot) return false;

    // Get all descendants of selected spiral
    const descendants = getAllDescendants(selectedSpiral);
    return descendants.has(spiralIndex);
  };

  // Modify the SpiralPath component
  const SpiralPath = ({
    spiral,
    opacity = 1,
    previewThickness,
    isSelected,
    index,
  }) => {
    const isDescendant = isDescendantOfSelected(index);

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
        onClick={() => {
          setSelectedTool("spiral");
          setSelectedSpiral(null);
        }}
        title="Spiral Tool (B)"
      >
        B
      </button>
    </div>
  );

  const findTValueOnSpiral = (point, spiral) => {
    const points = generateSpiralPointsByType(
      spiral.outer,
      spiral.center,
      spiral.clockwise,
      spiral.coils,
      spiral.type,
      spiral
    );

    // Find closest point on spiral
    let minDist = Infinity;
    let closestT = 0;

    points.forEach((p, i) => {
      const dist = Math.hypot(point.x - p.x, point.y - p.y);
      if (dist < minDist) {
        minDist = dist;
        closestT = i / (points.length - 1);
      }
    });

    return closestT;
  };

  const getPointOnSpiral = (t, spiral) => {
    const points = generateSpiralPointsByType(
      spiral.outer,
      spiral.center,
      spiral.clockwise,
      spiral.coils,
      spiral.type,
      spiral
    );

    const index = Math.round(t * (points.length - 1));
    return points[index];
  };

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
                      Line Thickness:{" "}
                      {selectedSpiral !== null
                        ? (
                            spirals[selectedSpiral].outer.thickness ||
                            lineThickness
                          ).toFixed(1)
                        : lineThickness.toFixed(1)}
                      px <span className="text-gray-500 text-xs">(W/S)</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      step="0.1"
                      value={
                        selectedSpiral !== null
                          ? spirals[selectedSpiral].outer.thickness ||
                            lineThickness
                          : lineThickness
                      }
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (selectedSpiral !== null) {
                          setSpirals(
                            spirals.map((spiral, i) => {
                              if (i === selectedSpiral) {
                                return {
                                  ...spiral,
                                  outer: {
                                    ...spiral.outer,
                                    thickness: value,
                                  },
                                };
                              }
                              return spiral;
                            })
                          );
                        } else {
                          setLineThickness(value);
                        }
                      }}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Coils:{" "}
                      {selectedSpiral !== null
                        ? spirals[selectedSpiral].coils.toFixed(1)
                        : defaultCoils.toFixed(1)}{" "}
                      <span className="text-gray-500 text-xs">(A/D)</span>
                    </label>
                    <input
                      type="range"
                      min="-22"
                      max="22"
                      step="0.1"
                      value={
                        selectedSpiral !== null
                          ? spirals[selectedSpiral].coils
                          : defaultCoils
                      }
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (selectedSpiral !== null) {
                          setSpirals(
                            spirals.map((spiral, i) => {
                              if (i === selectedSpiral) {
                                return {
                                  ...spiral,
                                  coils: value,
                                };
                              }
                              return spiral;
                            })
                          );
                        } else {
                          setDefaultCoils(value);
                        }
                      }}
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
                  index={index}
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
                      taperToCenter: taperToCenter,
                      type: spiralType,
                      sizeRatio: sizeRatio,
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
