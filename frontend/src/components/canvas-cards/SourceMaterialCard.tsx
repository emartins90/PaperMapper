import React, { useState, useEffect } from "react";
import Tag from "@/components/Tag";
import { Handle, Position } from "reactflow";
import { FileListDisplay } from "../canvas-add-files/FileListDisplay";
import { LuBookOpen } from "react-icons/lu";
import { Spinner } from "../ui/spinner";

type SourceMaterialCardProps = {
  data: {
    tags: string[] | undefined;
    text: string;
    summary?: string;
    thesisSupport: string;
    source: string;
    credibility: string;
    sourceFunction?: string;
    onOpen?: () => void;
    onSelect?: () => void;
    files?: string[];
    fileEntries?: Array<{ url: string; filename: string; type: string }>;
    onFileClick?: (fileUrl: string, fileType: 'image' | 'pdf' | 'other' | 'audio') => void;
    isDeleting?: boolean;
    isSelected?: boolean;
  };
  showHandles?: boolean;
  width?: string;
};

const handleStyle = {
  width: 10,
  height: 10,
  background: '#fff',
  border: '2px solid var(--source-400)',
  borderRadius: '50%',
};

export default function SourceMaterialCard({ data, showHandles = true, width = 'w-96' }: SourceMaterialCardProps) {
  const onFileClick = data.onFileClick;
  // Ensure tags is always an array
  const tags = Array.isArray(data.tags) ? data.tags : (data.tags ? [data.tags] : []);

  // Get argument type color
  const getArgumentTypeColor = (argumentType: string) => {
    const normalizedType = argumentType.toLowerCase().trim();
    
    switch (normalizedType) {
      case 'thesis-supporting':
        return 'green';
      case 'counter-evidence':
        return 'red';
      case 'neutral to thesis':
        return 'gray';
      default:
        return 'gray';
    }
  };

  return (
    <div 
      className={`rounded-xl border-2 bg-white p-4 shadow-md ${width} relative transition-all duration-200 cursor-pointer
        ${data.isSelected 
          ? 'border-source-400 shadow-lg shadow-source-200/50' 
          : 'border-source-200 hover:border-source-300 hover:shadow-lg'
        }`}
      onClick={data.onSelect}
    >
      {/* Deletion overlay */}
      {data.isDeleting && (
        <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center z-10">
          <div className="flex items-center gap-2 text-gray-600">
            <Spinner size="sm" />
            <span className="text-sm font-medium">Deleting...</span>
          </div>
        </div>
      )}
      
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
        <div className="text-source-700 flex items-center gap-1 min-w-0 flex-1">
          <LuBookOpen className="text-source-400 flex-shrink-0" size={22} />
          <div className="truncate">
            <span className="font-bold">Source Material</span>{data.sourceFunction ? <span className="font-normal"> : {data.sourceFunction}</span> : ''}
          </div>
        </div>
        <button onClick={data.onOpen} aria-label="Open card" className="flex-shrink-0 ml-2">
          <span className="text-source-400 text-xl">↗</span>
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
      
      {/* Only show summary if not empty or '(skipped)' */}
      {data.summary && data.summary.trim() !== '' && data.summary !== '(skipped)' && (
        <div className="text-black mb-4">{data.summary}</div>
      )}
      {/* Only show text if not empty or '(skipped)' and no summary */}
      {!data.summary && data.text && data.text.trim() !== '' && data.text !== '(skipped)' && (
        <div className="text-black mb-4">{data.text}</div>
      )}

      {/* Render uploaded files (images as thumbnails, others as file names) */}
      {Array.isArray((data as any).files) && (data as any).files.length > 0 && (
        <FileListDisplay files={data.files ?? []} fileEntries={data.fileEntries} onFileClick={onFileClick} showFilesLabel={true} cardType="source" />
      )}

      {/* Only show argument type chip if one is selected and not '(skipped)' */}
      {data.thesisSupport && data.thesisSupport.trim() !== '' && data.thesisSupport !== '(skipped)' && (
        <Tag color={getArgumentTypeColor(data.thesisSupport)} className="mb-2 inline-block">
          {data.thesisSupport}
        </Tag>
      )}
      
      <div className="mt-2 text-xs text-gray-700">
        <span className="font-bold">Source:</span> {(data.source && data.source.trim() !== '' && data.source !== '(skipped)') ? data.source : <span className="text-gray-500">No source provided</span>}
        {data.credibility && data.credibility.trim() !== '' && data.credibility !== '(skipped)' && (
          <>
            <br />
            <span className="font-bold">Credibility:</span> {data.credibility}
          </>
        )}
      </div>
    </div>
  );
} 