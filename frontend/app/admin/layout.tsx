import { redirect } from 'next/navigation'

async function getCurrentUser() {
  // In a real app, read the JWT/session cookie and validate against the API
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    redirect('/')
  }

  return (
    <div className="flex h-screen">
      <aside className="w-56 border-r bg-gray-900 text-white p-4">
        <h2 className="font-bold mb-6">Admin</h2>
        <nav className="space-y-2 text-sm">
          <a href="/admin/users" className="block px-3 py-2 rounded hover:bg-gray-800">Users</a>
          <a href="/admin/models" className="block px-3 py-2 rounded hover:bg-gray-800">Models</a>
          <a href="/admin/subscriptions" className="block px-3 py-2 rounded hover:bg-gray-800">Subscriptions</a>
          <a href="/admin/analytics" className="block px-3 py-2 rounded hover:bg-gray-800">Analytics</a>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}
