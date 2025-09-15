import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { image_urls } = await request.json();
    
    if (!image_urls || !Array.isArray(image_urls)) {
      return NextResponse.json({ error: 'image_urls is required and must be an array' }, { status: 400 });
    }
    
    // Forward the request to the backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/outline/export-images/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '', // Forward cookies for authentication
      },
      body: JSON.stringify({ image_urls }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: errorText }, { status: response.status });
    }
    
    // Return the ZIP file
    const zipBuffer = await response.arrayBuffer();
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename=outline_images.zip',
      },
    });
    
  } catch (error) {
    console.error('Error in export-images API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 