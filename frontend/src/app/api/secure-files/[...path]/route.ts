import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const folder = path[0];
  const filename = path[1];
  
  if (!folder || !filename) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const url = `${apiUrl}/secure-files/${folder}/${filename}`;

  // Debug: Log what cookies we're forwarding
  const cookies = request.headers.get('cookie') || '';
  console.log('[SECURE-FILES] Forwarding cookies:', cookies);
  console.log('[SECURE-FILES] Request URL:', url);

  try {
    const response = await fetch(url, {
      headers: {
        'Cookie': cookies,
        'User-Agent': request.headers.get('user-agent') || '',
        'Accept': request.headers.get('accept') || '*/*',
        'Accept-Language': request.headers.get('accept-language') || '',
        'Accept-Encoding': request.headers.get('accept-encoding') || '',
      },
    });

    if (!response.ok) {
      console.log('[SECURE-FILES] Backend response not ok:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'File not found or access denied' }, 
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const body = await response.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[SECURE-FILES] Error fetching secure file:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 