import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'

// 認証不要なパス
const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password']
const authPaths = ['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 静的ファイルやAPIルートの一部は除外
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    authPaths.some(path => pathname.startsWith(path))
  ) {
    return NextResponse.next()
  }
  
  // 認証トークンの確認
  const token = request.cookies.get('auth_token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '')
  
  const isPublicPath = publicPaths.includes(pathname)
  
  // 公開パスへのアクセス
  if (isPublicPath) {
    // 既にログインしている場合はダッシュボードへリダイレクト
    if (token) {
      try {
        verifyToken(token)
        return NextResponse.redirect(new URL('/dashboard', request.url))
      } catch {
        // トークンが無効な場合は続行
      }
    }
    return NextResponse.next()
  }
  
  // 保護されたパスへのアクセス
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  try {
    const payload = verifyToken(token)
    
    // 管理者専用パスのチェック
    if (pathname.startsWith('/admin') && !['super_admin', 'admin'].includes(payload.role)) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    
    // APIルートの場合はヘッダーにユーザー情報を追加
    if (pathname.startsWith('/api')) {
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-user-id', payload.sub)
      requestHeaders.set('x-user-role', payload.role)
      requestHeaders.set('x-agency-id', payload.agency_id || '')
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    }
    
    return NextResponse.next()
  } catch (error) {
    // トークンが無効な場合はログインページへ
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}