"use client";

import React, { useState, useEffect } from "react";
import OutlineCardList from "./OutlineCardList";
import OutlineStructure from "./OutlineStructure";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  CollisionDetection,
  rectIntersection,
  useDroppable,
} from '@dnd-kit/core';
import { 
  sortableKeyboardCoordinates,
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { LuGripVertical } from "react-icons/lu";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Drop zone component for sections (preserving exact styling)
function DropZone({ id }: { id: string }) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div ref={setNodeRef} className="mb-2">
      <div className={`border-2 border-dashed rounded-lg p-4 text-center font-medium h-16 flex items-center justify-center transition-colors ${
        isOver 
          ? 'border-purple-400 bg-purple-50 text-purple-600' 
          : 'border-primary-500 bg-transparent text-primary-500'
      }`}>
        Drop section here
      </div>
    </div>
  );
}

interface OutlineProps {
  projectId: number;
}

// Helper function to convert number to Roman numeral (preserving exact logic)
const _intToRoman = (num: number): string => {
  const val = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const rom = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let result = '';
  for (let i = 0; i < val.length && i < val.length && num > 0; i++) {
    while (num >= val[i]) {
      result += rom[i];
      num -= val[i];
    }
  }
  return result;
};

export default function Outline({ projectId }: OutlineProps) {
  const [isCondensedView, setIsCondensedView] = useState(true);
  
  // Card drag state
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [activeCardData, setActiveCardData] = useState<any>(null);
  
  // Section drag state (moved from OutlineStructure)
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [activeSectionIndex, setActiveSectionIndex] = useState<number | null>(null);
  const [sectionDropZones, setSectionDropZones] = useState<number[]>([]);
  
  // Subsection drag state
  const [activeSubsectionId, setActiveSubsectionId] = useState<string | null>(null);
  const [activeSubsectionData, setActiveSubsectionData] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load sections (moved from OutlineStructure)
  useEffect(() => {
    const loadSections = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/outline_sections/?project_id=${projectId}`, {
          credentials: "include"
        });
        if (response.ok) {
          const data = await response.json();
          setSections(data);
        }
      } catch (error) {
        console.error("Error loading outline sections:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSections();
  }, [projectId]);

  // Smart collision detection for different drag types
  const smartCollisionDetection: CollisionDetection = (args) => {
    const activeIdStr = args.active?.id?.toString() || '';
    
    // Section dragging - only detect section drop zones
    if (activeSectionId && !activeIdStr.startsWith('card-') && !activeIdStr.includes('subsection-drop-')) {
      const sectionDropCollisions = rectIntersection({
        ...args,
        droppableContainers: args.droppableContainers.filter(container => 
          container.id.toString().startsWith('dropzone-')
        )
      });
      return sectionDropCollisions;
    }

    // Subsection dragging - only detect subsection drop zones
    if (activeSubsectionId) {
      const subsectionDropCollisions = rectIntersection({
        ...args,
        droppableContainers: args.droppableContainers.filter(container => 
          container.id.toString().startsWith('subsection-drop-')
        )
      });
      return subsectionDropCollisions;
    }

    // Card dragging - only detect card drop zones  
    if (activeIdStr.startsWith('card-') || activeIdStr.startsWith('structure-card-')) {
      const cardDropCollisions = rectIntersection({
        ...args,
        droppableContainers: args.droppableContainers.filter(container => 
          container.id.toString().startsWith('card-drop-')
        )
      });
      return cardDropCollisions;
    }

    // Default collision detection
    return rectIntersection(args);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeIdStr = active.id.toString();
    
    console.log('Drag start:', activeIdStr);
    
    // Card drag start (from list or structure)
    if (activeIdStr.startsWith('card-') || activeIdStr.startsWith('structure-card-')) {
      setActiveCardId(activeIdStr);
      setActiveCardData(active.data.current);
      console.log('Started dragging card:', active.id, active.data.current);
      return;
    }
    
    // Check if it's a subsection drag (find in any parent section)
    let foundSubsection = null;
    let parentSection = null;
    for (const section of sections) {
      if (section.subsections) {
        const subsection = section.subsections.find((sub: any) => sub.id.toString() === activeIdStr);
        if (subsection) {
          foundSubsection = subsection;
          parentSection = section;
          break;
        }
      }
    }
    
    if (foundSubsection && parentSection) {
      setActiveSubsectionId(activeIdStr);
      setActiveSubsectionData(foundSubsection);
      console.log('Started dragging subsection:', foundSubsection);
      return;
    }
    
    // Section drag start (preserving exact logic from OutlineStructure)
    const activeIndex = sections.findIndex(section => section.id.toString() === activeIdStr);
    if (activeIndex !== -1) {
      setActiveSectionId(activeIdStr);
      setActiveSectionIndex(activeIndex);
      
      // Calculate drop zones based on the dragged section's position (exact logic)
      const newDropZones: number[] = [];
      for (let i = 0; i <= sections.length; i++) {
        if (i !== activeIndex && i !== activeIndex + 1) {
          newDropZones.push(i);
        }
      }
      setSectionDropZones(newDropZones);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Keep existing drag over logic
    if (event.over) {
      console.log('Dragging over:', event.over.id);
      // Debug: Check if it's a card drop zone
      if (event.over.id.toString().startsWith('card-drop-')) {
        console.log('Detected card drop zone:', event.over.id);
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    console.log('Drag ended:', { active: active.id, over: over?.id });
    
    // Reset all drag state
    setActiveCardId(null);
    setActiveCardData(null);
    setActiveSectionId(null);
    setActiveSectionIndex(null);
    setSectionDropZones([]);
    setActiveSubsectionId(null);
    setActiveSubsectionData(null);

    const activeIdStr = active.id.toString();
    const overIdStr = over?.id.toString();

    if (!over) {
      console.log('No drop target - checking if card should be removed from structure');
      
      // If dragging a card from the structure and dropping outside valid zones, remove it
      if (activeIdStr.startsWith('structure-card-')) {
        const cardId = parseInt(activeIdStr.replace('structure-card-', ''));
        console.log('Removing card from structure:', cardId);
        
        try {
          const response = await fetch(`${API_URL}/outline_card_placements/card/${cardId}`, {
            method: "DELETE",
            credentials: "include"
          });
          
          if (response.ok) {
            console.log("Card removed from structure successfully");
            // Small delay to ensure backend processing is complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Reload sections to reflect the removal
            const sectionsResponse = await fetch(`${API_URL}/outline_sections/?project_id=${projectId}`, {
              credentials: "include"
            });
            if (sectionsResponse.ok) {
              const data = await sectionsResponse.json();
              console.log("Reloaded sections after card removal:", data);
              setSections(data);
            }
          } else {
            console.error("Failed to remove card from structure:", await response.text());
          }
        } catch (error) {
          console.error("Error removing card from structure:", error);
        }
      }
      return;
    }

    // Handle card drops (from list or structure)
    if ((activeIdStr.startsWith('card-') || activeIdStr.startsWith('structure-card-')) && overIdStr && overIdStr.startsWith('card-drop-')) {
      const dropInfo = overIdStr.replace('card-drop-', '').split('-');
      const sectionId = dropInfo[0];
      const position = dropInfo[1];
      
      // Extract card ID from either format
      let cardId: number;
      if (activeIdStr.startsWith('structure-card-')) {
        cardId = parseInt(activeIdStr.replace('structure-card-', ''));
      } else {
        cardId = parseInt(activeIdStr.replace('card-', ''));
      }
      
      console.log('Dropping card into section:', { 
        sectionId, 
        position, 
        cardId, 
        from: activeIdStr.startsWith('structure-card-') ? 'structure' : 'list',
        overIdStr,
        dropInfo 
      });
      
      try {
        let response;
        
        if (activeIdStr.startsWith('structure-card-')) {
          // Moving card within/between sections - use upsert endpoint
          console.log('Moving card within/between sections');
          response = await fetch(`${API_URL}/outline_card_placements/upsert`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              project_id: projectId,
              section_id: parseInt(sectionId),
              card_id: cardId,
              order_index: parseInt(position)
            })
          });
        } else {
          // Adding new card from list - use regular create
          console.log('Adding card from list to structure');
          response = await fetch(`${API_URL}/outline_card_placements/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              project_id: projectId,
              section_id: parseInt(sectionId),
              card_id: cardId,
              order_index: parseInt(position)
            })
          });
        }
        
        if (response.ok) {
          console.log("Card placement updated successfully");
          // Small delay to ensure backend processing is complete
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Instead of full reload, just reload the sections
          const sectionsResponse = await fetch(`${API_URL}/outline_sections/?project_id=${projectId}`, {
            credentials: "include"
          });
          if (sectionsResponse.ok) {
            const data = await sectionsResponse.json();
            console.log("Reloaded sections data:", data);
            setSections(data);
          } else {
            console.error("Failed to reload sections:", sectionsResponse.status);
          }
        } else {
          console.error("Failed to update card placement:", await response.text());
        }
      } catch (error) {
        console.error("Error updating card placement:", error);
      }
      return;
    }

    // Handle subsection drops
    if (overIdStr && overIdStr.startsWith('subsection-drop-') && activeSubsectionId && activeSubsectionData) {
      const dropPosition = parseInt(overIdStr.split('-').pop() || '0');
      
      // Find the parent section and subsection
      let parentSection = null;
      let subsectionIndex = -1;
      
      for (const section of sections) {
        if (section.subsections) {
          subsectionIndex = section.subsections.findIndex((sub: any) => sub.id.toString() === activeSubsectionId);
          if (subsectionIndex !== -1) {
            parentSection = section;
            break;
          }
        }
      }
      
      if (parentSection && subsectionIndex !== -1) {
        let newIndex = dropPosition;
        if (dropPosition > subsectionIndex) {
          newIndex = dropPosition - 1;
        }
        
        if (newIndex !== subsectionIndex && newIndex >= 0 && newIndex < parentSection.subsections.length) {
          // Create updated subsections with new order
          const newSubsections = [...parentSection.subsections];
          const [movedSubsection] = newSubsections.splice(subsectionIndex, 1);
          newSubsections.splice(newIndex, 0, movedSubsection);
          
          // Update order_index and section_number for all subsections
          const updatedSubsections = newSubsections.map((subsection: any, index: number) => ({
            ...subsection,
            order_index: index,
            section_number: String.fromCharCode(65 + index) // A, B, C, etc.
          }));
          
          // Update the sections state
          const updatedSections = sections.map(section => 
            section.id === parentSection.id 
              ? { ...section, subsections: updatedSubsections }
              : section
          );
          setSections(updatedSections);
          
          // Update backend
          try {
            await Promise.all(updatedSubsections.map((subsection: any) => 
              fetch(`${API_URL}/outline_sections/${subsection.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ 
                  order_index: subsection.order_index,
                  section_number: subsection.section_number 
                })
              })
            ));
          } catch (error) {
            console.error("Error updating subsection order:", error);
          }
        }
      }
      return;
    }

    // Handle section drops (preserving exact logic from OutlineStructure)
    if (overIdStr && overIdStr.startsWith('dropzone-') && activeSectionIndex !== null) {
      const dropPosition = parseInt(overIdStr.replace('dropzone-', ''));
      let newIndex = dropPosition;
      if (dropPosition > activeSectionIndex) {
        newIndex = dropPosition - 1;
      }
      
      if (newIndex !== activeSectionIndex) {
        const newSections = arrayMove(sections, activeSectionIndex, newIndex);
        const updatedSections = newSections.map((section, index) => ({
          ...section,
          order_index: index,
          section_number: _intToRoman(index + 1)
        }));
        
        setSections(updatedSections);

        try {
          await Promise.all(updatedSections.map(section => 
            fetch(`${API_URL}/outline_sections/${section.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ 
                order_index: section.order_index,
                section_number: section.section_number 
              })
            })
          ));
        } catch (error) {
          console.error("Error updating section order:", error);
          // Revert on error - reload sections
          window.location.reload();
        }
      }
    }
  };

  const handleCondensedViewChange = (isCondensed: boolean) => {
    setIsCondensedView(isCondensed);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={smartCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-gray-50">
        {/* Top divider - leaves space for ProjectNav */}
        <div className="h-26 border-b border-gray-200 bg-white"></div>
        
        {/* Main content area */}
        <div className="flex h-[calc(100vh-80px)]">
          {/* Left section - Card List */}
          <div className="w-96 border-r border-gray-200 bg-white">
            <OutlineCardList 
              projectId={projectId} 
              isCondensed={isCondensedView}
              activeCardId={activeCardId}
              sections={sections}
            />
          </div>
          
          {/* Right section - Outline Structure */}
          <div className="flex-1 bg-white">
            <SortableContext 
              items={[
                ...sections.map(s => s.id.toString()),
                ...sections.flatMap(s => s.subsections ? s.subsections.map((sub: any) => sub.id.toString()) : [])
              ]} 
              strategy={verticalListSortingStrategy}
            >
                        <OutlineStructure 
            projectId={projectId} 
            onCondensedViewChange={handleCondensedViewChange}
            activeCardId={activeCardId}
            sections={sections}
            setSections={setSections}
            activeSectionId={activeSectionId}
            sectionDropZones={sectionDropZones}
            loading={loading}
            isCondensed={isCondensedView}
            activeSubsectionId={activeSubsectionId}
          />
            </SortableContext>
          </div>
        </div>
        
        {/* Drag overlays */}
        <DragOverlay 
          dropAnimation={null}
          style={{ cursor: 'grabbing' }}
        >
          {/* Card drag overlay */}
          {activeCardId && activeCardData ? (
            <div className="border border-gray-200 rounded-lg p-3 bg-white shadow-lg max-w-xs pointer-events-none">
              <div className="text-sm font-medium text-gray-700 truncate">
                {activeCardData.title || activeCardData.question || activeCardData.content || 'Card'}
              </div>
            </div>
          ) : null}
          
          {/* Section drag overlay (preserving exact styling but ensuring cursor tracking) */}
          {activeSectionId ? (
            <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-lg h-16 flex items-center pointer-events-none">
              <div className="flex items-center gap-2">
                <LuGripVertical className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-700">
                  {sections.find(s => s.id.toString() === activeSectionId)?.section_number}. {sections.find(s => s.id.toString() === activeSectionId)?.title}
                </span>
              </div>
            </div>
          ) : null}
          
          {/* Subsection drag overlay */}
          {activeSubsectionId && activeSubsectionData ? (
            <div className="border border-gray-200 rounded-lg p-3 bg-white shadow-lg ml-6 pointer-events-none">
              <div className="flex items-center gap-2">
                <LuGripVertical className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-700">
                  {activeSubsectionData.section_number}. {activeSubsectionData.title}
                </span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}