export interface CharacterModeDefinition {
  slug: string;
  name: string;
  promptAddon?: string;
  isNsfw?: boolean;
  isDefault?: boolean;
  sortOrder?: number;
}

export interface CharacterDefinition {
  slug: string;
  name: string;
  description?: string;
  systemPrompt: string;
  avatarUrl?: string;
  isActive?: boolean;
  nsfwCapable?: boolean;
  modes?: CharacterModeDefinition[];
}
