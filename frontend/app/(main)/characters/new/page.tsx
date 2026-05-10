import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { CreateCharacterForm } from './CreateCharacterForm'

export const metadata: Metadata = {
  title: 'Create Character',
}

export default function NewCharacterPage() {
  return (
    <section className="p-6 max-w-xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Create Character</h2>
      <CreateCharacterForm />
    </section>
  )
}

function CreateCharacterForm() {
  'use client'
  return (
    <form
      className="space-y-4"
      action={async (formData: FormData) => {
        'use server'
        // In a real app: import server action from actions.ts
        const name = formData.get('name') as string
        const description = formData.get('description') as string
        const systemPrompt = formData.get('systemPrompt') as string
        const visibility = formData.get('visibility') as string
        const tags = (formData.get('tags') as string).split(',').map((t) => t.trim())

        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/characters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, systemPrompt, visibility, tags }),
        })
        redirect('/marketplace')
      }}
    >
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input name="name" required className="w-full border rounded px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea name="description" required className="w-full border rounded px-3 py-2 text-sm" rows={3} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">System Prompt</label>
        <textarea name="systemPrompt" required className="w-full border rounded px-3 py-2 text-sm" rows={5} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Tags (comma separated)</label>
        <input name="tags" placeholder="SFW, Romantic, Cyberpunk" className="w-full border rounded px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Visibility</label>
        <select name="visibility" className="w-full border rounded px-3 py-2 text-sm">
          <option value="PUBLIC">Public</option>
          <option value="UNLISTED">Unlisted</option>
          <option value="PRIVATE">Private</option>
        </select>
      </div>
      <button type="submit" className="px-5 py-2 bg-black text-white rounded text-sm">
        Create
      </button>
    </form>
  )
}
