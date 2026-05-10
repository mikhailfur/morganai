import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Users',
}

async function getUsers() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users`, {
    cache: 'no-store',
  })
  if (!res.ok) return { data: [], meta: { total: 0 } }
  return res.json()
}

export default async function AdminUsersPage() {
  const { data: users, meta } = await getUsers()

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Users</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">Email</th>
            <th className="py-2">Display Name</th>
            <th className="py-2">Role</th>
            <th className="py-2">Premium</th>
            <th className="py-2">Created</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u: any) => (
            <tr key={u.id} className="border-b">
              <td className="py-2">{u.email}</td>
              <td className="py-2">{u.displayName ?? '-'}</td>
              <td className="py-2">{u.role}</td>
              <td className="py-2">{u.isPremium ? 'Yes' : 'No'}</td>
              <td className="py-2">{new Date(u.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {meta.total === 0 && <p className="text-gray-500 mt-4">No users found.</p>}
    </section>
  )
}
