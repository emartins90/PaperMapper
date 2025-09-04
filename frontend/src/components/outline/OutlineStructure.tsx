"use client";

import React from "react";

interface OutlineStructureProps {
  projectId: number;
}

export default function OutlineStructure({ projectId }: OutlineStructureProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Header with controls */}
      <div className="py-6 px-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Left side content can go here later */}
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Templates and Export buttons placeholder */}
          <button className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-sm font-medium">Templates</span>
          </button>
          <button className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm font-medium">Export Outline</span>
          </button>
        </div>
      </div>
      
      {/* Content area - placeholder for outline structure */}
      <div className="flex-1 p-6">
        {/* Outline structure will go here */}
      </div>
    </div>
  );
}
