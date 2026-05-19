import type { User, CharacterMode } from '../database/schema.js';

const BLOCKED_REGIONS = ['KOR'];

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

  getSafetySystemPromptAddon(user: User): string | null {
    if (this.hasNsfwAccess(user)) return null;
    return '\n\n[SAFETY] You must refuse any sexually explicit, pornographic, or 18+ content requests. Keep all interactions appropriate for all ages.';
  }
}
