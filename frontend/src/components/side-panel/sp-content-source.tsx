"use client";

import React, { useState, useEffect, useRef } from "react";
import FileUploadSection from "../canvas-add-files/FileUploadSection";
import { uploadFilesForCardType } from "../useFileUploadHandler";
import LinkedCardsTab from "../LinkedCardsTab";

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
  onDeleteCard 
}: SourceCardContentProps) {
  const [notes, setNotes] = useState(cardData?.additionalNotes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [files, setFiles] = useState<string[]>(cardData?.files || []);
  const [fileEntries, setFileEntries] = useState<Array<{ url: string; filename: string; type: string }>>(cardData?.fileEntries || []);
  const [isUploading, setIsUploading] = useState(false);
  
  // Add state for all editable fields
  const [sourceCitation, setSourceCitation] = useState(cardData?.source || "");
  const [summary, setSummary] = useState(cardData?.summary || "");
  const [sourceContent, setSourceContent] = useState(cardData?.text || "");
  const [tags, setTags] = useState<string[]>(Array.isArray(cardData?.tags) ? cardData.tags : []);
  const [tagInput, setTagInput] = useState("");
  const [argumentType, setArgumentType] = useState(cardData?.thesisSupport || "");
  const [sourceFunction, setSourceFunction] = useState(cardData?.sourceFunction || "");
  const [credibility, setCredibility] = useState(cardData?.credibility || "");
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Filter suggestions based on input
  const filterSuggestions = (input: string) => {
    if (!input.trim()) {
      setFilteredSuggestions([]);
      return;
    }
    
    const existingTags = getAllExistingTags();
    const filtered = existingTags.filter(tag => 
      tag.toLowerCase().includes(input.toLowerCase()) && 
      !tags.includes(tag)
    );
    setFilteredSuggestions(filtered);
  };

  // Handle tag input change
  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTagInput(value);
    filterSuggestions(value);
    setShowTagSuggestions(value.length > 0);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    const newTags = [...tags, suggestion];
    setTags(newTags);
    setTagInput("");
    setShowTagSuggestions(false);
    setFilteredSuggestions([]);
    saveAllFieldsWithTags(newTags);
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
  }, [openCard?.id]); // Only run when the card ID changes, not when cardData changes

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

  // Handle tag input
  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTags = [...tags, tagInput.trim()];
      setTags(newTags);
      setTagInput("");
      setShowTagSuggestions(false);
      setFilteredSuggestions([]);
      // Save immediately when tag is added with the new tags
      saveAllFieldsWithTags(newTags);
    }
  };

  // Handle tag deletion
  const handleDeleteTag = (tagToDelete: string) => {
    const newTags = tags.filter(tag => tag !== tagToDelete);
    setTags(newTags);
    // Save immediately when tag is deleted with the new tags
    saveAllFieldsWithTags(newTags);
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
        console.log('[FileUpload] newFiles:', newFiles);
        const fileUrls = newFiles.map(file => URL.createObjectURL(file));
        const updatedFiles = [...files, ...fileUrls];
        setFiles(updatedFiles);
        onUpdateNodeData?.(openCard.id, { 
          files: updatedFiles,
          pendingFiles: newFiles, // Store the actual File objects for later upload
          fileEntries: fileEntries // Store file metadata for display
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
    
    // Debounce the save to avoid too many API calls
    const timeoutId = setTimeout(() => {
      saveNotes(newNotes);
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  };

  // Handle field changes (just update state, no auto-save)
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
    // Save immediately when selection is made
    saveAllFieldsWithArgumentType(newValue);
  };

  const handleSourceFunctionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setSourceFunction(newValue);
    // Save immediately when selection is made
    saveAllFieldsWithSourceFunction(newValue);
  };

  const handleCredibilityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setCredibility(newValue);
    // Save immediately when selection is made
    saveAllFieldsWithCredibility(newValue);
  };

  const handleTagsChange = (newTags: string[]) => {
    setTags(newTags);
  };

  // Handle field blur (save when user leaves the field)
  const handleSourceCitationBlur = () => {
    saveAllFields();
  };

  const handleSummaryBlur = () => {
    saveAllFields();
  };

  const handleSourceContentBlur = () => {
    saveAllFields();
  };

  const handleArgumentTypeBlur = () => {
    saveAllFields();
  };

  const handleSourceFunctionBlur = () => {
    saveAllFields();
  };

  const handleCredibilityBlur = () => {
    saveAllFields();
  };

  const handleTagsBlur = () => {
    saveAllFields();
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Detailed Source Material</label>
            <textarea
              className="w-full p-2 border border-gray-300 rounded-md text-sm resize-none min-h-[120px] max-h-64 overflow-auto"
              style={{ minHeight: '120px', maxHeight: '16rem' }}
              placeholder="Type or paste the full text content, quotes, or relevant excerpts from your source..."
              rows={5}
              value={sourceContent}
              onChange={handleSourceContentChange}
              onBlur={handleSourceContentBlur}
            />
          </div>
          <FileUploadSection
            files={files}
            isUploading={isUploading}
            onFileUpload={handleFileUpload}
            onFileDelete={handleDeleteFile}
            fileInputRef={fileInputRef}
            fileEntries={fileEntries}
          />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">My Notes</label>
            <textarea
              className="w-full p-2 border border-gray-300 rounded-md text-sm min-h-[80px] resize-y"
              placeholder="Add any personal notes, thoughts, or connections to other sources..."
              rows={3}
              value={notes}
              onChange={handleNotesChange}
            />
          </div>
        </div>
      ) : sourceTab === "info" ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source Function</label>
            <select className="w-full p-2 border border-gray-300 rounded-md text-sm" value={sourceFunction} onChange={handleSourceFunctionChange} onBlur={handleSourceFunctionBlur}>
              <option value="">Select source function...</option>
              <option value="Evidence">Evidence</option>
              <option value="Definition">Definition</option>
              <option value="Background Info">Background Info</option>
              <option value="Data Point">Data Point</option>
              <option value="Theory">Theory</option>
              <option value="Concept">Concept</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">How does this source contribute to your research?</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Argument Type</label>
            <select className="w-full p-2 border border-gray-300 rounded-md text-sm" value={argumentType} onChange={handleArgumentTypeChange} onBlur={handleArgumentTypeBlur}>
              <option value="">Select argument type...</option>
              <option value="Thesis-supporting">Thesis-supporting</option>
              <option value="Counter-evidence">Counter-evidence</option>
              <option value="Neutral to thesis">Neutral to thesis</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Topical Tags</label>
            <div className="space-y-2">
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center gap-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleDeleteTag(tag)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-bold"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="relative">
                <input
                  className="w-full border rounded px-2 py-1"
                  value={tagInput}
                  onChange={handleTagInputChange}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder="Type a tag and press Enter..."
                />
                {showTagSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {filteredSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
        
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
            <textarea 
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Source Citation</label>
              <textarea 
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                placeholder="Author, Title, Publication, Date, URL..."
                rows={3}
                value={sourceCitation}
                onChange={handleSourceCitationChange}
                onBlur={handleSourceCitationBlur}
              />
              <p className="text-xs text-gray-500 mt-1">Include all available citation details. We'll help format this properly later.</p>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Source Credibility</label>
              <select className="w-full p-2 border border-gray-300 rounded-md text-sm" value={credibility} onChange={handleCredibilityChange} onBlur={handleCredibilityBlur}>
                <option value="">Select credibility level...</option>
                <option value="Peer-reviewed study">Peer-reviewed study</option>
                <option value="News article (reputable)">News article (reputable)</option>
                <option value="News article (biased)">News article (biased)</option>
                <option value="Expert opinion">Expert opinion</option>
                <option value="Institutional report">Institutional report</option>
                <option value="Personal experience">Personal experience</option>
                <option value="Blog or opinion piece">Blog or opinion piece</option>
                <option value="Speculative claim">Speculative claim</option>
                <option value="Social media post">Social media post</option>
                <option value="Unclear origin">Unclear origin</option>
              </select>
            </div>
          </div>
        </div>
      ) : sourceTab === "linked" ? (
        <LinkedCardsTab openCard={openCard} nodes={nodes} edges={edges} onEdgesChange={onEdgesChange} onClose={onClose} />
      ) : null}
    </div>
  );
} 