'use client'

import { useEffect } from 'react'

export default function ChatError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('Chat route error:', error)
  }, [error])

  return (
    <div className="p-8 text-center">
      <h2 className="text-lg font-semibold text-red-600 mb-2">Something went wrong loading this chat.</h2>
      <p className="text-sm text-gray-600 mb-4">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-black text-white rounded text-sm"
      >
        Try again
      </button>
    </div>
  )
}
