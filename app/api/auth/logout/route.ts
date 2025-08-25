import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { getServiceSupabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: true })
    }
    
    const token = authHeader.substring(7)
    
    try {
      const payload = verifyToken(token)
      const supabase = getServiceSupabase()
      
      // ログアウトをログに記録
      await supabase.from('activity_logs').insert({
        user_id: payload.sub,
        agency_id: payload.agency_id,
        action_type: 'logout',
        action_details: { success: true },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || null,
      })
      
    } catch (error) {
      // トークンが無効でもログアウトは成功として扱う
      console.error('Logout error:', error)
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ success: true })
  }
}