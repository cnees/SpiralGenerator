import { generateSpiralPointsByType } from "./spiralCalculations";
import { distanceToLineSegment } from "./geometryUtils";
import { DEFAULT_VALUES, SPIRAL_TYPES } from "../constants";

export const updateDescendants = (
  movedSpiralIndex,
  movedSpiral,
  spirals,
  relationships,
  visited = new Set(),
  depth = 0
) => {
  // Prevent infinite recursion
  if (depth > 100 || visited.has(movedSpiralIndex)) {
    return spirals;
  }
  visited.add(movedSpiralIndex);

  let updatedSpirals = [...spirals];
  updatedSpirals[movedSpiralIndex] = movedSpiral;

  // Find all direct children of the moved spiral
  const children = relationships.filter(
    (rel) => rel.parentIndex === movedSpiralIndex
  );

  // Recursively update each child's position
  children.forEach((rel) => {
    // Skip if this would create a cycle
    if (visited.has(rel.childIndex)) {
      return;
    }

    const childSpiral = updatedSpirals[rel.childIndex];
    const parentSpiral = updatedSpirals[rel.parentIndex];

    // Skip if either spiral is missing
    if (!childSpiral || !parentSpiral) {
      return;
    }

    // Generate points along parent spiral
    const parentPoints = generateSpiralPointsByType(
      parentSpiral.outer,
      parentSpiral.center,
      parentSpiral.clockwise,
      parentSpiral.coils,
      parentSpiral.type,
      parentSpiral
    );

    // Ensure we have points and valid t value
    if (!parentPoints.length) {
      return;
    }
    const index = Math.min(
      Math.floor(rel.t * (parentPoints.length - 1)),
      parentPoints.length - 1
    );
    const attachPoint = parentPoints[index];

    // Skip if we couldn't find an attachment point
    if (!attachPoint) {
      return;
    }

    // Calculate new position maintaining relative angle
    const parentAngle = Math.atan2(
      parentSpiral.center.y - attachPoint.y,
      parentSpiral.center.x - attachPoint.x
    );
    const newAngle = parentAngle + rel.angle;

    // Calculate vector from attach point to child center
    const childRadius = Math.hypot(
      childSpiral.center.x - childSpiral.outer.x,
      childSpiral.center.y - childSpiral.outer.y
    );

    // Update child spiral position
    const newChildOuter = attachPoint;
    const newChildCenter = {
      x: newChildOuter.x + childRadius * Math.cos(newAngle),
      y: newChildOuter.y + childRadius * Math.sin(newAngle),
    };

    const updatedChild = {
      ...childSpiral,
      outer: { ...newChildOuter, thickness: childSpiral.outer.thickness },
      center: newChildCenter,
    };

    // Recursively update this child's descendants
    updatedSpirals = updateDescendants(
      rel.childIndex,
      updatedChild,
      updatedSpirals,
      relationships,
      visited,
      depth + 1
    );
  });

  return updatedSpirals;
};

export const getCoilsForSize = (distance, defaultCoils) => {
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

export const findTValueOnSpiral = (point, spiral) => {
  const points = generateSpiralPointsByType(
    spiral.outer,
    spiral.center,
    spiral.clockwise,
    spiral.coils || DEFAULT_VALUES.DEFAULT_COILS,
    spiral.type || SPIRAL_TYPES.LOGARITHMIC,
    spiral
  );

  let closestDist = Infinity;
  let closestIndex = 0;

  // Find the closest segment
  for (let i = 0; i < points.length - 1; i++) {
    const result = distanceToLineSegment(point, points[i], points[i + 1]);
    if (result.distance < closestDist) {
      closestDist = result.distance;
      closestIndex = i;
    }
  }

  // Return t value (0 to 1) representing position along the spiral
  return closestIndex / (points.length - 1);
};
