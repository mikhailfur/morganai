import { env } from '../../config/index.js';

export const MODELS = {
  FREE_PRIMARY: env.OPENROUTER_FREE_PRIMARY_MODEL,
  FREE_FALLBACK: env.OPENROUTER_FREE_FALLBACK_MODEL,
  PREMIUM: env.OPENROUTER_PREMIUM_MODEL,
  FREE_VISION: env.OPENROUTER_FREE_VISION_MODEL,
  PREMIUM_VISION: env.OPENROUTER_PREMIUM_VISION_MODEL,
  WHISPER: env.OPENROUTER_WHISPER_MODEL,
} as const;

export function getModelsForTier(tier: 'free' | 'premium', hasImages = false): string[] {
  if (hasImages) {
    return tier === 'premium' ? [MODELS.PREMIUM_VISION] : [MODELS.FREE_VISION];
  }
  if (tier === 'premium') return [MODELS.PREMIUM];
  return [MODELS.FREE_PRIMARY, MODELS.FREE_FALLBACK];
}
