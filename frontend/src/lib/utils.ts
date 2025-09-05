import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

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

// Helper function to truncate text to 5 lines
function truncateToLines(text: string, maxLines: number = 5): string {
  const lines = text.split('\n');
  if (lines.length <= maxLines) return text;
  
  const truncated = lines.slice(0, maxLines);
  return truncated.join('\n') + '\n...';
}

// Format outline as plain text
export function formatOutlineAsText(sections: OutlineSection[]): string {
  let output = '';
  const citationsMap = new Map<string, number>(); // Map citation text to number
  const citationsList: string[] = []; // Ordered list of citations
  
  function formatSection(section: OutlineSection, indentLevel: number = 0) {
    // Use 4 spaces per indentation level for consistency
    const indent = '    '.repeat(indentLevel);
    const cardIndent = '    '.repeat(indentLevel) + '    '; // Additional 4 spaces for cards
    
    // Section title
    output += `${indent}${section.section_number}. ${section.title}\n`;
    
    // Cards in this section - indented further than section title
    section.card_placements
      .sort((a, b) => a.order_index - b.order_index)
      .forEach(placement => {
        const card = placement.card;
        const content = getCardContent(card);
        
        if (content) {
          const cardType = card.type.charAt(0).toUpperCase() + card.type.slice(1);
          const truncatedContent = card.type === 'source' ? truncateToLines(content) : content;
          
          // Handle multi-line content with proper indentation
          const lines = truncatedContent.split('\n');
          const firstLine = lines[0];
          const remainingLines = lines.slice(1);
          
          output += `${cardIndent}• ${cardType}: ${firstLine}\n`;
          
          // Indent continuation lines to align with content after bullet point
          remainingLines.forEach(line => {
            if (line.trim()) { // Only add non-empty lines
              output += `${cardIndent}  ${' '.repeat(cardType.length + 2)}${line}\n`;
            }
          });
          
          // Add citation for source cards
          if (card.type === 'source' && card.citation) {
            let citationNumber = citationsMap.get(card.citation);
            if (!citationNumber) {
              citationNumber = citationsList.length + 1;
              citationsMap.set(card.citation, citationNumber);
              citationsList.push(card.citation);
            }
            output += `${cardIndent}  ${' '.repeat(cardType.length + 2)}[${citationNumber}]\n`;
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
      output += '\n'; // Add spacing between sections
    });
  
  // Add citations list at the bottom if there are any
  if (citationsList.length > 0) {
    output += '\n**Citations**\n';
    output += 'Note: Please verify the accuracy and formatting of all citations. Paper Thread does not check citation accuracy.\n\n';
    citationsList.forEach((citation, index) => {
      output += `${index + 1}. ${citation}\n`;
    });
  }
  
  return output.trim();
}



// Format outline as Word document
export async function formatOutlineAsWord(sections: OutlineSection[]): Promise<Document> {
  const children: (Paragraph | any)[] = [];
  const citationsMap = new Map<string, number>(); // Map citation text to number
  const citationsList: string[] = []; // Ordered list of citations
  
  // Standard font size and color for consistency
  const standardFontSize = 24; // 12pt (docx uses half-points)
  const standardColor = "000000"; // Black
  const smallFontSize = 20; // 10pt for disclaimer
  
  // Add title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Outline",
          bold: true,
          size: standardFontSize,
          color: standardColor,
        }),
      ],
      alignment: AlignmentType.CENTER,
    })
  );
  
  // Add spacing
  children.push(new Paragraph({ text: "" }));
  
  function formatSection(section: OutlineSection, indentLevel: number = 0) {
    // Calculate indentation in twips (1440 twips = 1 inch, so 720 twips = 0.5 inch per level)
    const indentationTwips = indentLevel * 720;
    
    // Section title - always bold with proper indentation
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${section.section_number}. ${section.title}`,
            bold: true,
            size: standardFontSize,
            color: standardColor,
          }),
        ],
        indent: {
          left: indentationTwips,
        },
      })
    );
    
    // Cards in this section - indented further than section title
    section.card_placements
      .sort((a, b) => a.order_index - b.order_index)
      .forEach(placement => {
        const card = placement.card;
        const content = getCardContent(card);
        
        if (content) {
          const cardType = card.type.charAt(0).toUpperCase() + card.type.slice(1);
          const truncatedContent = card.type === 'source' ? truncateToLines(content) : content;
          
          // Create the main content paragraph
          const cardChildren = [
            new TextRun({
              text: `• ${cardType}: `,
              bold: true,
              size: standardFontSize,
              color: standardColor,
            }),
            new TextRun({
              text: truncatedContent,
              size: standardFontSize,
              color: standardColor,
            }),
          ];
          
          // Add citation for source cards
          if (card.type === 'source' && card.citation) {
            let citationNumber = citationsMap.get(card.citation);
            if (!citationNumber) {
              citationNumber = citationsList.length + 1;
              citationsMap.set(card.citation, citationNumber);
              citationsList.push(card.citation);
            }
            cardChildren.push(
              new TextRun({
                text: ` [${citationNumber}]`,
                size: standardFontSize,
                color: standardColor,
              })
            );
          }
          
          children.push(
            new Paragraph({
              children: cardChildren,
              indent: {
                left: indentationTwips + 360, // Additional 0.25 inch indent for cards
              },
            })
          );
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
  
  // Add citations list at the bottom if there are any
  if (citationsList.length > 0) {
    // Add some spacing before citations
    children.push(new Paragraph({ text: "" }));
    children.push(new Paragraph({ text: "" }));
    
    // Citations header
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Citations",
            bold: true,
            size: standardFontSize,
            color: standardColor,
          }),
        ],
        alignment: AlignmentType.LEFT,
      })
    );
    
    // Add disclaimer right after header (no spacing)
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Note: Please verify the accuracy and formatting of all citations. Paper Thread does not check citation accuracy.",
            italics: true,
            size: smallFontSize,
            color: standardColor,
          }),
        ],
      })
    );
    
    // Add spacing before citations list
    children.push(new Paragraph({ text: "" }));
    
    // Add each citation with number
    citationsList.forEach((citation, index) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${index + 1}. ${citation}`,
              size: standardFontSize,
              color: standardColor,
            }),
          ],
        })
      );
    });
  }
  
  return new Document({
    sections: [
      {
        properties: {},
        children: children,
      },
    ],
  });
}

// Export functions
export async function exportOutlineAsText(sections: OutlineSection[], filename: string = 'outline.txt') {
  const content = formatOutlineAsText(sections);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, filename);
}



export async function exportOutlineAsWord(sections: OutlineSection[], filename: string = 'outline.docx') {
  const doc = await formatOutlineAsWord(sections);
  const buffer = await Packer.toBuffer(doc);
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  saveAs(blob, filename);
}

// Main export function with format selection
export async function exportOutline(sections: OutlineSection[], format: 'txt' | 'docx', filename?: string) {
  const defaultFilename = filename || `outline.${format}`;
  
  switch (format) {
    case 'txt':
      await exportOutlineAsText(sections, defaultFilename);
      break;
    case 'docx':
      await exportOutlineAsWord(sections, defaultFilename);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}
