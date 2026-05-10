import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

async function getSession(sessionId: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat-sessions/${sessionId}`, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

export async function generateMetadata({ params }: { params: { sessionId: string } }): Promise<Metadata> {
  return { title: `Chat ${params.sessionId}` }
}

export default async function ChatPage({ params }: { params: { sessionId: string } }) {
  const session = await getSession(params.sessionId)
  if (!session) return notFound()

  return (
    <section className="flex flex-col h-full">
      <header className="border-b px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Character</p>
          <h3 className="font-semibold">{session.character?.name ?? 'Unknown'}</h3>
        </div>
        {/* ModelSelector is a Client Component boundary */}
        <ChatModelSelector current={session.selectedModel} sessionId={params.sessionId} />
      </header>
      <div className="flex-1 p-4 overflow-auto">
        {/* MessageList is a Client Component */}
        <ChatMessageList sessionId={params.sessionId} initialMessages={session.messages ?? []} />
      </div>
      <div className="border-t px-4 py-3">
        <ChatInput sessionId={params.sessionId} />
      </div>
    </section>
  )
}

// Avoid bundling heavy client components into the server bundle by declaring them in the same file
// In a real app these would be imported from separate files

function ChatModelSelector({ current, sessionId }: { current: string; sessionId: string }) {
  'use client'
  return (
    <select
      className="border rounded px-2 py-1 text-sm"
      defaultValue={current}
      onChange={async (e) => {
        await fetch(`/api/chat-sessions/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selectedModel: e.target.value }),
        })
        window.location.reload()
      }}
    >
      <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
      <option value="openai/gpt-4o">GPT-4o</option>
      <option value="meta-llama/llama-3-70b-instruct">Llama 3 70B</option>
    </select>
  )
}

function ChatMessageList({ sessionId, initialMessages }: { sessionId: string; initialMessages: any[] }) {
  'use client'
  // In a real implementation this would connect to Socket.io and render streamed tokens
  return (
    <div className="space-y-3">
      {initialMessages.map((msg) => (
        <div key={msg.id} className={`p-3 rounded ${msg.role === 'USER' ? 'bg-blue-50 ml-12' : 'bg-gray-50 mr-12'}`}>
          <p className="text-xs text-gray-500 mb-1">{msg.role === 'USER' ? 'You' : 'AI'}</p>
          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
        </div>
      ))}
    </div>
  )
}

function ChatInput({ sessionId }: { sessionId: string }) {
  'use client'
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault()
        const form = e.currentTarget
        const fd = new FormData(form)
        const content = fd.get('content') as string
        if (!content.trim()) return
        // In a real app, this sends via WebSocket
        await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, content }),
        })
        form.reset()
      }}
    >
      <input name="content" className="flex-1 border rounded px-3 py-2 text-sm" placeholder="Type a message…" />
      <button type="submit" className="px-4 py-2 bg-black text-white rounded text-sm">
        Send
      </button>
    </form>
  )
}
