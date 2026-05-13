export interface Window {
  Telegram?: {
    WebApp: {
      ready(): void
      initData: string
      [key: string]: unknown
    }
  }
}

export {}
