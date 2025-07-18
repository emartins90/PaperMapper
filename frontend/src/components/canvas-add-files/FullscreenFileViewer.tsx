import React from "react";
import ReactDOM from "react-dom";
import { useRef, useEffect, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { MdClose } from "react-icons/md";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface FullscreenFileViewerProps {
  open: boolean;
  fileUrl: string | null;
  fileType: 'image' | 'pdf' | 'other' | 'audio';
  onClose: () => void;
  cardType?: string; // Add cardType prop
  cardNode?: any; // The node/card data for the file
  onUpdateCard?: (cardId: string, newData: any) => void;
}

const getFileName = (fileUrl: string | null) => fileUrl ? fileUrl.split("/").pop() || "file" : "";

export const FullscreenFileViewer: React.FC<FullscreenFileViewerProps> = ({ 
  open, 
  fileUrl, 
  fileType, 
  onClose,
  cardType = "questions", // Default to questions for backward compatibility
  cardNode,
  onUpdateCard
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Floating input state
  const [mainText, setMainText] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Initialize from cardNode
  useEffect(() => {
    if (!cardNode) return;
    switch (cardNode.type) {
      case "source":
        setMainText(cardNode.data.text || "");
        setNotes(cardNode.data.additionalNotes || "");
        break;
      case "question":
        setMainText(cardNode.data.question || "");
        break;
      case "insight":
        setMainText(cardNode.data.insight || "");
        break;
      case "thought":
        setMainText(cardNode.data.thought || "");
        break;
      case "claim":
        setMainText(cardNode.data.claim || "");
        break;
      default:
        setMainText("");
        setNotes("");
    }
  }, [cardNode]);

  // Save handler
  const handleSave = async (field: "main" | "notes", value: string) => {
    if (!cardNode || !onUpdateCard) return;
    setSaving(true);
    let newData: any = {};
    switch (cardNode.type) {
      case "source":
        if (field === "main") newData.text = value;
        if (field === "notes") newData.additionalNotes = value;
        break;
      case "question":
        if (field === "main") newData.question = value;
        break;
      case "insight":
        if (field === "main") newData.insight = value;
        break;
      case "thought":
        if (field === "main") newData.thought = value;
        break;
      case "claim":
        if (field === "main") newData.claim = value;
        break;
      default:
        break;
    }
    await onUpdateCard(cardNode.id, newData);
    setSaving(false);
  };

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

  // Debug logs
  useEffect(() => {
    if (open) {
      console.log('[FullscreenFileViewer] fileUrl:', fileUrl);
      console.log('[FullscreenFileViewer] cardType:', cardType);
      console.log('[FullscreenFileViewer] cardNode:', cardNode);
      if (!cardNode) {
        console.warn('[FullscreenFileViewer] cardNode is undefined for fileUrl:', fileUrl, 'cardType:', cardType);
      }
    }
  }, [open, fileUrl, cardType, cardNode]);

  // Track window width for responsive hiding of fields
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1920);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!open || !fileUrl) return null;

  const overlay = (
    <div
      className="fixed inset-0 w-full h-full z-[9999] flex items-center justify-center backdrop-blur-xs"
      style={{
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.7) 25%, rgba(0,0,0,0.6) 100%)'
      }}
      onClick={handleOverlayClick}
    >
      {/* Filename top left */}
      <span className="absolute top-0 left-0 p-6 text-white text-xl font-semibold drop-shadow-lg truncate max-w-[70vw] z-50 select-none" title={getFileName(fileUrl)}>
        {getFileName(fileUrl)}
      </span>
      {/* Close button top right */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white text-3xl cursor-pointer rounded-full focus:outline-none z-50 flex items-center justify-center transition bg-black/40 hover:bg-white/20 w-14 h-14 shadow-lg border border-white/20"
        aria-label="Close"
        tabIndex={0}
        style={{ aspectRatio: '1/1' }}
      >
        <MdClose size={32} />
      </button>
      {/* Main flex row for file and inputs */}
      <div className="relative z-10 flex flex-row items-start justify-center w-full max-w-[90vw] max-h-[calc(90vh-72px)] gap-4 p-8">
        {/* File preview left, now with flex-grow to share space with inputs */}
        <div className="flex-grow min-w-0 max-w-full max-h-[calc(90vh-72px)] flex items-center justify-center">
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
              className="object-contain rounded-lg shadow-2xl max-w-full max-h-[calc(90vh-72px)]"
              style={{ display: 'block', marginTop: 0, marginBottom: 0 }}
            />
          )}
          {!loading && !error && fileType === 'pdf' && blobUrl && (
            <iframe
              src={blobUrl}
              title="PDF Viewer"
              className={`w-full h-[calc(90vh-72px)] rounded-lg shadow-2xl bg-white`}
              style={{ minWidth: windowWidth >= 1100 ? '600px' : '100%', maxWidth: windowWidth >= 1100 ? '75vw' : '90vw', minHeight: '600px', display: 'block', marginTop: 0, marginBottom: 0 }}
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
            <div className="bg-white/90 rounded-lg shadow-2xl p-8 flex flex-col items-center justify-center max-w-2xl min-w-[320px]">
              <span className="mb-4 text-lg font-semibold text-gray-900 truncate max-w-[60vw]" title={getFileName(fileUrl)}>
                {getFileName(fileUrl)}
              </span>
              <AudioWaveform fileUrl={fileUrl} />
              <audio controls src={fileUrl} className="mt-4 w-full max-w-md" />
            </div>
          )}
        </div>
        {/* Inputs right */}
        {cardNode && cardNode.type === "source" && windowWidth >= 1100 && (
          <div className="flex flex-col gap-4 min-w-[320px] max-w-[25vw] flex-shrink-0 justify-center">
            <div className="flex flex-col gap-1">
              <Label htmlFor="fullscreen-main-text" className="block text-sm font-medium text-white mb-1">
                Detailed Source Material
              </Label>
              <Textarea
                id="fullscreen-main-text"
                className="bg-white/90 text-black rounded-lg shadow-lg p-4 text-base font-medium resize-y min-h-[120px] max-h-[40vh] border-2 border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-200 outline-none transition"
                value={mainText}
                placeholder="Type or paste the full text content, quotes, or relevant excerpts from your source..."
                onChange={e => setMainText(e.target.value)}
                onBlur={e => handleSave("main", e.target.value)}
                disabled={saving}
                style={{backdropFilter: 'blur(2px)'}}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="fullscreen-notes" className="block text-sm font-medium text-white mb-1">Additional Notes</Label>
              <Textarea
                id="fullscreen-notes"
                className="bg-white/90 text-black rounded-lg shadow p-3 text-sm resize-y min-h-[60px] max-h-[20vh] border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-200 outline-none transition"
                value={notes}
                placeholder="Add any personal notes, thoughts, or connections to other sources..."
                onChange={e => setNotes(e.target.value)}
                onBlur={e => handleSave("notes", e.target.value)}
                disabled={saving}
                style={{backdropFilter: 'blur(2px)'}}
              />
            </div>
          </div>
        )}
      </div>
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