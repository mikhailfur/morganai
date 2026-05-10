import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Subscriptions',
}

async function getSubscriptions() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/subscriptions`, {
    cache: 'no-store',
  })
  if (!res.ok) return { data: [], meta: { total: 0 } }
  return res.json()
}

export default async function AdminSubscriptionsPage() {
  const { data: subscriptions } = await getSubscriptions()

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Subscriptions</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">User</th>
            <th className="py-2">Provider</th>
            <th className="py-2">Status</th>
            <th className="py-2">Expires</th>
          </tr>
        </thead>
        <tbody>
          {subscriptions.map((s: any) => (
            <tr key={s.id} className="border-b">
              <td className="py-2">{s.user?.email ?? s.userId}</td>
              <td className="py-2">{s.provider}</td>
              <td className="py-2">{s.status}</td>
              <td className="py-2">
                {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
