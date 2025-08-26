import { NextRequest, NextResponse } from
   'next/server'

  export async function GET(request:
  NextRequest) {
    return NextResponse.json({
      user: null,
      message: 'ビルドテスト中'
    }, { status: 401 })
  }
