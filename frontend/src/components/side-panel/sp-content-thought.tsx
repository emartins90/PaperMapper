"use client";

import React, { useState, useEffect, useRef } from "react";
import FileUploadSection from "../canvas-add-files/FileUploadSection";
import { uploadFilesForCardType } from "../useFileUploadHandler";
import LinkedCardsTab from "../LinkedCardsTab";

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
  onClose
}: ThoughtCardContentProps) {
  const [thought, setThought] = React.useState(cardData?.thought || "");
  const [files, setFiles] = React.useState<string[]>(cardData?.files || []);
  const [fileEntries, setFileEntries] = React.useState<Array<{ url: string; filename: string; type: string }>>(cardData?.fileEntries || []);
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setThought(cardData?.thought || "");
    setFiles(cardData?.files || []);
    setFileEntries(cardData?.fileEntries || []);
  }, [openCard?.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !openCard) return;
    setIsUploading(true);
    try {
      // If we have a backend ID, upload to backend
      if (cardData?.thoughtId) {
        await uploadFilesForCardType(
          "thought",
          cardData.thoughtId,
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/thoughts/delete_file/?thought_id=${cardData?.thoughtId}&file_url=${encodeURIComponent(fileUrl)}`, {
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
              onBlur={() => openCard && onUpdateNodeData?.(openCard.id, { thought })}
            />
          </div>
          <div>
            <FileUploadSection
              files={files}
              isUploading={isUploading}
              onFileUpload={handleFileUpload}
              onFileDelete={handleFileDelete}
              fileInputRef={fileInputRef}
              fileEntries={fileEntries}
            />
          </div>
        </div>
      ) : thoughtTab === "linked" ? (
        <LinkedCardsTab openCard={openCard} nodes={nodes} edges={edges} onEdgesChange={onEdgesChange} onClose={onClose} />
      ) : null}
    </div>
  );
} 