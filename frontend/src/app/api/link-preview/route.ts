import { NextRequest, NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';

interface LinkMetadata {
  title: string;
  description: string;
  image: string;
  favicon?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    // Validate URL
    const urlObj = new URL(url);
    
    // Fetch the HTML content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PaperMapper/1.0)',
      },
      // Add timeout
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    
    // Parse metadata from HTML
    const metadata = extractMetadata(html, urlObj);
    
    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Error fetching link preview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch link preview' },
      { status: 500 }
    );
  }
}

function extractMetadata(html: string, urlObj: URL): LinkMetadata {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  
  // Extract title
  const title = 
    doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
    doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
    doc.querySelector('title')?.textContent ||
    '';

  // Extract description
  const description = 
    doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
    doc.querySelector('meta[name="twitter:description"]')?.getAttribute('content') ||
    doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
    '';

  // Extract high-quality images with priority order
  const image = 
    doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
    doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content') ||
    doc.querySelector('meta[property="og:image:width"][content="1200"]')?.parentElement?.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
    '';

  // Extract favicon with preference for larger sizes
  let favicon = '';
  const iconLinks = doc.querySelectorAll('link[rel*="icon"]');
  
  // Priority order: apple-touch-icon > icon with sizes > default icon
  const appleTouchIcon = doc.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href');
  if (appleTouchIcon) {
    favicon = appleTouchIcon;
  } else {
    // Look for the largest icon
    let largestIcon = '';
    let maxSize = 0;
    
    iconLinks.forEach(link => {
      const href = link.getAttribute('href');
      const sizes = link.getAttribute('sizes');
      
      if (href) {
        if (sizes) {
          // Parse sizes like "32x32" or "16x16"
          const sizeMatch = sizes.match(/(\d+)x(\d+)/);
          if (sizeMatch) {
            const size = parseInt(sizeMatch[1]) * parseInt(sizeMatch[2]);
            if (size > maxSize) {
              maxSize = size;
              largestIcon = href;
            }
          }
        } else if (!largestIcon) {
          // Fallback to first icon without sizes
          largestIcon = href;
        }
      }
    });
    
    favicon = largestIcon || `${urlObj.origin}/favicon.ico`;
  }

  // Resolve relative URLs to absolute URLs
  const resolveUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return `${urlObj.protocol}${url}`;
    if (url.startsWith('/')) return `${urlObj.origin}${url}`;
    return `${urlObj.origin}/${url}`;
  };

  return {
    title: title.trim(),
    description: description.trim(),
    image: resolveUrl(image),
    favicon: resolveUrl(favicon),
  };
} 