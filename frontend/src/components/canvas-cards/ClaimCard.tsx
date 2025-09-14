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
    claimFormatted?: string;
    claimType?: string;
    tags?: string[] | string;
    onOpen?: () => void;
    onSelect?: () => void;
    files?: string[];
    fileEntries?: Array<{ url: string; filename: string; type: string }>;
    onFileClick?: (fileUrl: string, fileType: 'image' | 'pdf' | 'other' | 'audio') => void;
    isDeleting?: boolean;
    isSelected?: boolean;
    cardId?: string;
    panelJustOpened?: boolean;
    actionButton?: React.ReactNode;
    // New outline-specific props
    isCondensed?: boolean;
    isDisabled?: boolean;
    isInStructure?: boolean;
  };
  showHandles?: boolean;
  width?: string;
  openCard?: { id: string; type: string } | null;
  showArrow?: boolean;
  showShadow?: boolean;
  showIcon?: boolean; // Add this prop
};

const handleStyle = {
  width: 10,
  height: 10,
  background: '#fff',
  border: '2px solid var(--claim-400)',
  borderRadius: '50%',
};

export default function ClaimCard({ data, showHandles = true, width = 'w-96', openCard, showArrow = true, showShadow = true, showIcon = true }: ClaimCardProps) {
  // Ensure tags is always an array
  const tags = Array.isArray(data.tags) ? data.tags : (data.tags ? [data.tags] : []);

  // New outline-specific logic - default to full view (false) for gather view
  const showCondensed = data.isCondensed ?? false; // Default to full view
  const isDisabled = data.isDisabled ?? false;
  const isInStructure = data.isInStructure ?? false;
  
  // Adjust width and shadow based on context
  const effectiveWidth = isInStructure ? 'w-full' : width;
  const effectiveShadow = isInStructure ? false : showShadow;

  return (
    <div 
      className={`rounded-xl border-2 bg-white ${showCondensed ? 'p-2.75' : 'p-4'} ${effectiveWidth} relative transition-all duration-200 cursor-pointer
        ${effectiveShadow ? 'shadow-md' : ''}
        ${isDisabled ? 'opacity-50 pointer-events-none' : ''}
        ${data.isSelected 
          ? `border-claim-400 ${effectiveShadow ? 'shadow-lg shadow-claim-200/50' : ''}` 
          : `border-claim-300 hover:border-claim-400 ${effectiveShadow ? 'hover:shadow-lg' : ''}`
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
      <div className={`flex items-center justify-between ${showCondensed ? 'mb-0!' : 'mb-2'}`}>
        <div className="text-claim-700 flex items-center gap-1">
          {showIcon && <LuSpeech className="text-claim-400" size={22} />}
          <span className="font-bold">{data.claimType ? data.claimType : "Claim"}</span>
        </div>
        {showArrow && (
          <button onClick={data.onOpen} aria-label="Open card" className="cursor-pointer">
            <span className={`text-xl transition-all duration-200 inline-block ${
              openCard && data.cardId && openCard.id === data.cardId 
                ? `text-claim-600 rotate-45 ${data.panelJustOpened ? '' : 'hover:text-claim-400 hover:rotate-0'}` 
                : `text-claim-400 ${data.panelJustOpened ? '' : 'hover:text-claim-600 hover:rotate-45'}`
            }`}>↗</span>
          </button>
        )}
      </div>
      {/* Only show tags section if there are tags and not '(skipped)' - and only in full view */}
      {!showCondensed && tags.length > 0 && tags[0] !== '(skipped)' && (
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag: string) => (
            tag && tag !== '(skipped)' && <Tag key={tag} color="primary">{tag}</Tag>
          ))}
        </div>
      )}
      <div 
        className={`text-black mb-4 break-words rich-text-display ${showCondensed ? 'line-clamp-3 mb-1!' : 'mb-4'}`}
        style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
        dangerouslySetInnerHTML={{ __html: data.claimFormatted || data.claim }}
      />
      
      {/* Render uploaded files (images as thumbnails, others as file names) - only in full view */}
      {!showCondensed && data.files && data.files.length > 0 && (
        <FileListDisplay files={data.files} fileEntries={data.fileEntries} onFileClick={data.onFileClick} showFilesLabel={true} cardType="claim" />
      )}
      
      {/* Action button - only in full view */}
      {!showCondensed && data.actionButton && (
        <div className="mt-1 flex justify-end">
          {data.actionButton}
        </div>
      )}
    </div>
  );
} 