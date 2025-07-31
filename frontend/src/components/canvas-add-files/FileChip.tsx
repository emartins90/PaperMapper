import React from "react";
import { FaFilePdf, FaFileWord, FaFileAudio, FaFile } from "react-icons/fa6";

interface FileChipProps {
  fileUrl: string;
  filename?: string;
}

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === "pdf") return { icon: <FaFilePdf className="text-red-500 w-4 h-4" /> };
  if (["doc", "docx"].includes(ext || "")) return { icon: <FaFileWord className="text-blue-700 w-4 h-4" /> };
  if (["mp3", "wav", "m4a", "ogg"].includes(ext || "")) return { icon: <FaFileAudio className="text-purple-500 w-4 h-4" /> };
  return { icon: <FaFile className="text-gray-500 w-4 h-4" /> };
};

const FileChip: React.FC<FileChipProps> = ({ fileUrl, filename }) => {
  const name = filename || "file";
  const { icon } = getFileIcon(name);
  return (
    <div className={"flex items-center px-2 py-2 rounded-md text-xs font-medium bg-gray-50 gap-2 w-full min-w-0 max-w-full"} style={{lineHeight: 1.2}}>
      <span className="flex-shrink-0">{icon}</span>
      <span className="flex-1 min-w-0 truncate text-gray-900">{name}</span>
    </div>
  );
};

export default FileChip; 