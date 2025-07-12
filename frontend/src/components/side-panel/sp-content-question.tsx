"use client";

import React, { useState, useEffect, useRef } from "react";
import FileUploadSection from "../canvas-add-files/FileUploadSection";
import { uploadFilesForCardType } from "../useFileUploadHandler";
import LinkedCardsTab from "../LinkedCardsTab";

interface QuestionCardContentProps {
  cardData: any;
  openCard: { id: string; type: string } | null;
  onUpdateNodeData?: (cardId: string, newData: any) => void;
  questionTab: string;
  nodes: any[];
  edges: any[];
  onEdgesChange?: (changes: any[]) => void;
  onClose?: () => void;
  onAddCard?: (cardId: string) => void;
  onDeleteCard?: (cardId: string) => void;
}

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

export default function QuestionCardContent({ 
  cardData, 
  openCard, 
  onUpdateNodeData, 
  questionTab, 
  nodes, 
  edges, 
  onEdgesChange, 
  onClose, 
  onAddCard, 
  onDeleteCard 
}: QuestionCardContentProps) {
  const [question, setQuestion] = React.useState(cardData?.question || "");
  const [category, setCategory] = React.useState(cardData?.category || "");
  const [customCategory, setCustomCategory] = React.useState("");
  const [status, setStatus] = React.useState(cardData?.status || "unexplored");
  const [priority, setPriority] = React.useState(cardData?.priority || "");
  const [isSaving, setIsSaving] = React.useState(false);
  const [files, setFiles] = React.useState<string[]>(cardData?.files || []);
  const [fileEntries, setFileEntries] = React.useState<Array<{ url: string; filename: string; type: string }>>(cardData?.fileEntries || []);
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setQuestion(cardData?.question || "");
    setCategory(cardData?.category || "");
    setStatus(cardData?.status || "unexplored");
    setPriority(cardData?.priority || "");
    setCustomCategory("");
    setFiles(cardData?.files || []);
    setFileEntries(cardData?.fileEntries || []);
  }, [openCard?.id]);

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
    
    setIsSaving(true);
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
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  // File upload logic for questions
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
        console.log('[FileUpload] newFiles:', newFiles);
        // Create file entries with both blob URL and original filename
        const newFileEntries = newFiles.map(file => ({
          url: URL.createObjectURL(file),
          filename: file.name,
          type: file.type
        }));
        console.log('[FileUpload] newFileEntries:', newFileEntries);
        const updatedFiles = [...files, ...newFileEntries.map(entry => entry.url)];
        const updatedFileEntries = [...fileEntries, ...newFileEntries];
        console.log('[onUpdateNodeData] files:', updatedFiles);
        console.log('[onUpdateNodeData] fileEntries:', updatedFileEntries);
        console.log('[onUpdateNodeData] pendingFiles:', newFiles);
        onUpdateNodeData?.(openCard.id, { 
          files: updatedFiles,
          pendingFiles: newFiles, // Store the actual File objects for later upload
          fileEntries: updatedFileEntries // Store file metadata for display
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

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {questionTab === "info" ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
            <textarea
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              placeholder="Enter your research or essay question..."
              rows={3}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onBlur={() => saveAllFields({ question })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Function / Category</label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              value={category && QUESTION_CATEGORIES.includes(category) ? category : (category ? "Custom..." : "")}
              onChange={e => {
                setCategory(e.target.value);
                if (e.target.value !== "Custom...") {
                  setCustomCategory("");
                  saveAllFields({ category: e.target.value });
                }
              }}
              onBlur={() => saveAllFields({ category })}
            >
              <option value="">Select category...</option>
              {QUESTION_CATEGORIES.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {category === "Custom..." && (
              <input
                className="w-full mt-2 p-2 border border-gray-300 rounded-md text-sm"
                placeholder="Enter custom category..."
                value={customCategory}
                onChange={e => setCustomCategory(e.target.value)}
                onBlur={() => saveAllFields({ category: customCategory })}
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              value={status}
              onChange={e => { setStatus(e.target.value); saveAllFields({ status: e.target.value }); }}
              onBlur={() => saveAllFields({ status })}
            >
              {QUESTION_STATUSES.map(opt => (
                <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              value={priority}
              onChange={e => { setPriority(e.target.value); saveAllFields({ priority: e.target.value }); }}
              onBlur={() => saveAllFields({ priority })}
            >
              <option value="">No Priority</option>
              {QUESTION_PRIORITIES.filter(opt => opt !== "").map(opt => (
                <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
              ))}
            </select>
          </div>
          {/* File upload and display section */}
          <FileUploadSection
            files={files}
            isUploading={isUploading}
            onFileUpload={handleFileUpload}
            onFileDelete={handleFileDelete}
            fileInputRef={fileInputRef}
            fileEntries={fileEntries}
          />
          {isSaving && <div className="text-xs text-blue-500 mt-2">Saving...</div>}
        </div>
      ) : questionTab === "linked" ? (
        <LinkedCardsTab openCard={openCard} nodes={nodes} edges={edges} onEdgesChange={onEdgesChange} onClose={onClose} />
      ) : null}
    </div>
  );
} 