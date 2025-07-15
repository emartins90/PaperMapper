"use client";

import React, { useState, useEffect, useRef } from "react";
import FileUploadSection from "../canvas-add-files/FileUploadSection";
import UnsavedCardFileUpload from "../shared/UnsavedCardFileUpload";
import { uploadFilesForCardType } from "../useFileUploadHandler";
import { useCardSave } from "../shared/useCardSave";
import LinkedCardsTab from "../LinkedCardsTab";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MultiCombobox } from "@/components/ui/multi-combobox";
import { Combobox, useCustomOptions } from "@/components/ui/combobox";

interface SourceCardContentProps {
  cardType: string | undefined;
  sourceTab: string;
  cardData: any;
  onUpdateNodeData?: (cardId: string, newData: any) => void;
  openCard: { id: string; type: string } | null;
  nodes: any[];
  edges: any[];
  onClose: () => void;
  onEdgesChange?: (changes: any[]) => void;
  onAddCard?: (cardId: string) => void;
  onDeleteCard?: (cardId: string) => void;
  onFormDataChange?: (data: any) => void;
  showSaveButton?: boolean;
}

export default function SourceCardContent({ 
  cardType, 
  sourceTab, 
  cardData, 
  onUpdateNodeData, 
  openCard, 
  nodes, 
  edges, 
  onClose, 
  onEdgesChange, 
  onAddCard, 
  onDeleteCard, 
  onFormDataChange,
  showSaveButton
}: SourceCardContentProps) {
  const [notes, setNotes] = useState(cardData?.additionalNotes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [files, setFiles] = useState<string[]>(cardData?.files || []);
  const [fileEntries, setFileEntries] = useState<Array<{ url: string; filename: string; type: string }>>(cardData?.fileEntries || []);
  const [isUploading, setIsUploading] = useState(false);
  
  // For unsaved cards, store files as File[] objects
  const [pendingFiles, setPendingFiles] = useState<File[]>(cardData?.pendingFiles || []);
  
  // Add state for all editable fields
  const [sourceCitation, setSourceCitation] = useState(cardData?.source || "");
  const [summary, setSummary] = useState(cardData?.summary || "");
  const [sourceContent, setSourceContent] = useState(cardData?.text || "");
  const [tags, setTags] = useState<string[]>(Array.isArray(cardData?.tags) ? cardData.tags : []);
  const [argumentType, setArgumentType] = useState(cardData?.thesisSupport || "");
  const [sourceFunction, setSourceFunction] = useState(cardData?.sourceFunction || "");
  const [credibility, setCredibility] = useState(cardData?.credibility || "");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const sourceFunctionOptions = useCustomOptions("sourceFunction");
  const sourceCredibilityOptions = useCustomOptions("sourceCredibility");

  // Check if card is unsaved
  const isUnsaved = !cardData?.sourceMaterialId;

  // Use the shared save hook
  const { saveCard, isSaving: isSavingCard } = useCardSave({
    cardId: openCard?.id || "",
    cardType: "source",
    projectId: cardData?.projectId || 0,
    onUpdateNodeData,
    onAddCard,
    onDeleteCard,
  });

  // Get all existing tags from all cards
  const getAllExistingTags = () => {
    const allTags = new Set<string>();
    nodes.forEach(node => {
      if (node.data?.tags) {
        const nodeTags = Array.isArray(node.data.tags) ? node.data.tags : 
                        typeof node.data.tags === 'string' ? node.data.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0) : [];
        nodeTags.forEach((tag: string) => allTags.add(tag));
      }
    });
    return Array.from(allTags).sort();
  };



  // Update all fields when component mounts or card changes
  useEffect(() => {
    setNotes(cardData?.additionalNotes || "");
    setSourceCitation(cardData?.source || "");
    setSummary(cardData?.summary || "");
    setSourceContent(cardData?.text || "");
    setTags(Array.isArray(cardData?.tags) ? cardData.tags : []);
    setArgumentType(cardData?.thesisSupport || "");
    setSourceFunction(cardData?.sourceFunction || "");
    setCredibility(cardData?.credibility || "");
    setPendingFiles(cardData?.pendingFiles || []);
  }, [openCard?.id]);

  // Update form data for parent component when fields change
  useEffect(() => {
    if (onFormDataChange) {
      onFormDataChange({
        sourceContent: sourceContent,
        summary: summary,
        topicalTags: tags.join(", "),
        argumentType: argumentType,
        sourceFunction: sourceFunction,
        sourceCredibility: credibility,
        sourceCitation: sourceCitation,
        uploadedFiles: pendingFiles,
      });
    }
  }, [sourceContent, summary, tags, argumentType, sourceFunction, credibility, sourceCitation, pendingFiles, onFormDataChange]); // Only run when the card ID changes, not when cardData changes

  // Update files when cardData changes
  useEffect(() => {
    setFiles(cardData?.files || []);
    setFileEntries(cardData?.fileEntries || []);
  }, [cardData?.files, cardData?.fileEntries]);

  // Save all fields to backend
  const saveAllFields = async () => {
    // Always update local node data first
    if (onUpdateNodeData) {
      onUpdateNodeData(openCard?.id || "", {
        source: sourceCitation,
        summary: summary,
        text: sourceContent,
        tags: tags,
        thesisSupport: argumentType,
        sourceFunction: sourceFunction,
        credibility: credibility,
        additionalNotes: notes,
        files: files,
      });
    }
    
    // Only try to save to backend if we have a backend ID
    if (!cardData?.sourceMaterialId) {
      return;
    }
    
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const response = await fetch(`${API_URL}/source_materials/${cardData.sourceMaterialId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          project_id: cardData.projectId,
          citation_id: cardData.citationId,
          content: sourceContent,
          summary: summary,
          tags: tags.join(', '),
          argument_type: argumentType,
          function: sourceFunction,
          files: files.join(','),
          notes: notes,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save changes: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error("Error saving changes:", error);
      alert("Failed to save changes: " + (error as Error).message);
    } finally {
      // Keep the save indicator visible briefly for better UX
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  // Save all fields with specific tags
  const saveAllFieldsWithTags = async (tagsToSave: string[]) => {
    // Always update local node data first
    if (onUpdateNodeData) {
      onUpdateNodeData(openCard?.id || "", {
        source: sourceCitation,
        summary: summary,
        text: sourceContent,
        tags: tagsToSave,
        thesisSupport: argumentType,
        sourceFunction: sourceFunction,
        credibility: credibility,
        additionalNotes: notes,
        files: files,
      });
    }
    
    // Only try to save to backend if we have a backend ID
    if (!cardData?.sourceMaterialId) {
      return;
    }
    
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const response = await fetch(`${API_URL}/source_materials/${cardData.sourceMaterialId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          project_id: cardData.projectId,
          citation_id: cardData.citationId,
          content: sourceContent,
          summary: summary,
          tags: tagsToSave.join(', '),
          argument_type: argumentType,
          function: sourceFunction,
          files: files.join(','),
          notes: notes,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save changes: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error("Error saving changes:", error);
      alert("Failed to save changes: " + (error as Error).message);
    } finally {
      // Keep the save indicator visible briefly for better UX
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  // Save all fields with specific argument type
  const saveAllFieldsWithArgumentType = async (argumentTypeToSave: string) => {
    // Always update local node data first
    if (onUpdateNodeData) {
      onUpdateNodeData(openCard?.id || "", {
        source: sourceCitation,
        summary: summary,
        text: sourceContent,
        tags: tags,
        thesisSupport: argumentTypeToSave,
        sourceFunction: sourceFunction,
        credibility: credibility,
        additionalNotes: notes,
        files: files,
      });
    }
    
    // Only try to save to backend if we have a backend ID
    if (!cardData?.sourceMaterialId) {
      return;
    }
    
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const response = await fetch(`${API_URL}/source_materials/${cardData.sourceMaterialId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          project_id: cardData.projectId,
          citation_id: cardData.citationId,
          content: sourceContent,
          summary: summary,
          tags: tags.join(', '),
          argument_type: argumentTypeToSave,
          function: sourceFunction,
          files: files.join(','),
          notes: notes,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save changes: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error("Error saving changes:", error);
      alert("Failed to save changes: " + (error as Error).message);
    } finally {
      // Keep the save indicator visible briefly for better UX
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  // Save all fields with specific source function
  const saveAllFieldsWithSourceFunction = async (sourceFunctionToSave: string) => {
    // Always update local node data first
    if (onUpdateNodeData) {
      onUpdateNodeData(openCard?.id || "", {
        source: sourceCitation,
        summary: summary,
        text: sourceContent,
        tags: tags,
        thesisSupport: argumentType,
        sourceFunction: sourceFunctionToSave,
        credibility: credibility,
        additionalNotes: notes,
        files: files,
      });
    }
    
    // Only try to save to backend if we have a backend ID
    if (!cardData?.sourceMaterialId) {
      return;
    }
    
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const response = await fetch(`${API_URL}/source_materials/${cardData.sourceMaterialId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          project_id: cardData.projectId,
          citation_id: cardData.citationId,
          content: sourceContent,
          summary: summary,
          tags: tags.join(', '),
          argument_type: argumentType,
          function: sourceFunctionToSave,
          files: files.join(','),
          notes: notes,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save changes: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error("Error saving changes:", error);
      alert("Failed to save changes: " + (error as Error).message);
    } finally {
      // Keep the save indicator visible briefly for better UX
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  // Save all fields with specific credibility
  const saveAllFieldsWithCredibility = async (credibilityToSave: string) => {
    // Always update local node data first
    if (onUpdateNodeData) {
      onUpdateNodeData(openCard?.id || "", {
        source: sourceCitation,
        summary: summary,
        text: sourceContent,
        tags: tags,
        thesisSupport: argumentType,
        sourceFunction: sourceFunction,
        credibility: credibilityToSave,
        additionalNotes: notes,
        files: files,
      });
    }
    
    // Only try to save to backend if we have a backend ID
    if (!cardData?.sourceMaterialId) {
      return;
    }
    
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const response = await fetch(`${API_URL}/source_materials/${cardData.sourceMaterialId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          project_id: cardData.projectId,
          citation_id: cardData.citationId,
          content: sourceContent,
          summary: summary,
          tags: tags.join(', '),
          argument_type: argumentType,
          function: sourceFunction,
          files: files.join(','),
          notes: notes,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save changes: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error("Error saving changes:", error);
      alert("Failed to save changes: " + (error as Error).message);
    } finally {
      // Keep the save indicator visible briefly for better UX
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  // Save notes to backend (existing function)
  const saveNotes = async (newNotes: string) => {
    if (!cardData?.sourceMaterialId) return;
    
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const response = await fetch(`${API_URL}/source_materials/${cardData.sourceMaterialId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          project_id: cardData.projectId,
          citation_id: cardData.citationId,
          content: sourceContent,
          summary: summary,
          tags: tags.join(', '),
          argument_type: argumentType,
          function: sourceFunction,
          files: files.join(','),
          notes: newNotes,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to save notes");
      }
    } catch (error) {
      console.error("Error saving notes:", error);
      // Revert the notes if save failed
      setNotes(cardData?.additionalNotes || "");
    } finally {
      setIsSaving(false);
    }
  };



  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !openCard) return;
    setIsUploading(true);
    try {
      // If we have a backend ID, upload to backend
      if (cardData?.sourceMaterialId) {
        await uploadFilesForCardType(
          "source",
          cardData.sourceMaterialId,
          Array.from(e.target.files),
          files,
          (newFiles) => {
            setFiles(newFiles);
            onUpdateNodeData?.(openCard.id, { files: newFiles });
          }
        );
      } else {
        // For new cards, store files locally as File objects
        const newFiles = Array.from(e.target.files);
    
        const updatedPendingFiles = [...pendingFiles, ...newFiles];
        setPendingFiles(updatedPendingFiles);
        onUpdateNodeData?.(openCard.id, { 
          pendingFiles: updatedPendingFiles
        });
      }
    } catch (err) {
      alert("Failed to upload file: " + (err as Error).message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle file deletion
  const handleDeleteFile = async (fileUrl: string) => {
    const filename = fileUrl.split('/').pop();
    if (!filename) {
      alert('Could not determine filename.');
      return;
    }
    if (!cardData || !cardData.sourceMaterialId || !cardData.projectId) {
      alert('Source material data is missing.');
      return;
    }
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      // Delete the file from the uploads directory (ignore 404)
      await fetch(`${API_URL}/upload/${filename}`, { method: 'DELETE' });

      // Remove the file from the files array
      const newFiles = files.filter(f => f !== fileUrl);
      setFiles(newFiles);

      // Prepare the update payload (all required fields, snake_case)
      const payload = {
        citation_id: cardData.citationId ?? null,
        project_id: cardData.projectId,
        content: cardData.text ?? "",
        summary: cardData.summary ?? "",
        tags: Array.isArray(cardData.tags) ? cardData.tags.join(', ') : (cardData.tags ?? ""),
        argument_type: cardData.thesisSupport ?? "",
        function: cardData.sourceFunction ?? "",
        files: newFiles.length ? newFiles.join(',') : "",
        notes: cardData.additionalNotes ?? "",
      };

      // Update the source material in the backend
      const updateRes = await fetch(`${API_URL}/source_materials/${cardData.sourceMaterialId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!updateRes.ok) {
        throw new Error('Failed to update source material');
      }
      
      // Update the node data in the parent component to reflect the change immediately
      if (onUpdateNodeData) {
        onUpdateNodeData(openCard?.id || "", { files: newFiles });
      }
    } catch (err) {
      alert('Failed to fully delete file.');
    }
  };

  // Handle notes change with debounced save
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNotes = e.target.value;
    setNotes(newNotes);
    
    // Only save to backend if card is saved
    if (!isUnsaved) {
      // Debounce the save to avoid too many API calls
      const timeoutId = setTimeout(() => {
        saveNotes(newNotes);
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  };

  // Handle field changes (just update state, no auto-save for unsaved cards)
  const handleSourceCitationChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSourceCitation(e.target.value);
  };

  const handleSummaryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSummary(e.target.value);
  };

  const handleSourceContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSourceContent(e.target.value);
  };

  const handleArgumentTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setArgumentType(newValue);
    // Save immediately when selection is made (only for saved cards)
    if (!isUnsaved) {
      saveAllFieldsWithArgumentType(newValue);
    }
  };

  const handleSourceFunctionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setSourceFunction(newValue);
    // Save immediately when selection is made (only for saved cards)
    if (!isUnsaved) {
      saveAllFieldsWithSourceFunction(newValue);
    }
  };

  const handleCredibilityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setCredibility(newValue);
    // Save immediately when selection is made (only for saved cards)
    if (!isUnsaved) {
      saveAllFieldsWithCredibility(newValue);
    }
  };

  const handleTagsChange = (newTags: string[]) => {
    setTags(newTags);
  };

  // Handle field blur (save when user leaves the field, only for saved cards)
  const handleSourceCitationBlur = () => {
    if (!isUnsaved) {
      saveAllFields();
    }
  };

  const handleSummaryBlur = () => {
    if (!isUnsaved) {
      saveAllFields();
    }
  };

  const handleSourceContentBlur = () => {
    if (!isUnsaved) {
      saveAllFields();
    }
  };

  const handleArgumentTypeBlur = () => {
    if (!isUnsaved) {
      saveAllFields();
    }
  };

  const handleSourceFunctionBlur = () => {
    if (!isUnsaved) {
      saveAllFields();
    }
  };

  const handleCredibilityBlur = () => {
    if (!isUnsaved) {
      saveAllFields();
    }
  };

  const handleTagsBlur = () => {
    if (!isUnsaved) {
      saveAllFields();
    }
  };

  const handleSaveSource = async () => {
    if (!openCard || !sourceContent.trim()) return;

    try {
      await saveCard({
        cardId: openCard.id,
        chatAnswers: {
          sourceContent: sourceContent,
          summary: summary,
          topicalTags: tags.join(", "),
          argumentType: argumentType,
          sourceFunction: sourceFunction,
          sourceCredibility: credibility,
          sourceCitation: sourceCitation,
        },
        uploadedFiles: pendingFiles,
      });
    } catch (error) {
      console.error("Failed to save source:", error);
      alert("Failed to save source: " + (error as Error).message);
    }
  };

  if (!cardType || cardType !== "source") {
    return (
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="text-gray-500 text-sm">Card details and tabs go here.</div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {sourceTab === "content" ? (
        <div className="space-y-4">
          <div>
            <Label htmlFor="source-content" className="block text-sm font-medium text-gray-700 mb-1">Detailed Source Material</Label>
            <Textarea
              id="source-content"
              className="resize-none min-h-[120px] max-h-64 overflow-auto"
              style={{ minHeight: '120px', maxHeight: '16rem' }}
              placeholder="Type or paste the full text content, quotes, or relevant excerpts from your source..."
              rows={5}
              value={sourceContent}
              onChange={handleSourceContentChange}
              onBlur={handleSourceContentBlur}
            />
          </div>
          
          {/* Use different file upload components based on save status */}
          {isUnsaved ? (
            <UnsavedCardFileUpload
              files={pendingFiles}
              onFilesChange={(newFiles) => {
                setPendingFiles(newFiles);
                onUpdateNodeData?.(openCard?.id || "", { pendingFiles: newFiles });
              }}
            />
          ) : (
            <FileUploadSection
              files={files}
              isUploading={isUploading}
              onFileUpload={handleFileUpload}
              onFileDelete={handleDeleteFile}
              fileInputRef={fileInputRef}
              fileEntries={fileEntries}
              cardType="source"
            />
          )}
          
          <div>
            <Label htmlFor="source-notes" className="block text-xs font-medium text-gray-600 mb-1">My Notes</Label>
            <Textarea
              id="source-notes"
              className="min-h-[80px] resize-y"
              placeholder="Add any personal notes, thoughts, or connections to other sources..."
              rows={3}
              value={notes}
              onChange={handleNotesChange}
            />
          </div>

          {/* Save button for unsaved cards - only show if showSaveButton is true */}
          {isUnsaved && showSaveButton && (
            <div className="pt-4">
              <button
                onClick={handleSaveSource}
                disabled={isSavingCard || !sourceContent.trim()}
                className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingCard ? "Saving..." : "Save Source"}
              </button>
            </div>
          )}
        </div>
      ) : sourceTab === "info" ? (
        <div className="space-y-4">
          <div>
            <Label htmlFor="source-function" className="block text-sm font-medium text-gray-700 mb-1">Source Function</Label>
            <Combobox
              options={[
                { value: "Evidence", label: "Evidence" },
                { value: "Definition", label: "Definition" },
                { value: "Background Info", label: "Background Info" },
                { value: "Data Point", label: "Data Point" },
                { value: "Theory", label: "Theory" },
                { value: "Concept", label: "Concept" },
                ...sourceFunctionOptions.options.filter(
                  o => !["Evidence","Definition","Background Info","Data Point","Theory","Concept"].includes(o.value)
                ),
              ]}
              value={sourceFunction || ""}
              onChange={async (value) => {
                setSourceFunction(value);
                if (!isUnsaved) {
                  saveAllFieldsWithSourceFunction(value);
                }
                // If it's a new custom option, persist it
                if (
                  value &&
                  !["Evidence","Definition","Background Info","Data Point","Theory","Concept"].includes(value) &&
                  !sourceFunctionOptions.options.some(o => o.value === value)
                ) {
                  await sourceFunctionOptions.addOption(value);
                }
              }}
              placeholder="Select or type source function..."
              allowCustom={true}
            />
            <p className="text-xs text-gray-500 mt-1">How does this source contribute to your research?</p>
          </div>
          
          <div>
            <Label htmlFor="argument-type" className="block text-sm font-medium text-gray-700 mb-1">Argument Type</Label>
            <Select value={argumentType || ""} onValueChange={(value) => {
              setArgumentType(value);
              if (!isUnsaved) {
                saveAllFieldsWithArgumentType(value);
              }
            }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select argument type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Thesis-supporting">Thesis-supporting</SelectItem>
                <SelectItem value="Counter-evidence">Counter-evidence</SelectItem>
                <SelectItem value="Neutral to thesis">Neutral to thesis</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="source-tags" className="block text-sm font-medium text-gray-700 mb-1">Topical Tags</Label>
            <MultiCombobox
              options={getAllExistingTags().map(tag => ({ value: tag, label: tag }))}
              value={tags}
              onChange={(newTags) => {
                setTags(newTags);
                if (!isUnsaved) {
                  saveAllFieldsWithTags(newTags);
                }
              }}
              placeholder="Type a tag and press Enter..."
              allowCustom={true}
            />
          </div>
          
          <div>
            <Label htmlFor="source-summary" className="block text-sm font-medium text-gray-700 mb-1">Summary</Label>
            <Textarea 
              id="source-summary"
              placeholder="Write a brief summary (2-3 sentences) of the key points..."
              rows={3}
              value={summary}
              onChange={handleSummaryChange}
              onBlur={handleSummaryBlur}
            />
            <p className="text-xs text-gray-500 mt-1">Focus on the most relevant information for your research question.</p>
          </div>
          
          <div className="border-t border-gray-200 pt-4">
            <div>
              <Label htmlFor="source-citation" className="block text-sm font-medium text-gray-700 mb-1">Source Citation</Label>
              <Textarea 
                id="source-citation"
                placeholder="Author, Title, Publication, Date, URL..."
                rows={3}
                value={sourceCitation}
                onChange={handleSourceCitationChange}
                onBlur={handleSourceCitationBlur}
              />
              <p className="text-xs text-gray-500 mt-1">Include all available citation details. We'll help format this properly later.</p>
            </div>
            
            <div className="mt-4">
              <Label htmlFor="source-credibility" className="block text-sm font-medium text-gray-700 mb-1">Source Credibility</Label>
              <Combobox
                options={[
                  { value: "Peer-reviewed study", label: "Peer-reviewed study" },
                  { value: "News article (reputable)", label: "News article (reputable)" },
                  { value: "News article (biased)", label: "News article (biased)" },
                  { value: "Expert opinion", label: "Expert opinion" },
                  { value: "Institutional report", label: "Institutional report" },
                  { value: "Personal experience", label: "Personal experience" },
                  { value: "Blog or opinion piece", label: "Blog or opinion piece" },
                  { value: "Speculative claim", label: "Speculative claim" },
                  { value: "Social media post", label: "Social media post" },
                  { value: "Unclear origin", label: "Unclear origin" },
                  ...sourceCredibilityOptions.options.filter(
                    o => ![
                      "Peer-reviewed study",
                      "News article (reputable)",
                      "News article (biased)",
                      "Expert opinion",
                      "Institutional report",
                      "Personal experience",
                      "Blog or opinion piece",
                      "Speculative claim",
                      "Social media post",
                      "Unclear origin"
                    ].includes(o.value)
                  ),
                ]}
                value={credibility || ""}
                onChange={async (value) => {
                  setCredibility(value);
                  if (!isUnsaved) {
                    saveAllFieldsWithCredibility(value);
                  }
                  // If it's a new custom option, persist it
                  if (
                    value &&
                    ![
                      "Peer-reviewed study",
                      "News article (reputable)",
                      "News article (biased)",
                      "Expert opinion",
                      "Institutional report",
                      "Personal experience",
                      "Blog or opinion piece",
                      "Speculative claim",
                      "Social media post",
                      "Unclear origin"
                    ].includes(value) &&
                    !sourceCredibilityOptions.options.some(o => o.value === value)
                  ) {
                    await sourceCredibilityOptions.addOption(value);
                  }
                }}
                placeholder="Select or type credibility level..."
                allowCustom={true}
              />
            </div>
          </div>

          {/* Save button for unsaved cards - only show if showSaveButton is true */}
          {isUnsaved && showSaveButton && (
            <div className="pt-4">
              <button
                onClick={handleSaveSource}
                disabled={isSavingCard || !sourceContent.trim()}
                className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingCard ? "Saving..." : "Save Source"}
              </button>
            </div>
          )}
        </div>
      ) : sourceTab === "linked" ? (
        <LinkedCardsTab openCard={openCard} nodes={nodes} edges={edges} onEdgesChange={onEdgesChange} onClose={onClose} />
      ) : null}
    </div>
  );
} 