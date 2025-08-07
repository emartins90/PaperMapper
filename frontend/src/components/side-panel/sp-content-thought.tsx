"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import FileUploadSection from "../canvas-add-files/FileUploadSection";
import UnsavedCardFileUpload from "../shared/UnsavedCardFileUpload";
import { uploadFilesForCardType } from "../useFileUploadHandler";
import { useCardSave } from "../shared/useCardSave";
import LinkedCardsTab from "../LinkedCardsTab";
import { Label } from "@/components/ui/label";
import { MultiCombobox } from "@/components/ui/multi-combobox";
import { Spinner } from "@/components/ui/spinner";
import SimpleRichTextEditor from "../rich-text-editor/simple-rich-text-editor";

interface ThoughtCardContentProps {
  cardData: any;
  openCard: { id: string; type: string } | null;
  onUpdateNodeData?: (cardId: string, newData: any) => void;
  onAddCard?: (cardId: string) => void;
  onDeleteCard?: (cardId: string) => void;
  thoughtTab: string;
  nodes: any[];
  edges: any[];
  onEdgesChange?: (changes: any[]) => void;
  onClose?: () => void;
  onFormDataChange?: (data: any) => void;
  showSaveButton?: boolean;
  onFileClick?: (fileUrl: string, entry: any) => void; // Add this
  projectId?: number; // Add projectId prop
}

export default function ThoughtCardContent({ 
  cardData, 
  openCard, 
  onUpdateNodeData, 
  onAddCard, 
  onDeleteCard,
  thoughtTab,
  nodes,
  edges,
  onEdgesChange,
  onClose,
  onFormDataChange,
  showSaveButton,
  onFileClick,
  projectId // Add projectId prop
}: ThoughtCardContentProps) {
  const [thought, setThought] = React.useState(cardData?.thought || "");
  const [thoughtFormatted, setThoughtFormatted] = React.useState(cardData?.thoughtFormatted || "");
  const [files, setFiles] = React.useState<string[]>(cardData?.files || []);
  const [fileEntries, setFileEntries] = React.useState<Array<{ url: string; filename: string; type: string }>>(cardData?.fileEntries || []);
  const [isUploading, setIsUploading] = React.useState(false);
  const [deletingFiles, setDeletingFiles] = React.useState<Set<string>>(new Set());
  const [pendingNodeUpdate, setPendingNodeUpdate] = React.useState<{ files: string[], fileEntries: any[] } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // For unsaved cards, store files as File objects
  const [pendingFiles, setPendingFiles] = React.useState<File[]>(cardData?.pendingFiles || []);

  // Add tags state
  const [tags, setTags] = React.useState<string[]>(Array.isArray(cardData?.tags) ? cardData.tags : []);

  // Check if card is unsaved
  const isUnsaved = !cardData?.thoughtId;

  // Use the shared save hook
  const { saveCard, isSaving } = useCardSave({
    cardId: openCard?.id || "",
    cardType: "thought",
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
        const nodeTags = Array.isArray(node.data.tags) ? node.data.tags : (node.data.tags ? [node.data.tags] : []);
        nodeTags.forEach((tag: string) => allTags.add(tag));
      }
    });
    return Array.from(allTags).sort();
  };

  // Rich text editor handler
  const handleThoughtFormattedChange = (html: string, plainText: string) => {
    setThoughtFormatted(html);
    setThought(plainText);
  };

  React.useEffect(() => {
    setThought(cardData?.thought || "");
    setThoughtFormatted(cardData?.thoughtFormatted || "");
    setFiles(cardData?.files || []);
    setFileEntries(cardData?.fileEntries || []);
    setPendingFiles(cardData?.pendingFiles || []);
    setTags(Array.isArray(cardData?.tags) ? cardData.tags : []);
  }, [openCard?.id]);

  // Update form data for parent component when fields change
  React.useEffect(() => {
    if (onFormDataChange) {
      onFormDataChange({
        thoughtText: thought,
        thoughtTextFormatted: thoughtFormatted,
        uploadedFiles: pendingFiles,
      });
    }
  }, [thought, thoughtFormatted, pendingFiles, onFormDataChange]);

  // Handle pending node updates
  React.useEffect(() => {
    if (pendingNodeUpdate && openCard) {
      onUpdateNodeData?.(openCard.id, pendingNodeUpdate);
      setPendingNodeUpdate(null);
    }
  }, [pendingNodeUpdate, openCard, onUpdateNodeData]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !openCard) return;
    
    setIsUploading(true);
    try {
      // If we have a backend ID, upload to backend
      if (cardData?.thoughtId) {
        const result = await uploadFilesForCardType(
          "thought",
          cardData.thoughtId,
          Array.from(e.target.files),
          files,
          (newFiles, newFileEntries) => {
            setFiles(newFiles);
            setFileEntries(prev => {
              const updatedFileEntries = [...prev, ...(newFileEntries || [])];
              
              // Queue node data update for next render cycle
              const pendingUpdate = { files: newFiles, fileEntries: updatedFileEntries };
              setPendingNodeUpdate(pendingUpdate);
              
              return updatedFileEntries;
            });
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
      console.error("File upload error:", err);
      alert("Failed to upload file: " + (err as Error).message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileDelete = async (fileUrl: string) => {
    if (!openCard) return;
    
    // Add file to deleting set
    setDeletingFiles(prev => new Set(prev).add(fileUrl));
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/thoughts/delete_file/?thought_id=${cardData?.thoughtId}&file_url=${encodeURIComponent(fileUrl)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to delete file");
      const newFiles = files.filter(f => f !== fileUrl);
      const newFileEntries = fileEntries.filter(entry => entry.url !== fileUrl);
      setFiles(newFiles);
      setFileEntries(newFileEntries);
      onUpdateNodeData?.(openCard.id, { files: newFiles, fileEntries: newFileEntries });
    } catch (err) {
      alert("Failed to delete file: " + (err as Error).message);
    } finally {
      // Remove file from deleting set
      setDeletingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileUrl);
        return newSet;
      });
    }
  };

  const handleSaveThought = async () => {
    if (!openCard || !thought.trim()) return;

    try {
      await saveCard({
        cardId: openCard.id,
        chatAnswers: {
          thoughtText: thought,
          thoughtTextFormatted: thoughtFormatted,
        },
        uploadedFiles: pendingFiles,
      });
    } catch (error) {
      console.error("Failed to save thought:", error);
      alert("Failed to save thought: " + (error as Error).message);
    }
  };

  // Save all fields to backend for saved cards
  const saveAllFields = async () => {
    if (!cardData?.thoughtId) return; // Only for saved cards

    const token = localStorage.getItem("token");
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const thoughtId = cardData.thoughtId;

    const payload = {
      project_id: projectId,
      thought_text: thought,
      thought_text_formatted: thoughtFormatted,
      tags: tags,
    };

    const response = await fetch(`${API_URL}/thoughts/${thoughtId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      alert(`Failed to save changes: ${response.status} ${errorText}`);
      return;
    }

    // Update node data
    if (onUpdateNodeData && openCard) {
      onUpdateNodeData(openCard.id, {
        thought: thought,
        thoughtFormatted: thoughtFormatted,
        tags: tags,
      });
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {thoughtTab === "info" ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thought</label>
            <SimpleRichTextEditor
              value={thoughtFormatted}
              onChange={handleThoughtFormattedChange}
              placeholder="Share your thought..."
              className="min-h-[120px] max-h-[400px]"
              cardType="thought"
              showSaveButton={!!cardData?.thoughtId}
              onSave={() => saveAllFields()}
            />
          </div>
          
          <div>
            <Label htmlFor="thought-tags" className="block text-sm font-medium text-gray-700 mb-1">Tags</Label>
            <MultiCombobox
              options={getAllExistingTags().map(tag => ({ value: tag, label: tag }))}
              value={tags}
              onChange={(newTags) => {
                setTags(newTags);
                if (!isUnsaved) {
                  onUpdateNodeData?.(openCard?.id || "", { tags: newTags });
                }
              }}
              placeholder="Type a tag and press Enter..."
              allowCustom={true}
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
              onFileDelete={handleFileDelete}
              fileInputRef={fileInputRef}
              fileEntries={fileEntries}
              cardType="thought"
              onFileClick={onFileClick}
              deletingFiles={deletingFiles}
            />
          )}

          {/* Save button for unsaved cards - only show if showSaveButton is true */}
          {isUnsaved && showSaveButton && (
            <div className="pt-4">
              <button
                onClick={handleSaveThought}
                disabled={isSaving || !thought.trim()}
                className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSaving ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Thought"
                )}
              </button>
            </div>
          )}
        </div>
      ) : thoughtTab === "linked" ? (
        <LinkedCardsTab openCard={openCard} nodes={nodes} edges={edges} onEdgesChange={onEdgesChange} onClose={onClose} panelJustOpened={false} />
      ) : null}
    </div>
  );
} 