'use client'

import { useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns'
import { ja } from 'date-fns/locale'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface SalesChartProps {
  data: {
    date: string
    amount: number
  }[]
  month: Date
}

export function SalesChart({ data, month }: SalesChartProps) {
  const days = eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month),
  })

  const labels = days.map(day => format(day, 'd日', { locale: ja }))
  
  const salesData = days.map(day => {
    const dayData = data.find(
      d => format(new Date(d.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
    )
    return dayData?.amount || 0
  })

  const chartData = {
    labels,
    datasets: [
      {
        label: '売上',
        data: salesData,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.y
            return `売上: ¥${value.toLocaleString()}`
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '¥' + value.toLocaleString()
          },
        },
      },
    },
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {format(month, 'yyyy年MM月', { locale: ja })}の売上推移
      </h3>
      <div className="h-64">
        <Line data={chartData} options={options} />
      </div>
    </div>
  )
}