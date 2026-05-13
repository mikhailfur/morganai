export interface UserResponse {
  id: number
  telegram_id: number
  username: string | null
  first_name: string | null
  last_name: string | null
  is_premium: boolean
  premium_expires_at: string | null
  selected_character_id: number | null
  selected_mode_id: number | null
  last_activity_at: string | null
  created_at: string | null
}

export interface CharacterResponse {
  id: number
  name: string
  system_prompt: string
  avatar_url: string | null
  is_default: boolean
  is_nsfw: boolean
  is_premium: boolean
  created_at: string | null
}

export interface BehaviorModeResponse {
  id: number
  name: string
  prompt_addition: string
  is_premium: boolean
  is_nsfw: boolean
  created_at: string | null
}

export interface SubscriptionPlan {
  name: string
  price_rub: number
  price_usd: number
}

export interface SubscriptionPlans {
  [key: string]: SubscriptionPlan
}
