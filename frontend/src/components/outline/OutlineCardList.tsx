"use client";

import React from "react";

interface OutlineCardListProps {
  projectId: number;
}

export default function OutlineCardList({ projectId }: OutlineCardListProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4">
        <h2 className="text-md font-semibold text-gray-900 mb-1">Card List</h2>
        <p className="text-sm text-gray-600">
          Drag and drop cards into sections to add them to your outline.
        </p>
      </div>
      
      {/* Content area - placeholder for now */}
      <div className="flex-1 p-6">
        {/* Cards will go here */}
      </div>
    </div>
  );
}
