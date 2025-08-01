import React, { useEffect, useState } from "react";
import { LuExternalLink, LuNotepadText, LuSearch, LuFileText, LuLightbulb, LuMessageCircle, LuSpeech, LuLibrary, LuBrain, LuFileQuestion, LuLibraryBig } from "react-icons/lu";

interface ResourceCardProps {
  url: string;
  title?: string;
  description?: string;
  category?: string;
  onError?: (error: string) => void;
}

interface LinkMetadata {
  title: string;
  description: string;
  image: string;
  favicon?: string;
}

// Function to get icon background color based on category
function getIconBackgroundColor(category?: string): string {
  if (!category) return 'bg-muted';
  
  const categoryLower = category.toLowerCase();
  
  if (categoryLower.includes('writing') || categoryLower.includes('guide')) {
    return 'bg-primary-100';
  }
  if (categoryLower.includes('argument') || categoryLower.includes('thesis')) {
    return 'bg-claim-100';
  }
  if (categoryLower.includes('critical') || categoryLower.includes('thinking')) {
    return 'bg-insight-100';
  }
  if (categoryLower.includes('research') || categoryLower.includes('source')) {
    return 'bg-source-100';
  }
  if (categoryLower.includes('citation') || categoryLower.includes('bibliography')) {
    return 'bg-source-100';
  }
  
  return 'bg-muted';
}

// Function to get icon based on content/URL keywords with proper colors
function getIconForResource(url: string, title?: string, category?: string) {


  // Category-based fallback with foreground color
  if (category) {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('writing') || categoryLower.includes('guide')) {
      return <LuLibraryBig className="w-4 h-4 text-foreground" />;
    }
    if (categoryLower.includes('argument') || categoryLower.includes('thesis')) {
      return <LuSpeech className="w-4 h-4 text-foreground" />;
    }
    if (categoryLower.includes('critical') || categoryLower.includes('thinking')) {
      return <LuBrain className="w-4 h-4 text-foreground" />;
    }
    if (categoryLower.includes('research') || categoryLower.includes('source')) {
      return <LuFileQuestion className="w-4 h-4 text-foreground" />;
    }
    if (categoryLower.includes('citation') || categoryLower.includes('bibliography')) {
      return <LuNotepadText className="w-4 h-4 text-foreground" />;
    }
  }

  // Default icon
  return <LuExternalLink className="w-4 h-4 text-foreground" />;
}

// Function to extract source name from URL
function getSourceName(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // Map common hostnames to friendly names
    const sourceMap: { [key: string]: string } = {
      'owl.purdue.edu': 'Purdue OWL',
      'writing.wisc.edu': 'UW-Madison Writing Center',
      'writingcenter.unc.edu': 'UNC Writing Center',
      'guides.library.cornell.edu': 'Cornell Library',
      'libguides.usc.edu': 'USC Libraries',
      'owl.english.purdue.edu': 'Purdue OWL',
    };
    
    return sourceMap[hostname] || hostname.replace('www.', '');
  } catch {
    return 'Unknown Source';
  }
}

export default function ResourceCard({
  url,
  title: propTitle,
  description: propDescription,
  category,
  onError
}: ResourceCardProps) {
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLinkMetadata();
  }, [url]);

  const fetchLinkMetadata = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);

      if (!response.ok) {
        throw new Error('Failed to fetch link metadata');
      }

      const data = await response.json();
      setMetadata(data);
    } catch (err) {
      console.error('Error fetching link metadata:', err);
      setError('Failed to load link preview');
      onError?.(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const displayTitle = propTitle || 'Loading...';
  const sourceName = getSourceName(url);

  return (
    <div 
      className="flex items-center justify-between p-2 h-14 hover:bg-accent/50 rounded-md cursor-pointer transition-colors border border-border"
      onClick={handleClick}
    >
      {/* Left side - Icon and Content */}
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        {/* Icon Container */}
        <div className={`w-8 h-8 ${getIconBackgroundColor(category)} rounded-md flex items-center justify-center flex-shrink-0`}>
          {loading ? (
            <div className="w-4 h-4 bg-muted-foreground/20 rounded animate-pulse"></div>
          ) : (
            getIconForResource(url, displayTitle, category)
          )}
        </div>

        {/* Two-line content */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-foreground truncate">
            {sourceName}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {displayTitle}
          </div>
        </div>
      </div>

      {/* Right side - External Link Icon */}
      <LuExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0 ml-2" />
    </div>
  );
} 