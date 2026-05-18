import { env } from '../../config/index.js';

const BASE_URL = 'https://openrouter.ai/api/v1';

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public status: number,
    public model?: string,
  ) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

export async function openrouterFetch(
  path: string,
  body: unknown,
): Promise<unknown> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': env.OPENROUTER_SITE_URL,
      'X-Title': env.OPENROUTER_SITE_NAME,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new OpenRouterError(
      `OpenRouter API error ${response.status}: ${text}`,
      response.status,
    );
  }

  return response.json();
}

export function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 503 || (status >= 500 && status < 600);
}
