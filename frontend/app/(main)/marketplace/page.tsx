import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Marketplace',
  description: 'Discover AI characters on MorganAI',
}

async function getCharacters(searchParams: Record<string, string>) {
  const qs = new URLSearchParams(searchParams)
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/characters?${qs}`, {
    next: { revalidate: 60 },
  })
  if (!res.ok) return { data: [], meta: { total: 0 } }
  return res.json()
}

export default async function MarketplacePage({ searchParams }: { searchParams: Record<string, string> }) {
  const { data: characters, meta } = await getCharacters(searchParams)

  return (
    <section className="p-6">
      <h2 className="text-xl font-semibold mb-4">Marketplace</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {characters.map((char: any) => (
          <Link
            key={char.id}
            href={`/characters/${char.id}`}
            className="border rounded-lg p-4 hover:shadow transition bg-white"
          >
            <h3 className="font-semibold">{char.name}</h3>
            <p className="text-sm text-gray-600 line-clamp-2">{char.description}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {char.tags.map((tag: string) => (
                <span key={tag} className="text-xs px-2 py-1 bg-gray-100 rounded">{tag}</span>
              ))}
            </div>
          </Link>
        ))}
      </div>
      {meta.total === 0 && <p className="text-gray-500 mt-8">No characters found.</p>}
    </section>
  )
}
