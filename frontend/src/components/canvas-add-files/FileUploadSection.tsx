import { Button } from "../ui/button";
import React, { useEffect } from "react";
import { LuX } from "react-icons/lu";
import { FaFilePdf, FaFileWord, FaFileAudio, FaFile } from "react-icons/fa6";
import { Spinner } from "../ui/spinner";

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
  deletingFiles?: Set<string>; // Track which files are being deleted
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
  onFileClick,
  deletingFiles = new Set()
}: FileUploadSectionProps) {
  
  // Debug authentication state
  useEffect(() => {
    console.log('[AUTH-DEBUG] Current cookies:', document.cookie);
    console.log('[AUTH-DEBUG] Local storage token:', localStorage.getItem('token'));
    console.log('[AUTH-DEBUG] Local storage email:', localStorage.getItem('email'));
  }, []);

  // Prefer fileEntries if present (for new cards), else fall back to files array
  const displayFiles: FileEntry[] = fileEntries.length > 0
    ? fileEntries
    : files.map((url) => ({ url, filename: "file", type: "" }));

  // Helper to get icon and color by file type
  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === "pdf") return { icon: <FaFilePdf className="text-red-500 w-5 h-5" />, color: "bg-red-100" };
    if (["doc", "docx"].includes(ext || "")) return { icon: <FaFileWord className="text-blue-700 w-5 h-5" />, color: "bg-blue-100" };
    if (["mp3", "wav", "m4a", "ogg"].includes(ext || "")) return { icon: <FaFileAudio className="text-purple-500 w-5 h-5" />, color: "bg-purple-100" };
    return { icon: <FaFile className="text-gray-500 w-5 h-5" />, color: "bg-gray-100" };
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
    console.log('[FILE-DEBUG] getImageSrc called with entry:', entry);
    
    // If it's a local upload
    if (entry.url.startsWith('/uploads/')) {
      const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${entry.url}`;
      console.log('[FILE-DEBUG] Local upload URL:', url);
      return url;
    }
    // If it's a public R2 URL, extract the filename and use the secure endpoint
    if (entry.url.includes('.r2.dev') || entry.url.includes('.r2.cloudflarestorage.com')) {
      const filename = entry.url.split('/').pop();
      const folder = cardType === "source" ? "source-materials" : `${cardType}s`;
      const url = `/secure-files/${folder}/${filename}`;
      console.log('[FILE-DEBUG] R2 URL converted to secure-files:', url);
      return url;
    }
    // If it's just a filename
    if (!entry.url.startsWith('http') && !entry.url.startsWith('/')) {
      const folder = cardType === "source" ? "source-materials" : `${cardType}s`;
      const url = `/secure-files/${folder}/${entry.url}`;
      console.log('[FILE-DEBUG] Filename converted to secure-files:', url);
      return url;
    }
    // Otherwise, return as-is
    console.log('[FILE-DEBUG] Returning as-is:', entry.url);
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
          {isUploading ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Uploading...
            </>
          ) : (
            "+ Add Files & Images"
          )}
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
                  disabled={deletingFiles.has(entry.url)}
                >
                  {deletingFiles.has(entry.url) ? (
                    <Spinner size="sm" className="text-red-500" />
                  ) : (
                    <LuX className="text-red-500" size={16}/>
                  )}
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
                      style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {entry.filename}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onFileDelete(entry.url)}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="Remove file"
                  disabled={deletingFiles.has(entry.url)}
                >
                  {deletingFiles.has(entry.url) ? (
                    <Spinner size="sm" className="text-red-500" />
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 