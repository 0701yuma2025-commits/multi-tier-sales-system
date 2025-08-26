 'use client'

  export default function DashboardPage() {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold
  mb-4">ダッシュボード</h1>
        <p
  className="text-gray-600">ビルドテスト中
  - Netlifyデプロイ確認用</p>

        <div className="mt-8 grid
  grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6
  rounded-lg shadow">
            <h2 className="text-lg
  font-semibold">今月の売上</h2>
            <p className="text-2xl
  font-bold mt-2">¥0</p>
          </div>
          <div className="bg-white p-6
  rounded-lg shadow">
            <h2 className="text-lg
  font-semibold">今月の報酬</h2>
            <p className="text-2xl
  font-bold mt-2">¥0</p>
          </div>
          <div className="bg-white p-6
  rounded-lg shadow">
            <h2 className="text-lg
  font-semibold">アクティブ代理店</h2>
            <p className="text-2xl
  font-bold mt-2">0</p>
          </div>
        </div>
      </div>
    )
  }
