import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

interface GenerateResponseParams {
  systemPrompt: string
  welcomeMessage: string
  history: Array<{ role: string; content: string }>
  userMessage: string
  imageUrl?: string
}

interface GeminiPart {
  text?: string
  inlineData?: {
    mimeType: string
    data: string
  }
}

interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name)
  private readonly geminiApiKey: string
  private readonly geminiApiUrl = 'https://generativelanguage.googleapis.com/v1beta'

  constructor(private readonly configService: ConfigService) {
    this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY')
  }

  async generateResponse({
    systemPrompt,
    welcomeMessage,
    history,
    userMessage,
    imageUrl,
  }: GenerateResponseParams): Promise<{ text: string }> {
    try {
      const contents: GeminiContent[] = []

      // Add system prompt as first message
      contents.push({
        role: 'user',
        parts: [{ text: systemPrompt }],
      })
      contents.push({
        role: 'model',
        parts: [{ text: welcomeMessage }],
      })

      // Add history
      for (const msg of history) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        })
      }

      // Add current message with optional image
      const userParts: GeminiPart[] = [{ text: userMessage }]

      if (imageUrl) {
        const imageData = await this.fetchImageAsBase64(imageUrl)
        userParts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageData,
          },
        })
      }

      contents.push({
        role: 'user',
        parts: userParts,
      })

      const response = await fetch(
        `${this.geminiApiUrl}/models/gemini-2.0-flash:generateContent?key=${this.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.9,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
            },
            safetySettings: [
              {
                category: 'HARM_CATEGORY_HARASSMENT',
                threshold: 'BLOCK_NONE',
              },
              {
                category: 'HARM_CATEGORY_HATE_SPEECH',
                threshold: 'BLOCK_NONE',
              },
            ],
          }),
        }
      )

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Gemini API error: ${error}`)
      }

      const data = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

      return { text }
    } catch (error) {
      this.logger.error('Gemini API error:', error)
      throw error
    }
  }

  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    try {
      // Whisper API (OpenAI-compatible)
      const formData = new FormData()
      formData.append('file', new Blob([audioBuffer], { type: 'audio/webm' }), 'audio.webm')
      formData.append('model', 'whisper-1')
      formData.append('language', 'ru')

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.configService.get<string>('OPENAI_API_KEY')}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Whisper API error: ${await response.text()}`)
      }

      const data = await response.json()
      return data.text
    } catch (error) {
      this.logger.error('Transcription error:', error)
      throw error
    }
  }

  async textToSpeech(text: string): Promise<Buffer> {
    try {
      // MiniMax TTS API
      const response = await fetch('https://api.minimax.chat/v1/text2audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.configService.get<string>('MINIMAX_API_KEY')}`,
        },
        body: JSON.stringify({
          text,
          model: 'speech-01',
          voice_setting: {
            voice_id: 'female-shaonv',
            speed: 1.0,
            vol: 1.0,
          },
          audio_setting: {
            sample_rate: 32000,
            bitrate: 128000,
            format: 'mp3',
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`MiniMax TTS error: ${await response.text()}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (error) {
      this.logger.error('TTS error:', error)
      throw error
    }
  }

  private async fetchImageAsBase64(imageUrl: string): Promise<string> {
    const response = await fetch(imageUrl)
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer).toString('base64')
  }
}
