import Link from 'next/link'

export default function HomePage() {
  return (
    <section className="p-8">
      <h2 className="text-2xl font-semibold mb-4">Welcome to MorganAI</h2>
      <p className="mb-6 text-gray-600">
        Chat with AI characters, create your own, and explore the marketplace.
      </p>
      <div className="flex gap-4">
        <Link href="/marketplace" className="px-4 py-2 bg-black text-white rounded">
          Explore Characters
        </Link>
        <Link href="/characters/new" className="px-4 py-2 border rounded">
          Create Character
        </Link>
      </div>
    </section>
  )
}
