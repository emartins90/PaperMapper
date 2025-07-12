import React from "react";
import Tag from "@/components/Tag";
import { Handle, Position } from "reactflow";
import { FileListDisplay } from "../canvas-add-files/FileListDisplay";

type QuestionCardProps = {
  data: {
    question: string;
    category?: string;
    status: string;
    priority?: string;
    statusColor?: string;
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

export default function QuestionCard({ data, showHandles = true, width = 'w-96' }: QuestionCardProps) {
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
    <div className={`rounded-xl border-2 ${cardBorderClass} bg-white p-4 shadow-md ${width} relative`}>
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
        <div className={`font-bold ${titleColorClass} flex-1 min-w-0 flex items-center gap-2`}>
          {data.priority && getPriorityIndicator(data.priority) && (
            <span className={`font-bold text-lg ${getPriorityIndicator(data.priority)?.color}`}>
              {getPriorityIndicator(data.priority)?.text}
            </span>
          )}
          <span className="truncate block">
            Question{data.category ? ` : ${data.category}` : ''}
          </span>
        </div>
        <button onClick={data.onOpen} aria-label="Open card" className="flex-shrink-0 ml-2">
          <span className={`text-xl ${arrowColorClass}`}>↗</span>
        </button>
      </div>
      <div className="text-black mb-4">{data.question}</div>
      
      {/* Render uploaded files (images as thumbnails, others as file names) */}
      {data.files && data.files.length > 0 && (
        <FileListDisplay files={data.files} onFileClick={data.onFileClick} showFilesLabel={true} />
      )}
      
      <div className="flex flex-wrap gap-2 mt-4">
        {data.status && (
          <div className="flex items-center gap-1 text-xs text-gray-700 mt-2">
            <span className="font-bold">Status:</span>
            <Tag color={getStatusColor(data.status)}>{capitalizeStatus(data.status)}</Tag>
          </div>
        )}

      </div>
    </div>
  );}
