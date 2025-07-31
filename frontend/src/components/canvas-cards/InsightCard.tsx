import React from "react";
import Tag from "@/components/Tag";
import { Handle, Position } from "reactflow";
import { FileListDisplay } from "../canvas-add-files/FileListDisplay";
import { LuLightbulb } from "react-icons/lu";

type InsightCardProps = {
  data: {
    insight: string;
    insightType?: string;
    sourcesLinked?: string;
    tags?: string[] | string;
    onOpen?: () => void;
    files?: string[];
    fileEntries?: Array<{ url: string; filename: string; type: string }>;
    onFileClick?: (fileUrl: string, fileType: 'image' | 'pdf' | 'other' | 'audio') => void;
  };
  showHandles?: boolean;
  width?: string;
};

const handleStyle = {
  width: 10,
  height: 10,
  background: '#fff',
  border: '2px solid var(--insight-400)',
  borderRadius: '50%',
};

export default function InsightCard({ data, showHandles = true, width = 'w-96' }: InsightCardProps) {
  // Ensure tags is always an array
  const tags = Array.isArray(data.tags) ? data.tags : (data.tags ? [data.tags] : []);

  const onFileClick = data.onFileClick;
  return (
    <div className={`rounded-xl border-2 border-insight-300 bg-white p-4 shadow-md ${width} relative`}>
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
        <div className="text-insight-700 truncate-block flex items-center gap-1">
          <LuLightbulb className="text-insight-400" size={22} />
          <span className="font-bold">Insight</span>{data.insightType ? <span className="font-normal"> : {data.insightType}</span> : ''}
        </div>
        <button onClick={data.onOpen} aria-label="Open card">
          <span className="text-insight-400 text-xl">↗</span>
        </button>
      </div>
      {/* Only show tags section if there are tags and not '(skipped)' */}
      {tags.length > 0 && tags[0] !== '(skipped)' && (
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag: string) => (
            tag && tag !== '(skipped)' && <Tag key={tag} color="primary">{tag}</Tag>
          ))}
        </div>
      )}
      <div className="text-black mb-4">{data.insight}</div>
      
      {/* Render uploaded files (images as thumbnails, others as file names) */}
      {data.files && data.files.length > 0 && (
        <FileListDisplay files={data.files} fileEntries={data.fileEntries} onFileClick={data.onFileClick} showFilesLabel={true} cardType="insight" />
      )}
    </div>
  );
} 