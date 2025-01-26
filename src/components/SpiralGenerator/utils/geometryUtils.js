export const distanceToLineSegment = (point, start, end) => {
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

export const extendLine = (start, end, factor = 10) => {
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
