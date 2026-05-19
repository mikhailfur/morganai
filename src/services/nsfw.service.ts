import type { User, CharacterMode } from '../database/schema.js';

const BLOCKED_REGIONS = ['KOR'];

export const NSFW_SENTINEL = '__NSFW_BLOCKED__';

export class NsfwBlockedError extends Error {
  constructor(public readonly reason: 'region' | 'no_access') {
    super('NSFW content blocked');
    this.name = 'NsfwBlockedError';
  }
}

export class NsfwService {
  hasNsfwAccess(user: User): boolean {
    if (user.blocked) return false;
    if (user.kycVerified && user.kycNationality && BLOCKED_REGIONS.includes(user.kycNationality)) {
      return false;
    }
    return user.tier === 'premium' || user.nsfwUnlocked;
  }

  isRegionBlocked(user: User): boolean {
    if (!user.kycVerified) return false;
    return !!user.kycNationality && BLOCKED_REGIONS.includes(user.kycNationality);
  }

  canUseMode(user: User, mode: CharacterMode): boolean {
    if (!mode.isNsfw) return true;
    return this.hasNsfwAccess(user);
  }

  getNsfwBlockReason(user: User): 'region' | 'no_access' | null {
    if (this.isRegionBlocked(user)) return 'region';
    if (!this.hasNsfwAccess(user)) return 'no_access';
    return null;
  }

  isConfigured(): boolean {
    return true;
  }

  isSentinel(response: string): boolean {
    return response.trim() === NSFW_SENTINEL;
  }

  getSafetySystemPromptAddon(user: User): string | null {
    if (this.hasNsfwAccess(user)) return null;
    return (
      `\n\n[CONTENT POLICY] If the user's message contains sexually explicit, pornographic, romantic/sexual roleplay, or any 18+ content, ` +
      `you MUST respond with ONLY the exact text: ${NSFW_SENTINEL}\n` +
      `Do not add any explanation, apology, or other text — just that exact string and nothing else.`
    );
  }
}
