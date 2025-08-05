import React from "react";
import Tag from "@/components/Tag";
import { Handle, Position } from "reactflow";
import { FileListDisplay } from "../canvas-add-files/FileListDisplay";
import { LuCircleHelp } from "react-icons/lu";
import { Spinner } from "../ui/spinner";

type QuestionCardProps = {
  data: {
    question: string;
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

export default function QuestionCard({ data, showHandles = true, width = 'w-96', openCard, showArrow = true, showShadow = true }: QuestionCardProps) {
  // Ensure tags is always an array
  const tags = Array.isArray(data.tags) ? data.tags : (data.tags ? [data.tags] : []);

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
      className={`rounded-xl border-2 bg-white p-4 ${width} relative transition-all duration-200 cursor-pointer
        ${showShadow ? 'shadow-md' : ''}
        ${data.isSelected 
          ? `border-question-400 ${showShadow ? 'shadow-lg shadow-question-200/50' : ''}` 
          : `${cardBorderClass} hover:border-question-300 ${showShadow ? 'hover:shadow-lg' : ''}`
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
      <div className="flex items-center justify-between mb-2">
        <div className={`${titleColorClass} flex-1 min-w-0 flex items-center gap-1`}>
          {data.priority && getPriorityIndicator(data.priority) && (
            <span className={`font-bold text-lg ${getPriorityIndicator(data.priority)?.color}`}>
              {getPriorityIndicator(data.priority)?.text}
            </span>
          )}
          <LuCircleHelp className="text-question-400" size={22} />
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
      {/* Only show tags section if there are tags and not '(skipped)' */}
      {tags.length > 0 && tags[0] !== '(skipped)' && (
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag: string) => (
            tag && tag !== '(skipped)' && <Tag key={tag} color="primary">{tag}</Tag>
          ))}
        </div>
      )}
      <div className="text-black mb-4 break-words" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{data.question}</div>
      
      {/* Render uploaded files (images as thumbnails, others as file names) */}
      {data.files && data.files.length > 0 && (
        <FileListDisplay files={data.files} fileEntries={data.fileEntries} onFileClick={data.onFileClick} showFilesLabel={true} cardType="question" />
      )}
      
      <div className="flex flex-wrap gap-2 mt-4">
        {data.status && (
          <div className="flex items-center gap-1 text-xs text-gray-700 mt-2">
            <span className="font-bold">Status:</span>
            <Tag color={getStatusColor(data.status)}>{capitalizeStatus(data.status)}</Tag>
          </div>
        )}
      </div>
      
      {/* Action button */}
      {data.actionButton && (
        <div className="mt-1 flex justify-end">
          {data.actionButton}
        </div>
      )}
    </div>
  );
}
