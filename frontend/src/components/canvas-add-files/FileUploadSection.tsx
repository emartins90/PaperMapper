import { Button } from "../ui/button";
import React from "react";
import { MdClose } from "react-icons/md";
import { MdPictureAsPdf, MdDescription, MdAudiotrack, MdInsertDriveFile } from "react-icons/md";

type FileEntry = { url: string; filename: string; type: string };

type FileUploadSectionProps = {
  files: string[];
  isUploading: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileDelete: (fileUrl: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  accept?: string;
  fileEntries?: FileEntry[];
  cardType?: string; // Add cardType prop
  onFileClick?: (fileUrl: string, entry: FileEntry) => void; // Optional click handler
};

export default function FileUploadSection({
  files,
  isUploading,
  onFileUpload,
  onFileDelete,
  fileInputRef,
  accept = "image/*,.pdf,.doc,.docx,audio/mp3,audio/wav,audio/m4a,audio/ogg",
  fileEntries = [],
  cardType = "questions", // Default to questions for backward compatibility
  onFileClick
}: FileUploadSectionProps) {
  // Prefer fileEntries if present (for new cards), else fall back to files array
  const displayFiles: FileEntry[] = fileEntries.length > 0
    ? fileEntries
    : files.map((url) => ({ url, filename: url.split("/").pop() || "file", type: "" }));

  // Helper to get icon and color by file type
  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === "pdf") return { icon: <MdPictureAsPdf className="text-red-500 w-5 h-5" />, color: "bg-red-100" };
    if (["doc", "docx"].includes(ext || "")) return { icon: <MdDescription className="text-blue-700 w-5 h-5" />, color: "bg-blue-100" };
    if (["mp3", "wav", "m4a", "ogg"].includes(ext || "")) return { icon: <MdAudiotrack className="text-purple-500 w-5 h-5" />, color: "bg-purple-100" };
    return { icon: <MdInsertDriveFile className="text-gray-500 w-5 h-5" />, color: "bg-gray-100" };
  };

  // Helper to check if file is an image
  const isImageFile = (entry: FileEntry) => {
    if (entry.url.startsWith('blob:')) {
      return entry.type.startsWith('image/');
    }
    return entry.filename.match(/\.(jpg|jpeg|png|gif|webp)$/i) !== null;
  };

  // Helper to get image source
  const getImageSrc = (entry: FileEntry) => {
    // If it's a local upload
    if (entry.url.startsWith('/uploads/')) {
      return `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${entry.url}`;
    }
    // If it's a public R2 URL, extract the filename and use the secure endpoint
    if (entry.url.includes('.r2.dev') || entry.url.includes('.r2.cloudflarestorage.com')) {
      const filename = entry.url.split('/').pop();
      const folder = cardType === "source" ? "source-materials" : `${cardType}s`;
      return `/secure-files/${folder}/${filename}`;
    }
    // If it's just a filename
    if (!entry.url.startsWith('http') && !entry.url.startsWith('/')) {
      const folder = cardType === "source" ? "source-materials" : `${cardType}s`;
      return `/secure-files/${folder}/${entry.url}`;
    }
    // Otherwise, return as-is
    return entry.url;
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Files & Images</label>
      <div className="flex justify-start mt-2">
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={onFileUpload}
          multiple
          ref={fileInputRef}
        />
        <Button
          type="button"
          variant="outline"
          className="px-3 py-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          + Add Files & Images
        </Button>
      </div>
      {displayFiles && displayFiles.length > 0 && (
        <div className="mt-2">
          {/* Images full width, no cropping */}
          {displayFiles.filter(isImageFile).map((entry, index) => {
            return (
              <div key={index} className="relative mb-3">
                <img
                  src={getImageSrc(entry)}
                  alt={entry.filename}
                  className={`w-full h-auto rounded border ${onFileClick ? 'cursor-pointer' : ''}`}
                  style={{ objectFit: 'contain' }}
                  onClick={onFileClick ? () => onFileClick(entry.url, entry) : undefined}
                  aria-label={onFileClick ? `Open ${entry.filename}` : undefined}
                />
                <button
                  onClick={() => onFileDelete(entry.url)}
                  className="absolute top-1 right-1 bg-white border border-gray-300 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-200 shadow-md"
                  title="Delete file"
                >
                  <MdClose className="text-red-500" size={16}/>
                </button>
              </div>
            );
          })}
          {/* Non-image files */}
          {displayFiles.filter(entry => !isImageFile(entry)).map((entry, index) => {
            const { icon, color } = getFileIcon(entry.filename);
            return (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded flex items-center justify-center ${color}`}>{icon}</div>
                  <div>
                    <p
                      className={`text-sm font-medium text-gray-900 ${onFileClick ? 'cursor-pointer underline' : ''}`}
                      onClick={onFileClick ? () => onFileClick(entry.url, entry) : undefined}
                      aria-label={onFileClick ? `Open ${entry.filename}` : undefined}
                    >
                      {entry.filename}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onFileDelete(entry.url)}
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
} 