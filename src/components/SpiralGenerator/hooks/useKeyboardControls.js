import { useCallback } from "react";
import { DEFAULT_VALUES } from "../constants";

export const useKeyboardControls = ({
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
}) => {
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
        setSnappingEnabled(!snappingEnabled);
      } else if (e.key.toLowerCase() === "e") {
        e.preventDefault();
        if (selectedSpiral !== null) {
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
      selectedSpiral,
      taperToCenter,
      snappingEnabled,
      sizeRatio,
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

  return { handleKeyDown, handleKeyUp };
};
