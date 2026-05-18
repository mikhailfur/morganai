import { env } from '../../config/index.js';

export const MODELS = {
  FREE_PRIMARY: env.OPENROUTER_FREE_PRIMARY_MODEL,
  FREE_FALLBACK: env.OPENROUTER_FREE_FALLBACK_MODEL,
  PREMIUM: env.OPENROUTER_PREMIUM_MODEL,
  WHISPER: env.OPENROUTER_WHISPER_MODEL,
} as const;

export function getModelsForTier(tier: 'free' | 'premium'): string[] {
  if (tier === 'premium') return [MODELS.PREMIUM];
  return [MODELS.FREE_PRIMARY, MODELS.FREE_FALLBACK];
}
