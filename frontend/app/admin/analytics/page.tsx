import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Analytics',
}

async function getOverview() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/analytics/overview`, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

export default async function AdminAnalyticsPage() {
  const stats = await getOverview()

  if (!stats) {
    return <p className="text-red-600">Failed to load analytics.</p>
  }

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Analytics Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border rounded p-4">
          <p className="text-sm text-gray-600">Total Users</p>
          <p className="text-2xl font-bold">{stats.totalUsers}</p>
        </div>
        <div className="border rounded p-4">
          <p className="text-sm text-gray-600">Total Sessions</p>
          <p className="text-2xl font-bold">{stats.totalSessions}</p>
        </div>
        <div className="border rounded p-4">
          <p className="text-sm text-gray-600">Total Messages</p>
          <p className="text-2xl font-bold">{stats.totalMessages}</p>
        </div>
        <div className="border rounded p-4">
          <p className="text-sm text-gray-600">Active Subs</p>
          <p className="text-2xl font-bold">{stats.activeSubs}</p>
        </div>
      </div>
    </section>
  )
}
