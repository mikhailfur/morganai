import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Models',
}

async function getModels() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/models`, {
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json()
}

export default async function AdminModelsPage() {
  const models = await getModels()

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Models</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">Provider ID</th>
            <th className="py-2">Display Name</th>
            <th className="py-2">Active</th>
            <th className="py-2">Premium Only</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m: any) => (
            <tr key={m.id} className="border-b">
              <td className="py-2 font-mono text-xs">{m.providerId}</td>
              <td className="py-2">{m.displayName}</td>
              <td className="py-2">{m.isActive ? 'Yes' : 'No'}</td>
              <td className="py-2">{m.isPremium ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
