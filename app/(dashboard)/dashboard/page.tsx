'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { KPICard } from '@/components/dashboard/KPICard'
import { SalesChart } from '@/components/dashboard/SalesChart'
import { RecentActivities } from '@/components/dashboard/RecentActivities'
import { supabase } from '@/lib/supabase'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import toast from 'react-hot-toast'

interface DashboardData {
  currentMonthSales: number
  currentMonthCommission: number
  activeAgencies: number
  pendingApprovals: number
  salesGrowth: string
  commissionGrowth: string
  salesChartData: { date: string; amount: number }[]
  recentActivities: any[]
}

export default function DashboardPage() {
  const { user, agency } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)
  const currentMonth = new Date()

  useEffect(() => {
    fetchDashboardData()
  }, [user, agency])

  async function fetchDashboardData() {
    if (!user) return

    try {
      setLoading(true)
      const startDate = startOfMonth(currentMonth)
      const endDate = endOfMonth(currentMonth)

      // 現在の月の売上を取得
      let salesQuery = supabase
        .from('sales')
        .select('total_amount, sold_at')
        .gte('sold_at', format(startDate, 'yyyy-MM-dd'))
        .lte('sold_at', format(endDate, 'yyyy-MM-dd'))
        .eq('is_cancelled', false)

      // 代理店の場合は自社の売上のみ
      if (agency && user.role === 'agency') {
        salesQuery = salesQuery.eq('agency_id', agency.id)
      }

      const { data: salesData, error: salesError } = await salesQuery

      if (salesError) throw salesError

      // 売上合計を計算
      const currentMonthSales = salesData?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0

      // 報酬データを取得
      let commissionQuery = supabase
        .from('commissions')
        .select('final_amount')
        .eq('month', format(startDate, 'yyyy-MM-dd'))
        .eq('status', 'confirmed')

      if (agency && user.role === 'agency') {
        commissionQuery = commissionQuery.eq('agency_id', agency.id)
      }

      const { data: commissionData, error: commissionError } = await commissionQuery

      if (commissionError) throw commissionError

      const currentMonthCommission = commissionData?.reduce((sum, comm) => sum + Number(comm.final_amount), 0) || 0

      // アクティブな代理店数を取得（管理者のみ）
      let activeAgencies = 0
      let pendingApprovals = 0

      if (['super_admin', 'admin'].includes(user.role)) {
        const { count: activeCount } = await supabase
          .from('agencies')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')

        const { count: pendingCount } = await supabase
          .from('agencies')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')

        activeAgencies = activeCount || 0
        pendingApprovals = pendingCount || 0
      } else if (agency) {
        // 代理店の場合は配下の代理店数
        const { count } = await supabase
          .from('agencies')
          .select('*', { count: 'exact', head: true })
          .eq('parent_agency_id', agency.id)
          .eq('status', 'active')

        activeAgencies = count || 0
      }

      // 売上チャートデータを整形
      const salesChartData = salesData?.map(sale => ({
        date: sale.sold_at,
        amount: Number(sale.total_amount),
      })) || []

      // 最近の活動を取得
      let activitiesQuery = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      if (agency && user.role === 'agency') {
        activitiesQuery = activitiesQuery.eq('agency_id', agency.id)
      }

      const { data: activities } = await activitiesQuery

      const recentActivities = activities?.map(activity => ({
        id: activity.id,
        type: activity.action_type.includes('sale') ? 'sale' :
              activity.action_type.includes('commission') ? 'commission' :
              activity.action_type.includes('agency') ? 'agency' : 'payment',
        description: getActivityDescription(activity),
        createdAt: activity.created_at,
      })) || []

      setData({
        currentMonthSales,
        currentMonthCommission,
        activeAgencies,
        pendingApprovals,
        salesGrowth: '+12.3%', // TODO: 実際の成長率を計算
        commissionGrowth: '+8.5%', // TODO: 実際の成長率を計算
        salesChartData,
        recentActivities,
      })
    } catch (error) {
      console.error('Dashboard data fetch error:', error)
      toast.error('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  function getActivityDescription(activity: any): string {
    const details = activity.action_details || {}
    switch (activity.action_type) {
      case 'login':
        return 'システムにログインしました'
      case 'agency_registration':
        return `新規代理店が登録されました`
      case 'sales_created':
        return `売上が登録されました`
      case 'commission_calculated':
        return `報酬が計算されました`
      default:
        return activity.action_type
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!data) {
    return <div>データの取得に失敗しました</div>
  }

  const kpiCards = [
    {
      label: '今月の売上',
      value: `¥${data.currentMonthSales.toLocaleString()}`,
      change: data.salesGrowth,
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'primary' as const,
    },
    {
      label: '今月の報酬',
      value: `¥${data.currentMonthCommission.toLocaleString()}`,
      change: data.commissionGrowth,
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'success' as const,
    },
    {
      label: 'アクティブ代理店',
      value: data.activeAgencies,
      change: '+3',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      color: 'info' as const,
    },
  ]

  // 管理者の場合は承認待ちも表示
  if (['super_admin', 'admin'].includes(user?.role || '')) {
    kpiCards.push({
      label: '承認待ち',
      value: data.pendingApprovals,
      change: '0',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
      color: 'warning' as const,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">ダッシュボード</h2>
        <p className="mt-1 text-sm text-gray-600">
          {agency ? `${agency.company_name} - Tier ${agency.tier_level}` : 'システム管理者'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card, index) => (
          <KPICard key={index} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SalesChart data={data.salesChartData} month={currentMonth} />
        <RecentActivities activities={data.recentActivities} />
      </div>
    </div>
  )
}