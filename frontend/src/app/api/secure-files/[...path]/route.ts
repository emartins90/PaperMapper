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

  try {
    const response = await fetch(url, {
      headers: {
        'Cookie': request.headers.get('cookie') || '',
        'User-Agent': request.headers.get('user-agent') || '',
        'Accept': request.headers.get('accept') || '*/*',
        'Accept-Language': request.headers.get('accept-language') || '',
        'Accept-Encoding': request.headers.get('accept-encoding') || '',
      },
    });

    if (!response.ok) {
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
    console.error('Error fetching secure file:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 