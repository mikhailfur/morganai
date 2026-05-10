'use server'

import { revalidatePath } from 'next/cache'

export async function createCharacter(formData: FormData) {
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const systemPrompt = formData.get('systemPrompt') as string
  const visibility = (formData.get('visibility') as string) ?? 'PRIVATE'
  const tags = (formData.get('tags') as string)
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/characters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, systemPrompt, visibility, tags }),
  })

  if (!res.ok) {
    throw new Error('Failed to create character')
  }

  revalidatePath('/marketplace')
}
