import React from "react";
import FileChip from "./FileChip";

export type FileType = 'image' | 'pdf' | 'audio' | 'other';

interface FileListDisplayProps {
  files: string[];
  onFileClick?: (fileUrl: string, fileType: FileType) => void;
  maxImages?: number;
  showFilesLabel?: boolean;
}

function getFileType(fileUrl: string): FileType {
  if (fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return 'image';
  if (fileUrl.match(/\.pdf$/i)) return 'pdf';
  if (fileUrl.match(/\.(mp3|wav|m4a|ogg)$/i)) return 'audio';
  return 'other';
}

function getFileName(fileUrl: string) {
  return fileUrl.split('/').pop() || 'file';
}

export const FileListDisplay: React.FC<FileListDisplayProps> = ({ files, onFileClick, maxImages = 4, showFilesLabel = true }) => {
  if (!files || files.length === 0) return null;

  // Images
  const imageFiles = files.filter(f => getFileType(f) === 'image');
  // Audio
  const audioFiles = files.filter(f => getFileType(f) === 'audio');
  // PDFs
  const pdfFiles = files.filter(f => getFileType(f) === 'pdf');
  // Other
  const otherFiles = files.filter(f => getFileType(f) === 'other');

  // Helper for full URL
  const fullUrl = (fileUrl: string) => fileUrl.startsWith('/uploads/')
    ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${fileUrl}`
    : fileUrl;

  // Image grid logic
  const imageCount = imageFiles.length;
  const gridCols = imageCount === 1 ? 'grid-cols-1' : imageCount === 2 ? 'grid-cols-2' : imageCount === 3 ? 'grid-cols-3' : 'grid-cols-4';
  const imagesToShow = imageFiles.slice(0, maxImages);
  const moreCount = imageCount > maxImages ? imageCount - maxImages : 0;

  return (
    <div className="mb-4">
      {/* Images grid */}
      {imageFiles.length > 0 && (
        <div className={`grid ${gridCols} gap-2 mb-2`}>
          {imagesToShow.map((fileUrl, idx) => (
            <button
              key={idx}
              className="w-full bg-gray-50 rounded border p-0 focus:outline-none"
              onClick={() => onFileClick && onFileClick(fullUrl(fileUrl), 'image')}
              style={{ cursor: 'pointer' }}
            >
              <img
                src={fullUrl(fileUrl)}
                alt={getFileName(fileUrl)}
                className="w-full object-contain rounded"
                style={{ maxHeight: '500px', height: 'auto' }}
              />
            </button>
          ))}
        </div>
      )}
      {/* +N more indicator */}
      {moreCount > 0 && (
        <div className="text-xs text-gray-500 mb-2">+{moreCount} more image{moreCount > 1 ? 's' : ''}</div>
      )}
      {/* Grouped files label and list */}
      {(pdfFiles.length > 0 || otherFiles.length > 0 || audioFiles.length > 0) && (
        <>
          {showFilesLabel && <div className="font-semibold text-xs text-gray-500 mb-1">Files:</div>}
          <div className="flex flex-col w-full">
            {[...pdfFiles, ...audioFiles, ...otherFiles].map((fileUrl, idx, arr) => {
              const fileLink = fullUrl(fileUrl);
              const name = getFileName(fileUrl);
              return (
                <span key={idx} className={`block w-full${idx !== arr.length - 1 ? ' mb-2' : ''}`}>
                  {onFileClick ? (
                    <button
                      onClick={() => onFileClick(fileLink, getFileType(fileUrl))}
                      className="focus:outline-none w-full text-left"
                      style={{ background: 'none', border: 'none', padding: 0, margin: 0 }}
                      title={name}
                    >
                      <FileChip fileUrl={fileUrl} filename={name} />
                    </button>
                  ) : (
                    <FileChip fileUrl={fileUrl} filename={name} />
                  )}
                </span>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}; 