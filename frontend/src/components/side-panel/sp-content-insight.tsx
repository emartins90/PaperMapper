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
import { Combobox, useCustomOptions } from "@/components/ui/combobox";
import { MultiCombobox } from "@/components/ui/multi-combobox";
import { Spinner } from "@/components/ui/spinner";
import SimpleRichTextEditor from "../rich-text-editor/simple-rich-text-editor";

interface InsightCardContentProps {
  cardData: any;
  openCard: { id: string; type: string } | null;
  onUpdateNodeData?: (cardId: string, newData: any) => void;
  onAddCard?: (cardId: string) => void;
  onDeleteCard?: (cardId: string) => void;
  insightTab: string;
  nodes: any[];
  edges: any[];
  onEdgesChange?: (changes: any[]) => void;
  onClose?: () => void;
  onFormDataChange?: (data: any) => void;
  showSaveButton?: boolean;
  onFileClick?: (fileUrl: string, entry: any) => void; // Add this
  projectId?: number; // Add projectId prop
}

export default function InsightCardContent({ 
  cardData, 
  openCard, 
  onUpdateNodeData, 
  onAddCard, 
  onDeleteCard,
  insightTab,
  nodes,
  edges,
  onEdgesChange,
  onClose,
  onFormDataChange,
  showSaveButton,
  onFileClick, // Add this
  projectId // Add this
}: InsightCardContentProps) {
  const [insight, setInsight] = React.useState(cardData?.insight || "");
  const [insightFormatted, setInsightFormatted] = React.useState(cardData?.insightFormatted || "");
  const [insightType, setInsightType] = React.useState(cardData?.insightType || "");
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
  const isUnsaved = !cardData?.insightId;

  // Use the shared save hook
  const { saveCard, isSaving } = useCardSave({
    cardId: openCard?.id || "",
    cardType: "insight",
    projectId: projectId || 0,
    onUpdateNodeData,
    onAddCard,
    onDeleteCard,
  });

  const insightTypeOptions = useCustomOptions("insightType");

  const handleInsightFormattedChange = (html: string, plainText: string) => {
    setInsightFormatted(html);
    setInsight(plainText);
  };

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
    setInsight(cardData?.insight || "");
    setInsightFormatted(cardData?.insightFormatted || "");
    setInsightType(cardData?.insightType || "");
    setFiles(cardData?.files || []);
    setFileEntries(cardData?.fileEntries || []);
    setPendingFiles(cardData?.pendingFiles || []);
    setTags(Array.isArray(cardData?.tags) ? cardData.tags : []);
  }, [cardData]);

  // Update form data for parent component when fields change
  React.useEffect(() => {
    if (onFormDataChange) {
      onFormDataChange({
        insightType,
        insightText: insight,
        insightTextFormatted: insightFormatted,
        uploadedFiles: pendingFiles,
      });
    }
  }, [insight, insightFormatted, insightType, pendingFiles, onFormDataChange]);

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
      if (cardData?.insightId) {
        const result = await uploadFilesForCardType(
          "insight",
          cardData.insightId,
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/insights/delete_file/?insight_id=${cardData?.insightId}&file_url=${encodeURIComponent(fileUrl)}`, {
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

  const handleSaveInsight = async () => {
    if (!openCard || !insight.trim()) return;

    try {
      await saveCard({
        cardId: openCard.id,
        chatAnswers: {
          insightType,
          insightText: insight,
          insightTextFormatted: insightFormatted,
        },
        uploadedFiles: pendingFiles,
      });
    } catch (error) {
      console.error("Failed to save insight:", error);
      alert("Failed to save insight: " + (error as Error).message);
    }
  };

  // Save all fields to backend for saved cards
  const saveAllFields = async (additionalFields?: any) => {
    if (!cardData?.insightId) return; // Only for saved cards

    const token = localStorage.getItem("token");
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const insightId = cardData.insightId;

    const payload = {
      project_id: projectId,
      insight_text: additionalFields?.insight ?? insight,
      insight_text_formatted: insightFormatted,
      insight_type: additionalFields?.insightType ?? insightType,
      files: files.join(','),
      ...additionalFields
    };
    payload.tags = Array.isArray(payload.tags) ? payload.tags : tags;

    const response = await fetch(`${API_URL}/insights/${insightId}`, {
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
        insight: payload.insight_text,
        insightFormatted: insightFormatted,
        insightType: payload.insight_type,
        tags: additionalFields?.tags ?? tags,
      });
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {insightTab === "info" ? (
        <div className="space-y-4">
          <div>
            <Label htmlFor="insight-type" className="block text-sm font-medium text-gray-700 mb-1">Insight Type</Label>
            <Combobox
              options={[
                { value: "Resolved Confusion", label: "Resolved Confusion" },
                { value: "Noticed a Pattern", label: "Noticed a Pattern" },
                { value: "Evaluated a Source", label: "Evaluated a Source" },
                { value: "Identified a Gap", label: "Identified a Gap" },
                { value: "Reframed the Issue", label: "Reframed the Issue" },
                { value: "Highlighted Impact", label: "Highlighted Impact" },
                ...insightTypeOptions.options.filter(
                  o => ![
                    "Resolved Confusion",
                    "Noticed a Pattern",
                    "Evaluated a Source",
                    "Identified a Gap",
                    "Reframed the Issue",
                    "Highlighted Impact"
                  ].includes(o.value)
                ),
              ]}
              value={insightType || ""}
              onChange={async (value) => {
                setInsightType(value);
                if (openCard && !isUnsaved) {
                  onUpdateNodeData?.(openCard.id, { insightType: value });
                  saveAllFields({ insightType: value });
                }
                // If it's a new custom option, persist it
                if (
                  value &&
                  ![
                    "Resolved Confusion",
                    "Noticed a Pattern",
                    "Evaluated a Source",
                    "Identified a Gap",
                    "Reframed the Issue",
                    "Highlighted Impact"
                  ].includes(value) &&
                  !insightTypeOptions.options.some(o => o.value === value)
                ) {
                  await insightTypeOptions.addOption(value);
                }
              }}
              placeholder="Select or type insight type..."
              allowCustom={true}
            />
          </div>
          <div>
            <Label htmlFor="insight-text" className="block text-sm font-medium text-gray-700 mb-1">Insight</Label>
            <SimpleRichTextEditor
              value={insightFormatted || insight}
              onChange={handleInsightFormattedChange}
              placeholder="Describe the insight or pattern you noticed..."
              cardType="insight"
              showSaveButton={!!cardData?.insightId}
              onSave={() => saveAllFields()}
            />
          </div>
          
          <div>
            <Label htmlFor="insight-tags" className="block text-sm font-medium text-gray-700 mb-1">Insightful Tags</Label>
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
              cardType="insight"
              onFileClick={onFileClick}
              deletingFiles={deletingFiles}
            />
          )}

          {/* Save button for unsaved cards - only show if showSaveButton is true */}
          {isUnsaved && showSaveButton && (
            <div className="pt-4">
              <button
                onClick={handleSaveInsight}
                disabled={isSaving || !insight.trim()}
                className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSaving ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Insight"
                )}
              </button>
            </div>
          )}
        </div>
      ) : insightTab === "linked" ? (
        <LinkedCardsTab openCard={openCard} nodes={nodes} edges={edges} onEdgesChange={onEdgesChange} onClose={onClose} panelJustOpened={false} />
      ) : null}
    </div>
  );
} 