import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '認証トークンが見つかりません' },
        { status: 401 }
      )
    }
    
    const token = authHeader.substring(7)
    
    try {
      const payload = verifyToken(token)
      const supabase = getServiceSupabase()
      
      // ユーザー情報を取得
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', payload.sub)
        .single()
      
      if (userError || !user) {
        return NextResponse.json(
          { error: 'ユーザーが見つかりません' },
          { status: 401 }
        )
      }
      
      if (!user.is_active) {
        return NextResponse.json(
          { error: 'アカウントが無効化されています' },
          { status: 401 }
        )
      }
      
      // 代理店情報を取得（存在する場合）
      let agency = null
      if (payload.agency_id) {
        const { data: agencyData } = await supabase
          .from('agencies')
          .select('*')
          .eq('id', payload.agency_id)
          .single()
        
        agency = agencyData
      }
      
      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        agency: agency ? {
          id: agency.id,
          company_name: agency.company_name,
          tier_level: agency.tier_level,
          status: agency.status,
        } : null,
      })
      
    } catch (error) {
      return NextResponse.json(
        { error: '無効なトークンです' },
        { status: 401 }
      )
    }
    
  } catch (error) {
    console.error('Token verification error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}