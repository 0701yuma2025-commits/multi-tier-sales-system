import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { verifyPassword } from '@/lib/auth/hash'
import { generateToken, getPermissionsByRole } from '@/lib/auth/jwt'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // バリデーション
    const validationResult = loginSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 400 }
      )
    }
    
    const { email, password } = validationResult.data
    const supabase = getServiceSupabase()
    
    // IPアドレス取得（スパム対策用）
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    
    // スパムチェック
    const { data: isSpam } = await supabase.rpc('check_spam_activity', {
      p_ip_address: ip,
      p_action_type: 'login'
    })
    
    if (isSpam) {
      return NextResponse.json(
        { error: 'ログイン試行回数が上限に達しました。しばらくしてから再度お試しください。' },
        { status: 429 }
      )
    }
    
    // ユーザー検索
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()
    
    if (userError || !user) {
      // ログイン失敗をログに記録
      await supabase.from('activity_logs').insert({
        action_type: 'login_attempt',
        action_details: { email, success: false },
        ip_address: ip,
        user_agent: request.headers.get('user-agent') || null,
      })
      
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      )
    }
    
    // アカウントロックチェック
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return NextResponse.json(
        { error: 'アカウントがロックされています。しばらくしてから再度お試しください。' },
        { status: 401 }
      )
    }
    
    // パスワード検証
    const isPasswordValid = await verifyPassword(password, user.password_hash)
    
    if (!isPasswordValid) {
      // ログイン失敗回数を増やす
      const failedAttempts = user.failed_login_attempts + 1
      let updateData: any = { failed_login_attempts: failedAttempts }
      
      // 5回失敗したらアカウントロック（1時間）
      if (failedAttempts >= 5) {
        updateData.locked_until = new Date(Date.now() + 60 * 60 * 1000).toISOString()
      }
      
      await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)
      
      // ログイン失敗をログに記録
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action_type: 'login_attempt',
        action_details: { success: false },
        ip_address: ip,
        user_agent: request.headers.get('user-agent') || null,
      })
      
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      )
    }
    
    // アクティブチェック
    if (!user.is_active) {
      return NextResponse.json(
        { error: 'このアカウントは無効化されています' },
        { status: 401 }
      )
    }
    
    // 代理店情報を取得
    const { data: agency } = await supabase
      .from('agencies')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    // JWTトークン生成
    const permissions = getPermissionsByRole(user.role)
    const token = generateToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      agency_id: agency?.id,
      tier_level: agency?.tier_level,
      permissions,
    })
    
    // ログイン成功時の処理
    await supabase
      .from('users')
      .update({
        last_login_at: new Date().toISOString(),
        failed_login_attempts: 0,
      })
      .eq('id', user.id)
    
    // ログイン成功をログに記録
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      agency_id: agency?.id,
      action_type: 'login',
      action_details: { success: true },
      ip_address: ip,
      user_agent: request.headers.get('user-agent') || null,
    })
    
    // レスポンス
    return NextResponse.json({
      token,
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
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}