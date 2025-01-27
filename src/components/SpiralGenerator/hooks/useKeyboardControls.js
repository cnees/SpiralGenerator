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
      if (e.target.tagName === "INPUT") return;

      setHeldKeys((prev) => new Set([...prev, e.key]));

      if (e.key.toLowerCase() === "w") {
        e.preventDefault();
        const newThickness = Math.min(
          DEFAULT_VALUES.MAX_LINE_THICKNESS,
          lineThickness + DEFAULT_VALUES.LINE_ADJUST_SPEED
        );
        setLineThickness(newThickness);
      } else if (e.key.toLowerCase() === "a") {
        e.preventDefault();
        if (selectedSpiral !== null) {
          setSpirals(
            spirals.map((spiral, i) => {
              if (i === selectedSpiral) {
                return {
                  ...spiral,
                  coils: Math.max(
                    DEFAULT_VALUES.MIN_COILS,
                    (spiral.coils || DEFAULT_VALUES.DEFAULT_COILS) -
                      DEFAULT_VALUES.COIL_ADJUST_SPEED
                  ),
                };
              }
              return spiral;
            })
          );
        } else {
          setDefaultCoils(
            Math.max(
              DEFAULT_VALUES.MIN_COILS,
              defaultCoils - DEFAULT_VALUES.COIL_ADJUST_SPEED
            )
          );
        }
      } else if (e.metaKey && !e.shiftKey && e.key === "z") {
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
      lineThickness,
      setLineThickness,
      defaultCoils,
      setDefaultCoils,
      setSpirals,
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
