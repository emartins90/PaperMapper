"use client";

import { ReactFlowProvider } from "reactflow";
import CanvasInner from "../../../components/Canvas";
import { useParams } from "next/navigation";

export default function ProjectPage() {
  const params = useParams();
  const projectId = typeof params.id === "string" ? parseInt(params.id, 10) : Array.isArray(params.id) ? parseInt(params.id[0], 10) : undefined;
  
  return (
    <ReactFlowProvider>
      <CanvasInner projectId={projectId} />
    </ReactFlowProvider>
  );
} 