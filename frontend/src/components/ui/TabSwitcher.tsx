import React from "react";

interface TabSwitcherProps {
  activeTab: "gather" | "outline";
  onTabChange: (tab: "gather" | "outline") => void;
}

export default function TabSwitcher({ activeTab, onTabChange }: TabSwitcherProps) {
  return (
    <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
      <button
        className={`relative px-2 py-2 rounded-md font-medium text-sm transition-colors duration-200 focus:outline-none
          ${activeTab === "gather" ? "bg-white shadow text-black" : "text-black/60"}`}
        onClick={() => onTabChange("gather")}
        style={{ zIndex: activeTab === "gather" ? 1 : 0 }}
      >
        Gather
      </button>
      <button
        className={`relative px-2 py-2 rounded-md font-medium text-sm transition-colors duration-200 focus:outline-none
          ${activeTab === "outline" ? "bg-white shadow text-black" : "text-black/60"}`}
        onClick={() => onTabChange("outline")}
        style={{ zIndex: activeTab === "outline" ? 1 : 0 }}
      >
        Outline
      </button>
    </div>
  );
} 