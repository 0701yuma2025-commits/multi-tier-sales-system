 import { NextRequest, NextResponse } from
   'next/server'

  export async function POST(request: NextRequest) {
    return NextResponse.json({
      message: 'ビルドテスト中 - ログイン機能は無効です'
    }, { status: 200 })
  }
