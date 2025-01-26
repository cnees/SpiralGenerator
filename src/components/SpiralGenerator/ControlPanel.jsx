import React from "react";
import { SPIRAL_TYPES, DEFAULT_VALUES } from "./constants";

export const ControlPanel = ({
  spiralType,
  setSpiralType,
  isClockwise,
  setIsClockwise,
  taperToCenter,
  setTaperToCenter,
  lineThickness,
  setLineThickness,
  defaultCoils,
  setDefaultCoils,
  selectedSpiral,
  spirals,
  setSpirals,
  snappingEnabled,
  setSnappingEnabled,
  endpointSnapRadius,
  setEndpointSnapRadius,
  centerSnapRadius,
  setCenterSnapRadius,
  undoStack,
  setUndoStack,
  setRedoStack,
}) => (
  <table className="flex-none border-separate border-spacing-4">
    <tbody>
      <tr>
        {/* Shape Controls */}
        <td className="w-[250px] bg-white p-4 rounded-lg shadow align-top">
          <h2 className="font-semibold text-gray-700 mb-4">Shape Controls</h2>
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
              <option value={SPIRAL_TYPES.ARCHIMEDES}>Archimedes Spiral</option>
              <option value={SPIRAL_TYPES.HYPERBOLIC}>Hyperbolic Spiral</option>
              <option value={SPIRAL_TYPES.FERMAT}>Fermat Spiral</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Direction: <span className="text-gray-500 text-xs">(X)</span>
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
                  !taperToCenter ? "bg-blue-500 text-white" : "bg-gray-200"
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
                      spirals[selectedSpiral].outer.thickness || lineThickness
                    ).toFixed(1)
                  : lineThickness.toFixed(1)}
                px <span className="text-gray-500 text-xs">(W/S)</span>
              </label>
              <input
                type="range"
                min={DEFAULT_VALUES.MIN_LINE_THICKNESS}
                max={DEFAULT_VALUES.MAX_LINE_THICKNESS}
                step="0.1"
                value={
                  selectedSpiral !== null
                    ? spirals[selectedSpiral].outer.thickness || lineThickness
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
                min={DEFAULT_VALUES.MIN_COILS}
                max={DEFAULT_VALUES.MAX_COILS}
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
                Snapping: <span className="text-gray-500 text-xs">(Q)</span>
              </label>
              <button
                className={`w-full px-3 py-1 rounded ${
                  snappingEnabled ? "bg-blue-500 text-white" : "bg-gray-200"
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
                onChange={(e) => setEndpointSnapRadius(Number(e.target.value))}
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
                onChange={(e) => setCenterSnapRadius(Number(e.target.value))}
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
    </tbody>
  </table>
);
