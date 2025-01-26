import { useState } from "react";
import { DEFAULT_VALUES, SPIRAL_TYPES } from "../constants";

export const useSpiralState = () => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [currentPoint, setCurrentPoint] = useState(null);
  const [snapPoint, setSnapPoint] = useState(null);
  const [spirals, setSpirals] = useState([]);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [isClockwise, setIsClockwise] = useState(true);
  const [snappedSpiral, setSnappedSpiral] = useState(null);
  const [lastFlipTime, setLastFlipTime] = useState(0);
  const [lineThickness, setLineThickness] = useState(2);
  const [defaultCoils, setDefaultCoils] = useState(
    DEFAULT_VALUES.DEFAULT_COILS
  );
  const [heldKeys, setHeldKeys] = useState(new Set());
  const [snappingEnabled, setSnappingEnabled] = useState(true);
  const [spiralType, setSpiralType] = useState(SPIRAL_TYPES.LOGARITHMIC);
  const [taperToCenter, setTaperToCenter] = useState(true);
  const [sizeRatio, setSizeRatio] = useState(1.0);
  const [parentSpiral, setParentSpiral] = useState(null);
  const [selectedTool, setSelectedTool] = useState("spiral");
  const [selectedSpiral, setSelectedSpiral] = useState(null);
  const [selectedEnd, setSelectedEnd] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredEnd, setHoveredEnd] = useState(null);
  const [spiralRelationships, setSpiralRelationships] = useState([]);
  const [endpointSnapRadius, setEndpointSnapRadius] = useState(
    DEFAULT_VALUES.ENDPOINT_SNAP_RADIUS
  );
  const [centerSnapRadius, setCenterSnapRadius] = useState(
    DEFAULT_VALUES.CENTER_SNAP_RADIUS
  );

  return {
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
  };
};
