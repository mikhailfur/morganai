'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Visibility = 'PUBLIC' | 'PRIVATE' | 'UNLISTED'

export default function CharacterForm() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    welcomeMessage: '',
    systemPrompt: '',
    visibility: 'PUBLIC' as Visibility,
    tags: [] as string[],
    isNSFW: false,
  })
  const [avatar, setAvatar] = useState<File | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: checked }))
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }))
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const data = new FormData()
      data.append('name', formData.name)
      data.append('welcomeMessage', formData.welcomeMessage)
      data.append('systemPrompt', formData.systemPrompt)
      data.append('visibility', formData.visibility)
      data.append('tags', JSON.stringify(formData.tags))
      data.append('isNSFW', String(formData.isNSFW))
      if (avatar) data.append('avatar', avatar)

      const res = await fetch('/api/characters', {
        method: 'POST',
        body: data,
      })

      if (!res.ok) throw new Error('Failed to create character')

      const character = await res.json()
      router.push(`/chat/${character.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Create New Character</h1>

      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="name" className="block text-sm font-medium">
          Character Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          value={formData.name}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter character name"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="avatar" className="block text-sm font-medium">
          Avatar
        </label>
        <input
          id="avatar"
          type="file"
          accept="image/*"
          onChange={(e) => setAvatar(e.target.files?.[0] || null)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="welcomeMessage" className="block text-sm font-medium">
          Welcome Message
        </label>
        <textarea
          id="welcomeMessage"
          name="welcomeMessage"
          required
          rows={3}
          value={formData.welcomeMessage}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="First message the character sends to users"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="systemPrompt" className="block text-sm font-medium">
          System Prompt (Character Personality)
        </label>
        <textarea
          id="systemPrompt"
          name="systemPrompt"
          required
          rows={6}
          value={formData.systemPrompt}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          placeholder="Define the character's personality, speech style, background, and behavior..."
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="visibility" className="block text-sm font-medium">
          Visibility
        </label>
        <select
          id="visibility"
          name="visibility"
          value={formData.visibility}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="PUBLIC">Public - Visible to everyone</option>
          <option value="UNLISTED">Unlisted - Only accessible via direct link</option>
          <option value="PRIVATE">Private - Only visible to you</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Tags</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Add a tag (e.g., Учёба, Работа, Психолог)"
          />
          <button
            type="button"
            onClick={addTag}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {formData.tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-blue-500 hover:text-blue-700"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="isNSFW"
          name="isNSFW"
          type="checkbox"
          checked={formData.isNSFW}
          onChange={handleCheckboxChange}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="isNSFW" className="text-sm font-medium">
          NSFW Content
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating...' : 'Create Character'}
      </button>
    </form>
  )
}
