"use client";

import React from "react";
import OutlineCardList from "./OutlineCardList";
import OutlineStructure from "./OutlineStructure";

interface OutlineProps {
  projectId: number;
}

export default function Outline({ projectId }: OutlineProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top divider - leaves space for ProjectNav */}
      <div className="h-26 border-b border-gray-200 bg-white"></div>
      
      {/* Main content area */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left section - Card List */}
        <div className="w-86 border-r border-gray-200 bg-white">
          <OutlineCardList projectId={projectId} />
        </div>
        
        {/* Right section - Outline Structure */}
        <div className="flex-1 bg-white">
          <OutlineStructure projectId={projectId} />
        </div>
      </div>
    </div>
  );
}