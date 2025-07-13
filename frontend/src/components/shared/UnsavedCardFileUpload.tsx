"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import FileChip from "@/components/canvas-add-files/FileChip";

interface UnsavedCardFileUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  className?: string;
}

const UnsavedCardFileUpload: React.FC<UnsavedCardFileUploadProps> = ({
  files,
  onFilesChange,
  className = "",
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    const updatedFiles = [...files, ...newFiles];
    onFilesChange(updatedFiles);
  };

  const handleDeleteFile = (fileIndex: number) => {
    const updatedFiles = files.filter((_, index) => index !== fileIndex);
    onFilesChange(updatedFiles);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <input
          type="file"
          multiple
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileUpload}
          accept="image/*,.pdf,.doc,.docx,audio/mp3,audio/wav,audio/m4a,audio/ogg"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="text-sm"
        >
          + Add Files & Images
        </Button>
        {files.length > 0 && (
          <span className="text-xs text-gray-500">
            {files.length} file{files.length > 1 ? 's' : ''} selected
          </span>
        )}
      </div>

      {/* Show uploaded files/images */}
      {files.length > 0 && (
        <div className="space-y-2">
          {/* Images as previews */}
          {files.filter(f => f.type.startsWith('image/')).map((file, idx) => {
            const url = URL.createObjectURL(file);
            return (
              <div key={idx} className="relative">
                <img
                  src={url}
                  alt={file.name}
                  className="w-full h-auto rounded border"
                  style={{ objectFit: 'contain' }}
                />
                <button
                  onClick={() => handleDeleteFile(files.findIndex(f => f === file))}
                  className="absolute top-1 right-1 bg-white border border-gray-300 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-200 shadow-md"
                  title="Delete file"
                >
                  <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            );
          })}

          {/* Non-image files as chips with remove button */}
          {files.filter(f => !f.type.startsWith('image/')).map((file, idx) => {
            // Use icon/color logic from FileUploadSection
            const ext = file.name.split('.').pop()?.toLowerCase();
            let icon = null;
            if (ext === "pdf") icon = <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.828A2 2 0 0 0 19.414 7.414l-5.828-5.828A2 2 0 0 0 12.172 1H6zm7 1.414L18.586 7H15a2 2 0 0 1-2-2V3.414z"/></svg>;
            else if (["doc", "docx"].includes(ext || "")) icon = <svg className="w-5 h-5 text-blue-700" fill="currentColor" viewBox="0 0 24 24"><path d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.828A2 2 0 0 0 19.414 7.414l-5.828-5.828A2 2 0 0 0 12.172 1H6zm7 1.414L18.586 7H15a2 2 0 0 1-2-2V3.414z"/></svg>;
            else if (["mp3", "wav", "m4a", "ogg"].includes(ext || "")) icon = <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>;
            else icon = <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>;

            return (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg w-full">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded flex items-center justify-center bg-gray-100">
                    {icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteFile(files.findIndex(f => f === file))}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="Remove file"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UnsavedCardFileUpload; 