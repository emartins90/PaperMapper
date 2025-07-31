"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import FileUploadSection from "../canvas-add-files/FileUploadSection";
import UnsavedCardFileUpload from "../shared/UnsavedCardFileUpload";
import { uploadFilesForCardType } from "../useFileUploadHandler";
import { useCardSave } from "../shared/useCardSave";
import LinkedCardsTab from "../LinkedCardsTab";
import { Label } from "@/components/ui/label";
import { MultiCombobox } from "@/components/ui/multi-combobox";

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
  const [files, setFiles] = React.useState<string[]>(cardData?.files || []);
  const [fileEntries, setFileEntries] = React.useState<Array<{ url: string; filename: string; type: string }>>(cardData?.fileEntries || []);
  const [isUploading, setIsUploading] = React.useState(false);
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

  React.useEffect(() => {
    setThought(cardData?.thought || "");
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
        uploadedFiles: pendingFiles,
      });
    }
  }, [thought, pendingFiles, onFormDataChange]);

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
    }
  };

  const handleSaveThought = async () => {
    if (!openCard || !thought.trim()) return;

    try {
      await saveCard({
        cardId: openCard.id,
        chatAnswers: {
          thoughtText: thought,
        },
        uploadedFiles: pendingFiles,
      });
    } catch (error) {
      console.error("Failed to save thought:", error);
      alert("Failed to save thought: " + (error as Error).message);
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {thoughtTab === "info" ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thought</label>
            <textarea
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              placeholder="Share your thought..."
              rows={3}
              value={thought}
              onChange={e => setThought(e.target.value)}
              onBlur={() => {
                if (openCard && !isUnsaved) {
                  onUpdateNodeData?.(openCard.id, { thought });
                }
              }}
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
            />
          )}

          {/* Save button for unsaved cards - only show if showSaveButton is true */}
          {isUnsaved && showSaveButton && (
            <div className="pt-4">
              <button
                onClick={handleSaveThought}
                disabled={isSaving || !thought.trim()}
                className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save Thought"}
              </button>
            </div>
          )}
        </div>
      ) : thoughtTab === "linked" ? (
        <LinkedCardsTab openCard={openCard} nodes={nodes} edges={edges} onEdgesChange={onEdgesChange} onClose={onClose} />
      ) : null}
    </div>
  );
} 