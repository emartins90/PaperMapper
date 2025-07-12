import React from "react";
import Tag from "@/components/Tag";
import { Handle, Position } from "reactflow";
import { FileListDisplay } from "./FileListDisplay";

type InsightCardProps = {
  data: {
    insight: string;
    sourcesLinked: string;
    onOpen?: () => void;
    files?: string[];
    onFileClick?: (fileUrl: string, fileType: 'image' | 'pdf' | 'other' | 'audio') => void;
  };
  showHandles?: boolean;
  width?: string;
};

const handleStyle = {
  width: 10,
  height: 10,
  background: '#fff',
  border: '2px solid #a78bfa', // purple-400
  borderRadius: '50%',
};

export default function InsightCard({ data, showHandles = true, width = 'w-96' }: InsightCardProps) {
  return (
    <div className={`rounded-xl border-2 border-purple-300 bg-white p-4 shadow-md ${width} relative`}>
      {/* Source handles on all four sides */}
      {showHandles && (
        <>
          <Handle type="source" position={Position.Top} id="top" style={{ ...handleStyle, top: -6 }} />
          <Handle type="source" position={Position.Bottom} id="bottom" style={{ ...handleStyle, bottom: -6 }} />
          <Handle type="source" position={Position.Left} id="left" style={{ ...handleStyle, left: -6 }} />
          <Handle type="source" position={Position.Right} id="right" style={{ ...handleStyle, right: -6 }} />
        </>
      )}
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-purple-700">Insight: Pattern Noticed</div>
        <button onClick={data.onOpen} aria-label="Open card">
          <span className="text-purple-400 text-xl">↗</span>
        </button>
      </div>
      <div className="text-black mb-4">{data.insight}</div>
      
      {/* Render uploaded files (images as thumbnails, others as file names) */}
      {data.files && data.files.length > 0 && (
        <FileListDisplay files={data.files} onFileClick={data.onFileClick} showFilesLabel={true} />
      )}
      
      <Tag color="gray">{data.sourcesLinked}</Tag>
    </div>
  );
} 