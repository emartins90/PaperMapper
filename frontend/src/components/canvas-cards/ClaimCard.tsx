import React from "react";
import Tag from "@/components/Tag";
import { Handle, Position } from "reactflow";
import { FileListDisplay } from "../canvas-add-files/FileListDisplay";
import { LuSpeech } from "react-icons/lu";
import { Spinner } from "../ui/spinner";

type ClaimType = "Hypothesis" | "Thesis" | "Conclusion" | "Proposal";

type ClaimCardProps = {
  data: {
    claim: string;
    claimType?: string;
    tags?: string[] | string;
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
  border: '2px solid var(--claim-400)',
  borderRadius: '50%',
};

export default function ClaimCard({ data, showHandles = true, width = 'w-96' }: ClaimCardProps) {
  // Ensure tags is always an array
  const tags = Array.isArray(data.tags) ? data.tags : (data.tags ? [data.tags] : []);

  const onFileClick = data.onFileClick;
  return (
    <div 
      className={`rounded-xl border-2 bg-white p-4 shadow-md ${width} relative transition-all duration-200 cursor-pointer
        ${data.isSelected 
          ? 'border-claim-400 shadow-lg shadow-claim-200/50' 
          : 'border-claim-300 hover:border-claim-400 hover:shadow-lg'
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
        <div className="text-claim-700 flex items-center gap-1">
          <LuSpeech className="text-claim-400" size={22} />
          <span className="font-bold">{data.claimType ? data.claimType : "Claim"}</span>
        </div>
        <button onClick={data.onOpen} aria-label="Open card">
          <span className="text-claim-400 text-xl">↗</span>
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
      <div className="text-black mb-4">{data.claim}</div>
      
      {/* Render uploaded files (images as thumbnails, others as file names) */}
      {data.files && data.files.length > 0 && (
        <FileListDisplay files={data.files} fileEntries={data.fileEntries} onFileClick={data.onFileClick} showFilesLabel={true} cardType="claim" />
      )}
    </div>
  );
} 