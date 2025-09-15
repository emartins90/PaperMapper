"use client";

import React, { useState, useRef, useEffect } from "react";
import { LuGripVertical, LuTrash2, LuPlus } from "react-icons/lu";
import { Button } from "../ui/button";
import SourceMaterialCard from "../canvas-cards/SourceMaterialCard";
import QuestionCard from "../canvas-cards/QuestionCard";
import InsightCard from "../canvas-cards/InsightCard";
import ThoughtCard from "../canvas-cards/ThoughtCard";
import ClaimCard from "../canvas-cards/ClaimCard";
import { useDraggable } from '@dnd-kit/core';
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  CSS,
} from '@dnd-kit/utilities';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  useDroppable,
  DragOverlay,
  CollisionDetection,
  rectIntersection,
} from '@dnd-kit/core';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Draggable card wrapper for cards in structure
function DraggableStructureCard({ 
  id, 
  children, 
  cardData, 
  isActive 
}: { 
  id: string; 
  children: React.ReactNode; 
  cardData: any; 
  isActive: boolean; 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id,
    data: cardData
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
    >
      {children}
    </div>
  );
}

// Subtle drop line component for subsections
function SubsectionDropLine({ id }: { id: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div 
      ref={setNodeRef} 
      className={`h-0.5 mx-4 my-1 transition-colors ${
        isOver ? 'bg-purple-400' : 'bg-transparent'
      }`} 
    />
  );
}

// Card drop line component
function CardDropLine({ id }: { id: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div 
      ref={setNodeRef} 
      className={`h-0.5 mx-2 my-1 transition-colors ${
        isOver ? 'bg-purple-400' : 'bg-transparent'
      }`} 
    />
  );
}

interface OutlineSectionProps {
  section: {
    id: number;
    title: string;
    order_index: number;
    parent_section_id?: number;
    section_number: string;
    subsections: any[];
    card_placements: any[];
  };
  onUpdate: (sectionId: number, updates: any) => void;
  onDelete: (sectionId: number) => void;
  onAddSubsection: (parentId: number) => void;
  onAddSection?: (insertAfterIndex?: number) => void;
  isSubsection?: boolean;
  isDraggable?: boolean;
  isDragging?: boolean;
  activeCardId?: string | null;
  isCondensed?: boolean;
  activeSubsectionId?: string | null;
}

export default function OutlineSection({ 
  section, 
  onUpdate, 
  onDelete, 
  onAddSubsection,
  onAddSection,
  isSubsection = false,
  isDraggable = false,
  isDragging = false,
  activeCardId,
  isCondensed = false,
  activeSubsectionId
}: OutlineSectionProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(section.title);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Subsection state
  const [subsections, setSubsections] = useState(section.subsections);

  // Update subsections when section prop changes
  useEffect(() => {
    setSubsections(section.subsections);
  }, [section.subsections]);

  // Custom collision detection for subsections - only detect drop lines
  const subsectionCollisionDetection: CollisionDetection = (args) => {
    const activeIdStr = args.active?.id?.toString() || '';
    
    // If dragging a subsection, only detect subsection drop zones
    if (activeIdStr.includes('subsection') || subsections.some(s => s.id.toString() === activeIdStr)) {
      const dropLineCollisions = rectIntersection({
        ...args,
        droppableContainers: args.droppableContainers.filter(container => 
          container.id.toString().startsWith('subsection-drop-')
        )
      });
      return dropLineCollisions.length > 0 ? dropLineCollisions : [];
    }
    
    // If dragging a card, detect card drop zones (pass through to parent context)
    if (activeIdStr.startsWith('card-') || activeIdStr.startsWith('structure-card-')) {
      // Don't handle card drops in this nested context - let parent handle them
      return [];
    }
    
    return [];
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ 
    id: section.id,
    disabled: !isDraggable,
    animateLayoutChanges: () => false, // Disable all layout animations
  });

  const style = {
    transform: isDragging ? 'none' : 'none', // Always disable transform to prevent movement
    transition: isDragging ? 'none' : transition,
  };

  // Helper function to convert number to Roman numeral
  const _intToRoman = (num: number): string => {
    const val = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    const rom = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
    let result = '';
    for (let i = 0; i < val.length && num > 0; i++) {
      while (num >= val[i]) {
        result += rom[i];
        num -= val[i];
      }
    }
    return result;
  };

  // Helper function to convert number to letter
  const _intToLetter = (num: number): string => {
    return String.fromCharCode(64 + num); // A=65, so 64+1=A
  };

  // Subsection dragging removed - handled by parent context

  // Focus input when editing starts
  useEffect(() => {
    if (editingTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTitle]);

  const handleEditTitle = () => {
    setEditingTitle(true);
    setTitleValue(section.title);
  };

  const handleSaveTitle = async () => {
    if (titleValue.trim() === section.title) {
      setEditingTitle(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/outline_sections/${section.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: titleValue.trim() })
      });

      if (!res.ok) throw new Error("Failed to update section");
      
      onUpdate(section.id, { title: titleValue.trim() });
      setEditingTitle(false);
    } catch (error) {
      console.error("Error updating section:", error);
      // Revert to original title on error
      setTitleValue(section.title);
      setEditingTitle(false);
    }
  };

  const handleCancelEdit = () => {
    setTitleValue(section.title);
    setEditingTitle(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const handleBlur = () => {
    handleSaveTitle();
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this section?")) {
      onDelete(section.id);
    }
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`${isSubsection ? 'ml-6 border-l-2 border-gray-100 pl-4 py-2' : 'border border-gray-200 rounded-lg p-4 relative'} ${isDragging ? 'opacity-40' : ''}`}
    >
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
        >
          <LuGripVertical className="w-4 h-4 text-gray-400" />
        </div>
        <span className="font-medium text-gray-700 flex-1">
          {section.section_number}. 
          {editingTitle ? (
            <input
              ref={inputRef}
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="ml-1 bg-transparent border-none outline-none font-medium text-gray-700 min-w-0 flex-1"
              style={{ 
                width: `${Math.max(titleValue.length, 10)}ch`,
                minWidth: '100px'
              }}
            />
          ) : (
            <span 
              onClick={handleEditTitle}
              className="ml-1 cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded transition-colors"
            >
              {section.title}
            </span>
          )}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          className="text-gray-500 hover:text-gray-700 ml-auto"
        >
          <LuTrash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Cards in this section */}
      <div className={`mt-4 ${isSubsection ? 'ml-6' : ''}`}>
        {section.card_placements.map((placement, index) => (
          <React.Fragment key={placement.id}>
            {/* Card drop zone above each card - only visible when dragging */}
            {activeCardId && (
              <CardDropLine id={`card-drop-${section.id}-${index}`} />
            )}
            
            <div className="mb-3">
              <DraggableStructureCard
                id={`structure-card-${placement.card_id}`}
                cardData={placement.card}
                isActive={activeCardId === `structure-card-${placement.card_id}`}
              >
              {(() => {
                if (!placement.card) {
                  return (
                    <div className="bg-gray-50 rounded p-3 text-sm border w-full mb-2">
                      <div className="text-gray-500 italic">
                        Card {placement.card_id} - Data not found
                      </div>
                    </div>
                  );
                }

                // Prepare card data like OutlineCardList does
                let cardData: any = {
                  cardId: placement.card_id,
                  isCondensed: isCondensed, // Use the prop from parent
                  isDisabled: false,
                  isInStructure: true,
                  onOpen: () => console.log("Opening card:", placement.card_id, placement.card_type),
                  onSelect: () => console.log("Selecting card:", placement.card_id, placement.card_type),
                  onFileClick: undefined,
                  tags: [],
                  files: [],
                  fileEntries: [],
                };

                // Create fileEntries with original filenames (same logic as OutlineCardList)
                const fileUrls = placement.card.files ? placement.card.files.split(',').filter((url: string) => url.trim()) : [];
                const fileFilenames = placement.card.file_filenames ? placement.card.file_filenames.split(',').filter((name: string) => name.trim()) : [];
                
                const fileEntries = fileUrls.map((url: string, index: number) => ({
                  url,
                  filename: fileFilenames[index] || "file",
                  type: ""
                }));

                // Update cardData with proper files and fileEntries
                cardData.files = fileUrls;
                cardData.fileEntries = fileEntries;

                // Map card data based on card type (same logic as OutlineCardList)
                const cardType = placement.card_type || placement.card?.type;
                
                if (cardType === 'source') {
                  cardData = {
                    ...cardData,
                    text: placement.card.content || '',
                    contentFormatted: placement.card.content_formatted || placement.card.content || '',
                    summary: placement.card.summary || '',
                    summaryFormatted: placement.card.summary_formatted || placement.card.summary || '',
                    thesisSupport: '',
                    source: placement.card.citation || '',
                    credibility: '',
                    sourceFunction: '',
                  };
                } else if (cardType === 'question') {
                  cardData = {
                    ...cardData,
                    question: placement.card.question || '',
                    questionFormatted: placement.card.question_text_formatted || placement.card.question || '',
                    category: placement.card.category || '',
                    status: 'in progress',
                    priority: 'medium',
                  };
                } else if (cardType === 'insight') {
                  cardData = {
                    ...cardData,
                    insight: placement.card.insight || '',
                    insightFormatted: placement.card.insight_text_formatted || placement.card.insight || '',
                  };
                } else if (cardType === 'thought') {
                  cardData = {
                    ...cardData,
                    thought: placement.card.thought || '',
                    thoughtFormatted: placement.card.thought_text_formatted || placement.card.thought || '',
                  };
                } else if (cardType === 'claim') {
                  cardData = {
                    ...cardData,
                    claim: placement.card.claim || '',
                    claimFormatted: placement.card.claim_text_formatted || placement.card.claim || '',
                  };
                }

                const cardProps = {
                  data: cardData,
                  showHandles: false,
                  width: "w-full",
                  showArrow: false,
                  showShadow: false,
                  showIcon: false,
                };
                
                // Render the appropriate card type
                if (cardType === 'source') {
                  return <SourceMaterialCard {...cardProps} />;
                }
                if (cardType === 'question') {
                  return <QuestionCard {...cardProps} />;
                }
                if (cardType === 'insight') {
                  return <InsightCard {...cardProps} />;
                }
                if (cardType === 'thought') {
                  return <ThoughtCard {...cardProps} />;
                }
                if (cardType === 'claim') {
                  return <ClaimCard {...cardProps} />;
                }

                // Fallback - this shouldn't be reached
                console.log('FALLBACK: cardType =', cardType, 'placement.card_type =', placement.card_type, 'placement.card?.type =', placement.card?.type);
                return (
                  <div className="bg-gray-50 rounded p-3 text-sm border w-full mb-2">
                    <div className="text-red-500 font-bold">DEBUG: Fallback reached</div>
                    <div className="text-xs text-gray-500">Card type: {placement.card_type}</div>
                    <div className="text-gray-700">
                      {placement.card.title || placement.card.question || placement.card.insight || placement.card.thought || placement.card.claim || placement.card.content || 'No content'}
                    </div>
                  </div>
                );
              })()}
              </DraggableStructureCard>
            </div>
          </React.Fragment>
        ))}
        
        {/* Card drop zone at the end - always show when dragging */}
        {activeCardId && (
          <CardDropLine id={`card-drop-${section.id}-${section.card_placements.length}`} />
        )}
      </div>

            {/* Subsections - handled by parent DndContext */}
      {subsections.length > 0 && (
        <div className="mt-2">
          {subsections.map((subsection, index) => {
            // Find the index of the currently dragged subsection
            const draggedSubsectionIndex = subsections.findIndex(sub => sub.id.toString() === activeSubsectionId);
            
            return (
              <React.Fragment key={subsection.id}>
                {/* Subsection drop line - only visible when dragging a subsection and not at original position */}
                {activeSubsectionId && 
                 draggedSubsectionIndex !== -1 && 
                 index !== draggedSubsectionIndex && 
                 index !== draggedSubsectionIndex + 1 && (
                  <SubsectionDropLine id={`subsection-drop-${index}`} />
                )}
                
                <OutlineSection
                  section={subsection}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onAddSubsection={onAddSubsection}
                  isSubsection={true}
                  isDraggable={true}
                  isDragging={activeSubsectionId === subsection.id.toString()}
                  activeCardId={activeCardId}
                  isCondensed={isCondensed}
                />
              </React.Fragment>
            );
          })}
          
          {/* Drop line at the end for subsections - only if not dropping after the last item */}
          {activeSubsectionId && (() => {
            const draggedSubsectionIndex = subsections.findIndex(sub => sub.id.toString() === activeSubsectionId);
            return draggedSubsectionIndex !== -1 && subsections.length !== draggedSubsectionIndex + 1 && (
              <SubsectionDropLine id={`subsection-drop-${subsections.length}`} />
            );
          })()}
        </div>
      )}

      {/* Add Subsection Button - moved to bottom */}
      {!isSubsection && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAddSubsection(section.id)}
          className="text-gray-500 hover:text-gray-700 mt-2"
        >
          <LuPlus className="w-4 h-4 mr-1" />
          Add subsection
        </Button>
      )}

      {/* Floating Add Section Button - only for main sections */}
      {!isSubsection && onAddSection && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAddSection(section.order_index)}
          className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-8 h-8 rounded-full p-0 border-2 bg-white hover:bg-gray-50 shadow-md"
        >
          <LuPlus className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
