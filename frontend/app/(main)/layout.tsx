import Link from 'next/link'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-gray-50 p-4">
        <h1 className="text-xl font-bold mb-6">MorganAI</h1>
        <nav className="space-y-2">
          <Link href="/" className="block px-3 py-2 rounded hover:bg-gray-200">Home</Link>
          <Link href="/marketplace" className="block px-3 py-2 rounded hover:bg-gray-200">Marketplace</Link>
          <Link href="/characters/new" className="block px-3 py-2 rounded hover:bg-gray-200">Create Character</Link>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
