 export default function DashboardLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    return (
      <div className="min-h-screen
  bg-gray-100">
        <nav className="bg-white shadow">
          <div className="px-4 py-4">
            <h1 className="text-xl font-bol
  d">多段階営業代理店管理システム</h1>
          </div>
        </nav>
        <main>{children}</main>
      </div>
    )
  }
