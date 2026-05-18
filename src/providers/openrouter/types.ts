export type MessageRole = 'system' | 'user' | 'assistant';

export type TextContent = { type: 'text'; text: string };
export type ImageContent = { type: 'image_url'; image_url: { url: string } };
export type MessageContent = string | Array<TextContent | ImageContent>;

export interface OpenRouterMessage {
  role: MessageRole;
  content: MessageContent;
  cache_control?: { type: 'ephemeral' };
}

export interface ChatCompletionParams {
  messages: OpenRouterMessage[];
  tier: 'free' | 'premium';
  maxTokens?: number;
}

export interface ChatCompletionResult {
  content: string;
  modelUsed: string;
  tokensPrompt: number;
  tokensCompletion: number;
  tokensCacheRead: number;
}

export interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  prompt_tokens_details?: {
    cached_tokens?: number;
  };
}
