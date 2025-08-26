 import { NextResponse } from
  'next/server'
  import type { NextRequest } from
  'next/server'

  export function middleware(request:
  NextRequest) {
    //
  ビルドテスト中は全てのリクエストを通す
    return NextResponse.next()
  }

  export const config = {
    matcher: [
      '/((?!_next/static|_next/image|favico
  n.ico).*)',
    ],
  }
