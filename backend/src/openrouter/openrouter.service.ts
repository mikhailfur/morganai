import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EventEmitter2 } from '@nestjs/event-emitter'

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface StreamChunkEvent {
  sessionId: string
  messageId: string
  chunk: string
  finishReason: string | null
}

@Injectable()
export class OpenRouterService {
  private readonly logger = new Logger(OpenRouterService.name)
  private readonly apiKey: string
  private readonly referer: string
  private readonly baseUrl = 'https://openrouter.ai/api/v1/chat/completions'

  private readonly activeControllers = new Map<string, AbortController>()

  constructor(
    private readonly config: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.apiKey = this.config.getOrThrow<string>('OPENROUTER_API_KEY')
    this.referer = this.config.get<string>('OPENROUTER_REFERER') ?? 'https://morganai.example.com'
  }

  /**
   * Streams a chat completion from OpenRouter.
   * @param opts.sessionId   WebSocket room id
   * @param opts.messages    Full message history INCLUDING the new user message and system prompt
   * @param opts.model       Model ID e.g. "anthropic/claude-3.5-sonnet"
   * @param opts.temperature Optional sampling temperature
   */
  async streamCompletion(opts: {
    sessionId: string
    messageId: string
    messages: OpenRouterMessage[]
    model: string
    temperature?: number
  }): Promise<void> {
    const controller = new AbortController()
    this.activeControllers.set(opts.sessionId, controller)

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': this.referer,
          'X-Title': 'MorganAI',
        },
        body: JSON.stringify({
          model: opts.model,
          messages: opts.messages,
          stream: true,
          temperature: opts.temperature ?? 0.8,
        }),
        signal: controller.signal,
      })

      if (!response.ok || !response.body) {
        const text = await response.text()
        throw new Error(`OpenRouter error ${response.status}: ${text}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          const data = line.slice(5).trim()
          if (data === '[DONE]') {
            this.emitChunk({
              sessionId: opts.sessionId,
              messageId: opts.messageId,
              chunk: '',
              finishReason: 'stop',
            })
            continue
          }

          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta?.content ?? ''
            const finish = parsed.choices?.[0]?.finish_reason ?? null
            if (delta || finish) {
              fullContent += delta
              this.emitChunk({
                sessionId: opts.sessionId,
                messageId: opts.messageId,
                chunk: delta,
                finishReason: finish,
              })
            }
          } catch {
            // ignore malformed SSE lines
          }
        }
      }

      this.logger.log(`Stream completed for session ${opts.sessionId} — ${fullContent.length} chars`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      this.logger.error(`OpenRouter stream failed: ${message}`)
      this.eventEmitter.emit('chat.error', {
        sessionId: opts.sessionId,
        messageId: opts.messageId,
        error: message,
      })
    } finally {
      this.activeControllers.delete(opts.sessionId)
    }
  }

  abortSession(sessionId: string): void {
    const ctrl = this.activeControllers.get(sessionId)
    if (ctrl) {
      ctrl.abort()
      this.activeControllers.delete(sessionId)
      this.logger.warn(`Aborted stream for session ${sessionId}`)
    }
  }

  private emitChunk(payload: StreamChunkEvent): void {
    this.eventEmitter.emit('chat.chunk', payload)
  }
}
