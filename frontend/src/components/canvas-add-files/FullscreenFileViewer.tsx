import React from "react";
import ReactDOM from "react-dom";
import { useRef, useEffect, useState } from "react";
import WaveSurfer from "wavesurfer.js";

interface FullscreenFileViewerProps {
  open: boolean;
  fileUrl: string | null;
  fileType: 'image' | 'pdf' | 'other' | 'audio';
  onClose: () => void;
  cardType?: string; // Add cardType prop
}

const getFileName = (fileUrl: string | null) => fileUrl ? fileUrl.split("/").pop() || "file" : "";

export const FullscreenFileViewer: React.FC<FullscreenFileViewerProps> = ({ 
  open, 
  fileUrl, 
  fileType, 
  onClose,
  cardType = "questions" // Default to questions for backward compatibility
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to convert old R2 URLs to secure endpoint
  const getFullUrl = (url: string) => {
    // If it's a local upload
    if (url.startsWith('/uploads/')) {
      return `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${url}`;
    }
    // If it's a public R2 URL, extract the filename and use the secure endpoint
    if (url.includes('.r2.dev') || url.includes('.r2.cloudflarestorage.com')) {
      const filename = url.split('/').pop();
      const folder = cardType === "source" ? "source-materials" : `${cardType}s`;
      return `/secure-files/${folder}/${filename}`;
    }
    // If it's just a filename
    if (!url.startsWith('http') && !url.startsWith('/')) {
      const folder = cardType === "source" ? "source-materials" : `${cardType}s`;
      return `/secure-files/${folder}/${url}`;
    }
    // Otherwise, return as-is
    return url;
  };

  // Fetch file with authentication
  const fetchFile = async (url: string) => {
    setLoading(true);
    setError(null);
    try {
      const fullUrl = getFullUrl(url);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const response = await fetch(`${apiUrl}${fullUrl}`, {
        credentials: "include", // Include authentication cookies
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const newBlobUrl = URL.createObjectURL(blob);
      setBlobUrl(newBlobUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
      console.error('Error loading file:', err);
    } finally {
      setLoading(false);
    }
  };

  // Clean up blob URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  // Fetch file when component opens
  useEffect(() => {
    if (open && fileUrl && (fileType === 'image' || fileType === 'pdf')) {
      fetchFile(fileUrl);
    }
  }, [open, fileUrl, fileType]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!open || !fileUrl) return null;

  const overlay = (
    <div className="fixed inset-0 w-full h-full z-[9999] bg-black/80 flex items-center justify-center" onClick={handleOverlayClick}>
      {/* Filename top left */}
      <span className="absolute top-0 left-0 p-6 text-white text-xl font-semibold drop-shadow-lg truncate max-w-[70vw] z-50 select-none" title={getFileName(fileUrl)}>
        {getFileName(fileUrl)}
      </span>
      {/* Close button top right */}
      <button
        onClick={onClose}
        className="absolute top-0 right-0 p-6 text-white text-3xl cursor-pointer hover:bg-white/10 rounded-full focus:outline-none z-50"
        aria-label="Close"
        tabIndex={0}
      >
        &times;
      </button>
      
      {/* Loading state */}
      {loading && (
        <div className="bg-white/90 rounded-lg shadow-2xl p-8 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <span className="text-gray-700">Loading file...</span>
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="bg-white/90 rounded-lg shadow-2xl p-8 flex flex-col items-center justify-center">
          <span className="mb-4 text-lg font-semibold text-red-600">Error loading file</span>
          <span className="mb-4 text-gray-700">{error}</span>
          <button
            onClick={() => fetchFile(fileUrl)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      )}
      
      {/* Content */}
      {!loading && !error && fileType === 'image' && blobUrl && (
        <img
          src={blobUrl}
          alt={getFileName(fileUrl)}
          className="max-w-[90vw] max-h-[calc(90vh-72px)] object-contain rounded-lg shadow-2xl"
          style={{ display: 'block', marginTop: 72, marginBottom: 24 }}
        />
      )}
      {!loading && !error && fileType === 'pdf' && blobUrl && (
        <iframe
          src={blobUrl}
          title="PDF Viewer"
          className="max-w-[90vw] w-[min(90vw,800px)] h-[calc(90vh-72px)] rounded-lg shadow-2xl bg-white"
          style={{ minHeight: '400px', display: 'block', marginTop: 72, marginBottom: 24 }}
        />
      )}
      {fileType === 'other' && (
        <div className="bg-white/90 rounded-lg shadow-2xl p-8 flex flex-col items-center justify-center">
          <span className="mb-4 text-lg font-semibold text-gray-900 truncate max-w-[60vw]" title={getFileName(fileUrl)}>
            {getFileName(fileUrl)}
          </span>
          <span className="mb-2 text-gray-700">File preview not supported.</span>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline text-base"
          >
            View or Download file
          </a>
          <button
            onClick={onClose}
            className="mt-6 px-4 py-2 bg-gray-200 rounded text-gray-800 font-semibold hover:bg-gray-300"
            aria-label="Close"
          >
            Close
          </button>
        </div>
      )}
      {fileType === 'audio' && (
        <div className="bg-white/90 rounded-lg shadow-2xl p-8 flex flex-col items-center justify-center max-w-2xl">
          <span className="mb-4 text-lg font-semibold text-gray-900 truncate max-w-[60vw]" title={getFileName(fileUrl)}>
            {getFileName(fileUrl)}
          </span>
          <AudioWaveform fileUrl={fileUrl} />
          <audio controls src={fileUrl} className="mt-4 w-full max-w-md" />
        </div>
      )}
    </div>
  );

  if (typeof window !== "undefined") {
    return ReactDOM.createPortal(overlay, document.body);
  }
  return null;
};

function AudioWaveform({ fileUrl }: { fileUrl: string }) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (waveformRef.current && fileUrl) {
      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "#60a5fa",
        progressColor: "#2563eb",
        height: 80,
        normalize: true,
        cursorWidth: 1,
        barWidth: 2,
        barGap: 1,
      });
      wavesurfer.current.load(fileUrl);
    }
    return () => {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }
    };
  }, [fileUrl]);

  return <div ref={waveformRef} className="w-full max-w-md" />;
} 