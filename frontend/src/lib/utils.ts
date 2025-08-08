import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// File upload limits (matching backend limits)
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file
export const MAX_FILES_PER_CARD = 5; // 5 files per card
export const MAX_TOTAL_SIZE_PER_CARD = 200 * 1024 * 1024; // 200MB total per card

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateFiles(
  files: File[], 
  existingCount: number = 0, 
  existingSize: number = 0
): FileValidationResult {
  const errors: string[] = [];
  
  // Check individual file sizes
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`"${file.name}" is too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }
  }
  
  // Check total file count
  const totalCount = files.length + existingCount;
  if (totalCount > MAX_FILES_PER_CARD) {
    errors.push(`Too many files. Maximum ${MAX_FILES_PER_CARD} files per card. You currently have ${existingCount} files and are trying to add ${files.length} more.`);
  }
  
  // Check total file size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0) + existingSize;
  if (totalSize > MAX_TOTAL_SIZE_PER_CARD) {
    errors.push(`Total file size too large. Maximum ${MAX_TOTAL_SIZE_PER_CARD / (1024 * 1024)}MB total per card. Current total would be ${Math.round(totalSize / (1024 * 1024))}MB.`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
