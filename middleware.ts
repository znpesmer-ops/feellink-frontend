import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes - auth kontrolü yapma
  const publicRoutes = ['/login', '/register', '/terms', '/privacy', '/guidelines']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Token kontrolü - cookie'den oku
  const token = request.cookies.get('access_token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '')

  // Login sayfasına erişim kontrolü
  if (pathname === '/login' && token) {
    // Token varsa login sayfasından feed'e yönlendir
    return NextResponse.redirect(new URL('/feed', request.url))
  }

  // Register sayfasına erişim kontrolü
  if (pathname === '/register' && token) {
    // Token varsa register sayfasından feed'e yönlendir
    return NextResponse.redirect(new URL('/feed', request.url))
  }

  // Protected routes - token yoksa login'e yönlendir
  if (!isPublicRoute && !token && pathname !== '/') {
    // Root path'i kontrol et - eğer root ise feed'e yönlendir (zaten login kontrolü yapılacak)
    if (pathname === '/') {
      return NextResponse.next()
    }
    // Diğer protected route'lar için login'e yönlendir
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  // 🔥 GEÇİCİ OLARAK DEVRE DIŞI - localStorage kullanıyoruz, cookie değil
  // İleride HTTP-only cookie'ye geçildiğinde bu aktif edilecek
  matcher: [
    // Sadece login ve register sayfaları için çalışsın (token varsa redirect)
    '/login',
    '/register',
  ],
}
