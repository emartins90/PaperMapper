"use client";

import React, { useState, useEffect, useRef } from "react";
import FileUploadSection from "../canvas-add-files/FileUploadSection";
import UnsavedCardFileUpload from "../shared/UnsavedCardFileUpload";
import { uploadFilesForCardType } from "../useFileUploadHandler";
import { useCardSave } from "../shared/useCardSave";
import LinkedCardsTab from "../LinkedCardsTab";
import { Label } from "@/components/ui/label";
import { MultiCombobox } from "@/components/ui/multi-combobox";
import { Spinner } from "@/components/ui/spinner";

const CLAIM_TYPES = [
  "Hypothesis",
  "Thesis",
  "Conclusion",
  "Proposal"
];

interface ClaimCardContentProps {
  cardData: any;
  openCard: { id: string; type: string } | null;
  onUpdateNodeData?: (cardId: string, newData: any) => void;
  onAddCard?: (cardId: string) => void;
  onDeleteCard?: (cardId: string) => void;
  claimTab: string;
  nodes: any[];
  edges: any[];
  onEdgesChange?: (changes: any[]) => void;
  onClose?: () => void;
  onFormDataChange?: (data: any) => void;
  showSaveButton?: boolean;
  onFileClick?: (fileUrl: string, entry: any) => void; // Add this
  projectId?: number; // Add projectId prop
}

export default function ClaimCardContent({ 
  cardData, 
  openCard, 
  onUpdateNodeData, 
  onAddCard, 
  onDeleteCard,
  claimTab,
  nodes,
  edges,
  onEdgesChange,
  onClose,
  onFormDataChange,
  showSaveButton,
  onFileClick, // Add this
  projectId // Add projectId prop
}: ClaimCardContentProps) {
  const [claim, setClaim] = React.useState(cardData?.claim || "");
  const [claimType, setClaimType] = React.useState(cardData?.claimType || undefined);
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
  const isUnsaved = !cardData?.claimId;

  // Use the shared save hook
  const { saveCard, isSaving } = useCardSave({
    cardId: openCard?.id || "",
    cardType: "claim",
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

  React.useEffect(() => {
    setClaim(cardData?.claim || "");
    setClaimType(cardData?.claimType !== undefined ? cardData.claimType : undefined);
    setFiles(cardData?.files || []);
    setFileEntries(cardData?.fileEntries || []);
    setPendingFiles(cardData?.pendingFiles || []);
    setTags(Array.isArray(cardData?.tags) ? cardData.tags : []);
  }, [openCard?.id]);

  // Update form data for parent component when fields change
  React.useEffect(() => {
    if (onFormDataChange) {
      onFormDataChange({
        claimText: claim,
        claimType: claimType,
        uploadedFiles: pendingFiles,
      });
    }
  }, [claim, claimType, pendingFiles, onFormDataChange]);

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
      if (cardData?.claimId) {
        const result = await uploadFilesForCardType(
          "claim",
          cardData.claimId,
          Array.from(e.target.files),
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

  const handleFileDelete = async (fileUrl: string) => {
    if (!openCard) return;
    
    // Add file to deleting set
    setDeletingFiles(prev => new Set(prev).add(fileUrl));
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/claims/delete_file/?claim_id=${cardData?.claimId}&file_url=${encodeURIComponent(fileUrl)}`, {
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

  const handleSaveClaim = async () => {
    if (!openCard || !claim.trim()) return;

    try {
      await saveCard({
        cardId: openCard.id,
        chatAnswers: {
          claimText: claim,
          claimType: claimType,
        },
        uploadedFiles: pendingFiles,
      });
    } catch (error) {
      console.error("Failed to save claim:", error);
      alert("Failed to save claim: " + (error as Error).message);
    }
  };

  // Save all fields to backend for saved cards
  const saveAllFields = async (fields?: Partial<{ claim: string; claimType: string; tags: string[] }>) => {
    if (!cardData?.claimId) return; // Only for saved cards

    const token = localStorage.getItem("token");
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const claimId = cardData.claimId;

    const payload = {
      project_id: projectId,
      claim_text: fields?.claim ?? claim,
      claim_type: fields?.claimType ?? claimType,
      files: files.join(','),
      ...fields
    };
    payload.tags = Array.isArray(payload.tags) ? payload.tags : tags;

    const response = await fetch(`${API_URL}/claims/${claimId}`, {
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
        claim: payload.claim_text,
        claimType: payload.claim_type,
        tags: payload.tags, // Update tags in node data
      });
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {claimTab === "info" ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Claim Type</label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              value={claimType || ""}
              onChange={e => {
                const value = e.target.value || undefined;
                setClaimType(value);
                if (openCard && !isUnsaved) {
                  saveAllFields({ claimType: value });
                }
              }}
              onBlur={() => {
                if (openCard && !isUnsaved) {
                  saveAllFields({ claimType });
                }
              }}
            >
              <option value="">Select type...</option>
              {CLAIM_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Claim</label>
            <textarea
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              placeholder="Enter the claim..."
              rows={3}
              value={claim}
              onChange={e => setClaim(e.target.value)}
              onBlur={() => {
                if (openCard && !isUnsaved) {
                  saveAllFields({ claim });
                }
              }}
            />
          </div>
          
          <div>
            <Label htmlFor="claim-tags" className="block text-sm font-medium text-gray-700">Tags</Label>
            <MultiCombobox
              options={getAllExistingTags().map(tag => ({ value: tag, label: tag }))}
              value={tags}
              onChange={(newTags) => {
                setTags(newTags);
                if (!isUnsaved) {
                  saveAllFields({ tags: newTags });
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
              cardType="claim"
              onFileClick={onFileClick}
              deletingFiles={deletingFiles}
            />
          )}
          {/* Save button for unsaved cards - only show if showSaveButton is true */}
          {isUnsaved && showSaveButton && (
            <div className="pt-4">
              <button
                onClick={handleSaveClaim}
                disabled={isSaving || !claim.trim()}
                className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSaving ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Claim"
                )}
              </button>
            </div>
          )}
        </div>
      ) : claimTab === "linked" ? (
        <LinkedCardsTab openCard={openCard} nodes={nodes} edges={edges} onEdgesChange={onEdgesChange} onClose={onClose} panelJustOpened={false} />
      ) : null}
    </div>
  );
} 