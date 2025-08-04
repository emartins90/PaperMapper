import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const { path } = params;
  const folder = path[0];
  const filename = path[1];
  
  if (!folder || !filename) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const url = `${apiUrl}/secure-files/${folder}/${filename}`;

  console.log('[API-DEBUG] Forwarding request to:', url);
  console.log('[API-DEBUG] Cookies being sent:', request.headers.get('cookie'));

  try {
    // Forward the request with all headers including cookies
    const response = await fetch(url, {
      headers: {
        'Cookie': request.headers.get('cookie') || '',
        'User-Agent': request.headers.get('user-agent') || '',
        'Accept': request.headers.get('accept') || '*/*',
        'Accept-Language': request.headers.get('accept-language') || '',
        'Accept-Encoding': request.headers.get('accept-encoding') || '',
      },
    });

    console.log('[API-DEBUG] Backend response status:', response.status);

    if (!response.ok) {
      console.log('[API-DEBUG] Backend error:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'File not found or access denied' }, 
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const body = await response.arrayBuffer();

    console.log('[API-DEBUG] Successfully retrieved file, size:', body.byteLength);

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[API-DEBUG] Error fetching secure file:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 