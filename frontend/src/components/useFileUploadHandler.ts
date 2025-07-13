import { useCallback } from "react";

export type CardType = 'source' | 'question' | 'insight' | 'thought';

export async function uploadFilesForCardType(
  cardType: CardType,
  backendId: string | number,
  files: File[],
  existingFiles: string[],
  onUpdateNodeData: (newFiles: string[]) => void
): Promise<string[]> {
  if (!files.length) return existingFiles;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  let endpoint = "";
  let idField = "";
  switch (cardType) {
    case "source":
      endpoint = "/source_materials/upload_file/";
      idField = "source_material_id";
      break;
    case "question":
      endpoint = "/questions/upload_file/";
      idField = "question_id";
      break;
    case "insight":
      endpoint = "/insights/upload_file/";
      idField = "insight_id";
      break;
    case "thought":
      endpoint = "/thoughts/upload_file/";
      idField = "thought_id";
      break;
    default:
      throw new Error("Unknown card type");
  }
  formData.append(idField, String(Number(backendId)));

  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[uploadFilesForCardType] Error response:", errorText);
      throw new Error("Failed to upload files");
    }
    const data = await res.json();
    const newFiles = [...existingFiles, ...(data.file_urls || [])];
    onUpdateNodeData(newFiles);
    return newFiles;
  } catch (err) {
    console.error("[uploadFilesForCardType] Exception:", err);
    throw err;
  }
}

// Optional React hook version for convenience
export function useFileUploadHandler() {
  return useCallback(uploadFilesForCardType, []);
} 