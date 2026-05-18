import pino from 'pino';
import { openrouterFetch, OpenRouterError, isRetryableError } from './client.js';
import { getModelsForTier } from './models.js';
import type {
  ChatCompletionParams,
  ChatCompletionResult,
  OpenRouterUsage,
} from './types.js';

export class AllModelsFailedError extends Error {
  constructor() {
    super('All AI models failed to respond');
    this.name = 'AllModelsFailedError';
  }
}

const logger = pino({ name: 'openrouter-chat' });

export async function chatCompletion(
  params: ChatCompletionParams,
): Promise<ChatCompletionResult> {
  const models = getModelsForTier(params.tier);

  for (const model of models) {
    try {
      const response = await openrouterFetch('/chat/completions', {
        model,
        messages: params.messages,
        max_tokens: params.maxTokens ?? 1024,
      }) as {
        choices: Array<{ message: { content: string }; finish_reason: string }>;
        usage: OpenRouterUsage;
        model: string;
      };

      const content = response.choices[0]?.message?.content ?? '';
      const usage = response.usage;

      return {
        content,
        modelUsed: response.model ?? model,
        tokensPrompt: usage.prompt_tokens ?? 0,
        tokensCompletion: usage.completion_tokens ?? 0,
        tokensCacheRead: usage.prompt_tokens_details?.cached_tokens ?? 0,
      };
    } catch (err) {
      if (err instanceof OpenRouterError && isRetryableError(err)) {
        logger.warn(
          { model, status: err.status, message: err.message.slice(0, 200) },
          'Model failed, trying next',
        );
        continue;
      }
      logger.error(
        { model, status: err instanceof OpenRouterError ? err.status : 'unknown', err },
        'Non-retryable error, aborting',
      );
      throw err;
    }
  }

  throw new AllModelsFailedError();
}
