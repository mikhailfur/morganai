export interface User {
  id: number;
  email: string;
  username: string;
  is_premium: boolean;
  is_admin: boolean;
  behavior_mode: string;
  selected_character: string;
  avatar_url?: string;
  total_messages?: number;
  voice_count_today?: number;
  created_at?: number;
  kyc_verified?: boolean;
  subscription_type?: 'free' | 'premium' | 'premium_plus';
  subscription_expires_at?: number | null;
  is_banned?: boolean;
}

export interface ChatMessage {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  has_voice?: boolean;
  has_image?: boolean;
  image_url?: string;
  timestamp?: number;
  voiceUrl?: string;
  isStreaming?: boolean;
}

export interface Character {
  slug: string;
  name: string;
  description: string;
  avatar_url?: string;
  is_premium: boolean;
  greeting_message?: string;
}

export interface AuthResponse {
  user: User;
}
