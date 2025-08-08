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
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Check, X } from "lucide-react";
import { cn, validateFiles } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { TextWithLinks } from "@/components/ui/text-with-links";
import SimpleRichTextEditor from "@/components/rich-text-editor/simple-rich-text-editor";

interface Citation {
  id: number;
  text: string;
  credibility: string | null;
  project_id: number;
}

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
  onFileClick?: (fileUrl: string, entry: any) => void; // Add this
  projectId?: number; // Add projectId prop
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
  showSaveButton,
  onFileClick, // Add this
  projectId // Add projectId
}: SourceCardContentProps) {
  const [notes, setNotes] = useState(cardData?.additionalNotes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [files, setFiles] = useState<string[]>(cardData?.files || []);
  const [fileEntries, setFileEntries] = useState<Array<{ url: string; filename: string; type: string }>>(cardData?.fileEntries || []);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set());
  const [pendingNodeUpdate, setPendingNodeUpdate] = useState<{ files: string[], fileEntries: any[] } | null>(null);
  
  // For unsaved cards, store files as File[] objects
  const [pendingFiles, setPendingFiles] = useState<File[]>(cardData?.pendingFiles || []);
  
  // Add state for all editable fields
  const [sourceCitation, setSourceCitation] = useState(cardData?.source || "");
  const [summary, setSummary] = useState(cardData?.summary || "");
  const [summaryFormatted, setSummaryFormatted] = useState(cardData?.summaryFormatted || "");
  const [sourceContent, setSourceContent] = useState(cardData?.text || "");
  const [sourceContentFormatted, setSourceContentFormatted] = useState(cardData?.contentFormatted || "");
  const [tags, setTags] = useState<string[]>(Array.isArray(cardData?.tags) ? cardData.tags : []);
  const [argumentType, setArgumentType] = useState(cardData?.thesisSupport || "");
  const [sourceFunction, setSourceFunction] = useState(cardData?.sourceFunction || "");
  const [credibility, setCredibility] = useState(cardData?.credibility || "");

  // Citation selection state
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [citationSelectorOpen, setCitationSelectorOpen] = useState(false);
  const [citationSearchValue, setCitationSearchValue] = useState("");
  const [showNewCitationModal, setShowNewCitationModal] = useState(false);
  const [newCitationText, setNewCitationText] = useState("");
  const [newCitationCredibility, setNewCitationCredibility] = useState("");
  
  // Edit citation modal state
  const [editingCitation, setEditingCitation] = useState<Citation | null>(null);
  const [editText, setEditText] = useState("");
  const [editCredibility, setEditCredibility] = useState("");
  const [isSavingCitation, setIsSavingCitation] = useState(false);
  
  // Track local citation state to handle immediate UI updates
  const [localCitationId, setLocalCitationId] = useState<number | null>(cardData?.citationId || null);

  
  // Track if we need to refresh citation data from database
  const [shouldRefreshCitation, setShouldRefreshCitation] = useState(false);
  
  // Track if we're making a citation-only update to prevent field resets
  const isCitationOnlyUpdateRef = useRef(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const sourceFunctionOptions = useCustomOptions("sourceFunction");
  const sourceCredibilityOptions = useCustomOptions("sourceCredibility");

  // Check if card is unsaved
  const isUnsaved = !cardData?.sourceMaterialId;

  // Use the shared save hook
  const { saveCard, isSaving: isSavingCard } = useCardSave({
    cardId: openCard?.id || "",
    cardType: "source",
    projectId: projectId || 0,
    onUpdateNodeData,
    onAddCard,
    onDeleteCard,
  });

  // Get all existing tags from all cards
  const getAllExistingTags = () => {
    const allTags = new Set<string>();
    nodes.forEach(node => {
      if (node.data?.tags) {
        const nodeTags = Array.isArray(node.data.tags) ? node.data.tags : [];
        nodeTags.forEach((tag: string) => allTags.add(tag));
      }
    });
    return Array.from(allTags).sort();
  };

  // Fetch existing citations
  const fetchCitations = async () => {
    if (!projectId) return;
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/citations/?project_id=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setCitations(data);
      }
    } catch (error) {
      console.error("Failed to fetch citations:", error);
    }
  };

  // Fetch citation data for saved cards
  const fetchCardCitationData = async () => {
    if (!cardData?.sourceMaterialId || !projectId) return;
    
    try {
      const token = localStorage.getItem("token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const response = await fetch(`${API_URL}/source_materials/${cardData.sourceMaterialId}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update citation state based on database data
        if (data.citation_id && citations.length > 0) {
          const citation = citations.find(c => c.id === data.citation_id);
          if (citation) {
            setSelectedCitation(citation);
            setLocalCitationId(data.citation_id);
            setSourceCitation(citation.text);
            setCredibility(citation.credibility || "");
          }
        } else {
          // No citation in database
          setSelectedCitation(null);
          setLocalCitationId(null);
          setSourceCitation("");
          setCredibility("");
        }
      }
    } catch (error) {
      console.error("Failed to fetch card citation data:", error);
    }
  };

  // Load citations on mount
  useEffect(() => {
    fetchCitations();
  }, [projectId]);

  // Listen for citation updates
  useEffect(() => {
    const handleCitationUpdate = () => {
      fetchCitations();
    };
    window.addEventListener('citationUpdate', handleCitationUpdate);
    return () => window.removeEventListener('citationUpdate', handleCitationUpdate);
  }, [projectId]);

  // Update all fields when component mounts or card changes
  useEffect(() => {
    // Skip field resets if we're making a citation-only update for unsaved cards
    if (isCitationOnlyUpdateRef.current && isUnsaved) {
      isCitationOnlyUpdateRef.current = false;
      
      // Only handle citation state, don't reset other fields
      if (cardData?.citationId && citations.length > 0) {
        const citation = citations.find(c => c.id === cardData.citationId);
        if (citation) {
          setSelectedCitation(citation);
          setLocalCitationId(cardData.citationId);
          setSourceCitation(citation.text);
          setCredibility(citation.credibility || "");
        }
      } else {
        setSelectedCitation(null);
        setLocalCitationId(null);
      }
      return;
    }
    
    setNotes(cardData?.additionalNotes || "");
    setSourceCitation(cardData?.source || "");
    setSummary(cardData?.summary || "");
    setSummaryFormatted(cardData?.summaryFormatted || "");
    setSourceContent(cardData?.text || "");
    setSourceContentFormatted(cardData?.contentFormatted || "");
    setTags(Array.isArray(cardData?.tags) ? cardData.tags : []);
    setArgumentType(cardData?.thesisSupport || "");
    setSourceFunction(cardData?.sourceFunction || "");
    setCredibility(cardData?.credibility || "");
    setPendingFiles(cardData?.pendingFiles || []);
    
    // Handle citation state based on whether card is saved or unsaved
    if (isUnsaved) {
      // For unsaved cards, use local state from cardData
      if (cardData?.citationId && citations.length > 0) {
        const citation = citations.find(c => c.id === cardData.citationId);
        if (citation) {
          setSelectedCitation(citation);
          setLocalCitationId(cardData.citationId);
          setSourceCitation(citation.text);
          setCredibility(citation.credibility || "");
        }
      } else {
        setSelectedCitation(null);
        setLocalCitationId(null);
      }
    } else {
      // For saved cards, fetch from database
      fetchCardCitationData();
    }
  }, [openCard?.id, cardData, citations, isUnsaved, shouldRefreshCitation]);

  // Update form data for parent component when fields change
  useEffect(() => {
    if (onFormDataChange) {
      onFormDataChange({
        sourceContent: sourceContent,
        sourceContentFormatted: sourceContentFormatted,
        summary: summary,
        summaryFormatted: summaryFormatted,
        topicalTags: tags,
        argumentType: argumentType,
        sourceFunction: sourceFunction,
        sourceCredibility: selectedCitation?.credibility || credibility,
        sourceCitation: selectedCitation?.text || sourceCitation,
        selectedCitationId: selectedCitation?.id || null,
        uploadedFiles: pendingFiles,
      });
    }
  }, [sourceContent, sourceContentFormatted, summary, summaryFormatted, tags, argumentType, sourceFunction, credibility, sourceCitation, selectedCitation, pendingFiles, onFormDataChange]);

  // Update files when cardData changes
  useEffect(() => {
    setFiles(cardData?.files || []);
    setFileEntries(cardData?.fileEntries || []);
  }, [cardData?.files, cardData?.fileEntries]);

  // Handle pending node updates
  useEffect(() => {
    if (pendingNodeUpdate && openCard) {
      onUpdateNodeData?.(openCard.id, pendingNodeUpdate);
      setPendingNodeUpdate(null);
    }
  }, [pendingNodeUpdate, openCard, onUpdateNodeData]);

  // Save all fields to backend
  const saveAllFields = async () => {
    
    // Always update local node data first
    if (onUpdateNodeData) {
      onUpdateNodeData(openCard?.id || "", {
        source: sourceCitation,
        summary: summary,
        summaryFormatted: summaryFormatted,
        text: sourceContent,
        contentFormatted: sourceContentFormatted,
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
      
      // Save citation if it exists and has changed
      if (cardData?.citationId) {
        await saveCitation(sourceCitation, credibility);
      }
      
      const payload = {
        project_id: cardData.projectId,
        citation_id: cardData.citationId,
        content: sourceContent,
        content_formatted: sourceContentFormatted,
        summary: summary,
        summary_formatted: summaryFormatted,
        tags: tags,
        argument_type: argumentType,
        function: sourceFunction,
        files: files.join(','),
        notes: notes,
      };
      
      const response = await fetch(`${API_URL}/source_materials/${cardData.sourceMaterialId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        toast.error(`Failed to save changes: ${response.status} ${errorText}`);
      }

      // Dispatch source material update event to refresh source list
      window.dispatchEvent(new CustomEvent('sourceMaterialUpdate'));
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error("Failed to save changes: " + (error as Error).message);
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
        summaryFormatted: summaryFormatted,
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
        content_formatted: sourceContentFormatted,
        summary: summary,
        summary_formatted: summaryFormatted,
        tags: tagsToSave,
          argument_type: argumentType,
          function: sourceFunction,
          files: files.join(','),
          notes: notes,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        toast.error(`Failed to save changes: ${response.status} ${errorText}`);
      }

      // Dispatch source material update event to refresh source list
      window.dispatchEvent(new CustomEvent('sourceMaterialUpdate'));
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error("Failed to save changes: " + (error as Error).message);
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
        summaryFormatted: summaryFormatted,
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
        content_formatted: sourceContentFormatted,
        summary: summary,
        summary_formatted: summaryFormatted,
        tags: tags,
        argument_type: argumentTypeToSave,
          function: sourceFunction,
          files: files.join(','),
          notes: notes,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        toast.error(`Failed to save changes: ${response.status} ${errorText}`);
      }

      // Dispatch source material update event to refresh source list
      window.dispatchEvent(new CustomEvent('sourceMaterialUpdate'));
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error("Failed to save changes: " + (error as Error).message);
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
        summaryFormatted: summaryFormatted,
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
        content_formatted: sourceContentFormatted,
        summary: summary,
        summary_formatted: summaryFormatted,
        tags: tags,
        argument_type: argumentType,
        function: sourceFunctionToSave,
          files: files.join(','),
          notes: notes,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        toast.error(`Failed to save changes: ${response.status} ${errorText}`);
      }

      // Dispatch source material update event to refresh source list
      window.dispatchEvent(new CustomEvent('sourceMaterialUpdate'));
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error("Failed to save changes: " + (error as Error).message);
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
      
      // Save citation if it exists
      if (cardData?.citationId) {
        await saveCitation(sourceCitation, credibilityToSave);
      }
      
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
          content_formatted: sourceContentFormatted,
          summary: summary,
          summary_formatted: summaryFormatted,
          tags: tags,
          argument_type: argumentType,
          function: sourceFunction,
          files: files.join(','),
          notes: notes,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        toast.error(`Failed to save changes: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error("Failed to save changes: " + (error as Error).message);
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
          content_formatted: sourceContentFormatted,
          summary: summary,
          summary_formatted: summaryFormatted,
          tags: tags,
          argument_type: argumentType,
          function: sourceFunction,
          files: files.join(','),
          notes: newNotes,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        toast.error(`Failed to save notes: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error("Error saving notes:", error);
      // Revert the notes if save failed
      setNotes(cardData?.additionalNotes || "");
    } finally {
      setIsSaving(false);
    }
  };

  // Save citation to backend
  const saveCitation = async (citationText: string, citationCredibility: string) => {
    if (!cardData?.citationId) return;
    
    try {
      const token = localStorage.getItem("token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const response = await fetch(`${API_URL}/citations/${cardData.citationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          text: citationText,
          credibility: citationCredibility,
          project_id: projectId,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        toast.error(`Failed to update citation: ${response.status} ${errorText}`);
      }

      // Dispatch citation update event to refresh source list
      window.dispatchEvent(new CustomEvent('citationUpdate'));
    } catch (error) {
      console.error("Error saving citation:", error);
      toast.error("Failed to save citation: " + (error as Error).message);
    }
  };


  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !openCard) return;
    
    const newFiles = Array.from(e.target.files);
    
    // Validate the new files
    const validation = validateFiles(newFiles, files.length);
    
    if (!validation.isValid) {
      // Show error messages
      validation.errors.forEach(error => {
        toast.error(error);
      });
      return;
    }
    
    setIsUploading(true);
    try {
      // If we have a backend ID, upload to backend
      if (cardData?.sourceMaterialId) {
        const result = await uploadFilesForCardType(
          "source",
          cardData.sourceMaterialId,
          newFiles,
          files,
          (newFiles, newFileEntries) => {
            setFiles(newFiles);
            setFileEntries(prev => {
              const updatedFileEntries = [...prev, ...(newFileEntries || [])];
              return updatedFileEntries;
            });
            // Queue node data update for next render cycle
            setPendingNodeUpdate({ files: newFiles, fileEntries: [...fileEntries, ...(newFileEntries || [])] });
          }
        );
      } else {
        // For new cards, store files locally as File objects
        const updatedPendingFiles = [...pendingFiles, ...newFiles];
        setPendingFiles(updatedPendingFiles);
        onUpdateNodeData?.(openCard.id, { 
          pendingFiles: updatedPendingFiles
        });
      }
    } catch (err) {
      console.error("File upload error:", err);
      toast.error("Failed to upload file: " + (err as Error).message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle file deletion
  const handleDeleteFile = async (fileUrl: string) => {
    const filename = fileUrl.split('/').pop();
    if (!filename) {
      toast.error('Could not determine filename.');
      return;
    }
    if (!cardData || !cardData.sourceMaterialId || !cardData.projectId) {
      toast.error('Source material data is missing.');
      return;
    }
    
    // Add file to deleting set
    setDeletingFiles(prev => new Set(prev).add(fileUrl));
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      // Delete the file from the uploads directory (ignore 404)
      await fetch(`${API_URL}/upload/${filename}`, { method: 'DELETE' });

      // Remove the file from the files array
      const newFiles = files.filter(f => f !== fileUrl);
      const newFileEntries = fileEntries.filter(entry => entry.url !== fileUrl);
      setFiles(newFiles);
      setFileEntries(newFileEntries);

      // Prepare the update payload (all required fields, snake_case)
      const payload = {
        citation_id: cardData.citationId ?? null,
        project_id: cardData.projectId,
        content: cardData.text ?? "",
        summary: cardData.summary ?? "",
        tags: Array.isArray(cardData.tags) ? cardData.tags : (cardData.tags ?? []),
        argument_type: cardData.thesisSupport ?? "",
        function: cardData.sourceFunction ?? "",
        files: newFiles.length ? newFiles.join(',') : "",
        file_filenames: newFileEntries.length ? newFileEntries.map(entry => entry.filename).join(',') : "",
        notes: cardData.additionalNotes ?? "",
      };

      // Update the source material in the backend
      const updateRes = await fetch(`${API_URL}/source_materials/${cardData.sourceMaterialId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!updateRes.ok) {
        const errorText = await updateRes.text();
        toast.error('Failed to update source material: ' + errorText);
      }
      
      // Update the node data in the parent component to reflect the change immediately
      if (onUpdateNodeData) {
        onUpdateNodeData(openCard?.id || "", { files: newFiles, fileEntries: newFileEntries });
      }
    } catch (err) {
      toast.error('Failed to fully delete file.');
    } finally {
      // Remove file from deleting set
      setDeletingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileUrl);
        return newSet;
      });
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

  const handleSummaryFormattedChange = (html: string, plainText: string) => {
    setSummaryFormatted(html);
    setSummary(plainText);
  };

  const handleSourceContentChange = (html: string, plainText: string) => {
    setSourceContentFormatted(html);
    setSourceContent(plainText);
  };

  // Handle field blur (save when user leaves the field, only for saved cards)
  const handleSourceCitationBlur = () => {
    if (!isUnsaved) {
      // Save citation if it exists
      if (cardData?.citationId) {
        saveCitation(sourceCitation, credibility);
      }
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

  const handleSaveSource = async () => {
    if (!openCard) return;

    try {
      await saveCard({
        cardId: openCard.id,
        chatAnswers: {
          sourceContent: sourceContent,
          sourceContentFormatted: sourceContentFormatted,
          summary: summary,
          summaryFormatted: summaryFormatted,
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
      toast.error("Failed to save source: " + (error as Error).message);
    }
  };

  // Handle citation selection
  const handleCitationSelect = async (citation: Citation) => {
    // Immediately update all citation-related state
    setSelectedCitation(citation);
    setLocalCitationId(citation.id);
    setSourceCitation(citation.text);
    setCredibility(citation.credibility || "");
    setCitationSelectorOpen(false);
    setCitationSearchValue("");
    
    if (isUnsaved) {
      // For unsaved cards, update node data with citation-only flag to prevent field resets
      if (onUpdateNodeData && openCard) {
        isCitationOnlyUpdateRef.current = true;
        onUpdateNodeData(openCard.id, {
          citationId: citation.id,
          source: citation.text,
          credibility: citation.credibility || "",
        });
      }
    } else {
      // For saved cards, update node data and save to database
      if (onUpdateNodeData && openCard) {
        onUpdateNodeData(openCard.id, {
          source: citation.text,
          credibility: citation.credibility || "",
          citationId: citation.id,
        });
      }

      // Save citation association to database for saved cards
      if (cardData?.sourceMaterialId) {
        try {
          const token = localStorage.getItem("token");
          const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          
          const payload = {
            project_id: cardData.projectId,
            citation_id: citation.id, // Associate the citation
            content: sourceContent,
            content_formatted: sourceContentFormatted,
            summary: summary,
            summary_formatted: summaryFormatted,
            tags: tags,
            argument_type: argumentType,
            function: sourceFunction,
            files: files.join(','),
            notes: notes,
          };
          
          const response = await fetch(`${API_URL}/source_materials/${cardData.sourceMaterialId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
            body: JSON.stringify(payload),
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            toast.error(`Failed to associate citation: ${response.status} ${errorText}`);
          }

          // Dispatch source material update event to refresh source list
          window.dispatchEvent(new CustomEvent('sourceMaterialUpdate'));
          
          // Trigger a refresh of citation data from database
          setShouldRefreshCitation(prev => !prev);
          
        } catch (error) {
          console.error("Failed to associate citation:", error);
          toast.error("Failed to associate citation: " + (error as Error).message);
        }
      }
    }
  };

  // Handle citation removal
  const handleCitationRemove = async () => {
    // Clear all citation-related state immediately
    setSelectedCitation(null);
    setSourceCitation("");
    setCredibility("");
    setLocalCitationId(null);
    
    if (isUnsaved) {
      // For unsaved cards, update node data with citation-only flag to prevent field resets
      if (onUpdateNodeData && openCard) {
        isCitationOnlyUpdateRef.current = true;
        onUpdateNodeData(openCard.id, {
          citationId: null,
          source: "",
          credibility: "",
        });
      }
    } else {
      // For saved cards, update node data and save to database
      if (onUpdateNodeData && openCard) {
        onUpdateNodeData(openCard.id, {
          ...cardData,
          source: "",
          credibility: "",
          citationId: null,
        });
      }

      // Save to backend if we have a source material ID
      if (cardData?.sourceMaterialId) {
        try {
          const token = localStorage.getItem("token");
          const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          
          const payload = {
            project_id: cardData.projectId,
            citation_id: null, // Remove the citation reference
            content: sourceContent,
            content_formatted: sourceContentFormatted,
            summary: summary,
            summary_formatted: summaryFormatted,
            tags: tags,
            argument_type: argumentType,
            function: sourceFunction,
            files: files.join(','),
            notes: notes,
          };
          
          const response = await fetch(`${API_URL}/source_materials/${cardData.sourceMaterialId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
            body: JSON.stringify(payload),
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            toast.error(`Failed to remove citation: ${response.status} ${errorText}`);
          }

          // Dispatch source material update event to refresh source list
          window.dispatchEvent(new CustomEvent('sourceMaterialUpdate'));
          
          // Trigger a refresh of citation data from database
          setShouldRefreshCitation(prev => !prev);
          
        } catch (error) {
          console.error("Failed to remove citation:", error);
          toast.error("Failed to remove citation: " + (error as Error).message);
          
          // If the database update failed, revert the UI state
          if (cardData?.citationId && citations.length > 0) {
            const citation = citations.find(c => c.id === cardData.citationId);
            if (citation) {
              setSelectedCitation(citation);
              setLocalCitationId(cardData.citationId);
              setSourceCitation(citation.text);
              setCredibility(citation.credibility || "");
            }
          }
        }
      }
    }
  };

  // Handle new citation creation
  const handleCreateNewCitation = async () => {
    if (!newCitationText.trim() || !projectId) return;
    
    try {
      const token = localStorage.getItem("token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const response = await fetch(`${API_URL}/citations/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          text: newCitationText.trim(),
          credibility: newCitationCredibility || null,
          project_id: projectId,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        toast.error(`Failed to create citation: ${response.status} ${errorText}`);
        return;
      }
      
      const newCitation = await response.json();
      
      // Update local state
      setCitations(prev => [...prev, newCitation]);
      setSelectedCitation(newCitation);
      setShowNewCitationModal(false);
      setNewCitationText("");
      setNewCitationCredibility("");
      
      // Update node data
      if (onUpdateNodeData && openCard) {
        onUpdateNodeData(openCard.id, {
          source: newCitation.text,
          credibility: newCitation.credibility || "",
          citationId: newCitation.id,
        });
      }

      // Save citation association to database for saved cards
      if (cardData?.sourceMaterialId) {
        const payload = {
          project_id: cardData.projectId,
          citation_id: newCitation.id, // Associate the new citation
          content: sourceContent,
          content_formatted: sourceContentFormatted,
          summary: summary,
          summary_formatted: summaryFormatted,
          tags: tags,
          argument_type: argumentType,
          function: sourceFunction,
          files: files.join(','),
          notes: notes,
        };
        
        const sourceMaterialResponse = await fetch(`${API_URL}/source_materials/${cardData.sourceMaterialId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify(payload),
        });
        
        if (!sourceMaterialResponse.ok) {
          const errorText = await sourceMaterialResponse.text();
          toast.error(`Failed to associate citation: ${sourceMaterialResponse.status} ${errorText}`);
          return;
        }

        // Dispatch source material update event to refresh source list
        window.dispatchEvent(new CustomEvent('sourceMaterialUpdate'));
      }
      
      // Dispatch citation update event
      window.dispatchEvent(new CustomEvent('citationUpdate'));
    } catch (error) {
      console.error("Failed to create citation:", error);
      toast.error("Failed to create citation: " + (error as Error).message);
    }
  };

  // Handle edit citation
  const handleEditCitation = (citation: Citation) => {
    setEditingCitation(citation);
    setEditText(citation.text);
    setEditCredibility(citation.credibility || "none");
  };

  // Handle save edited citation
  const handleSaveEditedCitation = async () => {
    if (!editingCitation || !editText.trim()) return;
    
    setIsSavingCitation(true);
    try {
      const token = localStorage.getItem("token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const response = await fetch(`${API_URL}/citations/${editingCitation.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          text: editText.trim(),
          credibility: editCredibility === "none" ? null : editCredibility,
          project_id: projectId,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        toast.error(`Failed to update citation: ${response.status} ${errorText}`);
        return;
      }
      
      const updatedCitation = await response.json();
      
      // Update local state
      setCitations(prev => prev.map(c => c.id === editingCitation.id ? updatedCitation : c));
      
      // Update selected citation if it's the one being edited
      if (selectedCitation && selectedCitation.id === editingCitation.id) {
        setSelectedCitation(updatedCitation);
        
        // Update node data
        if (onUpdateNodeData && openCard) {
          onUpdateNodeData(openCard.id, {
            source: updatedCitation.text,
            credibility: updatedCitation.credibility || "",
          });
        }
      }
      
      setEditingCitation(null);
      setEditText("");
      setEditCredibility("");
      
      // Dispatch citation update event
      window.dispatchEvent(new CustomEvent('citationUpdate'));
    } catch (error) {
      console.error("Failed to update citation:", error);
      toast.error("Failed to update citation: " + (error as Error).message);
    } finally {
      setIsSavingCitation(false);
    }
  };

  // Filter citations for search
  const filteredCitations = citations.filter(citation =>
    citation.text.toLowerCase().includes(citationSearchValue.toLowerCase()) ||
    (citation.credibility && citation.credibility.toLowerCase().includes(citationSearchValue.toLowerCase()))
  );

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
            <SimpleRichTextEditor
              value={sourceContentFormatted}
              onChange={handleSourceContentChange}
              placeholder="Type or paste the full text content, quotes, or relevant excerpts from your source..."
              className="min-h-[120px] max-h-[600px]"
              cardType="source"
              showSaveButton={!!cardData?.sourceMaterialId}
              onSave={() => saveAllFields()}
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
              onFileClick={onFileClick}
              deletingFiles={deletingFiles}
            />
          )}
          
          <div>
            <Label htmlFor="source-notes" className="block text-sm font-medium text-gray-600 mb-1">Additional Notes</Label>
            <Textarea
              id="source-notes"
              className="min-h-[80px] max-h-[400px] resize-y overflow-auto"
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
                disabled={isSavingCard}
                className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSavingCard ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Source"
                )}
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
            <p className="text-xs text-gray-500 mt-1">How does this source contribute to your paper?</p>
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
            <SimpleRichTextEditor
              value={summaryFormatted}
              onChange={handleSummaryFormattedChange}
              placeholder="Write a brief summary (2-3 sentences) of the key points..."
              className="min-h-[80px] max-h-[200px] resize-y overflow-auto"
              cardType="source"
              showSaveButton={!!cardData?.sourceMaterialId}
              onSave={() => saveAllFields()}
            />
            <p className="text-xs text-gray-500 mt-1">Focus on the most relevant information for your questions.</p>
          </div>
          
          <div className="border-t border-gray-200 pt-4">
            <div>
              <Label htmlFor="source-citation" className="block text-sm font-medium text-gray-700 mb-1">Source Citation</Label>
              
              {/* Show selected citation or citation input fields */}
              {selectedCitation ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div className="flex-1 min-w-0 pr-3">
                      {selectedCitation.credibility && (
                        <p className="text-sm font-medium text-foreground mb-1">{selectedCitation.credibility}</p>
                      )}
                      <div className="text-sm text-gray-900 break-words">
                  <TextWithLinks text={selectedCitation.text} />
                </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditCitation(selectedCitation)}
                        className="p-1 h-8 w-8 flex-shrink-0"
                        title="Edit citation (changes will apply to all source cards using this citation)"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          handleCitationRemove();
                        }}
                        className="p-1 h-8 w-8 text-red-600 hover:text-red-700 flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Citation selection buttons */}
                  <div className="flex gap-2">
                    {citations.length > 0 && (
                      <Popover open={citationSelectorOpen} onOpenChange={setCitationSelectorOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="flex-1">
                            Add Existing Citation
                          </Button>
                        </PopoverTrigger>
                      <PopoverContent className="w-96 p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder="Search citations..."
                            value={citationSearchValue}
                            onValueChange={setCitationSearchValue}
                          />
                          <CommandList className="max-h-96">
                            <CommandEmpty>No citations found.</CommandEmpty>
                            <CommandGroup>
                              {filteredCitations.map((citation: Citation) => (
                                <CommandItem
                                  key={citation.id}
                                  value={citation.text}
                                  onSelect={() => handleCitationSelect(citation)}
                                >
                                  <div className="flex-1">
                                    <div className="text-sm font-medium break-words" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                  <TextWithLinks text={citation.text} disableLinks={true} />
                </div>
                                    {citation.credibility && (
                                      <p className="text-xs text-gray-600">Credibility: {citation.credibility}</p>
                                    )}
                                  </div>
                                  <Check className={cn("ml-2 h-4 w-4", (selectedCitation && (selectedCitation as Citation).id === citation.id) ? "opacity-100" : "opacity-0")} />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    )}
                    
                    {!isUnsaved && (
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => setShowNewCitationModal(true)}
                      >
                        Add New Citation
                      </Button>
                    )}
                  </div>
                  
                  {/* Citation input fields - only show for unsaved cards */}
                  {isUnsaved && (
                    <div className="space-y-3">
                      <div>
                        <Textarea 
                          id="source-citation"
                          placeholder="Author, Title, Publication, Date, URL, DOI..."
                          rows={3}
                          value={sourceCitation}
                          onChange={handleSourceCitationChange}
                          onBlur={handleSourceCitationBlur}
                        />
                        <p className="text-xs text-gray-500 mt-1">Include all available citation details.</p>
                      </div>
              
                      <div>
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
                            ...(sourceCredibilityOptions.options || []).filter(
                              (o: { value: string; label: string }) => ![
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
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Save button for unsaved cards - only show if showSaveButton is true */}
          {isUnsaved && showSaveButton && (
            <div className="pt-4">
              <button
                onClick={handleSaveSource}
                disabled={isSavingCard}
                className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingCard ? "Saving..." : "Save Source"}
              </button>
            </div>
          )}
        </div>
      ) : sourceTab === "linked" ? (
        <LinkedCardsTab openCard={openCard} nodes={nodes} edges={edges} onEdgesChange={onEdgesChange} onClose={onClose} panelJustOpened={false} />
      ) : null}

      {/* New Citation Modal */}
      <Dialog open={showNewCitationModal} onOpenChange={setShowNewCitationModal}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="pb-4">
            <DialogTitle>Add New Citation</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label htmlFor="new-citation-text" className="block text-sm font-medium text-gray-700 mb-1">Citation Text</Label>
              <Textarea
                id="new-citation-text"
                placeholder="Author, Title, Publication, Date, URL..."
                rows={3}
                value={newCitationText}
                onChange={(e) => setNewCitationText(e.target.value)}
                className="resize-none"
                style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
              />
            </div>
            <div>
              <Label htmlFor="new-citation-credibility" className="block text-sm font-medium text-gray-700 mb-1">Credibility</Label>
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
                  ...((sourceCredibilityOptions.options as { value: string; label: string }[]) || []).filter(
                    (o: { value: string; label: string }) => ![
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
                value={newCitationCredibility || ""}
                onChange={async (value) => {
                  setNewCitationCredibility(value);
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
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setShowNewCitationModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateNewCitation} disabled={!newCitationText.trim()}>
              Create Citation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Citation Modal */}
      <Dialog open={!!editingCitation} onOpenChange={(open) => !open && setEditingCitation(null)}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="pb-2">
            <DialogTitle>Edit Citation</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label htmlFor="edit-citation-text" className="block text-sm font-medium text-gray-700 mb-1">Citation Text</Label>
              <Textarea
                id="edit-citation-text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                className="w-full resize-none"
                style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
              />
            </div>

            <div>
              <Label htmlFor="edit-citation-credibility" className="block text-sm font-medium text-gray-700 mb-1">Credibility</Label>
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
                  ...(sourceCredibilityOptions.options || []).filter(
                    (o: { value: string; label: string }) => ![
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
                value={editCredibility === "none" ? "" : editCredibility}
                onChange={async (value) => {
                  setEditCredibility(value || "none");
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
            <p className="text-sm text-gray-600">
              This citation is shared across multiple source cards. Changes will apply to all cards using this citation.
            </p>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setEditingCitation(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditedCitation} disabled={isSavingCitation || !editText.trim()}>
              {isSavingCitation ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 