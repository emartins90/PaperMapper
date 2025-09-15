import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

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

// ===== OUTLINE EXPORT FUNCTIONALITY =====

export interface OutlineCard {
  id: number;
  type: 'source' | 'question' | 'insight' | 'thought' | 'claim';
  title: string;
  content?: string;
  content_formatted?: string;
  summary?: string;
  summary_formatted?: string;
  question?: string;
  question_text_formatted?: string;
  insight?: string;
  insight_text_formatted?: string;
  thought?: string;
  thought_text_formatted?: string;
  claim?: string;
  claim_text_formatted?: string;
  category?: string;
  citation?: string;
  files?: string[];
  file_entries?: Array<{ url: string; filename: string; type: string }>;
  file_filenames?: string[] | string; // Add this line
}

export interface OutlineSection {
  id: number;
  title: string;
  section_number: string;
  order_index: number;
  subsections: OutlineSection[];
  card_placements: Array<{
    id: number;
    card: OutlineCard;
    card_type: string;
    order_index: number;
  }>;
}

// Helper function to strip HTML tags and get plain text
function stripHtml(html: string | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

// Helper function to get card content based on type
function getCardContent(card: OutlineCard): string {
  switch (card.type) {
    case 'question':
      return stripHtml(card.question_text_formatted) || stripHtml(card.question) || '';
    case 'source':
      return stripHtml(card.summary_formatted) || stripHtml(card.summary) || stripHtml(card.content_formatted) || stripHtml(card.content) || '';
    case 'insight':
      return stripHtml(card.insight_text_formatted) || stripHtml(card.insight) || '';
    case 'thought':
      return stripHtml(card.thought_text_formatted) || stripHtml(card.thought) || '';
    case 'claim':
      return stripHtml(card.claim_text_formatted) || stripHtml(card.claim) || '';
    default:
      return '';
  }
}

// Helper function to check if there are any images (without downloading)
function hasImages(sections: OutlineSection[]): boolean {
  let hasAnyImages = false;
  
  function checkImages(section: OutlineSection) {
    section.card_placements.forEach(placement => {
      const card = placement.card;
      
      // Check files array for images
      if (card.files) {
        let fileUrls: string[] = [];
        if (Array.isArray(card.files)) {
          fileUrls = card.files;
        } else if (typeof card.files === 'string' && card.files.trim() !== '') {
          fileUrls = card.files.split(',').map((url: string) => url.trim()).filter((url: string) => url.length > 0);
        }
        
        fileUrls.forEach(url => {
          const extension = url.split('.').pop()?.toLowerCase();
          if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
            hasAnyImages = true;
          }
        });
      }
    });
    
    // Process subsections
    section.subsections.forEach(subsection => {
      checkImages(subsection);
    });
  }
  
  sections.forEach(section => {
    checkImages(section);
  });
  
  return hasAnyImages;
}

// Helper function to get file information for a card
function getCardFiles(card: OutlineCard, indent: string = ''): string {
  if (card.file_entries && card.file_entries.length > 0) {
    const fileList = card.file_entries.map(file => {
      const fileType = file.type === 'image' ? '[Image]' : 
                      file.type === 'pdf' ? '[PDF]' : 
                      file.type === 'audio' ? '[Audio]' : '[File]';
      return `${indent}   • ${fileType} ${file.filename}`;
    }).join('\n');
    return `\n${indent}Files:\n${fileList}`;
  }
  
  if (card.file_filenames) {
    let fileNames: string[] = [];
    if (Array.isArray(card.file_filenames)) {
      fileNames = card.file_filenames;
    } else if (typeof card.file_filenames === 'string') {
      const trimmed = card.file_filenames.trim();
      if (trimmed !== '') {
        fileNames = trimmed.split(',').map((name: string) => name.trim()).filter((name: string) => name.length > 0);
      }
    }
    if (fileNames.length > 0) {
      const fileList = fileNames.map(filename => {
        const extension = filename.split('.').pop()?.toLowerCase();
        let fileType = '[Image]';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
          fileType = '[Image]';
        } else if (extension === 'pdf') {
          fileType = '[PDF]';
        } else if (['mp3', 'wav', 'm4a', 'aac'].includes(extension || '')) {
          fileType = '[Audio]';
        } else {
          fileType = '[File]';
        }
        return `${indent}   • ${fileType} ${filename}`;
      }).join('\n');
      return `\n${indent}Files:\n${fileList}`;
    }
  }
  
  if (card.files) {
    let fileUrls: string[] = [];
    if (Array.isArray(card.files)) {
      fileUrls = card.files;
    } else if (typeof card.files === 'string') {
      const trimmed = card.files.trim();
      if (trimmed !== '') {
        fileUrls = trimmed.split(',').map((url: string) => url.trim()).filter((url: string) => url.length > 0);
      }
    }
    if (fileUrls.length > 0) {
      const fileList = fileUrls.map((fileUrl: string) => {
        const filename = fileUrl.split('/').pop() || 'unknown';
        const extension = filename.split('.').pop()?.toLowerCase();
        let fileType = '[File]';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
          fileType = '[Image]';
        } else if (extension === 'pdf') {
          fileType = '[PDF]';
        } else if (['mp3', 'wav', 'm4a', 'aac'].includes(extension || '')) {
          fileType = '[Audio]';
        }
        return `${indent}   • ${fileType} ${filename}`;
      }).join('\n');
      return `\n${indent}Files:\n${fileList}`;
    }
  }
  
  return '';
}

// Helper function to truncate text to 5 lines
function truncateToLines(text: string, maxLines: number = 5): string {
  const lines = text.split('\n');
  if (lines.length <= maxLines) return text;
  
  const truncated = lines.slice(0, maxLines);
  return truncated.join('\n') + '\n...';
}

// Format outline as plain text
export function formatOutlineAsText(sections: OutlineSection[], imageFolderPath?: string): string {
  let output = '';
  
  // Add note about images if there are any
  if (imageFolderPath) {
    output += `Note: Images referenced in this outline are available in the '${imageFolderPath}' folder.\n\n`;
  }
  
  function formatSection(section: OutlineSection, indentLevel: number = 0) {
    const indent = '   '.repeat(indentLevel);
    
    // Section title
    output += `${indent}${section.section_number}. ${section.title}\n`;
    
    // Cards in this section
    section.card_placements
      .sort((a, b) => a.order_index - b.order_index)
      .forEach(placement => {
        const card = placement.card;
        const content = getCardContent(card);
        const cardIndent = indent + '   '; // Card indent = section indent + 3 spaces
        const files = getCardFiles(card, cardIndent); // Pass hasImages flag
        
        if (content) {
          const cardType = card.type.charAt(0).toUpperCase() + card.type.slice(1);
          const truncatedContent = card.type === 'source' ? truncateToLines(content) : content;
          output += `${cardIndent}${cardType}: ${truncatedContent}${files}\n`;
        } else if (files) {
          // Show files even if no content
          const cardType = card.type.charAt(0).toUpperCase() + card.type.slice(1);
          output += `${cardIndent}${cardType}: ${files}\n`;
        }
      });
    
    // Subsections
    section.subsections
      .sort((a, b) => a.order_index - b.order_index)
      .forEach(subsection => {
        formatSection(subsection, indentLevel + 1);
      });
  }
  
  sections
    .sort((a, b) => a.order_index - b.order_index)
    .forEach(section => {
      formatSection(section);
      output += '\n'; // Add spacing between sections
    });
  
  return output.trim();
}



// Format outline as Word document
export async function formatOutlineAsWord(sections: OutlineSection[], imageFolderPath?: string): Promise<Document> {
  const children: (Paragraph | any)[] = [];
  
  // Add title
  children.push(
    new Paragraph({
      text: "Outline",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
    })
  );
  
  // Add spacing
  children.push(new Paragraph({ text: "" }));

  // Add note about images if there are any
  if (imageFolderPath) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Note: Images referenced in this outline are available in the '${imageFolderPath}' folder.`,
            italics: true,
            color: "666666",
          }),
        ],
      })
    );
    children.push(new Paragraph({ text: "" })); // Add an empty paragraph for spacing
  }
  
  function formatSection(section: OutlineSection, indentLevel: number = 0) {
    const isSubsection = indentLevel > 0;
    const headingLevel = isSubsection ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_2;
    
    // Section title
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${section.section_number}. ${section.title}`,
            color: "000000", // Black color
          })
        ],
        heading: headingLevel,
        indent: {
          left: indentLevel * 720, // 720 twips = 0.5 inches per level
        },
      })
    );
    
    // Cards in this section
    section.card_placements
      .sort((a, b) => a.order_index - b.order_index)
      .forEach(placement => {
        const card = placement.card;
        const content = getCardContent(card);
        const files = getCardFiles(card, '', !!imageFolderPath); // Pass empty string for Word
        
        if (content || (files && files.trim())) {
          const cardType = card.type.charAt(0).toUpperCase() + card.type.slice(1);
          const truncatedContent = card.type === 'source' ? truncateToLines(content) : content;
          
          // Main card content
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${cardType}: `,
                  bold: true,
                }),
                new TextRun({
                  text: truncatedContent || '',
                }),
              ],
              indent: {
                left: (indentLevel + 1) * 720, // Cards are indented one level more than sections
              },
            })
          );
          
          // Add file information if available
          if (files && files.trim()) {
            // Convert the bulleted list format to Word format
            const fileLines = files.split('\n').filter(line => line.trim());
            fileLines.forEach(line => {
              children.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: line,
                      color: "666666",
                    }),
                  ],
                  indent: {
                    left: (indentLevel + 1) * 720, // Same indentation as card content
                  },
                })
              );
            });
          }
        }
      });
    
    // Subsections
    section.subsections
      .sort((a, b) => a.order_index - b.order_index)
      .forEach(subsection => {
        formatSection(subsection, indentLevel + 1);
      });
  }
  
  sections
    .sort((a, b) => a.order_index - b.order_index)
    .forEach(section => {
      formatSection(section);
    });
  
  return new Document({
    sections: [
      {
        properties: {},
        children: children,
      },
    ],
  });
}

// Export functions with ZIP support (no image downloading)
export async function exportOutlineAsText(sections: OutlineSection[], filename: string = 'outline.txt') {
  const zip = new JSZip();
  
  // Check if there are images (but don't try to download them)
  const hasAnyImages = hasImages(sections);
  
  // Generate outline content
  const content = formatOutlineAsText(sections, hasAnyImages ? 'images' : undefined);
  zip.file('outline.txt', content);
  
  // If there are images, add a note about them
  if (hasAnyImages) {
    const imageNote = `Note: This outline references images that are stored in your Paper Thread project. 
To access these images, please log into your Paper Thread account and view the individual cards.

The images are referenced in the outline above with their original filenames.`;
    zip.file('image-access-note.txt', imageNote);
  }
  
  // Generate and download ZIP
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveAs(zipBlob, filename.replace('.txt', '.zip'));
}

export async function exportOutlineAsWord(sections: OutlineSection[], filename: string = 'outline.docx') {
  const zip = new JSZip();
  
  // Check if there are images (but don't try to download them)
  const hasAnyImages = hasImages(sections);
  
  // Generate Word document
  const doc = await formatOutlineAsWord(sections, hasAnyImages ? 'images' : undefined);
  const buffer = await Packer.toBuffer(doc);
  zip.file('outline.docx', buffer);
  
  // If there are images, add a note about them
  if (hasAnyImages) {
    const imageNote = `Note: This outline references images that are stored in your Paper Thread project. 
To access these images, please log into your Paper Thread account and view the individual cards.

The images are referenced in the outline above with their original filenames.`;
    zip.file('image-access-note.txt', imageNote);
  }
  
  // Generate and download ZIP
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveAs(zipBlob, filename.replace('.docx', '.zip'));
}

// New function to download images via backend
async function downloadImagesViaBackend(imageUrls: string[]): Promise<Blob> {
  console.log('🖼️ Downloading images via backend:', imageUrls);
  
  try {
    const response = await fetch('/api/outline/export-images/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for authentication
      body: JSON.stringify({ image_urls: imageUrls }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download images: ${response.status} ${response.statusText}`);
    }
    
    return await response.blob();
  } catch (error) {
    console.error('Error downloading images via backend:', error);
    throw error;
  }
}

// Helper function to get all image URLs from sections
function getAllImageUrls(sections: OutlineSection[]): string[] {
  const imageUrls: string[] = [];
  
  function processSection(section: OutlineSection) {
    section.card_placements.forEach(placement => {
      const card = placement.card;
      if (card.files) {
        let fileUrls: string[] = [];
        if (Array.isArray(card.files)) {
          fileUrls = card.files;
        } else if (typeof card.files === 'string') {
          const trimmed = card.files.trim();
          if (trimmed !== '') {
            fileUrls = trimmed.split(',').map((url: string) => url.trim()).filter((url: string) => url.length > 0);
          }
        }
        
        // Filter for image files
        fileUrls.forEach(url => {
          const extension = url.split('.').pop()?.toLowerCase();
          if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
            imageUrls.push(url);
          }
        });
      }
    });
    
    section.subsections.forEach(subsection => {
      processSection(subsection);
    });
  }
  
  sections.forEach(section => {
    processSection(section);
  });
  
  return imageUrls;
}

// Updated main export function
export async function exportOutline(sections: OutlineSection[], format: 'txt' | 'docx', projectName?: string, filename?: string) {
  console.log('🚀 exportOutline called!', { format, sectionsCount: sections.length, projectName });
  
  try {
    const hasAnyImages = hasImages(sections);
    console.log('📸 Has images:', hasAnyImages);
    
    // Generate filename with project name
    const baseFilename = projectName ? `outline_${projectName.replace(/[^a-zA-Z0-9]/g, '_')}` : 'outline';
    const defaultFilename = filename || `${baseFilename}_${new Date().toISOString().split('T')[0]}.${format}`;
    
    // If no images, just export the outline directly
    if (!hasAnyImages) {
      console.log('📄 No images found, exporting outline directly');
      
      if (format === 'txt') {
        const content = formatOutlineAsText(sections);
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, defaultFilename);
      } else {
        const doc = await formatOutlineAsWord(sections);
        const buffer = await Packer.toBuffer(doc);
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        saveAs(blob, defaultFilename);
      }
      return;
    }
    
    // If there are images, create ZIP with images
    console.log('📦 Images found, creating ZIP with images');
    const zip = new JSZip();
    const imageFolderPath = 'images';
    
    // Generate outline content
    let outlineContent: string;
    if (format === 'txt') {
      outlineContent = formatOutlineAsText(sections, imageFolderPath);
    } else {
      const doc = await formatOutlineAsWord(sections, imageFolderPath);
      const buffer = await Packer.toBuffer(doc);
      outlineContent = buffer.toString('base64');
    }
    
    // Add outline to ZIP
    if (format === 'txt') {
      zip.file('outline.txt', outlineContent);
    } else {
      zip.file('outline.docx', outlineContent, { base64: true });
    }
    
    // Download images and add to ZIP
    const imageUrls = getAllImageUrls(sections);
    if (imageUrls.length > 0) {
      try {
        const imagesBlob = await downloadImagesViaBackend(imageUrls);
        const imagesZip = await JSZip.loadAsync(imagesBlob);
        
        // Add all images from the downloaded ZIP to our main ZIP
        for (const [filename, file] of Object.entries(imagesZip.files)) {
          if (!file.dir) {
            const content = await file.async('blob');
            zip.file(`images/${filename}`, content);
          }
        }
      } catch (error) {
        console.error('Failed to download images:', error);
        // Add a note about image access instead
        zip.file('image-access-note.txt', 
          'Images referenced in this outline are available in your Paper Thread account.\n' +
          'To access them, log into your account and view the individual cards.\n\n' +
          'Image URLs referenced:\n' + imageUrls.map(url => `- ${url}`).join('\n')
        );
      }
    }
    
    // Generate and download ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `${baseFilename}_export_${new Date().toISOString().split('T')[0]}.zip`);
    
  } catch (error) {
    console.error('Error creating outline export:', error);
    throw error;
  }
}
