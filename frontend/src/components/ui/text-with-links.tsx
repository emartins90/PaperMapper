import React from "react";

// Enhanced URL regex pattern to detect URLs, DOIs, and other linkable content in text
// This will match URLs with or without protocol, DOIs, and common patterns like www.
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+|[^\s]+\.[^\s]{2,}\/[^\s]*|doi\.org\/[^\s]+|10\.\d{4,}\/[^\s]+)/g;

interface TextWithLinksProps {
  text: string;
  className?: string;
  disableLinks?: boolean;
}

// Function to normalize URLs (add https:// if missing)
function normalizeUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('www.')) {
    return `https://${url}`;
  }
  // Handle DOIs - convert to doi.org URL
  if (url.startsWith('10.')) {
    return `https://doi.org/${url}`;
  }
  // For other patterns like "example.com" or "example.com/path"
  if (url.includes('.') && !url.startsWith('http')) {
    return `https://${url}`;
  }
  return url;
}

export function TextWithLinks({ text, className = "", disableLinks = false }: TextWithLinksProps) {
  if (!text) return null;
  
  const parts = text.split(URL_REGEX);
  const result: React.ReactNode[] = [];
  
  parts.forEach((part, index) => {
    // Check if this part looks like a URL or DOI
    if (URL_REGEX.test(part) && !disableLinks) {
      // Normalize the URL
      const normalizedUrl = normalizeUrl(part);
      
      // This is a URL or DOI - make it clickable
      result.push(
        <a
          key={index}
          href={normalizedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    } else {
      // This is regular text or disabled links - just show as text
      result.push(part);
    }
  });
  
  return <span className={className}>{result}</span>;
} 