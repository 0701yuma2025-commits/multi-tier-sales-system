interface KPICardProps {
  label: string
  value: string | number
  change?: string
  icon: string
  color?: 'primary' | 'success' | 'warning' | 'info'
}

const colorMap = {
  primary: 'bg-primary-100 text-primary-600',
  success: 'bg-green-100 text-green-600',
  warning: 'bg-yellow-100 text-yellow-600',
  info: 'bg-blue-100 text-blue-600',
}

export function KPICard({ label, value, change, icon, color = 'primary' }: KPICardProps) {
  const isPositive = change && change.startsWith('+')
  const isNegative = change && change.startsWith('-')

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
          {change && (
            <div className="mt-2 flex items-center text-sm">
              <span
                className={`font-medium ${
                  isPositive
                    ? 'text-green-600'
                    : isNegative
                    ? 'text-red-600'
                    : 'text-gray-600'
                }`}
              >
                {change}
              </span>
              <span className="text-gray-500 ml-2">前月比</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorMap[color]}`}>
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={icon}
            />
          </svg>
        </div>
      </div>
    </div>
  )
}