import { config } from './config';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export class OpenRouterClient {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://openrouter.ai/api/v1/chat/completions';

  constructor() {
    this.apiKey = config.openrouterApiKey;
    this.model = config.openrouterModel;
  }

  async generateResponse(
    systemPrompt: string,
    messages: ChatMessage[],
    options: {
      maxTokens?: number;
      temperature?: number;
      stream?: boolean;
    } = {}
  ): Promise<string> {
    const { maxTokens = 2048, temperature = 0.85 } = options;

    const requestMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': config.clientUrl,
        'X-Title': 'Morgan AI',
      },
      body: JSON.stringify({
        model: this.model,
        messages: requestMessages,
        max_tokens: maxTokens,
        temperature,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data: any = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async generateStreamResponse(
    systemPrompt: string,
    messages: ChatMessage[],
    onChunk: (text: string) => void,
    options: {
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<string> {
    const { maxTokens = 2048, temperature = 0.85 } = options;

    const requestMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': config.clientUrl,
        'X-Title': 'Morgan AI',
      },
      body: JSON.stringify({
        model: this.model,
        messages: requestMessages,
        max_tokens: maxTokens,
        temperature,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter stream error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    let fullText = '';
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        
        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            onChunk(delta);
          }
        } catch {
          // skip invalid JSON chunks
        }
      }
    }

    return fullText;
  }

  async analyzeImage(
    systemPrompt: string,
    imageBase64: string,
    mimeType: string,
    userMessage?: string
  ): Promise<string> {
    const prompt = userMessage
      ? `Опиши это изображение и ответь на вопрос пользователя: "${userMessage}"`
      : `Опиши это изображение подробно. Что ты видишь?`;

    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
        ],
      },
    ];

    return this.generateResponse(systemPrompt, messages);
  }
}

export const openrouterClient = new OpenRouterClient();
