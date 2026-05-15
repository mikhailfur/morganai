export interface CharacterDefinition {
  slug: string;
  name: string;
  description: string;
  systemPrompt: string;
  greetingMessage: string;
  isPremium: boolean;
  isActive: boolean;
  sortOrder: number;
}
