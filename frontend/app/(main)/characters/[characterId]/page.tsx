import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Character Details',
}

async function getCharacter(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/characters/${id}`, {
    next: { revalidate: 60 },
  })
  if (!res.ok) return null
  return res.json()
}

export default async function CharacterPage({ params }: { params: { characterId: string } }) {
  const character = await getCharacter(params.characterId)
  if (!character) return notFound()

  return (
    <section className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-2">{character.name}</h2>
      <div className="flex flex-wrap gap-2 mb-4">
        {character.tags.map((tag: string) => (
          <span key={tag} className="text-xs px-2 py-1 bg-gray-100 rounded">{tag}</span>
        ))}
      </div>
      <p className="text-gray-700 mb-6">{character.description}</p>
      <h3 className="font-semibold mb-1">System Prompt</h3>
      <pre className="bg-gray-50 border rounded p-3 text-sm whitespace-pre-wrap">{character.systemPrompt}</pre>
      <div className="mt-6">
        <form
          action={async () => {
            'use server'
            // Server Action to create a chat session and redirect
            // In a real app, call API to create session, then redirect
          }}
        >
          <button className="px-5 py-2 bg-black text-white rounded">Start Chat</button>
        </form>
      </div>
    </section>
  )
}
