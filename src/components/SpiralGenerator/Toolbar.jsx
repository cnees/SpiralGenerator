import React from "react";

export const Toolbar = ({
  selectedTool,
  setSelectedTool,
  setSelectedSpiral,
}) => (
  <div className="mb-4 flex gap-2">
    <button
      className={`px-4 py-2 rounded ${
        selectedTool === "spiral"
          ? "bg-blue-500 text-white"
          : "bg-gray-200 hover:bg-gray-300"
      }`}
      onClick={() => {
        setSelectedTool("spiral");
        setSelectedSpiral(null);
      }}
    >
      Draw Spiral (B)
    </button>
    <button
      className={`px-4 py-2 rounded ${
        selectedTool === "select"
          ? "bg-blue-500 text-white"
          : "bg-gray-200 hover:bg-gray-300"
      }`}
      onClick={() => {
        setSelectedTool("select");
      }}
    >
      Select (V)
    </button>
  </div>
);
