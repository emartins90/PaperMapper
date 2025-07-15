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

const QUESTION_CATEGORIES = [
  "Clarify a concept",
  "Challenge an assumption",
  "Evaluate a source",
  "Compare or contrast",
  "Explore cause and effect",
  "Test a hypothesis",
  "Consider a counterpoint",
  "Ask an ethical question",
  "Propose a solution",
  "Custom..."
];
const QUESTION_STATUSES = [
  "unexplored",
  "needs sources",
  "in progress",
  "answered",
  "not relevant"
];
const QUESTION_PRIORITIES = [
  "",
  "high",
  "medium",
  "low"
];

interface QuestionCardContentProps {
  cardData: any;
  openCard: { id: string; type: string } | null;
  onUpdateNodeData?: (cardId: string, newData: any) => void;
  onAddCard?: (cardId: string) => void;
  onDeleteCard?: (cardId: string) => void;
  questionTab: string;
  nodes: any[];
  edges: any[];
  onEdgesChange?: (changes: any[]) => void;
  onClose?: () => void;
  onFormDataChange?: (data: any) => void;
  showSaveButton?: boolean;
}

export default function QuestionCardContent({ 
  cardData, 
  openCard, 
  onUpdateNodeData, 
  onAddCard, 
  onDeleteCard,
  questionTab,
  nodes,
  edges,
  onEdgesChange,
  onClose,
  onFormDataChange,
  showSaveButton
}: QuestionCardContentProps) {
  const [question, setQuestion] = React.useState(cardData?.question || "");
  const [category, setCategory] = React.useState(cardData?.category || "");
  const [customCategory, setCustomCategory] = React.useState("");
  const [status, setStatus] = React.useState(cardData?.status || "unexplored");
  const [priority, setPriority] = React.useState(cardData?.priority || "");
  const [files, setFiles] = React.useState<string[]>(cardData?.files || []);
  const [fileEntries, setFileEntries] = React.useState<Array<{ url: string; filename: string; type: string }>>(cardData?.fileEntries || []);
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // For unsaved cards, store files as File[] objects
  const [pendingFiles, setPendingFiles] = React.useState<File[]>(cardData?.pendingFiles || []);

  // Check if card is unsaved
  const isUnsaved = !cardData?.questionId;

  // Use the shared save hook
  const { saveCard, isSaving } = useCardSave({
    cardId: openCard?.id || "",
    cardType: "question",
    projectId: cardData?.projectId || 0,
    onUpdateNodeData,
    onAddCard,
    onDeleteCard,
  });

  React.useEffect(() => {
    setQuestion(cardData?.question || "");
    setCategory(cardData?.category || "");
    setStatus(cardData?.status || "unexplored");
    setPriority(cardData?.priority || "");
    setCustomCategory("");
    setFiles(cardData?.files || []);
    setFileEntries(cardData?.fileEntries || []);
    setPendingFiles(cardData?.pendingFiles || []);
  }, [openCard?.id]);

  // Update form data for parent component when fields change
  React.useEffect(() => {
    if (onFormDataChange) {
      onFormDataChange({
        questionText: question,
        category: category === "Custom..." ? customCategory : category,
        status: status,
        priority: priority,
        uploadedFiles: pendingFiles,
      });
    }
  }, [question, category, customCategory, status, priority, pendingFiles, onFormDataChange]);



  const saveAllFields = async (fields?: Partial<{ question: string; category: string; status: string; priority: string }>) => {
    // Always update local node data first
    if (onUpdateNodeData) {
      onUpdateNodeData(openCard?.id || "", {
        question: fields?.question ?? question,
        category: fields?.category ?? (category === "Custom..." ? customCategory : category),
        status: fields?.status ?? status,
        priority: fields?.priority ?? priority,
      });
    }
    
    // Only try to save to backend if we have a backend ID
    if (!cardData?.questionId && !cardData?.data_id) {
      return;
    }
    
    // setIsSaving(true); // This is now handled by useCardSave
    try {
      const token = localStorage.getItem("token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const questionId = cardData?.questionId || cardData?.data_id;
      const response = await fetch(`${API_URL}/questions/${questionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          project_id: cardData?.projectId,
          question_text: fields?.question ?? question,
          category: fields?.category ?? (category === "Custom..." ? customCategory : category),
          status: fields?.status ?? status,
          priority: fields?.priority ?? priority,
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save changes: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error("Error saving question changes:", error);
      alert("Failed to save changes: " + (error as Error).message);
    } finally {
      // setTimeout(() => setIsSaving(false), 500); // This is now handled by useCardSave
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !openCard) return;
    setIsUploading(true);
    try {
      // If we have a backend ID, upload to backend
      if (cardData?.questionId) {
        await uploadFilesForCardType(
          "question",
          cardData.questionId,
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

  const handleFileDelete = async (fileUrl: string) => {
    if (!openCard) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/questions/delete_file/?question_id=${cardData?.questionId}&file_url=${encodeURIComponent(fileUrl)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to delete file");
      const newFiles = files.filter(f => f !== fileUrl);
      setFiles(newFiles);
      onUpdateNodeData?.(openCard.id, { files: newFiles });
    } catch (err) {
      alert("Failed to delete file: " + (err as Error).message);
    }
  };

  const handleSaveQuestion = async () => {
    if (!openCard || !question.trim()) return;

    try {
      await saveCard({
        cardId: openCard.id,
        chatAnswers: {
          questionText: question,
          category: category === "Custom..." ? customCategory : category,
          status: status,
          priority: priority,
        },
        uploadedFiles: pendingFiles,
      });
    } catch (error) {
      console.error("Failed to save question:", error);
      alert("Failed to save question: " + (error as Error).message);
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {questionTab === "info" ? (
        <div className="space-y-4">
          <div>
            <Label htmlFor="question-text" className="block text-sm font-medium text-gray-700 mb-1">Question Text</Label>
            <Textarea
              id="question-text"
              placeholder="Enter your research or essay question..."
              rows={3}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onBlur={() => {
                if (!isUnsaved) {
                  saveAllFields({ question });
                }
              }}
            />
          </div>
          <div>
            <Label htmlFor="question-category" className="block text-sm font-medium text-gray-700 mb-1">Function / Category</Label>
            <Select
              value={category || ""}
              onValueChange={(value) => {
                setCategory(value);
                if (value !== "Custom...") {
                  setCustomCategory("");
                  if (!isUnsaved) {
                    saveAllFields({ category: value });
                  }
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_CATEGORIES.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {category === "Custom..." && (
              <input
                className="w-full mt-2 p-2 border border-gray-300 rounded-md text-sm"
                placeholder="Enter custom category..."
                value={customCategory}
                onChange={e => setCustomCategory(e.target.value)}
                onBlur={() => {
                  if (!isUnsaved) {
                    saveAllFields({ category: customCategory });
                  }
                }}
              />
            )}
          </div>
          <div>
            <Label htmlFor="question-status" className="block text-sm font-medium text-gray-700 mb-1">Status</Label>
            <Select
              value={status || ""}
              onValueChange={(value) => { 
                setStatus(value); 
                if (!isUnsaved) {
                  saveAllFields({ status: value }); 
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status..." />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_STATUSES.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="question-priority" className="block text-sm font-medium text-gray-700 mb-1">Priority</Label>
            <Select
              value={priority || "none"}
              onValueChange={(value) => { 
                setPriority(value === "none" ? "" : value); 
                if (!isUnsaved) {
                  saveAllFields({ priority: value === "none" ? "" : value }); 
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Priority</SelectItem>
                {QUESTION_PRIORITIES.filter(opt => opt !== "").map(opt => (
                  <SelectItem key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              cardType="question"
            />
          )}

          {/* Save button for unsaved cards - only show if showSaveButton is true */}
          {isUnsaved && showSaveButton && (
            <div className="pt-4">
              <button
                onClick={handleSaveQuestion}
                disabled={isSaving || !question.trim()}
                className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save Question"}
              </button>
            </div>
          )}

          {isSaving && <div className="text-xs text-blue-500 mt-2">Saving...</div>}
        </div>
      ) : questionTab === "linked" ? (
        <LinkedCardsTab openCard={openCard} nodes={nodes} edges={edges} onEdgesChange={onEdgesChange} onClose={onClose} />
      ) : null}
    </div>
  );
} 