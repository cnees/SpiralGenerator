import { SPIRAL_TYPES } from "../constants";

export const generateSpiralPoints = (
  outer,
  center,
  clockwise = true,
  coils = 3
) => {
  if (!outer || !center) return [];

  const points = [];
  const dx = outer.x - center.x;
  const dy = outer.y - center.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const steps = 100 * coils;

  const baseAngle = Math.atan2(dy, dx);
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

export const generateSpiralPointsByType = (
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
      points.push({ x: outer.x, y: outer.y }, { x: center.x, y: center.y });
      break;

    case SPIRAL_TYPES.LOGARITHMIC:
      const growthFactor = Math.log(distance) / (2 * Math.PI * Math.abs(coils));
      for (let i = steps; i >= 0; i--) {
        const t = i / steps;
        const radius = Math.exp(
          2 * Math.PI * Math.abs(coils) * t * growthFactor
        );
        const angle =
          baseAngle + angleMultiplier * 2 * Math.PI * Math.abs(coils) * (1 - t);
        points.push({
          x: center.x + radius * Math.cos(angle),
          y: center.y + radius * Math.sin(angle),
        });
      }
      break;

    case SPIRAL_TYPES.ARCHIMEDES:
      // Linear growth spiral (r = at)
      for (let i = steps; i >= 0; i--) {
        const t = 1 - i / steps;
        const radius = distance * t;
        const angle =
          baseAngle + angleMultiplier * 2 * Math.PI * Math.abs(coils) * (1 - t);
        points.push({
          x: center.x + radius * Math.cos(angle),
          y: center.y + radius * Math.sin(angle),
        });
      }
      break;

    case SPIRAL_TYPES.HYPERBOLIC:
      // 1/r spiral with fixed outer point
      for (let i = steps; i >= 0; i--) {
        const t = i / steps;
        const scale = 5; // Controls how quickly the spiral tightens
        const radius = distance / (1 + scale * t);
        const angle =
          baseAngle + angleMultiplier * 2 * Math.PI * Math.abs(coils) * (1 - t);
        points.push({
          x: center.x + radius * Math.cos(angle),
          y: center.y + radius * Math.sin(angle),
        });
      }
      break;

    case SPIRAL_TYPES.FERMAT:
      // Square root spiral (r = a√θ)
      for (let i = steps; i >= 0; i--) {
        const t = 1 - i / steps;
        const radius = distance * Math.sqrt(t);
        const angle =
          baseAngle + angleMultiplier * 2 * Math.PI * Math.abs(coils) * (1 - t);
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
      const currentSizeRatio = spiral?.sizeRatio ?? 1.0;

      // Generate first spiral (full size)
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const radius =
          distance *
          Math.exp(2 * Math.PI * Math.abs(coils) * (t - 1) * baseGrowthFactor);
        const angle =
          baseAngle + angleMultiplier * 2 * Math.PI * Math.abs(coils) * (1 - t);
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
          Math.exp(2 * Math.PI * Math.abs(coils) * (t - 1) * baseGrowthFactor);
        const angle =
          baseAngle + angleMultiplier * 2 * Math.PI * Math.abs(coils) * (1 - t);

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

export const generateTaperedSpiralSegments = (
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

    if (points.length > 0 && points.every((p) => !isNaN(p.x) && !isNaN(p.y))) {
      result.push({
        points,
        thickness: segmentThickness,
      });
    }
  }

  return result;
};
