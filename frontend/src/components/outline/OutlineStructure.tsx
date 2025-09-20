"use client";

import React, { useState } from "react";
import { LuPlus, LuDownload, LuFolder, LuGripVertical, LuChevronDown } from "react-icons/lu";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import OutlineSection from "./OutlineSection";
import {
  useDroppable,
} from '@dnd-kit/core';
import { exportOutline } from "../../lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface OutlineSection {
  id: number;
  title: string;
  order_index: number;
  parent_section_id?: number;
  section_number: string;
  subsections: OutlineSection[];
  card_placements: any[];
}

interface OutlineStructureProps {
  projectId: number;
  onCondensedViewChange: (isCondensed: boolean) => void;
  activeCardId?: string | null;
  sections: any[];
  setSections: (sections: any[]) => void;
  activeSectionId?: string | null;
  sectionDropZones: number[];
  loading: boolean;
  isCondensed: boolean;
  activeSubsectionId?: string | null;
}

// Drop zone component for sections (preserving exact styling)
function DropZone({ id }: { id: string }) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div ref={setNodeRef} className="h-16 mb-2">
      <div className={`border-2 border-dashed rounded-lg p-4 text-center font-medium h-full flex items-center justify-center transition-colors ${
        isOver 
          ? 'border-purple-400 bg-purple-50 text-purple-600' 
          : 'border-primary-500 bg-transparent text-primary-500'
      }`}>
        Drop section here
      </div>
    </div>
  );
}

export default function OutlineStructure({ 
  projectId, 
  onCondensedViewChange, 
  activeCardId,
  sections,
  setSections,
  activeSectionId,
  sectionDropZones,
  loading,
  isCondensed,
  activeSubsectionId
}: OutlineStructureProps) {
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const handleExportOutline = async (format: 'txt' | 'docx') => {
    try {
      setIsExporting(true);
      setError(null);
      
      if (sections.length === 0) {
        setError('No sections to export');
        return;
      }
      
      // Convert sections to the format expected by the export utility
      const exportSections = sections.map(section => ({
        ...section,
        subsections: section.subsections || [],
        card_placements: section.card_placements || []
      }));
      
      await exportOutline(exportSections, format);
    } catch (error) {
      console.error('Export error:', error);
      setError(error instanceof Error ? error.message : 'Failed to export outline');
    } finally {
      setIsExporting(false);
    }
  };

  const handleAddSection = async (insertAfterIndex?: number) => {
    try {
      setError(null);
  
      
      // Calculate the order_index based on where to insert
      let orderIndex;
      let sectionNumber;
      
      if (insertAfterIndex !== undefined) {
        // Insert after the specified section
        orderIndex = insertAfterIndex + 1;
        sectionNumber = _intToRoman(insertAfterIndex + 2);
        
        // Update order indices for sections that come after
        const updatedSections = sections.map((section, index) => {
          if (index > insertAfterIndex) {
            return { ...section, order_index: section.order_index + 1 };
          }
          return section;
        });
        setSections(updatedSections);
      } else {
        // Add at the end (for the "Add First Section" button)
        orderIndex = sections.length;
        sectionNumber = _intToRoman(sections.length + 1);
      }
      
      const newSection = {
        project_id: projectId,
        title: "New Section",
        order_index: orderIndex,
        section_number: sectionNumber
      };

      

      const res = await fetch(`${API_URL}/outline_sections/`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(newSection)
      });

      

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Create section API Error:', errorText);
        throw new Error(`Failed to create section: ${res.status} ${errorText}`);
      }
      
      const createdSection = await res.json();
      
      
      // Insert the new section at the correct position
      if (insertAfterIndex !== undefined) {
        const newSections = [...sections];
        newSections.splice(insertAfterIndex + 1, 0, { ...createdSection, subsections: [], card_placements: [] });
        setSections(newSections);
      } else {
        setSections([...sections, { ...createdSection, subsections: [], card_placements: [] }]);
      }
    } catch (error) {
      console.error("Error creating section:", error);
      setError(error instanceof Error ? error.message : 'Failed to create section');
    }
  };

  const handleAddSubsection = async (parentId: number) => {
    try {
      const parentSection = sections.find(s => s.id === parentId);
      if (!parentSection) return;

      const newSubsection = {
        project_id: projectId,
        title: "New Subsection",
        order_index: parentSection.subsections.length,
        parent_section_id: parentId,
        section_number: _intToLetter(parentSection.subsections.length + 1)
      };

      const res = await fetch(`${API_URL}/outline_sections/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newSubsection)
      });

      if (!res.ok) throw new Error("Failed to create subsection");
      const createdSubsection = await res.json();
      
      setSections(sections.map(section => 
        section.id === parentId 
          ? { ...section, subsections: [...section.subsections, createdSubsection] }
          : section
      ));
    } catch (error) {
      console.error("Error creating subsection:", error);
    }
  };

  const handleUpdateSection = (sectionId: number, updates: any) => {
    const updateSection = (sections: OutlineSection[]): OutlineSection[] => {
      return sections.map(section => {
        if (section.id === sectionId) {
          return { ...section, ...updates };
        }
        
        // Recursively update subsections
        if (section.subsections.length > 0) {
          const updatedSubsections = updateSection(section.subsections);
          if (updatedSubsections !== section.subsections) {
            return { ...section, subsections: updatedSubsections };
          }
        }
        
        return section;
      });
    };
    
    setSections(updateSection(sections));
  };

  const handleDeleteSection = async (sectionId: number) => {
    try {
      setError(null);

      
      const res = await fetch(`${API_URL}/outline_sections/${sectionId}`, {
        method: "DELETE",
        credentials: "include"
      });

      

      if (!res.ok) {
        if (res.status === 404) {
          // Section doesn't exist in database, remove from frontend state anyway
          console.warn('Section not found in database, removing from frontend state');
          const updatedSections = removeSectionFromState(sections, sectionId);
          const renumberedSections = renumberSections(updatedSections);
          setSections(renumberedSections);
          return;
        }
        
        const errorText = await res.text();
        console.error('Delete section API Error:', errorText);
        throw new Error(`Failed to delete section: ${res.status} ${errorText}`);
      }
      
      // Successfully deleted from database, remove from frontend state and renumber
      const updatedSections = removeSectionFromState(sections, sectionId);
      const renumberedSections = renumberSections(updatedSections);
      setSections(renumberedSections);
      
      // Update the backend with new numbering
      try {
        await Promise.all(renumberedSections.map(section => 
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
        console.error("Error updating section numbering after delete:", error);
        // Don't revert the deletion, just log the numbering update error
      }
      
      
    } catch (error) {
      console.error("Error deleting section:", error);
      setError(error instanceof Error ? error.message : 'Failed to delete section');
    }
  };

  // Helper function to recursively remove a section from state
  const removeSectionFromState = (sections: OutlineSection[], sectionId: number): OutlineSection[] => {
    return sections.map(section => {
      if (section.id === sectionId) {
        return null; // Mark for removal
      }
      
      // Recursively check subsections
      const updatedSubsections = section.subsections.filter(sub => sub.id !== sectionId);
      if (updatedSubsections.length !== section.subsections.length) {
        return { ...section, subsections: updatedSubsections };
      }
      
      return section;
    }).filter(Boolean) as OutlineSection[];
  };

  // Helper function to renumber sections after deletion
  const renumberSections = (sections: OutlineSection[]): OutlineSection[] => {
    return sections.map((section, index) => ({
      ...section,
      order_index: index,
      section_number: _intToRoman(index + 1),
      // Also renumber subsections
      subsections: section.subsections.map((subsection, subIndex) => ({
        ...subsection,
        order_index: subIndex,
        section_number: _intToLetter(subIndex + 1)
      }))
    }));
  };

  const _intToRoman = (num: number): string => {
    const val = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    const syb = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
    let roman_num = "";
    let i = 0;
    while (num > 0 && i < val.length) {
      const count = Math.floor(num / val[i]);
      for (let j = 0; j < count; j++) {
        roman_num += syb[i];
        num -= val[i];
      }
      i++;
    }
    return roman_num;
  };

  // Helper function to convert number to letter
  const _intToLetter = (num: number): string => {
    return String.fromCharCode(64 + num); // A=65, so 64+1=A
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500">Loading outline...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-red-500 text-center">
          <p className="mb-2">Error loading outline</p>
          <p className="text-sm text-gray-600">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-center justify-between">
          {/* Condensed view toggle - top left */}
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="condensed-view" 
              defaultChecked={true}
              onCheckedChange={(checked) => onCondensedViewChange(checked as boolean)}
            />
            <label htmlFor="condensed-view" className="text-sm text-gray-600">
              Show condensed card view
            </label>
          </div>
          
          {/* Buttons - top right */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <LuFolder className="w-4 h-4 mr-2" />
              Templates
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isExporting || sections.length === 0}>
                  <LuDownload className="w-4 h-4 mr-2" />
                  {isExporting ? 'Exporting...' : 'Export Outline'}
                  <LuChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleExportOutline('txt')}
                  className="cursor-pointer"
                >
                  Plain Text (.txt)
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => handleExportOutline('docx')}
                  className="cursor-pointer"
                >
                  Word Document (.docx)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Outline Content */}
      <div className="flex-1 px-6 pb-6 overflow-y-auto outline-scroll-container">
        {sections.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="mb-4">No sections yet</p>
            <Button onClick={() => handleAddSection()} size="sm">
              <LuPlus className="w-4 h-4 mr-2" />
              Add First Section
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {sections.map((section, index) => (
              <React.Fragment key={section.id}>
                {/* Section drop zone above this section */}
                {activeSectionId && sectionDropZones.includes(index) && (
                  <DropZone id={`dropzone-${index}`} />
                )}
                
                <OutlineSection
                  section={section}
                  onUpdate={handleUpdateSection}
                  onDelete={handleDeleteSection}
                  onAddSubsection={handleAddSubsection}
                  onAddSection={() => handleAddSection(section.order_index)}
                  isDraggable={true}
                  isDragging={activeSectionId === section.id.toString()}
                  activeCardId={activeCardId}
                  isCondensed={isCondensed}
                  activeSubsectionId={activeSubsectionId}
                />
              </React.Fragment>
            ))}
            
            {/* Section drop zone at the end */}
            {activeSectionId && sectionDropZones.includes(sections.length) && (
              <DropZone id={`dropzone-${sections.length}`} />
            )}
          </div>
        )}
        
        {/* Extra padding to ensure scrollbar is always present */}
        <div className="h-96"></div>
      </div>
    </div>
  );
}
