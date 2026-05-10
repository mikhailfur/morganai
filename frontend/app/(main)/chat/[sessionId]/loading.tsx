export default function ChatLoading() {
  return (
    <section className="flex flex-col h-full animate-pulse">
      <header className="border-b px-4 py-3">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-1/4" />
      </header>
      <div className="flex-1 p-4 space-y-4">
        <div className="h-16 bg-gray-100 rounded ml-12" />
        <div className="h-16 bg-gray-100 rounded mr-12" />
        <div className="h-16 bg-gray-100 rounded ml-12" />
      </div>
      <div className="border-t px-4 py-3">
        <div className="h-10 bg-gray-200 rounded" />
      </div>
    </section>
  )
}
