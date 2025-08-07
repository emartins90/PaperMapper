import React from "react";
import Tag from "@/components/Tag";
import { Handle, Position } from "reactflow";
import { FileListDisplay } from "../canvas-add-files/FileListDisplay";
import { LuMessageCircle } from "react-icons/lu";
import { Spinner } from "../ui/spinner";

type ThoughtCardProps = {
  data: {
    thought: string;
    thoughtFormatted?: string;
    tags?: string[] | string;
    onOpen?: () => void;
    onSelect?: () => void;
    files?: string[];
    fileEntries?: Array<{ url: string; filename: string; type: string }>;
    onFileClick?: (fileUrl: string, fileType: 'image' | 'pdf' | 'other' | 'audio') => void;
    isDeleting?: boolean;
    isSelected?: boolean;
    cardId?: string; // Add cardId to identify this card
    panelJustOpened?: boolean; // Add panelJustOpened to prevent hover flicker
    actionButton?: React.ReactNode; // Add actionButton prop
  };
  showHandles?: boolean;
  width?: string;
  openCard?: { id: string; type: string } | null; // Add openCard prop
  showArrow?: boolean; // Add showArrow prop to control arrow visibility
  showShadow?: boolean; // Add showShadow prop to control card shadow and hover effects
};

const handleStyle = {
  width: 10,
  height: 10,
  background: '#fff',
  border: '2px solid var(--thought-400)',
  borderRadius: '50%',
};

export default function ThoughtCard({ data, showHandles = true, width = 'w-96', openCard, showArrow = true, showShadow = true }: ThoughtCardProps) {
  // Ensure tags is always an array
  const tags = Array.isArray(data.tags) ? data.tags : (data.tags ? [data.tags] : []);

  const onFileClick = data.onFileClick;
  return (
    <div 
      className={`rounded-xl border-2 bg-white p-4 ${width} relative transition-all duration-200 cursor-pointer
        ${showShadow ? 'shadow-md' : ''}
        ${data.isSelected 
          ? `border-thought-400 ${showShadow ? 'shadow-lg shadow-thought-200/50' : ''}` 
          : `border-thought-300 hover:border-thought-400 ${showShadow ? 'hover:shadow-lg' : ''}`
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
        <div className="font-bold text-thought-700 flex items-center gap-1">
          <LuMessageCircle className="text-thought-400" size={22} />
          Thought
        </div>
        {showArrow && (
          <button onClick={data.onOpen} aria-label="Open card" className="cursor-pointer">
            <span className={`text-xl transition-all duration-200 inline-block ${
              openCard && data.cardId && openCard.id === data.cardId 
                ? `text-thought-600 rotate-45 ${data.panelJustOpened ? '' : 'hover:text-thought-400 hover:rotate-0'}` 
                : `text-thought-400 ${data.panelJustOpened ? '' : 'hover:text-thought-600 hover:rotate-45'}`
            }`}>↗</span>
          </button>
        )}
      </div>
      {/* Only show tags section if there are tags and not '(skipped)' */}
      {tags.length > 0 && tags[0] !== '(skipped)' && (
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag: string) => (
            tag && tag !== '(skipped)' && <Tag key={tag} color="primary">{tag}</Tag>
          ))}
        </div>
      )}
      <div 
        className="rich-text-display text-black mb-4 break-words" 
        style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
        dangerouslySetInnerHTML={{ __html: data.thoughtFormatted || data.thought }}
      />
      
      {/* Render uploaded files (images as thumbnails, others as file names) */}
      {data.files && data.files.length > 0 && (
        <FileListDisplay files={data.files} fileEntries={data.fileEntries} onFileClick={data.onFileClick} showFilesLabel={true} cardType="thought" />
      )}
      
      {/* Action button */}
      {data.actionButton && (
        <div className="mt-1 flex justify-end">
          {data.actionButton}
        </div>
      )}
    </div>
  );
} 