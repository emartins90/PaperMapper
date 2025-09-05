"use client";

import { useParams } from "next/navigation";
import Outline from "@/components/outline/Outline";

export default function OutlinePage() {
  const params = useParams();
  const projectId = typeof params.id === "string" ? parseInt(params.id, 10) : Array.isArray(params.id) ? parseInt(params.id[0], 10) : undefined;

  if (!projectId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Project</h1>
          <p className="text-gray-600">Unable to load project information.</p>
        </div>
      </div>
    );
  }

  return <Outline projectId={projectId} />;
}