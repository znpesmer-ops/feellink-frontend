import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  
  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 })
  }

  try {
    const res = await fetch(url, { 
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    })
    
    if (!res.ok) {
      return new NextResponse('Upstream error', { status: 502 })
    }

    // İçerik türünü koru
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const buf = Buffer.from(await res.arrayBuffer())
    
    return new NextResponse(buf, {
      status: 200,
      headers: { 
        'content-type': contentType, 
        'cache-control': 'public, max-age=3600',
        'access-control-allow-origin': '*',
      },
    })
  } catch (error) {
    console.error('Image proxy error:', error)
    return new NextResponse('Proxy error', { status: 500 })
  }
}

