import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface Activity {
  id: string
  type: 'sale' | 'commission' | 'agency' | 'payment'
  description: string
  createdAt: string
}

interface RecentActivitiesProps {
  activities: Activity[]
}

const typeConfig = {
  sale: {
    icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
    color: 'text-blue-600 bg-blue-100',
  },
  commission: {
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    color: 'text-green-600 bg-green-100',
  },
  agency: {
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    color: 'text-purple-600 bg-purple-100',
  },
  payment: {
    icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    color: 'text-yellow-600 bg-yellow-100',
  },
}

export function RecentActivities({ activities }: RecentActivitiesProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">最近の活動</h3>
      </div>
      <div className="divide-y divide-gray-200">
        {activities.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            まだ活動履歴がありません
          </div>
        ) : (
          activities.map((activity) => {
            const config = typeConfig[activity.type]
            return (
              <div key={activity.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${config.color}`}>
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={config.icon}
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(activity.createdAt), 'yyyy年MM月dd日 HH:mm', {
                        locale: ja,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
      {activities.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 text-center">
          <button className="text-sm text-primary-600 hover:text-primary-500 font-medium">
            すべての活動を見る
          </button>
        </div>
      )}
    </div>
  )
}