import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

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
  files?: string[];
  file_entries?: Array<{ url: string; filename: string; type: string }>;
  
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

// Helper function to get file information for a card
function getCardFiles(card: OutlineCard): string {
  if (!card.file_entries || card.file_entries.length === 0) {
    return '';
  }
  
  const fileList = card.file_entries.map(file => {
    const fileType = file.type === 'image' ? '[Image]' : 
                    file.type === 'pdf' ? '[PDF]' : 
                    file.type === 'audio' ? '[Audio]' : '[File]';
    return `${fileType} ${file.filename}`;
  }).join(', ');
  
  return ` (Files: ${fileList})`;
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
        
        if (content) {
          const cardType = card.type.charAt(0).toUpperCase() + card.type.slice(1);
          const truncatedContent = card.type === 'source' ? truncateToLines(content) : content;
          output += `${indent}   ${cardType}: ${truncatedContent}\n`;
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

// Format outline as HTML
export function formatOutlineAsHtml(sections: OutlineSection[]): string {
  let output = '<html><head><title>Outline Export</title><style>';
  output += 'body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }';
  output += 'h1 { color: #333; border-bottom: 2px solid #333; }';
  output += 'h2 { color: #555; margin-top: 30px; }';
  output += 'h3 { color: #666; margin-top: 20px; margin-left: 20px; }';
  output += 'ul { margin-left: 20px; }';
  output += 'li { margin-bottom: 8px; }';
  output += '</style></head><body>';
  output += '<h1>Outline</h1>';
  
  function formatSection(section: OutlineSection, indentLevel: number = 0) {
    const isSubsection = indentLevel > 0;
    const headingTag = isSubsection ? 'h3' : 'h2';
    const indent = '   '.repeat(indentLevel);
    
    // Section title
    output += `<${headingTag}>${section.section_number}. ${section.title}</${headingTag}>`;
    
    // Cards in this section
    if (section.card_placements.length > 0) {
      output += '<ul>';
      section.card_placements
        .sort((a, b) => a.order_index - b.order_index)
        .forEach(placement => {
          const card = placement.card;
          const content = getCardContent(card);
          const files = getCardFiles(card);
          
          if (content) {
            const cardType = card.type.charAt(0).toUpperCase() + card.type.slice(1);
            const truncatedContent = card.type === 'source' ? truncateToLines(content) : content;
            output += `${indent}   ${cardType}: ${truncatedContent}${files}\n`;
          } else if (files) {
            // Show files even if no content
            const cardType = card.type.charAt(0).toUpperCase() + card.type.slice(1);
            output += `${indent}   ${cardType}: ${files}\n`;
          }
        });
      output += '</ul>';
    }
    
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
  
  output += '</body></html>';
  return output.trim();
}

// Format outline as Word document
export async function formatOutlineAsWord(sections: OutlineSection[]): Promise<Document> {
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
  
  function formatSection(section: OutlineSection, indentLevel: number = 0) {
    const isSubsection = indentLevel > 0;
    const headingLevel = isSubsection ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_2;
    
    // Section title
    children.push(
      new Paragraph({
        text: `${section.section_number}. ${section.title}`,
        heading: headingLevel,
      })
    );
    
    // Cards in this section
    section.card_placements
      .sort((a, b) => a.order_index - b.order_index)
      .forEach(placement => {
        const card = placement.card;
        const content = getCardContent(card);
        
        if (content) {
          const cardType = card.type.charAt(0).toUpperCase() + card.type.slice(1);
          const truncatedContent = card.type === 'source' ? truncateToLines(content) : content;
          
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${cardType}: `,
                  bold: true,
                }),
                new TextRun({
                  text: truncatedContent,
                }),
              ],
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

export async function exportOutlineAsHtml(sections: OutlineSection[], filename: string = 'outline.html') {
  const content = formatOutlineAsHtml(sections);
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  saveAs(blob, filename);
}

export async function exportOutlineAsWord(sections: OutlineSection[], filename: string = 'outline.docx') {
  const doc = await formatOutlineAsWord(sections);
  const buffer = await Packer.toBuffer(doc);
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  saveAs(blob, filename);
}

// Main export function with format selection
export async function exportOutline(sections: OutlineSection[], format: 'txt' | 'html' | 'docx', filename?: string) {
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
