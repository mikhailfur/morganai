/// <reference types="vite/client" />

export {}

// Extend ImportMeta interface for Vite
interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_WEBAPP_URL?: string
  [key: string]: any
}
