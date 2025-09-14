import React from "react";
import Tag from "@/components/Tag";
import { Handle, Position } from "reactflow";
import { FileListDisplay } from "../canvas-add-files/FileListDisplay";
import { LuCircleHelp } from "react-icons/lu";
import { Spinner } from "../ui/spinner";

type QuestionCardProps = {
  data: {
    question: string;
    questionFormatted?: string;
    category?: string;
    status: string;
    priority?: string;
    statusColor?: string;
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
  border: '2px solid var(--question-400)',
  borderRadius: '50%',
};

const grayHandleStyle = {
  width: 10,
  height: 10,
  background: '#fff',
  border: '2px solid #9ca3af', // gray-400
  borderRadius: '50%',
};

export default function QuestionCard({ data, showHandles = true, width = 'w-96', openCard, showArrow = true, showShadow = true, showIcon = true }: QuestionCardProps) {
  // Ensure tags is always an array
  const tags = Array.isArray(data.tags) ? data.tags : (data.tags ? [data.tags] : []);

  // New outline-specific logic - default to full view (false) for gather view
  const showCondensed = data.isCondensed ?? false; // Default to full view
  const isDisabled = data.isDisabled ?? false;
  const isInStructure = data.isInStructure ?? false;
  
  // Adjust width and shadow based on context
  const effectiveWidth = isInStructure ? 'w-full' : width;
  const effectiveShadow = isInStructure ? false : showShadow;

  // Helper function to get status color
  const getStatusColor = (status: string) => {
    const normalizedStatus = status.toLowerCase().trim();
    switch (normalizedStatus) {
      case 'unexplored':
        return 'red';
      case 'needs sources':
        return 'orange';
      case 'in progress':
        return 'blue';
      case 'answered':
        return 'green';
      case 'not relevant':
        return 'gray';
      default:
        return 'gray';
    }
  };

  // Helper function to capitalize status
  const capitalizeStatus = (status: string) => {
    return status.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  // Helper function to get priority exclamation points and color
  const getPriorityIndicator = (priority: string) => {
    if (!priority || priority.trim() === '') {
      return null; // No priority selected
    }
    
    const normalizedPriority = priority.toLowerCase().trim();
    switch (normalizedPriority) {
      case 'high':
        return { text: '!!!', color: 'text-error-500' };
      case 'medium':
        return { text: '!!', color: 'text-warning-500' };
      case 'low':
        return { text: '!', color: 'text-source-500' };
      default:
        return null; // Unknown priority, treat as no priority
    }
  };

  // Check if card should be grayed out
  const isNotRelevant = data.status?.toLowerCase().trim() === 'not relevant';
  
  // Determine styles based on relevance
  const cardBorderClass = isNotRelevant ? 'border-gray-200' : 'border-question-200';
  const titleColorClass = isNotRelevant ? 'text-gray-700' : 'text-question-700';
  const arrowColorClass = isNotRelevant ? 'text-gray-400' : 'text-question-400';
  const handleStyles = isNotRelevant ? grayHandleStyle : handleStyle;

  return (
    <div 
      className={`rounded-xl border-2 bg-white ${showCondensed ? 'p-2.75' : 'p-4'} ${effectiveWidth} relative transition-all duration-200 cursor-pointer
        ${effectiveShadow ? 'shadow-md' : ''}
        ${isDisabled ? 'opacity-50 pointer-events-none' : ''}
        ${data.isSelected 
          ? `border-question-400 ${effectiveShadow ? 'shadow-lg shadow-question-200/50' : ''}` 
          : `${cardBorderClass} hover:border-question-300 ${effectiveShadow ? 'hover:shadow-lg' : ''}`
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
          <Handle type="source" position={Position.Top} id="top" style={{ ...handleStyles, top: -6 }} />
          <Handle type="source" position={Position.Bottom} id="bottom" style={{ ...handleStyles, bottom: -6 }} />
          <Handle type="source" position={Position.Left} id="left" style={{ ...handleStyles, left: -6 }} />
          <Handle type="source" position={Position.Right} id="right" style={{ ...handleStyles, right: -6 }} />
        </>
      )}
      <div className={`flex items-center justify-between ${showCondensed ? 'mb-0!' : 'mb-2'}`}>
        <div className={`${titleColorClass} flex-1 min-w-0 flex items-center gap-1 ${showCondensed ? 'mb-1' : 'mb-2'}`}>
          {/* Priority indicator - only show in full view */}
          {!showCondensed && data.priority && getPriorityIndicator(data.priority) && (
            <span className={`font-bold text-lg ${getPriorityIndicator(data.priority)?.color}`}>
              {getPriorityIndicator(data.priority)?.text}
            </span>
          )}
          {showIcon && <LuCircleHelp className="text-question-400" size={22} />}
          <div className="truncate block">
            <span className="font-bold">Question</span>{data.category ? <span className="font-normal"> : {data.category}</span> : ''}
          </div>
        </div>
        {showArrow && (
          <button onClick={data.onOpen} aria-label="Open card" className="flex-shrink-0 ml-2 cursor-pointer">
            <span className={`text-xl transition-all duration-200 inline-block ${
              openCard && data.cardId && openCard.id === data.cardId 
                ? `text-question-600 rotate-45 ${data.panelJustOpened ? '' : 'hover:text-question-400 hover:rotate-0'}` 
                : `${arrowColorClass} ${data.panelJustOpened ? '' : 'hover:text-question-600 hover:rotate-45'}`
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
        className={`text-black break-words rich-text-display ${showCondensed ? 'line-clamp-3 mb-1' : 'mb-4'}`}
        style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
        dangerouslySetInnerHTML={{ __html: data.questionFormatted || data.question }}
      />
      
      {/* Render uploaded files (images as thumbnails, others as file names) - only in full view */}
      {!showCondensed && data.files && data.files.length > 0 && (
        <FileListDisplay files={data.files} fileEntries={data.fileEntries} onFileClick={data.onFileClick} showFilesLabel={true} cardType="question" />
      )}
      
      {/* Status - only show in full view */}
      {!showCondensed && data.status && (
        <div className="flex flex-wrap gap-2 mt-4">
          <div className="flex items-center gap-1 text-xs text-gray-700 mt-2">
            <span className="font-bold">Status:</span>
            <Tag color={getStatusColor(data.status)}>{capitalizeStatus(data.status)}</Tag>
          </div>
        </div>
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
