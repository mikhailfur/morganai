export interface User {
  id: number;
  email: string;
  username: string;
  is_premium: boolean;
  is_admin: boolean;
  is_support?: boolean;
  behavior_mode: string;
  selected_character: string;
  avatar_url?: string;
  total_messages?: number;
  voice_count_today?: number;
  daily_messages_count?: number;
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

export interface BehaviorModule {
  id: string;
  name: string;
  description: string;
  isNsfw?: boolean;
}

export interface Character {
  slug: string;
  name: string;
  description: string;
  avatar_url?: string;
  is_premium: boolean;
  greeting_message?: string;
  modules?: BehaviorModule[];
}

export interface UserCharacter {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  avatar_url?: string;
  system_prompt: string;
  greeting_message?: string;
  is_public: boolean;
  is_nsfw?: boolean;
  moderation_status?: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  created_at: number;
  author_name?: string;
}

export interface AuthResponse {
  user: User;
}

export interface SupportTicket {
  id: number;
  user_id: number;
  subject: string;
  status: 'open' | 'in_progress' | 'closed';
  created_at: number;
  updated_at: number;
  user_email?: string;
  user_name?: string;
  last_message?: string;
  messages?: TicketMessage[];
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  sender_id: number;
  sender_role: 'user' | 'support';
  content: string;
  created_at: number;
  sender_name?: string;
}

export interface Campaign {
  id: number;
  character_slug: string;
  title: string;
  description?: string;
  cover_url?: string;
  is_active: boolean;
  sort_order: number;
  created_at: number;
  scene_count?: number;
  scenes?: CampaignScene[];
  current_scene_id?: number | null;
  is_completed?: boolean;
  progress_started_at?: number | null;
}

export interface CampaignScene {
  id: number;
  campaign_id: number;
  scene_order: number;
  title: string;
  location?: string;
  situation?: string;
  context_prompt: string;
}

export interface UserCampaignProgress {
  campaign_id: number;
  current_scene_id: number;
  is_completed: boolean;
  started_at: number;
  updated_at: number;
}
